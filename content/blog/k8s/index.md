---
title: Kubernetes
description: Bảy section bám sát khoá Docker & Kubernetes, cộng một section nền tảng Linux.
status: seed
updated: 2026-08-21
tags: [k8s, devops, container]
order:
  - bat-dau-tu-dau
  - du-an-xuyen-suot
  - nen-tang
  - bat-dau-voi-k8s
  - k8s-thuc-chien
  - du-lieu-va-volume
  - networking
  - deploy-len-cloud
  - tong-ket
---

Giáo trình này **bám sát Section 11→16** của khoá *Docker & Kubernetes: The Practical
Guide* (Maximilian Schwarzmüller) — mỗi bài giảng là một note, giữ nguyên thứ tự và
số hiệu bài để đối chiếu.

Cộng thêm đúng **một section tôi tự thêm**: [Section 0 — Nền tảng](/blog/k8s/nen-tang).
Khoá giả định bạn đã biết Docker và không chạm tới Linux; thiếu namespace và cgroup
thì K8s mãi là ma thuật.

## Đối chiếu số section

Ở đây đánh số lại từ **0**, cho gọn. Bảng này để khỏi nhầm khi mở khoá ra xem:

| Ở đây | Trong khoá | Bài |
| --- | --- | --- |
| **Section 0** — Nền tảng | *không có* | — |
| **Section 1** — Bắt đầu với Kubernetes | Section 11 | 172–179 |
| **Section 2** — Kubernetes thực chiến | Section 12 | 182–206 |
| **Section 3** — Dữ liệu & Volume | Section 13 | 209–224 |
| **Section 4** — Networking | Section 14 | 227–241 |
| **Section 5** — Deploy lên cloud | Section 15 | 244–257 |
| **Section 6** — Tổng kết | Section 16 | 259–262 |

## Cách đọc số hiệu note

Tiêu đề note **không** mang số bài — số nằm ở mục *Đối chiếu khoá học* cuối mỗi index
section. Xem xong một bài thì viết note tương ứng; tra bảng đó để biết mình đang ở đâu.

Ba loại bài tôi **không** tạo note:

| Loại | Vì sao bỏ |
| --- | --- |
| Module Introduction / Resources | Nhịp của video, không có nội dung để ghi |
| **184, 185** — setup macOS/Windows | Đã thay bằng k3s trên VM Linux |
| 263 — Bonus | Quảng cáo khoá khác |

## Hai nguyên tắc tôi tự đặt ra

**70% thời gian phải là gõ lệnh.** Xem video xong mà không mở terminal thì note viết
ra chỉ là chép lại lời giảng.

**Mỗi bài tập đoán trước khi chạy.** Đoán sai là kết quả tốt hơn đoán đúng — đoán đúng
chỉ xác nhận cái đã biết, đoán sai mới lộ ra lỗ hổng.

## Nhịp dự kiến

Khoá là **8h42 video**. Cộng thời gian thực hành và ghi note, khoảng 10 tuần ở nhịp
6 giờ/tuần — chưa tính Section 0 (2 tuần).

Node màu xám là bài tôi chưa viết note.
