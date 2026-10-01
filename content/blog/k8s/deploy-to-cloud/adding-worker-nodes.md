---
title: "8.13 Thêm Worker Node"
description: "Control plane không chạy Pod. Một node group, ba IAM policy, và cụm mới có chỗ để đặt container — cộng hai thứ phải kiểm trước khi bấm Create, vì sai thì node group mất 20 phút mới chịu báo lỗi."
status: growing
created: 2026-09-25
updated: 2026-09-30
tags: [k8s, aws, eks, node, iam, ec2, access-entry]
---

> Tiếp [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks). Cụm đã `Active`,
> `kubectl` đã vào được, và `kubectl get nodes` trả về `No resources found`.

Note trước dựng xong **bộ não**. Note này thêm **cơ bắp**.

Theo bảy bước ở [8.1](/blog/k8s/deploy-to-cloud/deployment-options), bạn đang làm nốt
bước 1, 3 và 5: có máy, cài phần mềm K8s lên đó, nối nó vào cụm. Trên EKS, cả ba gói vào
một thứ duy nhất gọi là **node group**.

> EC2 tính tiền **theo giờ, cho từng instance**, và bắt đầu ngay khi máy chạy — kể cả khi
> nó chưa join được vào cụm. Đây là khoản đắt thứ hai của section, sau control plane.

Note chia hai phần. **Bước 0–5** là đường chính. Mục **"Gỡ lỗi"** ở cuối chỉ đọc khi một
bước nào đó không ra kết quả như mô tả — đi hết bước 5 mà mọi thứ đúng thì bỏ qua nó.

## Node group là gì

| | |
| --- | --- |
| **Cái bạn khai** | Loại máy, số lượng, subnet, IAM role |
| **Cái AWS dựng** | Một Auto Scaling Group chứa các EC2 instance, mỗi cái cài sẵn kubelet + containerd và tự `join` vào cụm |
| **Cái bạn không phải làm** | SSH vào máy, cài `kubelet`, chép certificate, gõ `kubeadm join` |

Trên k3s ở bảy section trước, node duy nhất vừa là control plane vừa là worker, nên ranh
giới này vô hình. Ở đây nó lộ ra rõ ràng: control plane là dịch vụ AWS quản lý, còn node
là **EC2 của bạn**, nằm trong VPC của bạn, tính tiền vào hoá đơn của bạn.

## 0. Hai thứ phải kiểm trước khi mở form

Nếu một trong hai thứ này sai, node group vẫn tạo ra EC2, EC2 vẫn chạy và tính tiền, nhưng
**không máy nào join được cụm** — và phải mất khoảng 20 phút node group mới chịu báo
`CREATE_FAILED`. Kiểm mất một phút.

### Auto Mode phải đang tắt

```bash
aws eks describe-cluster --name kub-cafe-demo --query "cluster.computeConfig.enabled" --output text
```

| Kết quả | Nghĩa |
| --- | --- |
| `False` hoặc `None` | Đúng. Sang mục tiếp |
| **`True`** | Auto Mode đang bật — thường do để nguyên công tắc ở Step 1 của [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks). **Tắt trước khi đi tiếp** |

**Nếu ra `True` — tắt bằng Console:** **EKS → `kub-cafe-demo` → tab Overview**, phần
**EKS Auto Mode** → **Manage** → tắt **Use EKS Auto Mode** → **Save changes**. Chờ cụm từ
`Updating` về `Active`.

**Hoặc bằng CLI** — phải tắt cả ba phần của Auto Mode trong cùng một lệnh:

```bash
aws eks update-cluster-config --name kub-cafe-demo --compute-config enabled=false --kubernetes-network-config 'elasticLoadBalancing={enabled=false}' --storage-config 'blockStorage={enabled=false}'
```

```bash
aws eks wait cluster-active --name kub-cafe-demo
```

> Lệnh trên dùng cú pháp **shorthand** của AWS CLI trong **nháy đơn**, chạy được cả trên
> bash lẫn PowerShell. Nhiều tài liệu viết dạng JSON với `\"` — PowerShell không hiểu kiểu
> escape đó, và bạn sẽ nhận `Unknown options: blockStorage\:{\enabled\:false}}`.

### Access entry của `eksNodeRole` phải đúng loại

Node group dùng `eksNodeRole` để join, và cụm nhận ra role đó qua một **access entry**.
Access entry có **loại**, và loại quyết định cụm đối xử với máy mang role đó thế nào:

| Loại | Dành cho | Tên node mà cụm chấp nhận |
| --- | --- | --- |
| **`EC2_LINUX`** | Node của **node group** — thứ note này tạo | Tên DNS của EC2, `ip-192-168-…` |
| `EC2` | Node của **Auto Mode** | Theo id của instance |

```bash
aws eks list-access-entries --cluster-name kub-cafe-demo --output text
```

Không thấy dòng nào chứa `eksNodeRole` là **bình thường** — node group sẽ tự tạo entry đúng
loại khi bạn bấm Create. Có dòng đó thì xem loại:

```bash
aws eks describe-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole --query "accessEntry.type" --output text
```

`EC2_LINUX` là đúng. **`EC2` là sai** — dấu vết Auto Mode để lại: lúc tạo cluster với Auto
Mode bật và ô **Node IAM role** chọn `eksNodeRole`, EKS tạo entry loại `EC2` cho nó. **Tắt
Auto Mode không xoá entry đó.** Để nguyên thì kubelet trên node group bị API server từ chối
khi đăng ký, vì tên node không khớp kiểu tên mà entry loại `EC2` chấp nhận.

**Nếu ra `EC2` — sửa bằng Console:** tab **Access** → **IAM access entries** → tick dòng
`eksNodeRole` → **Delete**. Rồi **Create access entry** → IAM principal `eksNodeRole` →
Type **EC2 Linux** → **Next** → **Create**. Loại này không cần gắn access policy.

**Hoặc bằng CLI:**

```bash
aws eks delete-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole
```

```bash
aws eks create-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole --type EC2_LINUX
```

`<account-id>` lấy bằng `aws sts get-caller-identity --query Account --output text`.

### Pod `Pending` trong `kube-system` lúc này là bình thường

```bash
kubectl get pods -n kube-system
```

`coredns`, `ebs-csi-controller`, `metrics-server`… đều `Pending` với event
`no nodes available to schedule pods`. Đúng — chưa có node nào để đặt chúng. Chúng sẽ tự
chạy ở bước 4, không phải làm gì.

## 1. Node IAM role — đã có từ 8.5

Form tạo node group sẽ đòi một role, và nó **không cho tạo tại chỗ**. Role đó là
`eksNodeRole`, đã tạo ở [8.5](/blog/k8s/deploy-to-cloud/iam-roles) — trusted entity là
**EC2**, không phải EKS, vì thứ đóng vai role này là máy EC2 chứ không phải dịch vụ EKS.

Kiểm nó còn đủ ba policy:

```bash
aws iam list-attached-role-policies --role-name eksNodeRole --output table
```

Mỗi policy thiếu thì hỏng ở một chỗ khác nhau:

| Policy | Cho phép node làm gì | Thiếu nó thì |
| --- | --- | --- |
| `AmazonEKSWorkerNodePolicy` | Gọi EKS để tự nối vào cụm, đọc thông tin cluster | Node không bao giờ xuất hiện trong `kubectl get nodes` |
| `AmazonEKS_CNI_Policy` | Gắn IP từ subnet VPC vào Pod, qua ENI | Node `Ready` nhưng Pod kẹt ở `ContainerCreating` |
| `AmazonEC2ContainerRegistryReadOnly` | Kéo image từ ECR — kể cả image của các add-on AWS | Pod add-on báo `ErrImagePull` |

**Nếu thiếu dòng nào** — gắn lại, ví dụ:

```bash
aws iam attach-role-policy --role-name eksNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
```

Policy thứ hai đáng dừng lại một chút. Trên k3s, Pod nhận IP từ dải riêng `10.42.x.x` do
flannel tự quản. Trên EKS với CNI mặc định, **mỗi Pod nhận một IP thật của subnet VPC** —
nghĩa là Pod có địa chỉ ngang hàng với EC2 instance, và dải IP của subnet trở thành một
tài nguyên có hạn. Việc xin và gắn IP đó cần quyền, và `AmazonEKS_CNI_Policy` chính là
quyền ấy.

## 2. Tạo node group

Vào cluster `kub-cafe-demo` → tab **Compute** → **Add node group**.

| Trường | Giá trị | Ghi chú |
| --- | --- | --- |
| Name | `kub-cafe-demo-node-group` | Tên node group. Mọi lệnh ở dưới dùng tên này |
| Node IAM role | `eksNodeRole` | Tạo ở 8.5. Không thấy thì refresh |

**Next**, sang trang cấu hình máy:

| Trường | Giá trị | Vì sao |
| --- | --- | --- |
| AMI type | `Amazon Linux 2023 (AL2023_x86_64_STANDARD)` | Bản AWS dựng sẵn, có kubelet và containerd |
| Capacity type | `On-Demand` | `Spot` rẻ hơn nhưng bị thu hồi giữa chừng |
| Instance type | **`t3.medium`**, hoặc **`c7i-flex.large`** nếu tài khoản ở gói Free. Console có thể điền sẵn `t3.small` — xoá đi | Cần ít nhất 13 Pod mỗi node. Xem mục [Chọn loại máy](#chọn-loại-máy) |
| Disk size | `20 GiB` | Mặc định, đủ dùng |

Trang tiếp là scaling:

| Trường | Giá trị |
| --- | --- |
| Desired size | `2` |
| Minimum size | `2` |
| Maximum size | `2` |

Hai node là đủ để thấy scheduler rải Pod qua nhiều máy, mà vẫn giữ hoá đơn nhỏ.

Trang **Specify networking**: Console chọn sẵn cả bốn subnet của VPC `cafe-eks-vpc` —
**bỏ chọn hai subnet public, chỉ giữ hai subnet private** (tên có chữ `PrivateSubnet`; lý
do và cách kiểm ở [8.10](/blog/k8s/deploy-to-cloud/ec2-instances)). Và **không** bật SSH
access. Không bật SSH thì không cần tạo key pair, cũng không mở thêm cổng nào.

> **Nếu lỡ để cả bốn subnet:** node group vẫn chạy, nhưng máy nào rơi vào subnet public sẽ
> có IP công khai. Danh sách subnet của node group **không sửa được** sau khi tạo — muốn
> đúng thì xoá node group rồi tạo lại.

Xem lại rồi **Create** — trang tóm tắt phải ghi đúng loại máy bạn chọn, không phải `t3.small`.

## 3. Chờ — và biết khi nào thôi chờ

Bình thường node group chuyển `Active` sau **3–5 phút**. Theo dõi:

```bash
aws eks describe-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group --query "nodegroup.status" --output text
```

```bash
kubectl get nodes -w
```

Hai dòng `Ready` xuất hiện là xong bước này — bấm `Ctrl+C`.

**Quá 10 phút mà `kubectl get nodes` vẫn trống thì đừng chờ tiếp.** Node group sẽ đứng ở
`CREATING` thêm khoảng 10 phút nữa rồi mới báo `CREATE_FAILED`, trong khi EC2 vẫn chạy và
tính tiền. Sang [mục gỡ lỗi](#gỡ-lỗi) ngay, chạy từ kiểm 1.

## 4. Kiểm tra node và `kube-system`

```bash
kubectl get nodes -o wide
```

```
NAME                                                STATUS   ROLES    AGE   VERSION
ip-192-168-159-107.ap-southeast-2.compute.internal  Ready    <none>   2m    v1.3x.x-eks-…
ip-192-168-247-29.ap-southeast-2.compute.internal   Ready    <none>   2m    v1.3x.x-eks-…
```

Ba chi tiết đáng để ý:

- **Tên node là tên DNS nội bộ của EC2**, không phải tên bạn đặt. Nhìn tên là biết ngay
  mình đang ở EKS chứ không phải k3s.
- **`ROLES` là `<none>`.** Không có node nào mang nhãn control plane, vì control plane
  không nằm trong cụm theo nghĩa bạn nhìn thấy được. AWS giữ nó ở chỗ khác.
- **IP thuộc dải của VPC**, đúng như phần CNI ở trên.

Kiểm loại máy và sức chứa của từng node:

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,TYPE:.metadata.labels.node\.kubernetes\.io/instance-type,MAXPODS:.status.allocatable.pods'
```

**Đúng:** `MAXPODS` từ `13` trở lên — `17` với `t3.medium`, `29` với `c7i-flex.large`.
**Nếu ra `11` hoặc thấp hơn:** node group đã tạo nhầm loại máy. Xoá node group rồi tạo lại theo bước 2 — lệnh xoá ở kiểm 8 của mục gỡ lỗi.
Để nguyên thì tới 8.14 hai frontend sẽ không có chỗ chạy.

Giờ các Pod `Pending` ở bước 0 phải chạy hết:

```bash
kubectl get pods -n kube-system -o wide
```

| Pod | Phải thấy |
| --- | --- |
| `aws-node`, `kube-proxy` | Mỗi node một cái, `Running` |
| `coredns` | `1/1 Running` |
| `ebs-csi-node`, `efs-csi-node`, `eks-pod-identity-agent` | Mỗi node một cái — nếu đã chọn các add-on này |
| `ebs-csi-controller` | **`6/6 Running`** |
| `metrics-server` | `1/1` — có thể `0/1` trong một phút đầu, đang khởi động |

Dòng dễ lệch nhất là `ebs-csi-controller`. Nó chỉ bắt đầu chạy khi có node, nên đây là lần
đầu bạn biết driver EBS có quyền IAM hay không. **Nếu nó `CrashLoopBackOff`**, làm kiểm 9 ở
mục gỡ lỗi — sửa ngay ở đây rẻ hơn nhiều so với phát hiện ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster),
khi PVC của Mongo kẹt `Pending` mà không nói lý do.

## 5. Thử đặt một Pod lên đó

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

**PowerShell:**

```powershell
kubectl scale deployment hello --replicas=4; if ($?) { kubectl get pods -o wide }
```

Đây là thứ **không** quan sát được trên cụm một node suốt bảy section trước: cùng một
Deployment, các Pod nằm trên các máy vật lý khác nhau, và Service vẫn gom chúng lại thành
một địa chỉ.

Dọn:

```bash
kubectl delete deployment hello
```

**Tới đây là xong note.** Đọc tiếp mục [Tiền](#tiền), rồi sang
[8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster). Mục gỡ lỗi ngay dưới chỉ
dành cho khi một bước ở trên không ra đúng kết quả.

## Chọn loại máy

Số Pod mỗi node bị chặn bởi **số IP mà ENI của instance đó gắn được**, chứ không phải bởi
CPU hay RAM:

```
Pod tối đa = số ENI × (số IP mỗi ENI − 1) + 2
```

Giờ đếm số Pod mà Cafe System thật sự cần trên hai node:

| Nhóm | Pod | Số |
| --- | --- | --- |
| DaemonSet — mỗi node một bản | `aws-node`, `kube-proxy`, `ebs-csi-node`, `efs-csi-node`, `eks-pod-identity-agent` | 5 × 2 = **10** |
| Add-on dạng Deployment — mỗi cái hai bản | `coredns`, `ebs-csi-controller`, `efs-csi-controller`, `metrics-server` | **8** |
| App ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) | mongo, auth, menu, order, shop-web, admin-web | **6** |
| `menu-api` lên hai bản ở [8.18](/blog/k8s/deploy-to-cloud/using-the-efs-volume) | | **+1** |
| **Tổng** | | **25** |

25 Pod trên hai node: **mỗi node phải chứa được ít nhất 13 Pod.** Hệ thống đã chiếm 18 chỗ
trước khi app có Pod nào, nên máy nhỏ hơn sẽ để hai frontend `Pending` — chúng được apply
sau cùng. Triệu chứng là `EXTERNAL-IP` có tên miền đàng hoàng, mà trình duyệt không vào
được: load balancer không có Pod nào phía sau.

Điều kiện thứ hai: máy phải là **x86**. Image `kub-cafe-*` ở
[8.3](/blog/k8s/deploy-to-cloud/preparing-the-project) build cho `linux/amd64`; máy ARM
(Graviton, tên có chữ `g` như `t4g`) sẽ kéo image về rồi báo `exec format error`.

| Loại máy | Kiến trúc | RAM | Pod tối đa | Gói Free | Dùng được? |
| --- | --- | --- | --- | --- | --- |
| `t3.micro`, `t8i.micro` | x86 | 1 GiB | 4 | Có | **Không** — thiếu chỗ |
| `t3.small`, `t8i.small` | x86 | 2 GiB | 11 | Có | **Không** — thiếu chỗ |
| `t4g.micro`, `t4g.small` | ARM | 1–2 GiB | 4–11 | Có | **Không** — ARM, và thiếu chỗ |
| **`c7i-flex.large`** | x86 | 4 GiB | **29** | **Có** | **Có — chọn cái này nếu tài khoản ở gói Free** |
| `m7i-flex.large` | x86 | 8 GiB | 29 | Có | Có — RAM thừa, đắt hơn |
| **`t3.medium`** | x86 | 4 GiB | **17** | **Không** | **Có — chọn cái này nếu tài khoản trả phí** |
| `t3a.medium` | x86 | 4 GiB | 17 | Không | Có — chip AMD, rẻ hơn `t3.medium` một chút |
| `t3.large` | x86 | 8 GiB | 35 | Không | Có — dư nhiều |

### Tài khoản gói Free không chạy được `t3.medium`

Tài khoản AWS tạo mới ở **gói Free** chỉ được dựng những loại máy trong danh sách Free
Tier. Chọn `t3.medium` thì node group không dựng được máy nào, và lý do nằm ở `health`:

```
Could not launch On-Demand Instances. InvalidParameterCombination - The specified
instance type is not eligible for Free Tier.
```

Xem tài khoản của bạn được dùng loại nào — cột `enis` và `ipsPerEni` đủ để tính số Pod
bằng công thức ở trên:

```bash
aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true --query "InstanceTypes[].{type:InstanceType,arch:ProcessorInfo.SupportedArchitectures[0],memMiB:MemoryInfo.SizeInMiB,enis:NetworkInfo.MaximumNetworkInterfaces,ipsPerEni:NetworkInfo.Ipv4AddressesPerInterface}" --output table
```

Chọn dòng nào `arch` là `x86_64` và tính ra **từ 13 Pod trở lên** — thường là
`c7i-flex.large`. Danh sách này AWS thay đổi theo thời gian và theo region, nên tin lệnh
hơn tin bảng ở trên.

"Có trong gói Free" nghĩa là **được phép dùng**, không phải miễn phí: tiền chạy máy trừ vào
credit của tài khoản. `c7i-flex.large` khoảng $0.09–0.11 mỗi giờ mỗi máy — vẫn phải scale về
0 khi không học, như mục [Tiền](#tiền).

### Không đổi được sau khi tạo

Instance type của node group bị khoá lúc tạo. Chọn sai là phải xoá node group rồi tạo lại
— hai lệnh xoá ở kiểm 8 của mục gỡ lỗi.

## Gỡ lỗi

Chạy lần lượt từ kiểm 1. Mỗi kiểm có lệnh, kết quả **đúng**, và việc cần làm **nếu không
đúng**. Gặp kiểm nào sai thì sửa xong kiểm đó rồi mới đi tiếp — các kiểm sau phụ thuộc kiểm
trước.

`<account-id>` trong các lệnh dưới lấy bằng:

```bash
aws sts get-caller-identity --query Account --output text
```

### Kiểm 1 — Auto Mode đã tắt

```bash
aws eks describe-cluster --name kub-cafe-demo --query "cluster.computeConfig.enabled" --output text
```

**Đúng:** `False` hoặc `None`.

**Nếu ra `True`:** tắt Auto Mode theo [bước 0](#auto-mode-phải-đang-tắt), chờ cụm `ACTIVE`,
rồi làm tiếp kiểm 2 — tắt Auto Mode không tự sửa access entry.

### Kiểm 2 — Access entry của `eksNodeRole` là `EC2_LINUX`

```bash
aws eks describe-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole --query "accessEntry.type" --output text
```

**Đúng:** `EC2_LINUX`.

**Nếu ra `EC2`:** xoá entry rồi tạo lại đúng loại — Console hoặc CLI như ở
[bước 0](#access-entry-của-eksnoderole-phải-đúng-loại):

```bash
aws eks delete-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole
```

```bash
aws eks create-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::<account-id>:role/eksNodeRole --type EC2_LINUX
```

Không cần xoá node group: kubelet trên máy tự thử đăng ký lại, node thường `Ready` sau
1–3 phút. Sang kiểm 6 để theo dõi.

**Nếu báo `ResourceNotFoundException`:** chưa có entry. Node group đang `CREATING` thì
bình thường — nó sẽ tự tạo. Node group đã `CREATE_FAILED` mà vẫn không có entry thì tạo bằng
lệnh `create-access-entry` ở trên.

### Kiểm 3 — Node role đủ ba policy

```bash
aws iam list-attached-role-policies --role-name eksNodeRole --query "AttachedPolicies[].PolicyName" --output text
```

**Đúng:** có đủ `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`,
`AmazonEC2ContainerRegistryReadOnly`.

**Nếu thiếu cái nào:** gắn đúng cái đó —

```bash
aws iam attach-role-policy --role-name eksNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
```

```bash
aws iam attach-role-policy --role-name eksNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
```

```bash
aws iam attach-role-policy --role-name eksNodeRole --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

Thiếu `AmazonEKSWorkerNodePolicy` là node không bao giờ join; thiếu hai cái sau thì node
join được nhưng Pod hỏng — bảng ở [bước 1](#1-node-iam-role--đã-có-từ-85).

### Kiểm 4 — EC2 đã được tạo và đang chạy

```bash
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=kub-cafe-demo" --query "Reservations[].Instances[].{id:InstanceId,state:State.Name,subnet:SubnetId}" --output table
```

**Đúng:** hai dòng `running`.

**Nếu bảng trống:** node group không dựng được máy nào. Đọc lý do AWS ghi:

```bash
aws eks describe-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group --query "nodegroup.{status:status,health:health.issues}" --output json
```

Lý do hay gặp:

- **`not eligible for Free Tier`** — tài khoản ở gói Free mà chọn `t3.medium`. Tạo lại với
  `c7i-flex.large`, xem mục [Chọn loại máy](#chọn-loại-máy).
- Hết loại máy đó ở AZ, hoặc chạm giới hạn số instance của tài khoản.
Sửa theo thông báo, rồi xoá và tạo lại node group theo kiểm 8.

### Kiểm 5 — Node có đường ra internet

Node ở subnet private gọi API server và kéo image qua NAT Gateway — xem
[8.10](/blog/k8s/deploy-to-cloud/ec2-instances).

```bash
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query "NatGateways[].{id:NatGatewayId,subnet:SubnetId}" --output table
```

**Đúng:** ít nhất một dòng.

**Nếu trống:** NAT Gateway đã bị xoá tay, hoặc stack VPC đã bị dựng lại. Không có cách sửa
nhỏ — mở stack VPC ở CloudFormation, xem tab **Events** có lỗi gì; nếu stack đã hỏng thì
xoá node group, xoá cluster, dựng lại từ [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets).

### Kiểm 6 — Node đã join và `Ready`

```bash
kubectl get nodes
```

**Đúng:** hai dòng `Ready`.

**Nếu trống:** quay lại kiểm 2 và kiểm 5 — đó là hai nguyên nhân gần như duy nhất khi EC2
đã chạy. Sửa xong thì theo dõi:

```bash
kubectl get nodes -w
```

**Nếu có node nhưng `NotReady` quá 2 phút:** xem lý do trên node —

```bash
kubectl describe node <node-name>
```

Tìm phần `Conditions`. Có dòng `cni plugin not initialized` là cụm thiếu CNI — sang kiểm 7.

### Kiểm 7 — Đủ ba add-on nền

```bash
aws eks list-addons --cluster-name kub-cafe-demo --output text
```

**Đúng:** có `vpc-cni`, `coredns`, `kube-proxy` — trên Console là **Amazon VPC CNI**,
**CoreDNS**, **kube-proxy**.

**Nếu thiếu cái nào:** cài đúng cái đó — node chuyển `Ready` sau khoảng một phút, ngay khi
`aws-node` chạy trên nó.

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name vpc-cni
```

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name coredns
```

```bash
aws eks create-addon --cluster-name kub-cafe-demo --addon-name kube-proxy
```

Thường thiếu vì bỏ tick ở Step 4 của
[8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks), hoặc vì cụm từng bật Auto Mode
— Auto Mode dựng networking riêng cho node của nó và không cài add-on cho node group.

### Kiểm 8 — Node group `ACTIVE`

```bash
aws eks describe-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group --query "nodegroup.{status:status,health:health.issues}" --output json
```

**Đúng:** `"status": "ACTIVE"`, `health` rỗng.

**Nếu `CREATE_FAILED` và kiểm 6 vẫn trống:** trạng thái này là cuối, AWS không tự thử lại.
Sửa các kiểm trên cho hết sai, rồi xoá và tạo lại node group ở bước 2. Xoá trên Console: tab
**Compute** → chọn node group → **Delete**. Hoặc:

```bash
aws eks delete-nodegroup --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group
```

```bash
aws eks wait nodegroup-deleted --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group
```

**Nếu `CREATE_FAILED` nhưng kiểm 6 ra hai node `Ready`:** xảy ra khi bạn sửa kiểm 2 sau khi
AWS đã hết giờ chờ. Node và Pod chạy bình thường — **dùng tiếp được**. Nhưng node group ở
trạng thái này thường không nhận cập nhật, nên lệnh scale về 0 ở mục [Tiền](#tiền) sẽ bị từ
chối. Lúc tiện — ví dụ trước khi nghỉ qua đêm — xoá và tạo lại bằng hai lệnh trên.

### Kiểm 9 — Driver EBS có quyền

```bash
kubectl get pods -n kube-system -l app=ebs-csi-controller
```

**Đúng:** hai Pod `6/6 Running`.

**Nếu `CrashLoopBackOff`:** xem log để chắc là thiếu quyền —

```bash
kubectl logs -n kube-system deploy/ebs-csi-controller -c ebs-plugin --tail=5
```

Có dòng `no EC2 IMDS role found … context deadline exceeded` là đúng nguyên nhân: driver
chưa được gán role, và Pod không mượn được role của node. Cấp quyền bằng Pod Identity theo
mục *Cấp quyền bằng Pod Identity* ở [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), rồi
khởi động lại controller:

```bash
kubectl rollout restart deployment ebs-csi-controller -n kube-system
```

Kiểm lại add-on:

```bash
aws eks describe-addon --cluster-name kub-cafe-demo --addon-name aws-ebs-csi-driver --query "addon.status" --output text
```

Phải ra `ACTIVE`, không phải `DEGRADED`.

**Nếu không có Pod `ebs-csi-controller` nào:** add-on chưa cài. Cài ở
[8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster), kèm Pod Identity.

### Kiểm 10 — Node còn chỗ cho Pod

Kiểm này thường cần tới ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster),
khi Pod của app đứng `Pending` dù node vẫn `Ready`.

```bash
kubectl get pods -A --field-selector=status.phase=Pending
```

**Đúng:** không có dòng nào.

**Nếu có:** xem lý do của một Pod trong đó —

```bash
kubectl describe pod <pod-name> -n <namespace>
```

Phần `Events` ghi `0/2 nodes are available: 2 Too many pods` là node đã hết chỗ. Kiểm sức
chứa:

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,TYPE:.metadata.labels.node\.kubernetes\.io/instance-type,MAXPODS:.status.allocatable.pods'
```

`MAXPODS` từ `11` trở xuống là đúng nguyên nhân — xem mục
[Chọn loại máy](#chọn-loại-máy). Instance type không đổi tại chỗ được: xoá node group bằng
hai lệnh ở kiểm 8, rồi tạo lại ở bước 2 với `t3.medium` hoặc `c7i-flex.large`. Dữ liệu
Mongo vẫn còn vì nằm trên đĩa EBS, và hai load balancer giữ nguyên tên miền.

Muốn chạy được ngay trong lúc chưa tạo lại, gỡ `metrics-server` — section này không dùng
nó, và nó trả lại 2 chỗ:

```bash
aws eks delete-addon --cluster-name kub-cafe-demo --addon-name metrics-server
```

## Tiền

Từ giờ hoá đơn có ba dòng chạy song song:

| Thứ | Tính theo |
| --- | --- |
| Control plane EKS | Giờ, cố định |
| **2 × EC2** | Giờ, theo từng instance — khoảng $0.05 mỗi máy với `t3.medium`, $0.09–0.11 với `c7i-flex.large` |
| NAT Gateway của `cafe-eks-vpc` | Giờ, cộng lưu lượng |

Tạm dừng phần EC2 khi không học, mà không phải xoá cụm:

```bash
aws eks update-nodegroup-config --cluster-name kub-cafe-demo --nodegroup-name kub-cafe-demo-node-group --scaling-config minSize=0,maxSize=2,desiredSize=0
```

Node biến mất, Pod về `Pending`, và EC2 ngừng tính tiền. Mở lại bằng chính lệnh đó với
`minSize=2,maxSize=2,desiredSize=2`.

**Nếu lệnh bị từ chối** vì node group đang `CREATE_FAILED` — xem kiểm 8: xoá node group, lần
sau tạo lại.

Control plane và NAT Gateway thì **vẫn tính tiền**. Muốn dừng hẳn thì phải xoá cluster và
xoá stack `cafe-eks-vpc`.

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

Cái k3d giấu đi: IAM role cho node, access entry và loại của nó, ENI và giới hạn số Pod
theo loại máy, subnet public/private, và chuyện node phải có đường ra internet để gọi API
server. Cái nó giữ lại: **scheduler có nhiều hơn một chỗ để đặt Pod** — và đó mới là thứ
bạn cần cho các note sau.

## Self-check

- [ ] Nói được node group gồm những gì, và AWS dựng hộ cái gì
- [ ] Phân biệt `eksClusterRole` với `eksNodeRole` — ai đóng vai nào, trusted entity khác nhau ra sao
- [ ] Kể ba policy của node role và triệu chứng khi thiếu từng cái
- [ ] Phân biệt access entry loại `EC2_LINUX` với `EC2`, và biết vì sao Auto Mode để lại loại sai
- [ ] Biết sau bao lâu thì thôi chờ node group, và kiểm gì đầu tiên
- [ ] Giải thích được vì sao số Pod tối đa phụ thuộc loại instance, không phụ thuộc RAM
- [ ] Tính được Cafe System cần bao nhiêu Pod mỗi node, và chọn loại máy theo gói tài khoản
- [ ] Nói được vì sao cột `ROLES` của mọi node đều là `<none>`
- [ ] Biết cách tạm dừng tính tiền EC2 mà không xoá cụm — và khi nào cách đó không dùng được

## Open questions

- Pod nhận IP thật của subnet VPC — vậy một subnet `/24` chứa được bao nhiêu Pod?
- `Spot` rẻ hơn nhiều. Loại workload nào chịu được việc node bị thu hồi giữa chừng?
- Node group scale 0 rồi bật lại — Pod có quay về đúng node cũ không, và có quan trọng không?
- Vì sao Pod trên node group không tới được dịch vụ metadata của EC2, trong khi chính node thì tới được?
