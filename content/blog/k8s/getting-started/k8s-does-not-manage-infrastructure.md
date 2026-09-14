---
title: "Kubernetes KHÔNG quản lý hạ tầng của bạn"
description: Ranh giới giữa thứ K8s làm và thứ bạn phải tự dựng. Khoá nhắc hai lần vì ai cũng hiểu sai.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, mindset, infra]
---

Bài này trong khoá có tiêu đề viết hoa chữ **NOT**, và sang Section 2 bài 182 lại nhắc
gần y hệt. Nhắc hai lần nghĩa là chỗ này người ta hiểu sai nhiều.

## Câu một dòng

> Kubernetes điều phối container **trên hạ tầng đã có sẵn**. Nó không tạo ra hạ tầng đó.

## Ai làm gì

| Việc | Ai làm |
| --- | --- |
| Tạo máy ảo / thuê server | **Bạn** — tay, Terraform, eksctl |
| Cài container runtime lên máy | **Bạn** (hoặc bộ cài như k3s làm hộ) |
| Nối các máy vào cùng một mạng | **Bạn** |
| Mở firewall, cấu hình VPC, subnet | **Bạn** |
| Mua tên miền, trỏ DNS | **Bạn** |
| Chọn Pod nào chạy máy nào | K8s |
| Khởi động lại container chết | K8s |
| Giữ đúng số bản sao | K8s |
| Cho Pod một địa chỉ ổn định để gọi nhau | K8s |

Đường phân chia gọn lại thành một câu: **cái gì phải tồn tại trước khi cluster tồn tại
thì đó là việc của bạn.**

## Bằng chứng gõ được trong mười giây

```bash
kubectl get nodes
```

Cluster **biết** các node. Giờ thử xoá một cái đi:

```bash
kubectl delete node <ten-node>
```

Máy đó vẫn chạy. SSH vào vẫn được. Container trên đó vẫn sống. Bạn không xoá cái máy —
bạn chỉ xoá **hồ sơ về nó** trong cơ sở dữ liệu của cluster. Vài giây sau kubelet trên
máy đó đăng ký lại và node hiện ra như cũ.

Không có thí nghiệm nào nói rõ hơn thế: với K8s, node chỉ là một **bản ghi**.

## Ba chỗ ranh giới trông có vẻ mờ

Đây là chỗ dễ tưởng K8s "cũng làm hạ tầng đấy chứ":

**`Service` kiểu `LoadBalancer`.** Bạn khai, và trên EKS thì một Network Load Balancer
thật hiện ra. Nhưng K8s không tạo nó — **cloud-controller-manager** gọi API của AWS để
xin. K8s xin, nhà cung cấp cấp.

Bằng chứng: làm y hệt trên một cluster bare metal không có ai trả lời, `EXTERNAL-IP` sẽ
`<pending>` **vĩnh viễn**, không lỗi, không timeout.

```
NAME   TYPE           EXTERNAL-IP   PORT(S)
web    LoadBalancer   <pending>     80:31274/TCP
```

(k3s có sẵn `servicelb` nên trên VM của bạn nó vẫn ra IP — đó là một addon của k3s,
không phải Kubernetes.)

**PersistentVolumeClaim.** Xin 10Gi thì có 10Gi. Người tạo đĩa là **CSI driver** của
nhà cung cấp. Không có driver thì PVC treo ở `Pending` mãi.

**Cluster Autoscaler.** Nghe như K8s tự mua máy. Không — nó là một thành phần **rời**,
cài thêm, và cũng chỉ gọi API của cloud để xin thêm VM.

Ba trường hợp, cùng một khuôn: **K8s khai báo nhu cầu, một plugin dịch nó thành lời gọi
API của nhà cung cấp.** Bỏ plugin đi thì nhu cầu treo đó, không ai đáp.

## Vì sao chi tiết này đáng nhớ

Người ta trả tiền cho EKS rồi tưởng AWS lo hết. Đến lúc Pod `Pending` mãi vì subnet hết
IP, hoặc node `NotReady` vì security group chặn cổng 10250, thì mở tab `kubectl` ra soi
không bao giờ tìm thấy nguyên nhân — vì nguyên nhân **không nằm trong cluster**.

Đó cũng chính là lý do tôi thêm hẳn [Section 0 — Nền tảng](/blog/k8s/foundations) vào
giáo trình này. K8s không xoá đi nhu cầu biết Linux và biết mạng; nó **giả định** bạn
đã biết.

## Self-check

- [ ] Nói được ranh giới bằng một câu, không cần liệt kê
- [ ] Giải thích được vì sao `EXTERNAL-IP` treo `<pending>` trên cluster bare metal
- [ ] Chỉ ra được ai thật sự tạo đĩa khi bạn khai một PVC

## Open questions

- Managed cluster (EKS/GKE) đẩy ranh giới này về phía nào, và bạn mất quyền gì đổi lại?
- `kubectl delete node` rồi node tự đăng ký lại — vậy có cách nào đuổi hẳn một node không?
