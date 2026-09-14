---
title: "6.1 Dự án khởi điểm & những gì đã biết"
description: Ôn lại volume ở mức Docker — xoá sạch container rồi dựng lại, dữ liệu vẫn còn nguyên.
status: growing
created: 2026-09-10
updated: 2026-09-10
tags: [docker, volume, state]
---

Trước khi đụng tới K8s, chạy app của section này bằng **Docker** một lượt. Ở đây bạn đã
biết sẵn câu trả lời, nên nó thành cái mốc để đối chiếu: cùng bài toán đó, K8s sẽ phải
làm nhiều hơn hẳn.

📦 [Tải source về](/code/kub-data-01-starting-setup.zip) — giải nén ra thư mục
`kub-data-01-starting-setup`.

## App có gì

Hai route, cả hai đụng vào **một file duy nhất**:

```js
const filePath = path.join(__dirname, 'story', 'text.txt');

app.get('/story',  ...);   // fs.readFile   — đọc ra
app.post('/story', ...);   // fs.appendFile — ghi thêm vào

app.listen(3000);
```

Không database, không cache. **File chính là toàn bộ trạng thái**, nên mất file là mất
sạch — dễ thấy bằng mắt, đó là lý do khoá chọn app này.

Và một dòng trong `docker-compose.yaml` là toàn bộ lời giải của Docker:

```yaml
services:
  stories:
    build: .
    volumes:
      - stories:/app/story      # ← dòng đáng chú ý
    ports:
      - 3000:3000
volumes:
  stories:
```

Hai con số trong `3000:3000` không giống nhau về ý nghĩa: **vế trái là cổng trên máy
bạn, vế phải là cổng trong container**. Vế phải phải là `3000` vì `app.listen(3000)`
khai vậy — đổi nó là hỏng. Còn vế trái tuỳ bạn: `8000:3000`, `4500:3000` đều được, chỉ
cần nhớ thay lại trong các lệnh `curl` bên dưới.

Source gốc của khoá dùng `80:3000`. Tôi đổi sang `3000:3000` vì trên máy chạy k3s thì
cổng 80 đã bị Traefik giữ, `docker compose up` sẽ báo `address already in use`.

## Bài tập 1 — Dựng lên và ghi một dòng

```bash
cd kub-data-01-starting-setup && docker compose up -d
```

Compose sẽ cằn nhằn `the attribute version is obsolete` — vô hại, file này viết từ 2020.
Xoá dòng `version: "3"` là hết.

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"text":"dong dau tien"}' http://localhost:3000/story
```

```bash
curl http://localhost:3000/story
```

**Kết quả:** `{"story":"dong dau tien\n"}`. Ghi thêm vài dòng nữa cho có cảm giác đây là
dữ liệu thật.

Gọi từ máy khác không được thì đó là chuyện mạng của VM, không phải của app — thử
`curl localhost:3000/story` ngay trên VM trước để tách bạch hai thứ.

## Bài tập 2 — Xoá sạch container rồi dựng lại

**Đoán trước:** `docker compose down` **xoá hẳn** container, không phải dừng. Container
mới lát nữa sẽ được dựng lại từ image — mà image thì chứa `text.txt` rỗng. Vậy dòng bạn
vừa ghi còn hay mất?

```bash
docker compose down
```

```bash
docker ps -a | grep stories || echo "khong con container nao"
```

Container **đã biến mất thật**, không phải chỉ dừng.

```bash
docker compose up -d
```

```bash
curl http://localhost:3000/story
```

**Kết quả:** `{"story":"dong dau tien\n"}` — **vẫn còn nguyên.**

## Vì sao còn

Vì `text.txt` chưa bao giờ nằm trong container. Dòng `stories:/app/story` gắn một
**named volume** đè lên thư mục `/app/story`, nên mọi thứ app ghi ra đều đi thẳng vào
volume đó — một thư mục do Docker quản lý, nằm ngoài container.

Volume vẫn nằm đó sau khi container chết:

```bash
docker volume ls | grep stories
```

```
local     kub-data-01-starting-setup_stories
```

`docker compose down` xoá container và network, **không đụng tới named volume**. Đó là
mặc định cố ý: Docker coi dữ liệu đáng giá hơn container.

Muốn xoá thật thì phải nói thẳng:

```bash
docker compose down -v
```

```bash
docker compose up -d && curl http://localhost:3000/story
```

**Kết quả:** `{"story":""}`. Giờ mới sạch — và cờ `-v` đó là ranh giới giữa "dựng lại
app" và "mất dữ liệu".

## Ba điều mang sang phần K8s

| Ở Docker | Hỏi lại khi sang K8s |
| --- | --- |
| Volume sống lâu hơn container | Volume sống lâu hơn **Pod**, hay chết cùng Pod? |
| Volume nằm trên máy chạy Docker | Pod dời sang node khác thì dữ liệu đi theo hay ở lại? |
| Khai bằng **một dòng** | Vì sao K8s cần tới `PersistentVolume` **và** `PersistentVolumeClaim`? |

Docker chỉ có một máy nên không phải hỏi mấy câu này. K8s có nhiều node, và đó là toàn
bộ lý do phần còn lại của section dài đến vậy.

Cùng cơ chế lớp ghi đã dựng ở
[image và layer](/blog/k8s/foundations/container/images-and-layers) và
[mount & overlayfs](/blog/k8s/foundations/linux/mount-and-overlayfs) — note này chỉ là lần
xác nhận cuối trước khi đổi sân.

## Dọn trước khi sang bài sau

```bash
docker compose down -v
```

Các note sau dựng lại app này **trong cluster**, cũng ở cổng 3000. Để compose chạy song
song thì hai bên tranh cổng, và tệ hơn là bạn dễ nhầm mình đang gọi vào cái nào.

## Self-check

- [ ] Nói được vì sao `docker compose down` không làm mất dữ liệu
- [ ] Biết cờ nào mới thật sự xoá volume
- [ ] Chỉ ra được dữ liệu đang nằm ở đâu, nếu không phải trong container
- [ ] Đặt được ba câu hỏi ở bảng trên trước khi đọc tiếp

## Open questions

- Hai container cùng gắn một named volume thì ghi đồng thời có sao không?
- Volume đó nằm ở chỗ nào trên đĩa máy thật? (gợi ý: `docker volume inspect`)
