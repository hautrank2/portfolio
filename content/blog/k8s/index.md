---
title: Kubernetes
description: Lộ trình 10 giai đoạn, từ nền tảng Linux tới GitOps. Note viết dần trong lúc học.
status: seed
updated: 2026-08-21
tags: [k8s, devops, container]
order:
  - bat-dau-tu-dau
  - nen-tang
  - mo-hinh-tu-duy
  - kien-truc-cluster
  - workload
  - debug
  - config-storage
  - networking
  - scheduling
  - bao-mat
  - observability
  - dong-goi-gitops
  - mo-rong
---

Lộ trình dưới đây đi theo thứ tự **phụ thuộc**, không theo thứ tự tài liệu. Mỗi tầng
chỉ mở ra khi tầng dưới đã vững — nên nó bắt đầu từ Linux và mạng, không phải từ
`kubectl apply`.

## Hai nguyên tắc tôi tự đặt ra

**70% thời gian phải là gõ lệnh.** Mỗi khái niệm mới đi qua bốn bước: tạo → xem →
phá → sửa. Bước "phá" học được nhiều nhất và cũng là bước tôi hay bỏ.

**Không đọc quá 30 phút mà không chạm vào cluster.** K8s chỉ vào đầu qua tay.

## Môi trường

k3s chạy trên một VM Linux, không dùng `kind` hay Docker Desktop. Lý do: containerd
thật, systemd thật, sống qua reboot — đúng thứ sẽ gặp khi debug cluster của công ty.

## Nhịp dự kiến

12 tuần, khoảng 6 giờ mỗi tuần. Hai giai đoạn không được nén là **Nền tảng** và
**Networking** — đi tắt ở đó thì mãi phải copy YAML từ blog mà không hiểu.

Node màu xám là thứ tôi biết mình cần học nhưng chưa viết.
