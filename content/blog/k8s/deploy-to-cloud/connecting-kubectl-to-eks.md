---
title: "8.12 AWS CLI — nối kubectl vào cluster"
description: "Cụm đã có trên AWS, nhưng máy bạn chưa biết đường tới. Cài CLI, chọn một danh tính không phải root key, rồi nối kubectl — và phân biệt hai tầng quyền khi nó báo Unauthorized."
status: growing
created: 2026-09-30
updated: 2026-09-30
tags: [k8s, aws, eks, cli, kubectl, rbac, iam]
---

> Tiếp [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks). Bạn vừa bấm
> **Create**, cluster đang `Creating` — mất 10–15 phút. Làm note này trong lúc chờ.

Cụm có rồi mà `kubectl` chưa biết đường tới thì cũng chưa dùng được. Note này nối máy của
bạn vào cụm, qua bốn bước:

```
1. Cài AWS CLI
2. Chọn danh tính cho CLI     ← bước dễ làm sai nhất
3. aws configure
4. update-kubeconfig → kubectl
```

Chưa có node, nên cuối note `kubectl get nodes` sẽ ra **rỗng** — và đó là đúng.

## 1. Cài AWS CLI

`kubectl` không tự xác thực được với EKS. Nó gọi **AWS CLI** để lấy token mỗi lần nói
chuyện với API server — nên CLI là thành phần bắt buộc, không phải tiện ích.

Trên Linux x86_64:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && unzip -q awscliv2.zip && sudo ./aws/install
```

**PowerShell:**

```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

```bash
aws --version
```

Phải là **v2**. Nếu máy đã có bản cũ, chạy lại installer với `--update`.

> **Dùng Windows PowerShell?** Phần lớn lệnh trong section là `aws` và `kubectl` đơn lẻ —
> shell nào cũng chạy. Lệnh nào dùng cú pháp riêng của bash (`&&`, vòng `for`, `$(...)`,
> `| grep`, `| tail`) đều có bản **PowerShell:** ngay bên dưới, viết cho Windows PowerShell
> 5.1 có sẵn trong Windows.
>
> Hai bẫy còn lại khi dùng PowerShell:
>
> - Tham số dạng JSON có `\"` bên trong bị PowerShell cắt vụn, CLI báo `Unknown options: …`.
>   Section này viết các tham số đó bằng cú pháp **shorthand** trong **nháy đơn** — ví dụ
>   `'blockStorage={enabled=false}'` — chạy được trên cả hai shell.
> - Placeholder dạng `<node-name>` phải được thay **trước khi** chạy: với PowerShell, dấu `<`
>   là toán tử, để nguyên thì lệnh báo lỗi cú pháp thay vì lỗi "không tìm thấy".

## 2. Chọn danh tính cho CLI

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

> **Danh tính nào đã bấm Create cluster thì quan trọng.** EKS chỉ tự cho đúng danh tính đó
> vào cụm. Nếu bạn tạo cluster bằng root rồi cấu hình CLI bằng một IAM user, `kubectl` sẽ
> bị từ chối — cách xử lý ở mục *"Khi `kubectl` báo must be logged in"* cuối note.

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
arn:aws:eks:ap-southeast-2:123456789012:cluster/kub-cafe-demo
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

## 3. `aws configure`

Bỏ qua bước này nếu bạn đi Đường 1 — `aws login` đã lo phần credential. Chỉ cần đặt region
bằng lệnh `aws configure set region` ở cuối mục.

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
| `arn:aws:iam::…:root` | Đang dùng key của root — xem lại mục 2 |
| `arn:aws:sts::…:assumed-role/…` | Đang dùng `aws login` hoặc SSO, cũng đúng |

## 4. Nối `kubectl` vào cụm

Trước khi nối, một lệnh kiểm gộp cả credential lẫn region:

```bash
aws eks list-clusters
```

Thấy `kub-cafe-demo` là xong. Rỗng thì credential đúng nhưng **region sai** — sửa bằng
`aws configure set region`.

Xem cụm đã `ACTIVE` chưa:

```bash
aws eks describe-cluster --name kub-cafe-demo --query cluster.status --output text
```

Còn `CREATING` thì chờ — thường 10–20 phút tính từ lúc bấm Create. Chạy `update-kubeconfig`
lúc này sẽ nhận `aws: [ERROR]: Cluster status is CREATING`; không có gì hỏng, chỉ là sớm.
Thay vì gõ lại nhiều lần, để CLI tự chờ — lệnh đứng yên tới khi cụm `ACTIVE`:

```bash
aws eks wait cluster-active --name kub-cafe-demo
```

`ACTIVE` rồi thì nối:

```bash
aws eks --region ap-southeast-2 update-kubeconfig --name kub-cafe-demo --alias eks
```

Lệnh này ghi thêm một context vào `~/.kube/config` và **chuyển sang context đó**.

`--alias` là thứ nên gõ ngay từ lần đầu. Không có nó, context mang tên đầy đủ của ARN:

```
arn:aws:eks:ap-southeast-2:123456789012:cluster/kub-cafe-demo
```

Mỗi lần muốn đổi qua lại là phải chép nguyên chuỗi đó.

> **Đây là chỗ sẽ làm bạn giật mình.** Từ giờ `kubectl get pods` trỏ vào EKS, không còn
> vào cụm k3s cũ. Mọi thứ bạn đã dựng ở [section 6](/blog/k8s/data-and-volumes) và
> [section 7](/blog/k8s/networking) trông như biến mất. Chúng **không** mất — bạn chỉ
> đang hỏi một cụm khác.

Xem mình đang ở context nào, và có những context nào:

```bash
kubectl config get-contexts
```

Dấu `*` ở đầu dòng là context đang dùng. Đổi qua lại:

```bash
kubectl config use-context default
```

```bash
kubectl config use-context eks
```

Nếu đã lỡ tạo context không có `--alias`, không cần chép tay chuỗi ARN:

```bash
EKS=$(kubectl config get-contexts -o name | grep kub-cafe-demo) && kubectl config use-context $EKS
```

**PowerShell:**

```powershell
$EKS = kubectl config get-contexts -o name | Select-String kub-cafe-demo; kubectl config use-context "$EKS"
```

Chạy lại `update-kubeconfig` với `--alias` cũng được — nó ghi đè context cũ và đổi tên
luôn.

Ba cách biết mình đang đứng ở đâu:

| Cách | Dấu hiệu |
| --- | --- |
| `kubectl config current-context` | In thẳng tên context |
| `kubectl get nodes` | k3s ra tên máy của bạn; EKS ra `ip-10-x-x-x.<region>.compute.internal` |
| Prompt của shell | Starship đọc kubeconfig, hiện `☸ <context>` ngay trên dòng lệnh |

Đây là thứ đáng ghi vào phản xạ: **trước mỗi lệnh `kubectl` ở section này, biết mình đang
nói với cụm nào.** Một `kubectl delete` gõ đúng lệnh nhưng sai context là cách tự tạo ra
một sự cố rất khó hiểu.

Giờ CLI đã có, kiểm lại một điều từ 8.11 — Auto Mode đã thật sự tắt chưa:

```bash
aws eks describe-cluster --name kub-cafe-demo --query "cluster.computeConfig" --output json
```

`{"enabled": false}` hoặc `null` là đúng.

**Nếu ra `"enabled": true`** — Auto Mode còn bật, thường do bỏ sót công tắc ở Step 1 của
8.11. Đừng tạo node group vội: làm **bước 0** của
[8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes) trước — tắt Auto Mode và sửa access
entry của `eksNodeRole`. Bỏ qua bước đó, node group sẽ tạo ra EC2 mà không máy nào join
được cụm.

## Khi `kubectl` không có context nào

```
E0930 11:29:39 memcache.go:265] couldn't get current server API group list: the server
could not find the requested resource
```

Lỗi này nghe giống lỗi của cụm, nhưng thật ra kubectl **chưa hề gọi tới cụm nào**. Không có
`~/.kube/config` — tức là chưa chạy `update-kubeconfig` — thì kubectl tự gọi tới địa chỉ
mặc định `http://localhost:8080`. Máy bạn mà có thứ gì khác đang nghe ở cổng 8080, như một
dev server, thì nó trả `404`, và kubectl dịch `404` thành câu *"could not find the requested
resource"*.

```bash
kubectl config current-context
```

Báo `current-context is not set` là đúng nguyên nhân. Quay lại bước 4.

## Khi `kubectl` báo "must be logged in to the server"

> **Có thể bỏ qua cả mục này** nếu CLI của bạn dùng **đúng danh tính đã bấm Create** ở
> 8.11. Ví dụ: tạo cluster bằng root và CLI cũng là root, hoặc đăng nhập Console bằng
> `eks-admin` để tạo cluster và CLI cũng là `eks-admin`. Danh tính tạo cluster được EKS tự
> cấp quyền admin trong cụm, nên `kubectl get nodes` chạy được ngay, không cần kiểm hay cấp
> gì thêm.
>
> Điều kiện là **cùng danh tính**, không phải **có quyền admin**. Một IAM user khác có
> `AdministratorAccess` vẫn bị từ chối — đó đúng là trường hợp mục này xử lý.

```
E0926 22:03:17 memcache.go:265] "Unhandled Error" err="couldn't get current server API
group list: the server has asked for the client to provide credentials"
error: You must be logged in to the server
```

Lỗi này **không** nói rằng cụm hỏng, cũng không nói kubeconfig sai. Nó nói: API server đã
nhận được danh tính của bạn và **từ chối**.

Bước đầu tiên luôn là tách hai tầng ra:

```bash
aws sts get-caller-identity
```

| Kết quả | Nghĩa |
| --- | --- |
| Lỗi `ExpiredToken` hoặc `InvalidClientTokenId` | Credential AWS hết hạn — chạy lại `aws login`, hoặc kiểm `~/.aws/credentials` |
| Ra `Arn` bình thường | Tầng AWS ổn. Vấn đề nằm ở **quyền bên trong cụm** |

Nhắc lại ranh giới đã nói ở [8.5](/blog/k8s/deploy-to-cloud/iam-roles), vì đây là chỗ nó
lộ ra:

| Tầng | Quyết định | Khai ở đâu |
| --- | --- | --- |
| **IAM** | Bạn gọi được API nào của AWS, ví dụ `aws eks describe-cluster` | IAM policy |
| **Kubernetes** | Bạn làm được gì **bên trong** cụm | Access entry của EKS |

`AdministratorAccess` là quyền ở tầng trên, và nó **không** tự cho bạn vào cụm.

### Vì sao `eks-admin` bị từ chối

EKS chỉ tự cấp quyền admin trong cụm cho đúng **danh tính đã tạo cluster**. Nếu bạn bấm
Create bằng **root** rồi cấu hình CLI bằng `eks-admin` theo Đường 2 ở mục 2, thì với cụm,
`eks-admin` là người lạ.

```bash
aws eks list-access-entries --cluster-name kub-cafe-demo
```

Không thấy ARN của mình trong danh sách là đúng nguyên nhân.

### Cấp quyền cho `eks-admin`

Làm bằng **danh tính đã tạo cluster**, nhanh nhất là trên Console:
**EKS → kub-cafe-demo → Access → Create access entry**, chọn IAM principal là `eks-admin`,
type `Standard`, rồi gắn policy `AmazonEKSClusterAdminPolicy` với scope `Cluster`.

Bằng CLI thì hai lệnh:

```bash
aws eks create-access-entry --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::123456789012:user/eks-admin --type STANDARD
```

```bash
aws eks associate-access-policy --cluster-name kub-cafe-demo --principal-arn arn:aws:iam::123456789012:user/eks-admin --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy --access-scope type=cluster
```

Có hiệu lực ngay, không phải tạo lại kubeconfig:

```bash
kubectl auth whoami
```

Hai chỗ dễ vấp:

- **ARN phải là của IAM user hoặc role thường.** Truyền nhầm một role có
  `/aws-service-role/` trong đường dẫn sẽ nhận
  `not allowed to modify access entries with a principalArn value of a Service Linked Role`.
  Lấy chuỗi đúng bằng `aws sts get-caller-identity --query Arn --output text`, và nhớ
  thay `<account-id>` bằng số thật.
- **Access entry chỉ dùng được khi authentication mode là `EKS API` hoặc
  `EKS API and ConfigMap`.** Xem ở tab **Access**, hoặc:

```bash
aws eks describe-cluster --name kub-cafe-demo --query cluster.accessConfig.authenticationMode --output text
```

  Nếu là `CONFIG_MAP`, quyền nằm trong ConfigMap `aws-auth` ở namespace `kube-system`, và
  muốn sửa nó thì phải `kubectl` được vào cụm — tức là phải làm từ danh tính đã tạo
  cluster. Chuyển sang `API_AND_CONFIG_MAP` bằng `aws eks update-cluster-config` là lối ra
  gọn hơn, nhưng **chỉ đi được một chiều**, không quay lại được.

Cách tránh toàn bộ chuyện này ngay từ đầu: **tạo cluster bằng chính danh tính sẽ dùng để
chạy `kubectl`.** Nếu còn đang đọc trước khi bấm Create ở 8.11: tạo `eks-admin` theo Đường
2, đăng nhập Console bằng user đó, rồi mới bấm Create cluster.

## Cụm đã `Active` — nhưng chưa có gì chạy được

```bash
kubectl get nodes
```

Kết quả: `No resources found`.

Đó là **đúng**, không phải lỗi. Bạn vừa dựng xong *bộ não* của cụm, còn *cơ bắp* thì chưa
có — đó là việc của [note 8.13](/blog/k8s/deploy-to-cloud/adding-worker-nodes).

Nói theo bảy bước ở [note 8.1](/blog/k8s/deploy-to-cloud/deployment-options): 8.11 và note
này vừa xong bước 2 và 4 (nối mạng, dựng control plane). Bước 1, 3, 5 — có máy, cài phần
mềm K8s, nối node vào cụm — chính là cái node group sắp tạo.

Nếu `kubectl apply` bất cứ thứ gì lúc này, Pod sẽ nằm mãi ở `Pending`. Đúng trạng thái
`Pending` bạn đã gặp ở [section 6](/blog/k8s/data-and-volumes) khi PVC không tìm được PV,
nhưng lý do khác hẳn: lần này scheduler không có node nào để chọn.

Chính các add-on cũng vậy:

```bash
kubectl get pods -n kube-system
```

`coredns`, `ebs-csi-controller`, `metrics-server`… đều `Pending`, event ghi
`no nodes available to schedule pods`. **Bình thường** — chúng sẽ tự chạy khi có node ở 8.13.
Không thấy `aws-node` hay `kube-proxy` cũng bình thường: chúng là DaemonSet, không có node
thì không có Pod nào.

## Nếu chỉ đọc chứ không bật EKS

k3d làm hộ toàn bộ note này ngay trong lệnh tạo cụm:

```bash
k3d cluster create lab --agents 2
```

Nó ghi kubeconfig, đặt context tên `k3d-lab`, và chuyển sang context đó. Không có CLI nào
lấy token, không có IAM, không có access entry — chứng chỉ client nằm thẳng trong
kubeconfig.

Phần **đổi context** thì giữ nguyên giá trị: có cả k3s cũ lẫn k3d mới trên cùng máy là đã
đủ để gõ nhầm cụm. Thử:

```bash
kubectl config get-contexts
```

Và nếu cụm k3d đã bị xoá mà kubeconfig vẫn trỏ vào nó, hoặc kubeconfig trống hẳn, bạn sẽ
gặp đúng lỗi ở mục *"Khi `kubectl` không có context nào"* — không cần AWS để tái hiện.

## Self-check

- [ ] Nói được vì sao `kubectl` cần AWS CLI có sẵn trên `PATH`
- [ ] Nói được rủi ro của root **key** khác gì với việc đăng nhập Console bằng root
- [ ] Tìm được Account ID khi cần đăng nhập Console bằng IAM user
- [ ] Biết vì sao sai region thì CLI không báo lỗi mà chỉ ra danh sách rỗng
- [ ] Biết kiểm mình đang ở context nào, và cách đổi qua lại giữa k3s và EKS
- [ ] Nhận ra lỗi `could not find the requested resource` là kubectl chưa có context, không phải lỗi cụm
- [ ] Biết chờ cụm `ACTIVE` bằng `aws eks wait`, và kiểm Auto Mode trước khi sang 8.13
- [ ] Phân biệt quyền IAM với quyền bên trong cụm, và nói được `AdministratorAccess` **không** đủ để `kubectl` vào cụm
- [ ] Nói được vì sao danh tính tạo cluster lại quan trọng

## Open questions

- `aws login` cấp token có hạn — hết hạn giữa lúc `kubectl apply` thì chuyện gì xảy ra?
- Token mà `kubectl` lấy qua `aws eks get-token` sống bao lâu, và ai kiểm nó ở phía cụm?
- Hai người cùng làm trên một cụm thì mỗi người một access entry, hay dùng chung một IAM user?
