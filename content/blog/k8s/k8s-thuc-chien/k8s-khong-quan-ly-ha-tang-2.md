---
title: "Kubernetes không quản lý hạ tầng"
description: Khoá nhắc lại lần thứ hai, ngay trước khi bạn gõ lệnh đầu tiên — để trả lời câu hỏi cái cluster sắp dùng ở đâu ra.
status: seed
created: 2026-08-25
updated: 2026-08-25
tags: [k8s, mindset, infra]
---

[Section trước đã nói chuyện này rồi](/blog/k8s/bat-dau-voi-k8s/k8s-khong-quan-ly-ha-tang).
Khoá nhắc lại ở đây không phải vì quên — mà vì **vị trí**: bạn sắp gõ `kubectl` lần đầu,
và câu hỏi *"cái cluster này ở đâu ra"* đúng lúc này mới thành câu hỏi thật.

## Lần trước là nguyên tắc, lần này là hoá đơn

| Trước khi có `kubectl` chạy được | Ai làm |
| --- | --- |
| Có một máy Linux | Bạn thuê / dựng VM |
| Máy đó có container runtime | Bộ cài k3s làm hộ |
| Có một tiến trình control plane | Bộ cài k3s làm hộ |
| Máy đó mở đúng cổng cho bạn vào | Bạn, trong firewall |
| Bạn có kubeconfig để nói chuyện với nó | Bạn copy về |

Chỉ **sau** khi năm dòng trên xong, K8s mới bắt đầu có việc để làm.

## Bài tập — cluster là thứ bạn đã tự dựng

**Đoán trước:** `kubectl get nodes` in ra node của bạn. Vậy nếu tắt tiến trình k3s trên
máy đó đi, `kubectl` sẽ báo lỗi gì — "node not found", hay một lỗi hoàn toàn khác?

```bash
kubectl get nodes -o wide
kubectl cluster-info
systemctl status k3s --no-pager | head -5
```

**Kết quả:** ba lệnh cho thấy ba tầng khác nhau của cùng một thứ. `get nodes` là **bản
ghi** trong cơ sở dữ liệu; `cluster-info` là **địa chỉ** bạn đang gọi tới; `systemctl`
là **tiến trình Linux thật** đang chạy trên máy — do bạn cài, sống nhờ systemd, chết
theo máy.

Thử tắt nó:

```bash
sudo systemctl stop k3s && kubectl get nodes; sudo systemctl start k3s
```

Lỗi không phải "node not found" mà là `connection refused` — **kubectl không kết nối
được tới đâu cả**. Không có cluster nào để hỏi. Đó là bằng chứng gọn nhất: cluster
không phải một dịch vụ ở đâu đó, nó là một tiến trình trên máy bạn.

## Vì sao chuyện này quyết định cách bạn debug

Khi Pod không lên, phản xạ là mở `kubectl describe`. Nhưng một phần lớn nguyên nhân
**không nằm trong cluster**: hết IP trong subnet, firewall chặn cổng 10250, đĩa đầy,
DNS của máy hỏng. `kubectl` không bao giờ nói cho bạn mấy thứ đó.

Nguyên tắc rút ra: **lỗi nào cũng phải hỏi "tầng nào" trước khi hỏi "object nào"**.

## Tự kiểm

- [ ] Kể được năm thứ phải có trước khi `kubectl` chạy được câu lệnh đầu tiên
- [ ] Giải thích được vì sao tắt k3s thì lỗi là `connection refused` chứ không phải "không thấy node"

## Câu hỏi còn mở

- Trên EKS thì ai giữ tiến trình control plane, và bạn còn `systemctl status` được gì?
