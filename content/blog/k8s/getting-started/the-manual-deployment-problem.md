---
title: "Vấn đề của deploy thủ công"
description: Docker đã đóng gói xong app. Vậy còn thiếu gì mà phải cần thêm một tầng nữa?
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [k8s, mindset]
---

Đến đây bạn đã đóng gói được app bằng Docker và chạy nó trên một server. Vậy tại sao
lại cần thêm cả một hệ thống nữa?

Câu trả lời không nằm ở *"K8s hay ho ra sao"*, mà ở **những việc bạn phải tự làm** khi
chỉ có Docker.

## Deploy thủ công trông như thế nào

```bash
ssh user@server
docker pull myapp:v2
docker stop myapp && docker rm myapp
docker run -d --name myapp -p 80:3000 myapp:v2
```

Bốn dòng. Chạy được. Vấn đề bắt đầu từ dòng thứ năm trở đi.

## Sáu câu hỏi mà bốn dòng trên không trả lời được

| Chuyện xảy ra | Ai lo? |
| --- | --- |
| Container crash lúc 3 giờ sáng | **Bạn**, nếu đang thức |
| Traffic tăng gấp 10 | **Bạn**, ssh vào chạy thêm container |
| Cần chạy trên 5 server | **Bạn**, ssh 5 lần, và nhớ đúng thứ tự |
| Giữa `stop` và `run` có downtime | Không ai — user chịu |
| Server chết hẳn | **Bạn**, dựng server mới lúc nửa đêm |
| App lên nhưng chưa sẵn sàng nhận request | Không ai — user nhận lỗi 502 |

Từng cái một đều giải quyết được bằng script. Vấn đề là **cộng lại**: bạn đang tự viết
một hệ điều phối, chỉ là viết dở và không ai review.

## `--restart=always` giải quyết được bao nhiêu?

Docker có sẵn restart policy, nên câu đầu tiên coi như xong:

```bash
docker run -d --restart=always myapp:v2
```

Nhưng nó chỉ restart **process chết**. Nếu app còn sống mà đã treo — vòng lặp vô hạn,
deadlock, mất kết nối DB — Docker thấy container vẫn `Up` và không làm gì cả.

Đây là khác biệt giữa *"process còn chạy"* và *"app còn phục vụ được"*. Docker chỉ biết
cái thứ nhất. Muốn biết cái thứ hai thì phải có **health check chủ động** — và phải có
ai đó hành động khi health check fail.

## Chỗ thật sự gãy: nhiều máy

Mọi thứ trên vẫn xoay xở được khi có **một** server. Sang server thứ hai thì xuất hiện
những câu hỏi không có lời giải bằng `docker run`:

- Container này nên chạy ở máy nào? Máy nào còn RAM?
- Máy 2 chết thì container của nó chuyển sang máy 1 kiểu gì?
- App ở máy 1 gọi app ở máy 3 bằng địa chỉ nào, khi IP đổi liên tục?
- Deploy phiên bản mới lên cả 5 máy mà không có phút nào chết hẳn?

Đây mới là bài toán Kubernetes sinh ra để giải. Không phải *"chạy container"* — Docker
làm việc đó rồi — mà là **điều phối container trên nhiều máy**.

## Self-check

- [ ] Kể được ít nhất bốn việc bạn phải tự làm khi deploy thủ công
- [ ] Giải thích được vì sao `--restart=always` chưa đủ
- [ ] Nói được vì sao bài toán chỉ thật sự khó khi có nhiều hơn một máy

## Open questions

- Docker Compose giải quyết được tới đâu trong danh sách trên?
- Ở quy mô nào thì tự viết script vẫn rẻ hơn dựng K8s?
