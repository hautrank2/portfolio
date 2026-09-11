---
title: "Bắt đầu với Kubernetes"
description: Vì sao K8s tồn tại, nó là gì, và kiến trúc cluster. Toàn lý thuyết, chưa gõ lệnh.
order:
  - the-manual-deployment-problem
  - why-kubernetes
  - what-is-a-cluster
  - architecture-and-core-concepts
  - k8s-does-not-manage-infrastructure
  - worker-node
  - master-node
  - key-terminology
---

Section đầu tiên của phần Kubernetes — tương ứng **Section 11 của khoá**. 44 phút,
hoàn toàn lý thuyết, không có lệnh nào để gõ. Đó là chủ ý: hiểu bài toán trước khi
thấy công cụ.

## Điều section này nhấn mạnh nhất

Bài **176** có một tiêu đề bằng chữ in hoa: *Kubernetes will **NOT** manage your
Infrastructure*. Và sang Section 2, bài **182** nhắc lại gần y hệt.

Nhắc hai lần nghĩa là người ta hay hiểu sai. K8s không tạo máy ảo, không cấu hình mạng
cloud, không cài gì lên node. Nó **điều phối container trên hạ tầng bạn đã có**. Ai
dựng hạ tầng đó là chuyện khác — Terraform, eksctl, hay tay bạn.

## Bài kiểm tra cuối section

Khoá có **Quiz 6** ở đây. Tự kiểm bằng một câu khó hơn:

> Xoá một Pod thì nó mọc lại, nhưng xoá Deployment thì Pod biến mất hẳn. Vì sao?

Trả lời trôi chảy là qua. Còn lúng túng thì phần *"kiến trúc"* mới chỉ là thuộc tên,
chưa phải hiểu.

## Đối chiếu khoá học

Bài **172–179**. Bỏ qua 171 (Module Introduction), Quiz 6, và 180 (Module Resources) —
đó là nhịp của video, không có nội dung để ghi note.

Bài **174 (What Is Kubernetes Exactly?)** ứng với note *Cluster là gì* — tôi đã viết
trước khi dựng lại giáo trình này.
