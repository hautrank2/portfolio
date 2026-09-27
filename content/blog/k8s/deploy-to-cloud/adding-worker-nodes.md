---
title: "8.7 Thêm Worker Node"
description: "Control plane không chạy Pod. Một node group, ba IAM policy, và cụm mới có chỗ để đặt container."
status: growing
created: 2026-09-25
updated: 2026-09-26
tags: [k8s, aws, eks, node, iam, ec2]
---

> Tiếp [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks). Cụm đã `Active`,
> `kubectl` đã vào được, và `kubectl get nodes` trả về `No resources found`.

Note trước dựng xong **bộ não**. Note này thêm **cơ bắp**.

Theo bảy bước ở [8.1](/blog/k8s/deploy-to-cloud/deployment-options), bạn đang làm nốt
bước 1, 3 và 5: có máy, cài phần mềm K8s lên đó, nối nó vào cụm. Trên EKS, cả ba gói vào
một thứ duy nhất gọi là **node group**.

> EC2 tính tiền **theo giờ, cho từng instance**, và bắt đầu ngay khi node group tạo xong.
> Đây là khoản đắt thứ hai của section, sau control plane.

## Node group là gì

| | |
| --- | --- |
| **Cái bạn khai** | Loại máy, số lượng, subnet, IAM role |
| **Cái AWS dựng** | Một Auto Scaling Group chứa các EC2 instance, mỗi cái cài sẵn kubelet + containerd và tự `join` vào cụm |
| **Cái bạn không phải làm** | SSH vào máy, cài `kubelet`, chép certificate, gõ `kubeadm join` |

Trên k3s ở bảy section trước, node duy nhất vừa là control plane vừa là worker, nên ranh
giới này vô hình. Ở đây nó lộ ra rõ ràng: control plane là dịch vụ AWS quản lý, còn node
là **EC2 của bạn**, nằm trong VPC của bạn, tính tiền vào hoá đơn của bạn.

## 1. Node IAM role — ba policy, ba việc

Form tạo node group sẽ đòi một role, và cũng như ở 8.6, nó **không cho tạo tại chỗ**. Mở
**IAM → Roles → Create role** ở tab khác:

| Trường | Giá trị |
| --- | --- |
| Trusted entity | **AWS service** → **EC2** |
| Role name | `eksNodeGroup` |

Chọn `EC2` chứ không phải `EKS`, vì thứ **đóng vai** role này là máy EC2, không phải dịch
vụ EKS. Đây đúng là ranh giới đã nói ở [8.6](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks):
`eksClusterRole` cấp quyền cho phần AWS quản lý, còn role này cấp quyền cho phần máy của
bạn.

Gắn ba policy:

| Policy | Cho phép node làm gì | Thiếu nó thì |
| --- | --- | --- |
| `AmazonEKSWorkerNodePolicy` | Gọi EKS để tự nối vào cụm, đọc thông tin cluster | Node không bao giờ xuất hiện trong `kubectl get nodes` |
| `AmazonEKS_CNI_Policy` | Gắn IP từ subnet VPC vào Pod, qua ENI | Node `Ready` nhưng Pod kẹt ở `ContainerCreating` |
| `AmazonEC2ContainerRegistryReadOnly` | Kéo image từ ECR | Image trên ECR không pull được; Docker Hub thì vẫn được |

Policy thứ hai đáng dừng lại một chút. Trên k3s, Pod nhận IP từ dải riêng `10.42.x.x` do
flannel tự quản. Trên EKS với CNI mặc định, **mỗi Pod nhận một IP thật của subnet VPC** —
nghĩa là Pod có địa chỉ ngang hàng với EC2 instance, và dải IP của subnet trở thành một
tài nguyên có hạn. Việc xin và gắn IP đó cần quyền, và `AmazonEKS_CNI_Policy` chính là
quyền ấy.

## 2. Tạo node group

Vào cluster `kub-dep-demo` → tab **Compute** → **Add node group**.

| Trường | Giá trị | Ghi chú |
| --- | --- | --- |
| Name | `kub-dep-demo` | Tên node group, không phải tên cluster — trùng tên cũng được |
| Node IAM role | `eksNodeGroup` | Vừa tạo ở trên. Không thấy thì refresh |

**Next**, sang trang cấu hình máy:

| Trường | Giá trị | Vì sao |
| --- | --- | --- |
| AMI type | `Amazon Linux 2023 (AL2023_x86_64_STANDARD)` | Bản AWS dựng sẵn, có kubelet và containerd |
| Capacity type | `On-Demand` | `Spot` rẻ hơn nhưng bị thu hồi giữa chừng |
| Instance type | **`t3.small`** | Xem mục dưới |
| Disk size | `20 GiB` | Mặc định, đủ dùng |

Trang tiếp là scaling:

| Trường | Giá trị |
| --- | --- |
| Desired size | `2` |
| Minimum size | `2` |
| Maximum size | `2` |

Hai node là đủ để thấy scheduler rải Pod qua nhiều máy, mà vẫn giữ hoá đơn nhỏ.

Trang **Specify networking**: chọn các subnet của VPC `eksVpc`, và **không** bật SSH
access. Không bật SSH thì không cần tạo key pair, cũng không mở thêm cổng nào.

Xem lại rồi **Create**. Mất khoảng **3–5 phút**.

## Vì sao `t3.small`, không phải `t3.micro`

`t3.micro` rẻ hơn, nhưng số Pod mỗi node bị chặn bởi **số IP mà ENI của instance đó gắn
được**, chứ không phải bởi CPU hay RAM:

| Instance | RAM | Số Pod tối đa |
| --- | --- | --- |
| `t3.micro` | 1 GiB | **4** |
| `t3.small` | 2 GiB | **11** |
| `t3.medium` | 4 GiB | 17 |

Bốn Pod nghe có vẻ đủ, cho tới khi nhớ rằng `kube-system` đã chiếm mất vài chỗ trên mỗi
node — `aws-node` của CNI và `kube-proxy`. Chỗ còn lại cho app của bạn chỉ còn một hai
Pod, và `Pending` sẽ xuất hiện vì lý do rất khó đoán nếu không biết trước.

```bash
kubectl get pods -n kube-system -o wide
```

## 3. Kiểm tra node đã vào cụm

```bash
kubectl get nodes -o wide
```

```
NAME                                             STATUS   ROLES    AGE   VERSION
ip-192-168-12-34.ap-southeast-2.compute.internal Ready    <none>   2m    v1.31.x
ip-192-168-56-78.ap-southeast-2.compute.internal Ready    <none>   2m    v1.31.x
```

Ba chi tiết đáng để ý:

- **Tên node là tên DNS nội bộ của EC2**, không phải tên bạn đặt. Nhìn tên là biết ngay
  mình đang ở EKS chứ không phải k3s.
- **`ROLES` là `<none>`.** Không có node nào mang nhãn control plane, vì control plane
  không nằm trong cụm theo nghĩa bạn nhìn thấy được. AWS giữ nó ở chỗ khác.
- **IP thuộc dải của VPC**, đúng như phần CNI ở trên.

Nếu sau 5 phút vẫn `No resources found`, xuống mục gỡ lỗi ở cuối note.

## 4. Thử đặt một Pod lên đó

```bash
kubectl create deployment hello --image=nginx:1.27-alpine
```

```bash
kubectl get pods -o wide
```

Cột `NODE` cho biết scheduler chọn máy nào. Scale lên để thấy Pod rải qua cả hai node:

```bash
kubectl scale deployment hello --replicas=4 && kubectl get pods -o wide
```

Đây là thứ **không** quan sát được trên cụm một node suốt bảy section trước: cùng một
Deployment, các Pod nằm trên các máy vật lý khác nhau, và Service vẫn gom chúng lại thành
một địa chỉ.

Dọn trước khi sang note sau:

```bash
kubectl delete deployment hello
```

## Nếu node không chịu vào cụm

```bash
kubectl get nodes
```

Trống, hoặc node group hiện `Create failed` — kiểm theo thứ tự này:

| Triệu chứng | Nguyên nhân thường gặp |
| --- | --- |
| Node group `Create failed`, kèm `NodeCreationFailure` | Node role thiếu policy, hoặc thiếu hẳn `AmazonEKSWorkerNodePolicy` |
| EC2 chạy nhưng node không xuất hiện trong `kubectl get nodes` | Node ở subnet private mà không có NAT Gateway, nên không gọi được API server |
| **Node hiện ra nhưng `NotReady` mãi** | Cụm không có CNI — xem mục ngay dưới |
| Node `Ready` nhưng Pod kẹt `ContainerCreating` | Thiếu `AmazonEKS_CNI_Policy` |
| Pod báo `ErrImagePull` với image ECR | Thiếu `AmazonEC2ContainerRegistryReadOnly` |

### `NotReady` kèm `cni plugin not initialized`

```bash
kubectl describe node <ten-node> | grep -A12 "Conditions:"
```

```
container runtime network not ready: NetworkReady=false
reason:NetworkPluginNotReady message:Network plugin returns error: cni plugin not initialized
```

kubelet đã nối được vào cụm, nhưng **không có plugin mạng nào**, nên nó từ chối nhận Pod.
Không có CNI thì không ai cấp IP cho Pod được.

```bash
kubectl get pods -n kube-system -o wide
```

Không thấy `aws-node` và `kube-proxy` nghĩa là cụm chưa cài addon nào. Cài ba addon nền:

```bash
aws eks create-addon --cluster-name kub-dep-demo --addon-name vpc-cni
```

```bash
aws eks create-addon --cluster-name kub-dep-demo --addon-name kube-proxy
```

```bash
aws eks create-addon --cluster-name kub-dep-demo --addon-name coredns
```

```bash
kubectl get nodes -w
```

Node chuyển `Ready` sau khoảng một phút, ngay khi `aws-node` chạy trên nó.

**Vì sao cụm lại thiếu CNI?** Hai khả năng:

| | |
| --- | --- |
| Cluster tạo ở chế độ **Auto Mode** | Auto Mode có networking dựng sẵn cho node **của nó**, và không cài `aws-node`. Node group bạn tạo tay thì không ai phục vụ |
| Addon bị gỡ, hoặc cluster tạo bằng API mà không kèm addon mặc định | Ít gặp hơn |

Kiểm tra bằng:

```bash
aws eks list-addons --cluster-name kub-dep-demo
```

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,COMPUTE:.metadata.labels.eks\.amazonaws\.com/compute-type'
```

Cột `COMPUTE` trống là node của node group thường; giá trị `auto` là node do Auto Mode
tạo. Trộn hai loại trong một cụm chạy được, nhưng bạn sẽ phải tự cài addon cho phần node
group — và đó chính là ba lệnh ở trên.

Xem EC2 có thật sự được tạo không:

```bash
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=kub-dep-demo" --query "Reservations[].Instances[].{id:InstanceId,state:State.Name,subnet:SubnetId}" --output table
```

Xem AWS báo gì về node group:

```bash
aws eks describe-nodegroup --cluster-name kub-dep-demo --nodegroup-name kub-dep-demo --query "nodegroup.{status:status,health:health}"
```

Trường `health` là chỗ AWS nói thẳng lý do, ví dụ `Ec2LaunchTemplateInvalidConfiguration`
hay `NodeCreationFailure`.

## Tiền

Từ giờ hoá đơn có ba dòng chạy song song:

| Thứ | Tính theo |
| --- | --- |
| Control plane EKS | Giờ, cố định |
| **2 × EC2 `t3.small`** | Giờ, theo từng instance |
| NAT Gateway của `eksVpc` | Giờ, cộng lưu lượng |

Tạm dừng phần EC2 khi không học, mà không phải xoá cụm:

```bash
aws eks update-nodegroup-config --cluster-name kub-dep-demo --nodegroup-name kub-dep-demo --scaling-config minSize=0,maxSize=2,desiredSize=0
```

Node biến mất, Pod về `Pending`, và EC2 ngừng tính tiền. Mở lại bằng chính lệnh đó với
`desiredSize=2`.

Control plane và NAT Gateway thì **vẫn tính tiền**. Muốn dừng hẳn thì phải xoá cluster và
xoá stack `eksVpc`.

## Nếu chỉ đọc chứ không bật EKS

```bash
k3d cluster create lab --agents 2
```

Hai `--agents` chính là node group ở đây: hai "máy" nối vào cụm, mỗi cái là một container.
Thêm node sau cũng được:

```bash
k3d node create extra --cluster lab --role agent
```

```bash
kubectl get nodes
```

Cái k3d giấu đi: IAM role cho node, ENI và giới hạn số Pod theo loại máy, subnet
public/private, và chuyện node phải có đường ra internet để gọi API server. Cái nó giữ
lại: **scheduler có nhiều hơn một chỗ để đặt Pod** — và đó mới là thứ bạn cần cho các note
sau.

## Self-check

- [ ] Nói được node group gồm những gì, và AWS dựng hộ cái gì
- [ ] Phân biệt `eksClusterRole` với `eksNodeGroup` — ai đóng vai nào, trusted entity khác nhau ra sao
- [ ] Kể ba policy của node role và triệu chứng khi thiếu từng cái
- [ ] Giải thích được vì sao số Pod tối đa phụ thuộc loại instance, không phụ thuộc RAM
- [ ] Nói được vì sao cột `ROLES` của mọi node đều là `<none>`
- [ ] Biết cách tạm dừng tính tiền EC2 mà không xoá cụm

## Open questions

- Pod nhận IP thật của subnet VPC — vậy một subnet `/24` chứa được bao nhiêu Pod?
- `Spot` rẻ hơn nhiều. Loại workload nào chịu được việc node bị thu hồi giữa chừng?
- Node group scale 0 rồi bật lại — Pod có quay về đúng node cũ không, và có quan trọng không?
