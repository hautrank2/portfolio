---
title: "8.10 EC2 — máy ảo làm worker node"
description: "Mỗi dòng trong kubectl get nodes là một máy ảo đang tính tiền — AMI, instance type, security group."
status: growing
created: 2026-09-29
updated: 2026-09-30
tags: [k8s, aws, ec2, ami, security-group, subnet]
---

> Tiếp [8.9](/blog/k8s/deploy-to-cloud/elastic-load-balancing). Đây là note "giải thích
> trước" cuối cùng. Note sau tạo cluster, và EC2 thật sự ra đời ở
> [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

Control plane của EKS không chạy Pod nào của bạn. Mọi container — `menu-api`, Mongo, driver
EBS — đều chạy trên **EC2 instance**, và mỗi dòng trong `kubectl get nodes` là một máy ảo
đang tính tiền theo giây.

Bạn sẽ không bấm tạo từng máy. Bạn khai một **node group**, và AWS dựng máy từ đó. Note này
giải thích bốn quyết định nằm trong cái form ấy — để khi điền ở 8.13, mỗi ô đều có lý do.

> **Note này để đọc, chưa phải để chạy.** Chưa có cluster, chưa có node. Chỉ một lệnh chạy
> được ngay — tìm hai subnet private, vì VPC đã có từ 8.6. Các lệnh cần node được gom ở mục
> **"Sau 8.13"** cuối note.

## Node group không phải là máy — nó là thứ sinh ra máy

```
Node group (EKS)
   │  bạn khai: loại máy, số lượng, subnet, IAM role
   ▼
Launch template ── "máy mới thì dựng thế này"
   │
   ▼
Auto Scaling Group ── "luôn giữ đủ N máy"
   │
   ▼
EC2 instance × N ── mỗi cái tự join vào cụm
```

Tầng **Auto Scaling Group** có một hệ quả đáng biết trước: nó **giữ số máy cố định**. Bạn
vào EC2 Console bấm *Terminate* một node để tiết kiệm tiền, vài phút sau một máy mới mọc
lên thay chỗ. Muốn dừng tính tiền thì phải sửa **số lượng** của node group — lệnh ở
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes), mục **Tiền**.

Đó cũng là tinh thần của Deployment ở tầng Kubernetes: bạn không xoá Pod để giảm bản, bạn
sửa `replicas`.

## 1. AMI — máy ra đời đã có gì

**AMI** là ảnh đĩa khởi động của máy. Node group dùng **EKS-optimized AMI** do AWS dựng,
với Amazon Linux 2023:

| Có sẵn | Để làm gì |
| --- | --- |
| `containerd` | Chạy container |
| `kubelet` | Nhận lệnh từ control plane, báo trạng thái node |
| `nodeadm` | Lúc khởi động, đọc thông tin cluster rồi cấu hình kubelet để join |

Đây là hai bước trong bảy bước ở [8.1](/blog/k8s/deploy-to-cloud/deployment-options) mà
bạn không phải làm: **bước 3**, cài phần mềm K8s lên máy, do AMI gói sẵn; và **bước 5**, nối
node vào cụm, do `nodeadm` làm lúc máy khởi động.

Phiên bản `kubelet` trong AMI đi theo phiên bản Kubernetes của cluster. Nâng cấp cluster
thì node group cũng phải nâng theo — AWS có nút **Update** cho việc đó.

## 2. Instance type — giới hạn không nằm ở RAM

Trực giác nói máy càng nhiều RAM thì chứa càng nhiều Pod. Trên EKS, trần thấp hơn thường
đến từ **số IP**.

Với CNI mặc định, mỗi Pod nhận **một IP thật của subnet**, gắn qua card mạng (ENI) của máy.
Mỗi loại máy có số ENI và số IP mỗi ENI cố định, nên số Pod tối đa là:

```
số ENI × (số IP mỗi ENI − 1) + 2
```

| Instance | vCPU | RAM | ENI × IP | Pod tối đa |
| --- | --- | --- | --- | --- |
| `t3.micro` | 2 | 1 GiB | 2 × 2 | **4** |
| `t3.small` | 2 | 2 GiB | 3 × 4 | **11** |
| `t3.medium` | 2 | 4 GiB | 3 × 6 | **17** |

Trừ một IP mỗi ENI vì IP chính của card thuộc về máy, không cho Pod. Cộng hai vì `aws-node`
và `kube-proxy` dùng thẳng mạng của máy, không tốn IP riêng.

Các Pod hệ thống của section này — CNI, `kube-proxy`, driver CSI, CoreDNS — đã chiếm
**18 chỗ** trên hai node trước khi app có Pod nào. `t3.micro` không đủ cho chính chúng;
`t3.small` còn lại 4 chỗ cho 6 Pod app, nên hai frontend sẽ `Pending`. Đó là lý do 8.13
đòi máy chứa **từ 13 Pod mỗi node** — `t3.medium`, hoặc `c7i-flex.large` nếu tài khoản ở
gói Free. Bảng đếm từng Pod và danh sách loại máy dùng được nằm ở
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

> Dòng `t3` là loại **burstable**: CPU chạy ở mức nền, được "vay" lên cao trong lúc ngắn.
> Mặc định nó ở chế độ `unlimited` — vay quá nhiều trong thời gian dài thì có phí thêm.
> Lab của section này không đủ nặng để chạm tới, nhưng đáng biết con số trên bảng giá không
> phải lúc nào cũng là trần.

## 3. Subnet — chỉ hai subnet private

Đây là ô dễ điền sai nhất, vì **Console chọn sẵn cả bốn subnet** của VPC.

Để nguyên thì node group rải máy qua cả subnet public lẫn private. Subnet public của
template tự cấp **IP công khai** cho máy mới — node ở đó đi ra internet thẳng qua Internet
Gateway, và phơi ra ngoài, trái với sơ đồ ở [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets).

Ở 8.13, **bỏ chọn hai subnet public, chỉ giữ hai subnet private.** Nhận ra chúng bằng tên
template đặt:

```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values=<vpc-id> --query "Subnets[].{id:SubnetId,az:AvailabilityZone,name:Tags[?Key=='Name']|[0].Value,publicIp:MapPublicIpOnLaunch}" --output table
```

Hai dòng có tên chứa `PrivateSubnet` là hai dòng cần. Muốn chắc chắn hơn tên, mở subnet
trên Console, tab **Route table**: dòng `0.0.0.0/0` trỏ tới `nat-…` là private, trỏ tới
`igw-…` là public.

### Node private vẫn phải đi ra ngoài

Node ở private không nhận kết nối từ internet, nhưng nó **phải gọi ra** — và mọi lời gọi đó
đi qua NAT Gateway:

| Ai gọi | Gọi tới | Để làm gì |
| --- | --- | --- |
| `kubelet` | API server của EKS | Join vào cụm, nhận Pod, báo trạng thái |
| `containerd` | Docker Hub | Kéo image `kub-cafe-*` — mỗi lần Pod khởi động, vì `imagePullPolicy: Always` |
| `aws-node` (CNI) | API EC2 | Xin IP, gắn ENI cho Pod |
| Driver EBS, EFS | API EC2, EFS | Tạo và gắn volume |

App của bạn không gọi internet, Mongo nằm ngay trong cụm — nhưng **hạ tầng dưới app** thì
có. Đó là lý do node private thiếu NAT thì không bao giờ join được cụm, như bảng gỡ lỗi ở
8.13 ghi.

## 4. Security group — ai được nói chuyện với node

Node group không bật SSH thì bạn **không phải tạo security group nào**. Lúc tạo cluster ở
8.11, EKS tự tạo một cái gọi là **cluster security group** — tên dạng
`eks-cluster-sg-kub-cafe-demo-…` — và gắn vào cả control plane lẫn mọi node.

Luật của nó đơn giản: **mọi thứ mang security group này được nói chuyện với nhau**, theo
mọi cổng. Node gọi node, Pod gọi Pod ở node khác, control plane gọi `kubelet` — đều qua đó.

Ngoài ra còn hai luật được thêm từ bên ngoài, từ hai note trước:

| Luật | Ai thêm | Cho phép |
| --- | --- | --- |
| Cổng `2049` từ CIDR của VPC | Bạn, ở [8.7](/blog/k8s/deploy-to-cloud/efs-file-system) | Node gọi tới mount target EFS — luật nằm ở security group `eks-efs` |
| Dải NodePort từ load balancer | Controller, ở [8.9](/blog/k8s/deploy-to-cloud/elastic-load-balancing) | Load balancer gọi vào node |

Khi đọc security group mà thấy một luật mình không nhớ đã tạo, gần như chắc chắn nó thuộc
dòng thứ hai.

## Chi phí

| Khoản | Tính theo |
| --- | --- |
| Instance | Theo giây, mỗi máy khoảng $0.05/giờ với `t3.medium`, $0.09–0.11 với `c7i-flex.large` |
| Ổ gốc `20 GiB` mỗi máy | Là một đĩa EBS — xem [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage). Xoá cùng máy |
| IP công khai | Không có — node ở private. Đây là một khoản nhỏ mà chọn đúng subnet giúp bạn tránh |

Hai máy, chạy cả ngày, khoảng hai đô rưỡi với `t3.medium`, gần năm đô với `c7i-flex.large`. Cộng dồn cùng control plane và NAT
Gateway thì thành con số ở [8.4](/blog/k8s/deploy-to-cloud/services-and-cost).

## Sau 8.13 — nhìn tận mắt

Khi node group đã chạy và `kubectl get nodes` ra hai node `Ready`, quay lại đây.

Id của cluster security group — mở nó trên Console để đọc các luật ở bảng trên:

```bash
aws eks describe-cluster --name kub-cafe-demo --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text
```

Node nằm ở subnet nào, có IP công khai không — cột `publicIp` phải trống:

```bash
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=kub-cafe-demo" --query "Reservations[].Instances[].{id:InstanceId,type:InstanceType,subnet:SubnetId,privateIp:PrivateIpAddress,publicIp:PublicIpAddress}" --output table
```

Số Pod tối đa mà kubelet nhận — phải khớp bảng instance type ở trên:

```bash
kubectl get nodes -o custom-columns='NODE:.metadata.name,TYPE:.metadata.labels.node\.kubernetes\.io/instance-type,MAXPODS:.status.allocatable.pods'
```

### Không SSH vẫn vào được node

Không có cổng 22, không có key pair — nhưng vẫn có lúc muốn nhìn vào bên trong máy.
Kubernetes cho một đường khác:

```bash
kubectl debug node/<node-name> -it --image=busybox:1.36
```

Lệnh này đặt một Pod lên đúng node đó, với toàn bộ filesystem của máy mount ở `/host`. Sau
8.14 và 8.18, xem đĩa EBS của Mongo và EFS của ảnh món đang mount ở đâu:

```bash
mount | grep -E "nvme|nfs4"
```

Gõ lệnh trên **bên trong** phiên debug. Xong thì `exit`, rồi xoá Pod debug mà `kubectl` in
tên ra lúc tạo.

## Nếu chỉ đọc chứ không bật EKS

Trên k3d, mỗi node là một **container**:

```bash
docker ps --filter name=k3d-lab --format "table {{.Names}}\t{{.Status}}"
```

`k3d-lab-agent-0`, `k3d-lab-agent-1` là hai "EC2" của bạn. Không có AMI (image `rancher/k3s`
đóng vai đó), không có instance type, không có giới hạn IP theo ENI, không có security
group.

`kubectl debug node/…` thì chạy y hệt — lệnh đó là của Kubernetes, không phải của AWS.

## Self-check

- [ ] Vẽ được chuỗi node group → launch template → Auto Scaling Group → EC2
- [ ] Giải thích vì sao terminate tay một node không giúp giảm tiền
- [ ] Nói được AMI của EKS có sẵn những gì, và thay bạn làm bước nào
- [ ] Tính được số Pod tối đa của một instance từ số ENI và số IP
- [ ] Biết chọn subnet nào cho node group, và nhận ra subnet private bằng hai cách
- [ ] Kể được những lời gọi ra ngoài mà node private vẫn cần, dù app không gọi internet
- [ ] Biết cluster security group cho phép gì, và luật lạ trong đó thường từ đâu ra

## Open questions

- Node group rải máy qua hai AZ thế nào — đều nhau, hay ngẫu nhiên? Và nếu một AZ hết loại
  máy đó thì sao?
- Số Pod tối đa tính theo IP. Có cách nào vượt qua giới hạn này mà không đổi loại máy?
- `kubectl debug node` cho quyền đọc cả filesystem của máy. Vậy ai trong cụm được phép chạy
  lệnh đó?
