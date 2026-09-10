---
title: "6.2 Volume của K8s — nhiều hơn Docker volume"
description: Định nghĩa cho gọn "state" là gì, rồi thấy vì sao K8s vẫn cần volume — và vì sao volume của nó không phải một thứ mà là cả một họ.
status: growing
created: 2026-09-10
updated: 2026-09-10
tags: [k8s, volume, state, docker]
---

[Note 6.1](/blog/k8s/du-lieu-va-volume/du-an-khoi-diem) cho thấy Docker giải bài này bằng
một dòng. Trước khi bê sang K8s, gọi tên cho chính xác **thứ đang được bảo vệ** — vì
không phải dữ liệu nào cũng đáng gắn volume.

## "State" là gì

> **State là dữ liệu do app tạo ra và dùng tới, mà không được phép mất.**

Vế sau mới là vế quan trọng. Không phải mọi thứ container ghi ra đĩa đều là state:
`node_modules`, file log đã đẩy đi nơi khác, ảnh thumbnail sinh lại được — mất hết cũng
không sao, dựng lại là có.

State chia làm hai loại, và chúng không giống nhau chút nào:

| | Dữ liệu người dùng tạo ra | Kết quả trung gian app tự sinh |
| --- | --- | --- |
| Ví dụ | Tài khoản, bài đăng, file upload | Cache, bảng tạm, kết quả tính dở |
| Thường nằm ở | Database, đôi khi là file | Bộ nhớ, bảng tạm, file tạm |
| Mất thì sao | **Mất là mất thật**, không dựng lại được | Tính lại được, chỉ chậm đi |
| Cần sống lâu bằng | Lâu hơn cả cụm | Thường chỉ cần bằng một Pod |

Cả hai đều cần volume, nhưng **cần hai kiểu volume khác nhau** — và đó chính là lý do
K8s không đưa cho bạn đúng một loại như Docker.

Với app `stories`: `story/text.txt` là loại thứ nhất. Người dùng gõ vào, không có bản
sao nào khác, mất là xong.

## Vì sao câu trả lời vẫn là Volume

Chuỗi lập luận ngắn đến bất ngờ:

```
   Volume  ──►  vì ta vẫn đang làm việc với CONTAINER
      │
      ▼
   K8s chạy container của ta
      │
      ▼
   nên phải cấu hình K8s để gắn Volume vào container
```

K8s không phát minh ra vấn đề mới. Nó **chạy container**, mà container thì vẫn mất lớp
ghi khi bị xoá — y hệt Docker, y hệt cơ chế ở
[image và layer](/blog/k8s/nen-tang/container/image-va-layer). Cùng một vấn đề thì cùng
một loại giải pháp.

Khác biệt duy nhất: ở Docker bạn khai volume cho **container**, ở K8s bạn khai volume
cho **Pod** — rồi nói rõ container nào trong Pod mount nó vào đâu.

## Bài tập — Nhìn thấy ranh giới lớp ghi

**Đoán trước:** app đang chạy với volume gắn ở `/app/story`. Nếu bạn ghi một file vào
`/tmp` và một dòng vào `/app/story/text.txt`, `docker diff` sẽ thấy mấy thứ?

```bash
cd kub-data-01-starting-setup && docker compose up -d
```

```bash
docker compose exec stories sh -c 'echo rac > /tmp/rac.txt'
```

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"vao volume"}' http://localhost:3000/story
```

```bash
docker diff $(docker compose ps -q stories)
```

**Kết quả:** chỉ thấy `/tmp/rac.txt`.

```
C /tmp
A /tmp/rac.txt
```

Dòng bạn vừa POST **không hề xuất hiện**, dù nó chắc chắn đã được ghi xuống đĩa.

`docker diff` liệt kê những gì khác nhau giữa **lớp ghi của container** và image. File
`/tmp/rac.txt` nằm trong lớp ghi nên có mặt. Còn `/app/story` đã bị volume đè lên — mọi
thứ ghi vào đó đi thẳng ra ngoài container, không đụng tới lớp ghi, nên `diff` không
thấy gì cả.

Đó là toàn bộ ý nghĩa của một volume, nhìn từ bên trong: **một cái lỗ trên sàn container**.

Dọn:

```bash
docker compose down -v
```

## "Nhiều hơn Docker volume" ở chỗ nào

Docker volume là **một thứ**: một thư mục do daemon quản lý, sống trên đúng cái máy đó,
tồn tại tới khi bạn `docker volume rm`.

Volume của K8s là **một họ**. Bạn không khai "gắn cho tôi một volume", bạn phải chọn
**kiểu**, và mỗi kiểu trả lời khác nhau cho ba câu hỏi sau:

| Câu hỏi | Vì sao Docker không phải hỏi |
| --- | --- |
| Dữ liệu sống lâu bằng gì — container, Pod, hay lâu hơn cụm? | Docker chỉ có một mức: lâu hơn container |
| Nó nằm **trên node nào**, và Pod dời node thì sao? | Docker chỉ có một máy |
| Ai cấp chỗ chứa — node, quản trị viên, hay nhà cung cấp cloud? | Docker tự cấp, khỏi hỏi |

Và đây là chỗ dễ vấp nhất, nói trước để khỏi bất ngờ ở note 6.6:

> **"Volume" trong K8s không mặc nhiên có nghĩa là "dữ liệu được giữ lại".** Kiểu
> `emptyDir` chết cùng Pod. Kiểu `hostPath` sống trên node và không đi theo Pod. Chỉ tới
> `PersistentVolume` thì mới có thứ giống Docker volume mà bạn quen.

Bốn note sau lần lượt là bốn câu trả lời đó, theo đúng thứ tự từ yếu tới mạnh.

## Tự kiểm

- [ ] Định nghĩa được state trong một câu, và nói được vế nào là vế quan trọng
- [ ] Phân biệt hai loại state, và vì sao chúng cần mức bền khác nhau
- [ ] Giải thích được vì sao K8s vẫn cần volume dù đã có Deployment tự dựng lại Pod
- [ ] Nói được vì sao `docker diff` không thấy file nằm trong volume
- [ ] Kể được ba câu hỏi mà Docker không phải trả lời còn K8s thì phải

## Câu hỏi còn mở

- Cache là state loại hai — vậy có bao giờ đáng gắn volume cho nó không?
- Nếu volume khai ở mức Pod, hai container trong cùng Pod dùng chung được không?
