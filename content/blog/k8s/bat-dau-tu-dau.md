---
title: Bắt đầu từ đâu, và học tới đâu thì dừng
description: Mục tiêu cụ thể, phạm vi cắt bỏ, và vì sao lộ trình này bắt đầu từ Linux.
status: seed
created: 2026-08-18
updated: 2026-08-21
tags: [k8s, mindset]
---

Tôi làm web — cả frontend lẫn backend với NestJS và .NET. Lý do học Kubernetes không
phải để vận hành cluster production, mà vì một chuyện rất cụ thể: mỗi lần app lên
staging bị lỗi, tôi không đọc nổi thứ team ops gửi qua Slack.

## Mục tiêu

Không phải "thành thạo K8s". Cụ thể hơn nhiều:

1. Đọc hiểu một manifest bất kỳ trong repo của team
2. Tự debug tới bước *"Pod của tôi lỗi vì lý do X"*, thay vì chỉ báo "nó không chạy"
3. Deploy được một hệ nhiều service lên cluster từ số 0

## Thứ tôi chủ động bỏ qua

Đây là phần quan trọng nhất và ít ai nói ra. Cắt được những thứ này thì lộ trình
còn lại vừa sức trong khoảng 3 tháng.

| Bỏ qua | Lý do |
|---|---|
| Bootstrap cluster bằng `kubeadm` | Tôi sẽ không tự dựng cluster production |
| Nội tại CNI (Calico, Cilium, BGP) | Biết "Pod có IP riêng, route được với nhau" là đủ |
| Backup/restore etcd, upgrade cluster | Việc của platform team |
| Viết CSI driver, Operator | Để sau, nếu có nhu cầu thật |
| Chứng chỉ CKA | CKA thi cho ops. Đúng vai tôi là **CKAD** |

## Giáo trình đi theo cái gì

Tôi bám sát **Section 11→16 của khoá** *Docker & Kubernetes: The Practical Guide*, mỗi
bài giảng một note, giữ nguyên số hiệu để đối chiếu. Lý do: khoá kéo **một dự án duy
nhất** đi xuyên suốt, nên mỗi khái niệm mới đều có chỗ để dùng ngay.

Tôi chỉ thêm đúng một thứ khoá không có — [Section 0](/blog/k8s/nen-tang) về Linux —
và ghi rõ ở cuối mỗi section những mảng khoá bỏ trắng, để sau này biết đường bổ sung.

## Vì sao không bắt đầu từ `kubectl`

Lần đầu tôi nhảy thẳng vào `Deployment` và copy YAML từ blog. Kết quả: gõ được lệnh
nhưng không hiểu gì. `Deployment` chỉ có nghĩa khi đã hiểu `Pod`, mà `Pod` chỉ có
nghĩa khi đã biết container là gì ở mức kernel.

Nên lộ trình này bắt đầu từ namespace và cgroup của Linux. Nghe xa, nhưng đó là chỗ
duy nhất khiến phần còn lại hết huyền bí.

## Môi trường

Một VM Linux chạy trên máy Windows, cài k3s bằng một lệnh:

```bash
curl -sfL https://get.k3s.io | sh -
```

Kéo kubeconfig về Windows để `kubectl` từ máy thật:

```bash
sudo cat /etc/rancher/k3s/k3s.yaml
```

Copy vào `~/.kube/config`, sửa `server: https://127.0.0.1:6443` thành IP của VM.

## Câu hỏi còn mở

- k3s lược bỏ những gì so với K8s đầy đủ? Có chỗ nào lược bỏ ảnh hưởng tới việc học không?
- Khi nào nên chuyển từ single-node sang multi-node để học scheduling cho đúng?
