---
title: "8.4 Ghi chú về chi phí AWS EKS"
description: EKS không nằm trong Free Tier. Làm theo khoá tốn vài đô — quên dọn thì không.
status: growing
created: 2026-09-25
updated: 2026-09-25
tags: [k8s, aws, eks, cost]
---

Note ngắn, nhưng đọc trước khi bấm nút tạo cluster.

## EKS không miễn phí

**AWS EKS không nằm trong [AWS Free Tier](https://aws.amazon.com/free)** — giống ECS. Bạn
trả tiền ngay từ cluster đầu tiên, kể cả khi nó không chạy Pod nào.

Bảng giá chính thức: [aws.amazon.com/eks/pricing](https://aws.amazon.com/eks/pricing/).

Khác biệt đáng nhớ so với những thứ bạn đã dùng:

| | Tính tiền theo |
| --- | --- |
| **Control plane EKS** | **Giờ, cho mỗi cluster** — chạy hay không vẫn tính |
| Worker node (EC2) | Giờ, theo loại máy |
| Load balancer | Giờ + lưu lượng |
| EFS | Dung lượng lưu + lưu lượng |

Dòng đầu là dòng lạ nhất với người quen Free Tier: **không có mức dùng miễn phí nào cả.**
Cluster rỗng để quên một tháng vẫn ra hoá đơn.

## Làm theo khoá thì tốn bao nhiêu

Các ví dụ trong khoá **không** dẫn tới hoá đơn lớn — thường chỉ vài đô. Nhưng con số đó
giả định bạn **dọn sạch sau khi xong**.

Thứ hay bị quên, xếp theo mức độ tốn kém:

| Quên dọn | Vì sao dễ quên |
| --- | --- |
| **Cluster EKS** | Không có Pod nào chạy nên trông như đã tắt |
| **NAT Gateway** | Do wizard tạo ngầm, không nằm trong danh sách bạn tự tạo |
| **Load balancer** | Sinh ra từ `type: LoadBalancer`, xoá Service mới mất |
| **EBS volume** | PVC xoá rồi nhưng PV `Retain` thì đĩa vẫn còn |
| **EFS** | Tính cả dung lượng lẫn lưu lượng, nhỏ nhưng chạy mãi |
| **EC2 worker node** | Cái duy nhất người ta nhớ tắt |

Ba dòng giữa đều là tài nguyên **do Kubernetes tạo hộ bạn**, nên chúng không xuất hiện
trong đầu bạn như những thứ "tôi đã bấm tạo". Đó chính là chuyện
[K8s dùng tài nguyên hạ tầng](/blog/k8s/deploy-to-cloud/deployment-options) lặp lại ở mặt
hoá đơn: K8s tiêu tài nguyên cloud thay bạn, và cũng tiêu tiền thay bạn.

## Dọn cho đúng thứ tự

Xoá cluster **trước** khi xoá tài nguyên do nó tạo là sai thứ tự — lúc đó không còn ai gỡ
load balancer và volume nữa, chúng thành rác mồ côi.

1. `kubectl delete` mọi Service `LoadBalancer` → AWS gỡ ELB
2. `kubectl delete` mọi PVC → gỡ EBS/EFS access point, nếu `reclaimPolicy: Delete`
3. Xoá node group
4. Xoá cluster
5. Mở **Billing → Cost Explorer** hôm sau, xem còn dòng nào không

Bước 5 là bước duy nhất chứng minh được là bạn đã dọn sạch. Danh sách tài nguyên thì dễ
sót; hoá đơn thì không.

Đặt luôn một cảnh báo ngân sách trước khi bắt đầu — **Billing → Budgets**, ngưỡng vài đô,
gửi email. Rẻ hơn nhiều so với việc phát hiện sau ba mươi ngày.

## Vì sao ở đây không bật EKS

Section này đọc theo khoá nhưng thực hành trên **k3d** — node là container, dựng cụm nhiều
node trong mười giây, không tốn đồng nào:

```bash
k3d cluster create lab --agents 2
```

Phần nào làm được trên k3d và phần nào chỉ đọc hiểu thì có ở
[index của section](/blog/k8s/deploy-to-cloud).

Bạn vẫn nên bật EKS thật **một lần** nếu định dùng nó ở công việc — nhưng hãy bật khi có
nguyên một buổi rảnh để đi hết rồi dọn ngay, đừng bật rồi để đó học dần.

## Self-check

- [ ] Nói được vì sao cluster EKS rỗng vẫn tính tiền
- [ ] Kể ba tài nguyên do K8s tạo hộ mà bạn dễ quên dọn
- [ ] Biết thứ tự dọn, và vì sao xoá cluster trước là sai
- [ ] Biết chỗ đặt cảnh báo ngân sách

## Open questions

- PV `reclaimPolicy: Retain` giữ lại đĩa — vậy xoá cụm rồi thì đĩa đó ai dọn?
- Hai cluster EKS ở hai region có tính tiền gấp đôi không?
