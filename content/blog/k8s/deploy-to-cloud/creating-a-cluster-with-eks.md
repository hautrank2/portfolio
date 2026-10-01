---
title: "8.11 EKS — tạo cluster"
description: "Dịch vụ đắt nhất nên dựng cuối cùng. Điền form cluster từ những gì sáu note trước đã tạo — và chọn đúng danh tính trước khi bấm Create."
status: growing
created: 2026-09-25
updated: 2026-09-30
tags: [k8s, aws, eks, control-plane, auto-mode]
---

Dịch vụ cuối cùng được tạo, và là **dịch vụ đắt nhất trong section**. Đó chính là lý do nó
đứng ở đây chứ không ở đầu: control plane tính tiền theo giờ ngay khi `Active`, nên mọi thứ
có thể chuẩn bị trước thì đã chuẩn bị xong ở sáu note trước.

Note này là **bước 4 của cột phải** trong
[note 8.1](/blog/k8s/deploy-to-cloud/deployment-options) — dựng control plane. Trên EKS nó
gói lại thành một form, và form đó chỉ là chỗ **chọn lại** những gì đã có.

> **Từ lúc bấm Create, đồng hồ tính tiền chạy** — khoảng `$0.10` mỗi giờ cho control plane,
> cộng NAT Gateway đã chạy từ [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets). Nếu chưa đặt
> cảnh báo ngân sách, quay lại [note 8.4](/blog/k8s/deploy-to-cloud/services-and-cost) làm
> trước — mất hai phút.

Giao diện AWS đổi khá thường xuyên: tên nút, thứ tự bước, chỗ đặt link có thể khác lúc bạn
đọc. **Những thứ cần điền thì không đổi** — nên hãy bám vào cột "là gì" chứ đừng bám vào
vị trí nút.

## Phải có sẵn ba thứ

| | Tạo ở note | Thiếu thì |
| --- | --- | --- |
| **`eksClusterRole`** | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) | Form không cho đi qua bước đầu |
| **VPC ≥ 2 subnet ở 2 AZ** | [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) | Danh sách VPC trống, hoặc bị từ chối ở bước cuối |
| **EFS đã tạo** | [8.7](/blog/k8s/deploy-to-cloud/efs-file-system) | Không chặn tạo cluster, nhưng sẽ chặn ở [8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume) |

Nếu bạn nhảy thẳng vào note này, dừng lại và làm ba note kia trước. Chúng **miễn phí hoặc
gần miễn phí**, còn note này thì không — và đó là toàn bộ lý do thứ tự trong section được
sắp như vậy.

## Nếu Console không hiện thứ bạn đang tìm

Đọc mục này trước, vì nó sẽ tiết kiệm cho bạn khá nhiều thời gian ở các bước dưới.

Nguyên nhân phổ biến nhất của *"tôi không thấy nút đó ở đâu"* là **cửa sổ browser đang
hẹp**. Console gập hết thanh header trên cùng — kể cả menu tài khoản và ô chọn region — và
dồn các panel bên phải xuống cuối trang. Chúng vẫn tồn tại, chỉ là không nằm ở chỗ mọi
hướng dẫn nói là chúng nằm.

Phóng cửa sổ full màn hình, `Ctrl` + `-` về 80%, và **kéo xuống hết trang**.

Không cần chờ tìm được nút, vào thẳng bằng URL:

| Cần gì | URL |
| --- | --- |
| Access key & MFA của **root** | `console.aws.amazon.com/iam/home#/security_credentials` |
| **Account ID** (dãy 12 số) và alias | `console.aws.amazon.com/billing/home#/account` |
| Danh sách **IAM user** | `console.aws.amazon.com/iam/home#/users` |
| Một user cụ thể | `…/iam/home#/users/details/<tên-user>?section=security_credentials` |

Một chi tiết đáng nhớ về trang user: mục **Console sign-in** và mục **Access keys** chỉ
xuất hiện **bên trong trang chi tiết của một user**. Chúng không có ở IAM Dashboard, cũng
không có ở danh sách Users. Và phải bấm vào **chính tên user** — bấm vào ô checkbox bên
cạnh thì vẫn ở lại danh sách, không có tab nào hiện ra.

## Mở form

Console AWS → dịch vụ **EKS** → **Create cluster**.

**Ghi lại region đang chọn trước khi làm gì khác.** Mọi thứ bạn sắp tạo — cluster, VPC, NAT
Gateway — đều gắn chặt vào region đó, và Console chỉ hiện những gì thuộc region đang xem.
Đây là cách phổ biến nhất để quên dọn và trả tiền cho thứ mình tưởng đã xoá.

Nếu không thấy ô chọn region vì header bị gập, đọc từ **thanh địa chỉ** — cách này luôn
thấy được:

```
https://ap-southeast-2.console.aws.amazon.com/eks/home#/clusters
        ^^^^^^^^^^^^^^
```

Đoạn ngay trước `.console.aws.amazon.com` chính là region code, và đó đúng là dạng CLI cần.

Trang đầu hỏi cách cấu hình. Chọn **Custom configuration** chứ không phải
**Quick configuration**. Chế độ nhanh dựng hộ bạn gần hết, và đó chính là thứ cần tránh ở
đây — mục đích của section này là **nhìn thấy cột phải**, không phải là đi nhanh.

Từ đây form có năm bước:

```
Step 1  Configure cluster        tên, hai IAM role, Auto Mode
Step 2  Specify networking       VPC, subnet, security group, endpoint
Step 3  Configure observability  để mặc định
Step 4  Select add-ons           CNI, DNS, kube-proxy
Step 5  Review and create
```

## Step 1: Configure cluster

| Ô | Giá trị | Đã tạo ở |
| --- | --- | --- |
| **Name** | `kub-cafe-demo` | — |
| **Cluster IAM role** | `eksClusterRole` | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |
| **Node IAM role** | Bỏ trống — xem ngay dưới | [8.5](/blog/k8s/deploy-to-cloud/iam-roles) |

Không thấy `eksClusterRole` trong danh sách thì refresh trang — form đọc danh sách role lúc
tải, không đọc lại theo thời gian thực.

### Auto Mode — tắt, và vì sao ô Node IAM role biến mất

Ngay dưới ô Cluster IAM role là công tắc **EKS Auto Mode**, và Console thường **bật sẵn**.
Ô **Node IAM role** nằm trong phần đó: nó chỉ hiện, và chỉ bắt buộc, khi Auto Mode bật —
vì lúc đó AWS tự tạo node và cần biết gắn role nào cho chúng.

| | Auto Mode bật | Auto Mode tắt |
| --- | --- | --- |
| Node | AWS tự tạo, tự thay, bạn không thấy node group | Bạn tự tạo node group ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) |
| Ô **Node IAM role** ở bước này | **Bắt buộc** | Không có |
| CNI, kube-proxy, CoreDNS | Dựng sẵn bên trong, **không** có addon nào để xem | Bạn chọn ở Step 4 |
| `type: LoadBalancer` | Một bộ điều khiển riêng của AWS dựng **NLB** | In-tree cloud provider dựng **Classic ELB** |
| IAM | Cluster role cần **5 policy** và thêm `sts:TagSession` | Cluster role chỉ cần `AmazonEKSClusterPolicy` |

**Tắt nó đi** cho section này. Auto Mode là thứ tốt khi đi làm, nhưng nó giấu đúng những
thứ bảy note tới đang muốn cho bạn nhìn thấy — và khi hỏng, nó hỏng ở những chỗ khoá học
không hề nhắc tới.

Tắt xong thì ô Node IAM role biến mất. `eksNodeRole` **không** bị bỏ phí: nó được chọn ở
form tạo node group, [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes), sau khi cluster
đã `Active`.

**Dấu hiệu nhận biết:** nếu trang này đang đòi bạn chọn **Node IAM role**, nghĩa là Auto
Mode **vẫn đang bật**. Đừng điền ô đó — tắt công tắc đi.

### Nếu lỡ để Auto Mode bật

Không phải chỉ là "khác với bài". Hai chuyện sẽ xảy ra, và cả hai đều im lặng cho tới tận
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes):

| Chuyện gì | Triệu chứng | Lộ ra ở |
| --- | --- | --- |
| EKS tạo access entry cho `eksNodeRole` với loại **`EC2`** — loại dành cho node của Auto Mode | Node group tạo EC2, EC2 chạy, nhưng **không máy nào join được**; khoảng 20 phút sau node group báo `CREATE_FAILED` | 8.13 |
| Auto Mode tự tạo node bằng API `ec2:CreateFleet`. Ở tài khoản thuộc một **AWS Organization**, policy của tổ chức (SCP) có thể chặn API này | Không node nào được tạo; `kube-system` `Pending` mãi với `no nodes available to schedule pods`. `kubectl get nodeclass default` báo `CreateFleetAuthCheckFailed` | 8.12 |

**Nếu đã lỡ:** không cần xoá cluster. Tắt Auto Mode trên cluster đang chạy, rồi sửa access
entry của `eksNodeRole` sang loại `EC2_LINUX` — cả hai nằm ở **bước 0** của
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes). Tắt Auto Mode **không** tự sửa access
entry, nên phải làm cả hai.

Kiểm bằng CLI sau khi cài ở [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) —
lệnh nằm cuối bước 4 của note đó.

Các ô còn lại của trang — Kubernetes version, Cluster access, Secrets encryption, Tags — để
mặc định. Riêng **Cluster access** đáng nhìn qua một lần: authentication mode mặc định có
**EKS API**, và đó là điều kiện để cấp quyền bằng access entry nếu sau này
[8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) báo `Unauthorized`.

## Step 2: Specify networking

Trang này chỉ là chỗ **chọn lại** mạng đã dựng ở
[8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets):

| Ô | Chọn | Vì sao |
| --- | --- | --- |
| **VPC** | VPC của stack `cafe-eks-vpc` | Mạng hai AZ, public + private |
| **Subnets** | **Chọn cả bốn** | Control plane đặt card mạng vào đây; subnet public còn cần cho load balancer |
| **Additional security groups** | **Để trống** | Xem ngay dưới |
| **Cluster endpoint access** | **Public and private** | Xem mục cuối của bước này |

Danh sách VPC không có cái bạn vừa dựng thì gần như chắc là **sai region**: stack
CloudFormation nằm ở region bạn tạo nó, và form này chỉ hiện VPC của region đang chọn.

Chọn cả bốn subnet ở đây **khác** với chọn subnet cho node group. Ở bước này là chỗ đặt
control plane và chỗ để load balancer tìm subnet; còn node thì chỉ vào hai subnet private,
và chuyện đó quyết định ở [8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

### Additional security groups — để trống

EKS **tự tạo** một security group cho cụm, tên dạng `eks-cluster-sg-kub-cafe-demo-…`, gắn
vào cả control plane lẫn mọi node sau này. Nó cho mọi thành viên nói chuyện với nhau — đủ
cho toàn bộ section. Chi tiết ở [8.10](/blog/k8s/deploy-to-cloud/ec2-instances).

Ô **Additional** chỉ dùng khi bạn cần thêm luật cho **control plane**, ví dụ cho một bastion
host gọi API server. Hai chỗ dễ nhầm:

- **Đừng chọn `eks-efs` ở đây.** Security group đó thuộc về mount target của EFS, tạo ở
  [8.7](/blog/k8s/deploy-to-cloud/efs-file-system). Gắn nó vào control plane không giúp node
  mount được EFS.
- **Đừng chọn security group `default` của VPC.** Cụm không cần nó, và nó chỉ thêm những
  luật không ai nhớ lý do.

### Cluster endpoint access

Chọn **Public and private**.

| Lựa chọn | Ai gọi được API server |
| --- | --- |
| Public | `kubectl` từ máy bạn — nhưng node phải đi vòng ra internet |
| Private | Chỉ từ trong VPC — `kubectl` từ máy bạn **không** tới được |
| **Public and private** | Cả hai: bạn gõ từ máy mình, node nói chuyện nội bộ |

Chọn `Private` ở đây là cách tự khoá mình ra ngoài: cụm dựng xong nhưng `kubectl` không
kết nối được. Dùng thật trong công ty thì `Private` mới là lựa chọn đúng, kèm một bastion
host hoặc VPN — nhưng đó là chuyện khác.

## Step 3: Configure observability

**Để mặc định**, **Next**.

Logging của control plane ghi vào CloudWatch và **tính tiền theo lượng log**. Ở lab thì
không cần bật, và mỗi thứ bật thêm là một dòng nữa trên hoá đơn. `kubectl logs` đủ dùng
cho mọi thứ trong section này.

## Step 4: Select add-ons

Auto Mode đã tắt, nên cụm **không có sẵn** mạng hay DNS — chúng là add-on, và đây là chỗ
chọn. Console thường tick sẵn ba cái đầu; kiểm lại cho chắc:

| Add-on | Chọn | Thiếu thì |
| --- | --- | --- |
| **Amazon VPC CNI** (`vpc-cni`) | **Có** | Node `NotReady`, `cni plugin not initialized` |
| **CoreDNS** | **Có** | Pod chạy nhưng không phân giải được tên Service nào |
| **kube-proxy** | **Có** | Service không định tuyến được tới Pod |
| **Amazon EKS Pod Identity Agent** | Có, nếu cấp quyền driver EBS bằng Pod Identity | Xem [8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage) |
| Amazon EBS CSI Driver, Amazon EFS CSI Driver | Tuỳ — xem ngay dưới | Cài ở [8.14](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster) và [8.16](/blog/k8s/deploy-to-cloud/adding-efs-as-a-volume) cũng được |

Ba dòng đầu là **ba thứ trong danh sách kiểm** ở
[index của section](/blog/k8s/deploy-to-cloud). Chọn ở đây thì node sinh ra ở 8.13 là
`Ready` ngay; bỏ sót thì bạn sẽ gặp lại chúng ở bảng gỡ lỗi của note đó.

Trang tiếp theo — **Configure selected add-ons settings** — để mặc định phiên bản, **Next**.

**Nếu đã tick Amazon EBS CSI Driver**, trang này có thêm mục **Add-on access** cho nó. Làm
luôn ở đây: chọn **EKS Pod Identity** → dòng **Pod Identity IAM role for service account:
ebs-csi-controller-sa** → **Create new role** — các bước đầy đủ ở
[8.8](/blog/k8s/deploy-to-cloud/ebs-block-storage), mục *Cấp quyền bằng Pod Identity*. Cần
tick cả **Pod Identity Agent** ở trang trước.

Bỏ trống mục đó thì add-on vẫn cài được, nhưng sẽ **Degraded**, và `ebs-csi-controller` sẽ
`CrashLoopBackOff` ngay khi có node ở 8.13. Sửa sau được — cùng các bước đó, qua nút
**Edit** của add-on — nhưng làm ở đây thì khỏi gặp.

## Step 5: Review and create

> **Trước khi bấm, nhìn góc phải trên: bạn đang đăng nhập bằng ai?** EKS chỉ tự cho đúng
> danh tính bấm Create vào cụm. Nếu định dùng `kubectl` bằng một IAM user như `eks-admin`,
> tạo user đó theo Đường 2 ở [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks),
> đăng nhập Console bằng nó, rồi mới quay lại đây. Tạo bằng root rồi nối CLI bằng user khác
> thì vẫn sửa được, nhưng mất thêm một vòng cấp quyền.

Đọc lại trang tóm tắt, đối chiếu với bốn bước trên — nhất là **Auto Mode: tắt** và
**Endpoint: Public and private**. Rồi **Create**.

Cluster mất khoảng **10–20 phút** để chuyển từ `Creating` sang `Active`. Đây là AWS đang
dựng control plane: API server, etcd, scheduler, controller manager — bốn thành phần của
[note 5.24](/blog/k8s/k8s-in-action/module-summary), lần này có người khác dựng hộ — rồi
cài các add-on ở Step 4.

Lâu, nhưng bình thường. **Chỉ lo khi quá 30 phút vẫn `Creating`, hoặc trạng thái chuyển
sang `Failed`**: mở tab **Overview** của cluster, phần **Health issues** — AWS ghi thẳng lý
do ở đó, thường là `eksClusterRole` thiếu quyền hoặc subnet không đủ hai AZ.

Trong lúc chờ, sang [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks): cụm có
rồi mà `kubectl` chưa biết đường tới thì cũng chưa dùng được. Cài CLI và cấu hình danh tính
không cần đợi cụm `Active`; chỉ bước nối `kubectl` ở cuối note đó mới cần.

## Đồng hồ đã chạy

Từ lúc cụm `Active`, hoá đơn có hai dòng tính theo giờ:

| Thứ | Từ khi nào |
| --- | --- |
| NAT Gateway | Từ [8.6](/blog/k8s/deploy-to-cloud/vpc-and-subnets) |
| **Control plane EKS** | **Từ note này** — kể cả khi chưa có node, chưa có Pod nào |

Cụm chưa chạy được gì cho tới khi có node ở
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes). Đừng để khoảng giữa kéo dài qua đêm.

## Nếu chỉ đọc chứ không bật EKS

Note này và [8.12](/blog/k8s/deploy-to-cloud/connecting-kubectl-to-eks) quy về **một dòng**
trên k3d:

```bash
k3d cluster create lab --agents 2
```

Một dòng đó gói gọn: hai IAM role (không cần — không có ranh giới quyền), một VPC với
subnet public/private (không cần — Docker network lo), control plane (chạy trong một
container), node (thêm hai container nữa), và cả phần xác thực `kubectl` (k3d ghi kubeconfig
hộ, không cần CLI nào lấy token).

Thứ đáng mang đi từ note này không phải thao tác bấm, mà là **biết một dòng lệnh đó vừa
giấu đi những gì**. Lần sau gặp `EXTERNAL-IP: <pending>` hay một Pod không pull được image
trên cụm thật, bạn sẽ nhớ có một tầng IAM ở dưới.

## Self-check

- [ ] Nói được vì sao phải tạo IAM role **trước** khi mở form tạo cluster
- [ ] Phân biệt `eksClusterRole` và node role — ai đóng vai nào
- [ ] Nói được vì sao chọn bản template **public and private subnets**
- [ ] Biết chọn endpoint access nào, và hậu quả nếu chọn `Private`
- [ ] Tìm được region code khi header Console bị gập
- [ ] Biết cluster của mình có bật Auto Mode không, và Auto Mode giấu đi những gì
- [ ] Nói được vì sao ô **Node IAM role** chỉ hiện khi bật Auto Mode, và `eksNodeRole` được dùng ở đâu khi tắt
- [ ] Nói được vì sao phải chọn danh tính **trước** khi bấm Create
- [ ] Nói được vì sao thiếu quyền trên `eksClusterRole` chỉ lộ ra khi tạo Service đầu tiên
- [ ] Kể hai tài nguyên đang tính tiền theo giờ sau note này

## Open questions

- Xoá cluster có xoá luôn stack `cafe-eks-vpc` không, hay phải xoá riêng?
- Vì sao EKS bắt buộc ≥ 2 subnet ở 2 AZ, trong khi một node cũng đủ chạy Pod?
- Control plane chạy ở đâu, trên máy của ai, và vì sao bạn không thấy nó trong `kubectl get nodes`?
