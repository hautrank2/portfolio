---
title: "8.6 Tạo & cấu hình cluster với EKS"
description: "Đi hết một lần tạo cluster trên Console — hai IAM role, một VPC dựng bằng CloudFormation, rồi nối kubectl vào cụm từ máy của bạn."
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, aws, eks, iam, vpc, cloudformation, cli, kubectl]
---

Note này là **bước 1–5 của cột phải** trong
[note 8.1](/blog/k8s/deploy-to-cloud/deployment-options): có máy, nối mạng, cài phần mềm
K8s, dựng control plane. Trên EKS, cả bốn bước đó gói lại thành một form — nhưng là một
form bắt bạn phải chuẩn bị sẵn hai thứ trước khi điền được.

> **Từ lúc bấm Create, đồng hồ tính tiền chạy.** Control plane tính theo giờ dù cụm chưa
> có node nào, và VPC bạn sắp dựng kèm một NAT Gateway cũng tính theo giờ. Nếu chưa đặt
> cảnh báo ngân sách, quay lại [note 8.5](/blog/k8s/deploy-to-cloud/a-tour-of-aws) làm
> trước — mất hai phút.

Giao diện AWS đổi khá thường xuyên: tên nút, thứ tự bước, chỗ đặt link có thể khác lúc bạn
đọc. **Những thứ cần điền thì không đổi** — nên hãy bám vào cột "là gì" chứ đừng bám vào
vị trí nút.

## Chuẩn bị: hai thứ phải có trước

| | Vì sao cần trước |
| --- | --- |
| **Hai IAM role** | Form tạo cluster bắt chọn role, không cho tạo tại chỗ ở mọi bước |
| **Một VPC đúng chuẩn EKS** | Form đòi VPC có ≥ 2 subnet ở 2 AZ khác nhau, định tuyến đúng |

Đây cũng là lý do note này dài hơn bạn tưởng: **phần lớn công việc không nằm trong EKS.**
EKS chỉ là cái form cuối cùng.

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

## 1. Mở EKS và chọn Custom configuration

Console AWS → dịch vụ **EKS** → **Create cluster**.

Chọn **Custom configuration** chứ không phải chế độ tự động. Chế độ tự động dựng hộ bạn
gần hết, và đó chính là thứ cần tránh ở đây — mục đích của section này là **nhìn thấy cột
phải**, không phải là đi nhanh.

Tên cluster:

```
kub-dep-demo
```

**Ghi lại region đang chọn.** Mọi thứ bạn sắp tạo — cluster, VPC, NAT Gateway — đều gắn
chặt vào region đó, và Console chỉ hiện những gì thuộc region đang xem. Đây là cách phổ
biến nhất để quên dọn và trả tiền cho thứ mình tưởng đã xoá.

Nếu không thấy ô chọn region vì header bị gập, đọc từ **thanh địa chỉ** — cách này luôn
thấy được:

```
https://ap-southeast-2.console.aws.amazon.com/eks/home#/clusters
        ^^^^^^^^^^^^^^
```

Đoạn ngay trước `.console.aws.amazon.com` chính là region code, và đó đúng là dạng CLI cần.

## 2. Cluster IAM role

Form sẽ đòi một role. Nếu chưa có, mở **IAM** ở tab khác:

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service**, use case **EKS → EKS - Cluster**
3. Tab **Add permissions**: không cần chọn gì thêm — **Next**
4. Tên role:

```
eksClusterRole
```

Các trường còn lại để mặc định, rồi **Create role**. Quay lại tab EKS, refresh danh sách
role và chọn `eksClusterRole`.

Bước 3 là bước dễ khựng nhất: màn hình permissions trống trơn khiến người ta tưởng mình
bỏ sót. Không phải — khi bạn chọn use case `EKS - Cluster`, AWS **gắn sẵn** policy
`AmazonEKSClusterPolicy` vào role. Không có gì để thêm.

Role này là câu trả lời cho câu hỏi đã treo từ [note 8.5](/blog/k8s/deploy-to-cloud/a-tour-of-aws):
khi bạn viết `type: LoadBalancer`, **ai** gọi API AWS để tạo ELB? Chính là dịch vụ EKS,
đóng vai role này. Ở k3s thì ServiceLB làm việc đó không cần xin phép ai, nên cả tầng này
vô hình suốt bảy section vừa rồi.

## 3. Node IAM role

Tương tự, nhưng cho **worker node**: mở form tạo role, đặt tên, còn lại để mặc định.

Hai role này phục vụ hai chủ thể khác nhau, và lẫn chúng là lỗi phổ biến:

| Role | Ai đóng vai | Để làm gì |
| --- | --- | --- |
| `eksClusterRole` | **Dịch vụ EKS** — control plane | Tạo ELB, gắn volume, đọc VPC thay bạn |
| Node role | **EC2 instance** làm worker | Cho kubelet gia nhập cụm, pull image |

Nói cách khác: role đầu cấp quyền cho **phần AWS quản lý**, role sau cấp quyền cho **phần
máy của bạn**. Node role sẽ được dùng thật ở [note 8.7](/blog/k8s/deploy-to-cloud/adding-worker-nodes)
khi tạo node group.

## 4. Networking: dựng VPC bằng CloudFormation

Tới mục **Specify networking**, form đòi chọn một VPC. Danh sách gần như chắc chắn không
có cái nào dùng được — VPC mặc định của tài khoản thường thiếu cấu hình subnet mà EKS cần.

Cách AWS khuyên là dùng **template CloudFormation có sẵn**, thay vì tự bấm tạo VPC,
subnet, route table, Internet Gateway và NAT Gateway từng cái một.

**CloudFormation** là dịch vụ IaC của AWS: bạn đưa một file mô tả hạ tầng, nó tạo trọn bộ
tài nguyên. Đúng ý tưởng `kubectl apply -f` — khai cái bạn muốn, để hệ thống tự dựng —
nhưng ở tầng hạ tầng cloud thay vì tầng Kubernetes.

Mở dịch vụ **CloudFormation** ở tab khác:

1. **Create stack** → *With new resources (standard)*
2. **Prepare template**: `Template is ready`
3. **Template source**: `Amazon S3 URL`
4. **Amazon S3 URL**: lấy từ trang tài liệu chính thức —
   [Create a VPC for your EKS cluster](https://docs.aws.amazon.com/eks/latest/userguide/creating-a-vpc.html#create-vpc),
   phần **Public and private subnets**, bản **IPv4**
5. Stack name:

```
eksVpc
```

6. Các bước còn lại để mặc định → **Submit**

> **Đừng chép URL template từ blog này hay từ video khoá học.** AWS thay đường dẫn theo
> phiên bản, và một URL cũ hoặc sai bản sẽ dựng ra một VPC không hợp lệ với EKS — lỗi chỉ
> lộ ra ở bước cuối, khi bạn đã đi qua bốn màn hình. Lấy từ trang tài liệu ở trên.

Chọn đúng bản **Public and private subnets** là có lý do: worker node nằm ở subnet
**private** (không lộ ra internet), còn load balancer nằm ở subnet **public**. Bản
chỉ-public cũng dựng được cụm, nhưng đó không phải hình dạng dùng thật.

Chờ stack chuyển sang `CREATE_COMPLETE` — khoảng vài phút. Tab **Resources** của stack
cho bạn xem **chính xác** nó vừa tạo những gì. Đáng mở ra nhìn một lần: đó là danh sách
những thứ mà [note 8.5](/blog/k8s/deploy-to-cloud/a-tour-of-aws) mới chỉ kể tên.

> Trong danh sách đó có **NAT Gateway** — thứ tính tiền theo giờ, và là thứ hay bị bỏ sót
> nhất khi dọn dẹp, vì nó do template tạo ngầm chứ không nằm trong đầu bạn như một thứ
> "tôi đã bấm tạo". Tin tốt: xoá stack `eksVpc` sẽ gỡ luôn nó, miễn là bạn xoá stack chứ
> không xoá tay từng tài nguyên.

Quay lại tab EKS, refresh, chọn VPC vừa tạo. Ở mục **Subnets**: **chọn tất cả**.

## 5. Cluster endpoint access

Chọn **Public and private**.

| Lựa chọn | Ai gọi được API server |
| --- | --- |
| Public | `kubectl` từ máy bạn — nhưng node phải đi vòng ra internet |
| Private | Chỉ từ trong VPC — `kubectl` từ máy bạn **không** tới được |
| **Public and private** | Cả hai: bạn gõ từ máy mình, node nói chuyện nội bộ |

Chọn `Private` ở đây là cách tự khoá mình ra ngoài: cụm dựng xong nhưng `kubectl` không
kết nối được. Dùng thật trong công ty thì `Private` mới là lựa chọn đúng, kèm một bastion
host hoặc VPN — nhưng đó là chuyện khác.

## 6. Observability và Logging

Để mặc định, **Next**.

Logging của control plane ghi vào CloudWatch và **tính tiền theo lượng log**. Ở lab thì
không cần bật, và mỗi thứ bật thêm là một dòng nữa trên hoá đơn.

## 7. Review và Create

Xem lại toàn bộ, rồi **Create**.

Cluster mất khoảng **10–15 phút** để chuyển từ `Creating` sang `Active`. Đây là AWS đang
dựng control plane: API server, etcd, scheduler, controller manager — bốn thành phần của
[note 5.24](/blog/k8s/k8s-in-action/module-summary), lần này có người khác dựng hộ.

Trong lúc chờ, làm nốt phần dưới: cụm có rồi mà `kubectl` chưa biết đường tới thì cũng
chưa dùng được.

## 8. Cài AWS CLI

`kubectl` không tự xác thực được với EKS. Nó gọi **AWS CLI** để lấy token mỗi lần nói
chuyện với API server — nên CLI là thành phần bắt buộc, không phải tiện ích.

Trên Linux x86_64:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && unzip -q awscliv2.zip && sudo ./aws/install
```

```bash
aws --version
```

Phải là **v2**. Nếu máy đã có bản cũ, chạy lại installer với `--update`.

## 9. Chọn danh tính cho CLI

Khoá học bảo tạo access key cho **root user**. AWS bây giờ hiện một cảnh báo ngay tại chỗ
đó, kèm hai đường thay thế. Cảnh báo đó đáng nghe.

Ba đường, và khác biệt thật sự nằm ở **có để lại bí mật tĩnh trên đĩa hay không**:

| Cách | Bí mật tĩnh trên đĩa | Lộ thì mất gì |
| --- | --- | --- |
| **`aws login`** | **Không** — token có hạn, tự hết | Token cũ hết hạn là vô dụng |
| Access key của **IAM user** | Có | Chỉ user đó — xoá key là xong |
| Access key của **root** | Có, **không bao giờ hết hạn** | **Cả tài khoản** — không giới hạn phạm vi, không thu hồi theo quyền |

Dòng cuối là dòng cần tránh, và đây là chỗ dễ nhầm nên nói rõ: **rủi ro nằm ở *key* của
root, không phải ở việc đăng nhập Console bằng root.** Đăng nhập Console bằng root là bình
thường và có những việc chỉ root làm được. Thứ nguy hiểm là một file bí mật vĩnh cửu nằm
trong `~/.aws/credentials` với toàn quyền lên tài khoản đang gắn thẻ.

### Đường 1: `aws login`

Không tạo key nào cả:

```bash
aws login
```

Nó mở browser để bạn đăng nhập bằng chính tài khoản Console đang dùng, rồi cấp một token
có hạn.

Trên VM không có giao diện đồ hoạ — trường hợp phổ biến nếu bạn đang SSH vào máy ảo —
`aws login` sẽ in ra một URL kèm mã ngắn. Mở URL đó trên browser của máy thật, nhập mã,
CLI trên VM tự nhận token.

Cái giá của cách này: token hết hạn sau vài giờ, và lúc đó `kubectl` báo lỗi xác thực dù
cụm vẫn chạy bình thường. Chạy lại `aws login` là xong. Đây là cái giá của việc không có
bí mật vĩnh cửu trên đĩa, và là cái giá nên trả.

### Đường 2: IAM user riêng

Nếu muốn một key dùng được lâu mà không phải key của root:

1. `console.aws.amazon.com/iam/home#/users` → **Create user**, tên ví dụ `eks-admin`
2. Tick **Provide user access to the AWS Management Console** ngay ở bước này nếu muốn
   đăng nhập Console bằng user đó — đặt password luôn, khỏi phải đi tìm mục
   **Console sign-in** sau
3. **Attach policies directly** → `AdministratorAccess`
4. Tạo xong, bấm vào tên user → tab **Security credentials** → mục **Access keys** →
   **Create access key** → use case **Command Line Interface (CLI)** → tick ô xác nhận
5. Copy **cả hai** giá trị ngay. Secret chỉ hiện đúng một lần

Muốn đăng nhập Console bằng user này thì cần Account ID:

```
https://<account-id>.signin.aws.amazon.com/console
```

Account ID lấy ở trang Billing → Account, hoặc đọc từ **ARN của cluster** — chỗ 12 số
giữa:

```
arn:aws:eks:ap-southeast-2:123456789012:cluster/kub-dep-demo
                           ^^^^^^^^^^^^
```

Và mở **cửa sổ ẩn danh** để đăng nhập, vì Console không giữ hai danh tính cùng lúc trong
một session — đăng nhập IAM user sẽ đẩy phiên root của bạn ra.

### Việc nên làm một lần rồi quên

Bật **MFA cho root**:

```
https://console.aws.amazon.com/iam/home#/security_credentials
```

Mục **Multi-factor authentication (MFA)** → **Assign MFA device**. Một tài khoản đã gắn
thẻ mà chỉ có mật khẩu bảo vệ là điểm yếu lớn hơn nhiều so với chuyện dùng root hay IAM
user.

## 10. `aws configure`

```bash
aws configure
```

Bốn câu hỏi:

| Trường | Điền gì |
| --- | --- |
| Access Key ID | Từ bước trên |
| Secret Access Key | Từ bước trên — không hiện lại được |
| **Default region name** | **Phải trùng region đã tạo cluster**, ví dụ `ap-southeast-2` |
| Default output format | `json` — hoặc để trống, mặc định cũng là `json` |

Trường region là trường duy nhất sai là gãy. Sai region thì CLI vẫn xác thực thành công
nhưng **không thấy cluster nào** — không lỗi, không cảnh báo, chỉ là danh sách rỗng.

Trường output format thì chỉ đổi cách in ra màn hình, và ghi đè được từng lệnh bằng
`--output`:

| Giá trị | Dùng khi |
| --- | --- |
| `json` | Mặc định — đi cùng `--query` và `jq` |
| `text` | Cột cách nhau bằng tab, gán được vào biến shell |
| `table` | Đọc bằng mắt |
| `yaml` | Đọc bằng mắt, quen mắt K8s |

Sửa về sau không cần chạy lại `aws configure`:

```bash
aws configure set region ap-southeast-2
```

> Installer có thể hỏi thêm: *Configure AWS skills and the AWS MCP server for your AI
> coding agent(s)?* Gõ **`n`** — nó cấu hình MCP server cho các AI coding agent trên máy,
> không liên quan tới `aws` hay `kubectl`. Đừng chọn `never`, để sau còn bật được.
>
> Lý do cụ thể để không bật lúc này: MCP server đó cho agent gọi API AWS bằng credential
> bạn vừa cấu hình — mà credential đó đang là `AdministratorAccess`. Trong một section mà
> EKS, NAT Gateway và ELB đều tính tiền theo giờ, thêm một thứ có thể tạo tài nguyên mà
> bạn không trực tiếp gõ lệnh là rủi ro không cần thiết.

Kiểm bạn đang là ai — đọc thẳng từ AWS, không đoán qua giao diện:

```bash
aws sts get-caller-identity
```

| Trường `Arn` | |
| --- | --- |
| `arn:aws:iam::…:user/eks-admin` | Đúng đường |
| `arn:aws:iam::…:root` | Đang dùng key của root — xem lại mục 9 |
| `arn:aws:sts::…:assumed-role/…` | Đang dùng `aws login` hoặc SSO, cũng đúng |

## 11. Nối `kubectl` vào cụm

Trước khi nối, một lệnh kiểm gộp cả credential lẫn region:

```bash
aws eks list-clusters
```

Thấy `kub-dep-demo` là xong. Rỗng thì credential đúng nhưng **region sai** — sửa bằng
`aws configure set region`.

Xem cụm đã `ACTIVE` chưa:

```bash
aws eks describe-cluster --name kub-dep-demo --query cluster.status --output text
```

Còn `CREATING` thì chờ. `ACTIVE` rồi thì nối:

```bash
aws eks --region ap-southeast-2 update-kubeconfig --name kub-dep-demo
```

Lệnh này ghi thêm một context vào `~/.kube/config` và **chuyển sang context đó**.

> **Đây là chỗ sẽ làm bạn giật mình.** Từ giờ `kubectl get pods` trỏ vào EKS, không còn
> vào cụm k3s cũ. Mọi thứ bạn đã dựng ở [section 6](/blog/k8s/data-and-volumes) và
> [section 7](/blog/k8s/networking) trông như biến mất. Chúng **không** mất — bạn chỉ
> đang hỏi một cụm khác.

Xem mình đang ở context nào, và có những context nào:

```bash
kubectl config get-contexts
```

Dấu `*` ở đầu dòng là context đang dùng. Quay về k3s bất cứ lúc nào:

```bash
kubectl config use-context default
```

Đây là thứ đáng ghi vào phản xạ: **trước mỗi lệnh `kubectl` ở section này, biết mình đang
nói với cụm nào.** Một `kubectl delete` gõ đúng lệnh nhưng sai context là cách tự tạo ra
một sự cố rất khó hiểu.

## Cụm đã `Active` — nhưng chưa có gì chạy được

```bash
kubectl get nodes
```

Kết quả: `No resources found`.

Đó là **đúng**, không phải lỗi. Bạn vừa dựng xong *bộ não* của cụm, còn *cơ bắp* thì chưa
có — đó là việc của [note 8.7](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

Nói theo bảy bước ở [note 8.1](/blog/k8s/deploy-to-cloud/deployment-options): bạn vừa
xong bước 2 và 4 (nối mạng, dựng control plane). Bước 1, 3, 5 — có máy, cài phần mềm K8s,
nối node vào cụm — chính là cái node group sắp tạo.

Nếu `kubectl apply` bất cứ thứ gì lúc này, Pod sẽ nằm mãi ở `Pending`. Đúng trạng thái
`Pending` bạn đã gặp ở [section 6](/blog/k8s/data-and-volumes) khi PVC không tìm được PV,
nhưng lý do khác hẳn: lần này scheduler không có node nào để chọn.

## Nếu chỉ đọc chứ không bật EKS

Toàn bộ note này quy về **một dòng** trên k3d:

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
- [ ] Giải thích vì sao dùng CloudFormation thay vì tự bấm tạo VPC
- [ ] Nói được vì sao chọn bản template **public and private subnets**
- [ ] Biết chọn endpoint access nào, và hậu quả nếu chọn `Private`
- [ ] Nói được rủi ro của root **key** khác gì với việc đăng nhập Console bằng root
- [ ] Tìm được region code và Account ID khi header Console bị gập
- [ ] Nói được vì sao `kubectl` cần AWS CLI có sẵn trên `PATH`
- [ ] Biết kiểm mình đang ở context nào, và cách quay về k3s
- [ ] Kể hai tài nguyên bắt đầu tính tiền ngay sau note này

## Open questions

- Xoá cluster có xoá luôn stack `eksVpc` không, hay phải xoá riêng?
- `aws login` cấp token có hạn — hết hạn giữa lúc `kubectl apply` thì chuyện gì xảy ra?
- Vì sao EKS bắt buộc ≥ 2 subnet ở 2 AZ, trong khi một node cũng đủ chạy Pod?
