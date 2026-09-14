---
title: "Tổng kết & bước tiếp theo"
description: Nhìn lại đã đi qua gì, và bản đồ những thứ nằm ngoài khoá.
order:
  - { slug: you-learned-a-lot, title: "259. Bạn đã học được rất nhiều!" }
  - { slug: related-topics, title: "260. Chủ đề liên quan có thể khám phá" }
  - { slug: next-steps, title: "261. Bước tiếp theo!" }
  - { slug: course-wrap-up, title: "262. Tổng kết khoá học" }
  - { slug: what-the-course-does-not-teach, title: "Ngoài khoá — năm mảng còn thiếu" }
---

Section ngắn nhất của khoá, **15 phút**, và cũng dễ bị bỏ qua nhất. Nhưng nó trả lời đúng câu
hỏi xuất hiện sau khi học xong: **giờ thì sao?**

## Self-check toàn tuyến

Không phải "đã xem hết video", mà là trả lời được sáu câu này không tra tài liệu:

- [ ] Container bị cách ly bằng **cơ chế nào**, cơ chế nào giới hạn **cái gì**?
- [ ] Vẽ được chuỗi từ `kubectl apply` tới container chạy
- [ ] Viết được Deployment + Service YAML từ đầu, không copy
- [ ] Nhìn `Exit Code: 137` là biết ngay chuyện gì đã xảy ra
- [ ] Nói được lúc nào dữ liệu trong Pod mất, lúc nào không
- [ ] Giải thích được ba cách Pod gọi Pod, và vì sao DNS thắng

## Năm mảng khoá không dạy

Bài **260** của khoá liệt kê chủ đề nên khám phá tiếp. Tôi thêm một note riêng cho
những thứ **đáng lẽ phải có** trong một khoá K8s, chứ không phải "nâng cao":

| Mảng | Vì sao cần | Khoá có? |
| --- | --- | --- |
| **Debug** | Pod hỏng là chuyện hằng ngày | ❌ |
| **requests / limits / QoS** | Không có thì cluster tự bóp chết mình | ❌ |
| **readiness & startup probe** | Khoá chỉ dạy `liveness` (bài 204) | ❌ |
| **RBAC & SecurityContext** | Bắt buộc khi cluster có nhiều người | ❌ |
| **Helm / Kustomize** | Khoá `kubectl apply -f` từ đầu tới cuối | ❌ |

Đây không phải chê khoá — nó là khoá **Docker & Kubernetes** cho người mới, và làm rất
tốt phần nó chọn làm. Chỉ là biết trước mình còn thiếu gì thì tốt hơn.

## Ba hướng đi tiếp, chọn theo mục tiêu

**Đọc hiểu manifest của team** — bạn xong rồi. Luyện thêm phần chẩn đoán:
`describe`, `logs --previous`, `get events`. Đó là kỹ năng dùng hằng ngày.

**Tự vận hành cluster** — học tiếp requests/limits, RBAC, Velero (backup), và phần
etcd mà khoá bỏ qua hoàn toàn.

**Chứng chỉ** — **CKAD** đúng vai, không phải CKA. CKAD thi kỹ năng người *dùng*
cluster; CKA thi kỹ năng *dựng và vá* cluster.

## Đối chiếu khoá học

Bài **259–262**. Bỏ 263 (Bonus — quảng cáo khoá khác).
