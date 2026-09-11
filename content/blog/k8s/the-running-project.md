---
title: Dự án xuyên suốt
description: Một app duy nhất lớn dần qua từng section. Mỗi khái niệm mới đều gắn vào nó.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [k8s, lab]
---

Đây là điểm mạnh nhất của khoá học, và là lý do tôi bám sát nó thay vì tự chia lại
theo khái niệm: **một app duy nhất, lớn dần**.

Học K8s bằng những Pod `nginx` rời rạc thì không bao giờ cần Service discovery, không
cần volume, không cần ConfigMap — nên mọi khái niệm đó đều thành trừu tượng.

## Hình dạng cuối cùng

```
      ┌──────────────┐
      │   frontend   │  nginx phục vụ file tĩnh + reverse proxy
      └──────┬───────┘
             │
      ┌──────┴───────┐
      │  tasks-api   │  ghi/đọc tasks.txt  ──►  volume
      └──────┬───────┘
             │  gọi để xác thực
      ┌──────┴───────┐
      │  users-api   │
      └──────────────┘
```

Ba service, cố ý **không** dùng database. Mục tiêu là học K8s, không phải học vận hành
Postgres. Một file `tasks.txt` trên volume dạy đúng bài học persistence mà không kéo
theo StatefulSet, migration, connection pool.

## Mốc theo từng section

| Section | Dự án đạt tới đâu | Bài của khoá |
| --- | --- | --- |
| **1** — Bắt đầu | Chưa có gì, mới là lý thuyết | 172–179 |
| **2** — Thực chiến | `users-api` chạy, scale được, rollback được, mô tả bằng YAML | 188–205 |
| **3** — Dữ liệu | `tasks-api` ghi `tasks.txt`, sống qua Pod restart | 209–223 |
| **4** — Networking | Ba service gọi nhau bằng tên, có frontend | 227–240 |
| **5** — Cloud | Chạy trên cluster nhiều node, có LoadBalancer | 244–257 |

## Nguyên tắc: mỗi section phải deploy được

Kết thúc mỗi section, dự án phải **chạy được** — không để lại trạng thái nửa vời.
Nếu một section kết thúc mà `kubectl get pods` không xanh hết, nghĩa là chưa xong.

Đây cũng là lý do app giữ thật đơn giản: đủ để cần tới khái niệm đang học, không đủ
để bản thân nó thành một dự án phải bảo trì.

## Lấy code ở đâu

Khoá phát mỗi module một file `starting-setup.zip` — dùng luôn là nhanh nhất, và mỗi
bài sau lại có bản `-finished` để đối chiếu.

Tự viết cũng nhanh không kém: mỗi service khoảng 30 dòng Express, một endpoint đọc/ghi
file, một endpoint `/health`.

Tôi nghiêng về **tự viết**, vì sau này khi bổ sung `readinessProbe` — thứ khoá không
dạy — thì cần sửa chính cái endpoint đó. Sửa code mình viết thì hiểu hơn sửa code tải
về.

## Câu hỏi còn mở

- Có nên thêm database ở cuối để chạm tới StatefulSet không, hay để thành track riêng?
- File trên volume vs database — bài học persistence khác nhau thật sự ở chỗ nào?
