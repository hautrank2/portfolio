---
title: "Tổng kết"
description: Nhìn lại đã đi qua gì, còn thiếu gì để tự học tiếp, và toàn bộ source code đã dùng.
order:
  - { slug: what-you-learned, title: "9.1 Những gì đã học" }
  - { slug: what-to-learn-next, title: "9.2 Những gì có thể tự học thêm" }
  - { slug: all-source-code, title: "9.3 Toàn bộ source code đã dùng" }
---

Section ngắn nhất, và cũng dễ bị bỏ qua nhất. Nhưng nó trả lời đúng ba câu hỏi xuất hiện sau
khi đóng note cuối của [section 8](/blog/k8s/deploy-to-cloud):

| Câu hỏi | Note |
| --- | --- |
| **Mình đã học được gì**, và đã thật sự nắm chưa? | [9.1](/blog/k8s/wrap-up/what-you-learned) |
| **Còn thiếu gì**, học tiếp theo thứ tự nào? | [9.2](/blog/k8s/wrap-up/what-to-learn-next) |
| **Code ở đâu**, nếu muốn làm lại một section? | [9.3](/blog/k8s/wrap-up/all-source-code) |

## Đi nhanh qua cả tuyến

| Section | Một câu | Dự án |
| --- | --- | --- |
| [Nền tảng](/blog/k8s/foundations) | Container là tiến trình Linux bị cách ly, không phải máy ảo nhỏ | — |
| [Bắt đầu](/blog/k8s/getting-started) | Cluster là control plane ra lệnh, worker node làm việc | — |
| [Thực chiến](/blog/k8s/k8s-in-action) | Khai trạng thái muốn có bằng YAML, K8s tự kéo cụm về đó | `first-app`, `second-app` |
| [Dữ liệu & Volume](/blog/k8s/data-and-volumes) | Dữ liệu sống lâu hơn Pod chỉ khi nằm ngoài Pod | `kub-data-01-starting-setup` |
| [Networking](/blog/k8s/networking) | Pod gọi nhau bằng tên Service, không bằng IP | `kub-network-01-starting-setup` |
| [Deploy lên cloud](/blog/k8s/deploy-to-cloud) | Cùng bộ YAML, nhưng mọi tầng bên dưới giờ là việc của bạn | `kub-demo-cafe-system` |

## Trước khi đóng lại

Nếu cụm EKS ở section 8 vẫn còn chạy, làm
[8.19](/blog/k8s/deploy-to-cloud/cleaning-up) **trước** khi đọc tiếp. Ba note của section này
không cần cụm nào cả — phần thực hành gợi ý ở 9.2 chạy được hết trên k3d, miễn phí.

## Đối chiếu khoá học

Bài **259–262** của khoá *Docker & Kubernetes: The Practical Guide*. Ba note ở đây không
bám từng bài như các section trước, mà gộp lại theo ba câu hỏi ở trên. Bỏ 263 (Bonus —
quảng cáo khoá khác).
