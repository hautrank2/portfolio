---
title: "8.5 IAM — hai role cho cluster và node"
description: "Dịch vụ duy nhất trong section không tốn đồng nào, và cũng là dịch vụ tốn nhiều thời gian nhất. Tạo hai role trước khi EKS cho bạn điền form."
status: growing
created: 2026-09-29
updated: 2026-09-29
tags: [k8s, aws, iam, eks, security]
---

Dịch vụ đầu tiên, và là dịch vụ **duy nhất trong section không tính tiền**. Đổi lại, nó là
dịch vụ chặn người mới nhiều nhất — vì lỗi thiếu quyền không nói *"bạn thiếu quyền"*, nó
nói những câu như `EXTERNAL-IP: <pending>` hoặc `Pod kẹt ở Pending`.

Làm nó trước cùng vì một lý do thực dụng: **form tạo cluster của EKS đòi chọn role, và
không cho tạo role tại chỗ.** Chưa có role thì không điền hết form được, và đồng hồ tính
tiền của [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks) chưa nên chạy trong
lúc bạn đi làm việc này.

## IAM là gì

**IAM** (*Identity and Access Management*) quyết định **ai được gọi API nào của AWS**. Ba
khái niệm cần phân biệt:

| | Là gì | Ví dụ trong section này |
| --- | --- | --- |
| **Policy** | Một danh sách quyền — được/không được gọi API nào | `AmazonEKSClusterPolicy` |
| **Role** | Một danh tính **không có mật khẩu**, để dịch vụ hoặc máy *đóng vai* | `eksClusterRole` |
| **User** | Một danh tính cho **người**, có mật khẩu hoặc access key | `eks-admin` của bạn |

Chỗ dễ lẫn nhất là **role**: nó không phải một tài khoản bạn đăng nhập vào. Nó là một bộ
quyền mà **một dịch vụ hoặc một máy ảo tạm thời khoác lên**. EKS khoác `eksClusterRole` để
gọi API thay bạn; EC2 khoác node role để tham gia cụm.

## Vì sao cụm cần tới hai role

Đây là câu hỏi đã treo từ [note 8.1](/blog/k8s/deploy-to-cloud/deployment-options): khi bạn
viết `type: LoadBalancer`, **ai** gọi API AWS để tạo ra ELB?

Không phải bạn. Bạn chỉ `kubectl apply` một file YAML. Có một thứ khác đọc file đó rồi đi
gọi API AWS — và trên cloud thật, thứ đó phải được cấp quyền trước.

```
  kubectl apply -f admin-web.yaml
            │
            ▼
   ┌──────────────────┐   đóng vai eksClusterRole
   │  Control plane   │ ──────────────────────────►  API AWS: tạo ELB, gắn EBS
   └────────┬─────────┘                              đọc subnet của VPC
            │ scheduler chọn node
            ▼
   ┌──────────────────┐   đóng vai node role
   │   EC2 worker     │ ──────────────────────────►  API AWS: gia nhập cụm, pull image
   └──────────────────┘
```

Hai mũi tên là hai role, phục vụ hai chủ thể khác nhau:

| Role | Ai đóng vai | Để làm gì |
| --- | --- | --- |
| **Cluster role** | **Dịch vụ EKS** — phần AWS quản lý | Tạo ELB, gắn volume, đọc VPC thay bạn |
| **Node role** | **EC2 instance** làm worker | Cho kubelet gia nhập cụm, pull image, ghi log |

Lẫn hai cái này là lỗi phổ biến, và triệu chứng rất khác nhau:

| Thiếu | Triệu chứng |
| --- | --- |
| Cluster role đủ quyền | Service `LoadBalancer` kẹt `EXTERNAL-IP: <pending>` mãi |
| Node role | Node **không bao giờ xuất hiện** trong `kubectl get nodes` |

Ở k3s thì cả hai tầng này **vô hình**: ServiceLB tạo load balancer không cần xin phép ai,
và node gia nhập cụm bằng một token bạn tự dán. Suốt bảy section vừa rồi bạn chưa gặp IAM
một lần nào — và đó chính là thứ note này bù lại.

## Tạo Cluster role

**IAM** → **Roles** → **Create role**.

1. **Trusted entity type**: `AWS service`
2. **Use case**: tìm `EKS`, chọn **`EKS - Cluster`**
3. Tab **Add permissions**: **không chọn gì thêm** → **Next**
4. **Role name**: `eksClusterRole`

5. Các trường còn lại để mặc định → **Create role**

> Bước 3 là bước dễ khựng nhất: màn hình permissions **trống trơn**, khiến người ta tưởng
> mình bỏ sót và đi tìm policy để tick. Không phải — khi bạn chọn use case `EKS - Cluster`,
> AWS **đã gắn sẵn** `AmazonEKSClusterPolicy` vào role. Không có gì để thêm.

Kiểm lại sau khi tạo, mở role ra và xem hai tab:

| Tab | Phải thấy gì |
| --- | --- |
| **Permissions** | `AmazonEKSClusterPolicy` |
| **Trust relationships** | `"Service": "eks.amazonaws.com"` |

Tab thứ hai là tab người ta không bao giờ mở, và là tab quan trọng hơn. **Trust policy trả
lời câu hỏi "ai được phép đóng vai này".** Có đủ permission mà trust policy sai thì EKS
không khoác được role lên, và bạn nhận một lỗi nói về `AssumeRole` chứ không nói về quyền.

### Nếu cluster của bạn sẽ bật Auto Mode

Một policy là **không đủ**. Auto Mode tự lo compute, networking, storage và load balancing,
nên nó cần role này có thêm bốn policy:

```bash
for p in AmazonEKSLoadBalancingPolicy AmazonEKSNetworkingPolicy AmazonEKSComputePolicy AmazonEKSBlockStoragePolicy; do aws iam attach-role-policy --role-name eksClusterRole --policy-arn arn:aws:iam::aws:policy/$p; done
```

```bash
aws iam list-attached-role-policies --role-name eksClusterRole --query "AttachedPolicies[].PolicyName" --output table
```

Trên Console: **IAM → Roles → eksClusterRole → Add permissions → Attach policies**, gõ
`AmazonEKS` rồi tick cả bốn trong một lần.

Và trust policy phải cho phép **`sts:TagSession`**, không chỉ `sts:AssumeRole`:

```bash
printf '%s' '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"eks.amazonaws.com"},"Action":["sts:AssumeRole","sts:TagSession"]}]}' > /tmp/eks-trust.json
```

```bash
aws iam update-assume-role-policy --role-name eksClusterRole --policy-document file:///tmp/eks-trust.json
```

Thiếu hai thứ này thì cluster vẫn `Active`, `kubectl` vẫn vào được, và mọi thứ trông bình
thường **cho tới khi** bạn tạo Service đầu tiên ở
[8.13](/blog/k8s/deploy-to-cloud/applying-config-to-the-cluster). Lúc đó `EXTERNAL-IP` đứng
ở `<pending>` mãi, và lý do chỉ hiện trong `kubectl describe svc`:

```
AccessDenied: ... is not authorized to perform: sts:TagSession on resource: .../eksClusterRole
```

Đây là loại lỗi đáng nhớ vì nó **nằm ngoài Kubernetes hoàn toàn**: không Pod nào hỏng,
không event nào ở Deployment, `kubectl get all` xanh hết. Và nó là ví dụ rõ nhất cho câu mở
đầu note này — **lỗi IAM không bao giờ nói là lỗi IAM.**

## Tạo Node role

Tương tự, nhưng cho **EC2**:

1. **Trusted entity type**: `AWS service`
2. **Use case**: `EC2`
3. **Add permissions**: lần này **phải tự chọn**, gắn ba policy:

| Policy | Để làm gì |
| --- | --- |
| `AmazonEKSWorkerNodePolicy` | Cho kubelet gia nhập cụm và báo trạng thái |
| `AmazonEC2ContainerRegistryReadOnly` | Pull image từ ECR |
| `AmazonEKS_CNI_Policy` | Cho add-on `vpc-cni` cấp IP cho Pod |

4. **Role name**: `eksNodeRole`

Khác biệt đáng chú ý so với cluster role: **use case là `EC2`, không phải `EKS`.** Vì chủ
thể đóng vai là máy ảo, không phải dịch vụ EKS. Chọn nhầm `EKS - Cluster` ở đây thì trust
policy trỏ vào `eks.amazonaws.com`, và node sẽ không bao giờ gia nhập được cụm.

Và ở đây AWS **không** gắn sẵn policy nào — ngược với bước trước. Bỏ trống là node join
xong rồi kẹt `NotReady`.

> Dòng `AmazonEKS_CNI_Policy` là dòng khoá học không có, vì thời điểm quay thì CNI được cài
> sẵn. Bây giờ `vpc-cni` là một add-on cần quyền cấp ENI và IP — thiếu nó thì node
> `NotReady` và Pod không lấy được IP nào. Đây là một trong sáu thứ ở
> [index của section](/blog/k8s/deploy-to-cloud).

## Một role thứ ba mà khoá không có

Tạo cluster bằng IAM user `eks-admin` thì **chính user đó** cũng cần được cụm công nhận.
Nghe vô lý — bạn tạo ra cụm mà không vào được cụm — nhưng đó đúng là chuyện xảy ra:

```
error: You must be logged in to the server (Unauthorized)
```

Lý do: quyền trên **AWS** và quyền trong **Kubernetes** là hai hệ thống tách rời. IAM cho
bạn gọi `aws eks describe-cluster`; nó **không** cho bạn gọi API server của Kubernetes.
Người tạo cụm được thêm vào tự động, nhưng bất cứ IAM user nào khác thì không.

Chỗ xử lý nằm ở tab **Access** của cluster (**Access entries**), và chỉ làm được **sau khi
cụm đã tồn tại** — nên nó thuộc [8.11](/blog/k8s/deploy-to-cloud/creating-a-cluster-with-eks).
Ghi lại ở đây để khi gặp `Unauthorized` bạn biết ngay đó không phải lỗi credential.

Ranh giới này đáng nhớ hơn cả thao tác:

| Hệ thống | Cho bạn làm gì |
| --- | --- |
| **IAM** | Gọi API **của AWS** về cụm — tạo, xoá, xem cấu hình |
| **RBAC của Kubernetes** | Gọi API **của cụm** — `kubectl get pods` |

`aws eks describe-cluster` chạy được mà `kubectl get pods` báo `Unauthorized` là dấu hiệu
rất rõ: IAM đúng, RBAC chưa.

## Kiểm lại trước khi đi tiếp

```bash
aws iam get-role --role-name eksClusterRole --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal' --output json
```

Phải ra `{"Service": "eks.amazonaws.com"}`.

```bash
aws iam list-attached-role-policies --role-name eksNodeRole --output table
```

Phải thấy đủ **ba** policy. Thiếu một cái thì lỗi sẽ đến muộn — lúc node group đã tạo và
bạn đang ngồi chờ node chuyển `Ready`.

Hai lệnh này đọc **trạng thái thật trên AWS**, không đọc từ màn hình bạn vừa bấm. Cùng tinh
thần với `kubectl exec -- printenv` ở [note 8.3](/blog/k8s/deploy-to-cloud/preparing-the-project):
kiểm từ nguồn, không kiểm từ file cấu hình.

## Chi phí

**Không đồng nào.** IAM miễn phí hoàn toàn — role, policy, user, tất cả.

Đây là lý do nên làm hết note này thật kỹ **trước** khi tạo cluster: bạn đang ở giai đoạn
duy nhất của section mà sai rồi sửa lại không mất gì.

## Nếu chỉ đọc chứ không bật EKS

Trên k3d, toàn bộ note này **không tồn tại**. Không có role, không có trust policy, không
có access entry — vì không có ranh giới quyền nào để vượt qua:

```bash
k3d cluster create lab --agents 2
```

Node gia nhập cụm ngay, load balancer sinh ra ngay, và `kubectl` vào được ngay.

Thứ đáng mang đi không phải thao tác bấm, mà là **biết rằng tầng đó tồn tại**. Lần sau gặp
`EXTERNAL-IP: <pending>` trên một cụm cloud, hoặc một node không bao giờ `Ready`, bạn sẽ
nghĩ tới IAM trước khi đi đọc log của Pod — và tiết kiệm được một buổi.

## Self-check

- [ ] Phân biệt policy, role và user
- [ ] Nói được vì sao role không phải tài khoản để đăng nhập
- [ ] Kể hai role, ai đóng vai từng cái, và triệu chứng khi thiếu
- [ ] Giải thích vì sao node role dùng use case `EC2` chứ không phải `EKS`
- [ ] Nói được trust policy khác permission policy ở chỗ nào
- [ ] Phân biệt `Unauthorized` của RBAC với lỗi credential của IAM

## Open questions

- Trust policy cho phép `eks.amazonaws.com` đóng vai — vậy tài khoản AWS khác có đóng được không?
- Node role gắn `AmazonEC2ContainerRegistryReadOnly` nhưng ta pull image từ Docker Hub — vẫn cần chứ?
- Nếu gỡ một policy khỏi node role khi cụm **đang chạy**, chuyện gì xảy ra với Pod hiện có?
