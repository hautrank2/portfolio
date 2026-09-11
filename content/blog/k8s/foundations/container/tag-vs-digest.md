---
title: Tag và digest — vì sao staging khác production
description: Tag là nhãn dán di chuyển được. Digest là dấu vân tay. Nhầm hai cái này trả giá bằng một đêm debug.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [container, image, registry]
---

Kịch bản có thật ở mọi công ty: staging chạy ngon, deploy production **cùng
một tag** — lỗi. "Cùng image mà?!" Không. Cùng **tag** thôi. Note này để bạn
không bao giờ nói câu đó.

## Lý thuyết vừa đủ

| | Tag | Digest |
| --- | --- | --- |
| Hình dạng | `nginx:1.27` | `nginx@sha256:3b7732505933...` |
| Bản chất | **Nhãn dán** — con trỏ trong registry | **SHA-256 của manifest** — dấu vân tay nội dung |
| Đổi được? | **Có.** Push lần nữa là tag trỏ sang image khác | **Không.** Đổi 1 byte là ra digest khác |
| Trả lời câu | "cho tôi bản mới nhất mang tên này" | "cho tôi chính xác bản này" |

Hệ quả chết người: hai máy `pull nginx:1.27` ở **hai thời điểm khác nhau** có
thể nhận **hai image khác nhau** — nếu ai đó đã push đè tag ở giữa. Với
`:latest` chuyện này xảy ra hằng ngày; với tag version nó hiếm hơn nhưng vẫn
xảy ra (rebuild vá bảo mật, CI cấu hình ẩu).

> **Chuẩn bị:** chạy trên VM, cần `docker`. Bài 2 dựng registry local trong
> một container — không đụng gì tới Docker Hub.

## Bài tập 1 — Nhìn digest của image đang có

```bash
docker pull nginx:alpine
docker image inspect nginx:alpine --format '{{index .RepoDigests 0}}'
#                             └─ phần tử đầu của RepoDigests
```

```
nginx@sha256:5f12...
```

Đó là căn cước thật. Và pull bằng chính nó được — không cần tag:

```bash
docker pull nginx@sha256:<dán-digest-vừa-thấy>
```

**Đoán trước:** `docker image ls` sau lệnh trên hiện thêm image mới, hay vẫn
là cái cũ? (Gợi ý: digest trỏ vào nội dung, mà nội dung đã có sẵn trên đĩa.)

## Bài tập 2 — Tự tay push đè tag và chứng kiến "cùng tag, khác ruột"

Dựng registry của riêng mình để nghịch thoải mái:

```bash
docker run -d --name reg -p 5000:5000 registry:2
#                              └─ registry chuẩn của Docker, chạy local
```

Tạo bản v1, đóng tag `app:1.0`, push:

```bash
mkdir -p /tmp/tagdemo && cd /tmp/tagdemo
printf 'FROM alpine:3.20\nRUN echo "BAN MOT" > /ban.txt\n' > Dockerfile
docker build -q -t localhost:5000/app:1.0 .
#            │    └─ tên registry nằm ngay trong tên image
#            └─ -q : chỉ in ID, đỡ ồn
docker push localhost:5000/app:1.0
docker image inspect localhost:5000/app:1.0 \
  --format '{{index .RepoDigests 0}}'
```

Ghi lại digest. Giờ **kẻ xấu** (là bạn 30 giây sau) build bản khác và push đè
**đúng tag đó**:

```bash
printf 'FROM alpine:3.20\nRUN echo "BAN HAI" > /ban.txt\n' > Dockerfile
docker build -q -t localhost:5000/app:1.0 .
docker push localhost:5000/app:1.0
docker image inspect localhost:5000/app:1.0 \
  --format '{{index .RepoDigests 0}}'
```

**Kết quả:** cùng `app:1.0`, digest **khác hẳn**. Registry không hề phản đối.
Máy nào pull trước giờ phút này giữ bản MOT, máy pull sau nhận bản HAI —
**"staging khác production" vừa xảy ra trước mắt bạn**, trong 2 phút.

Chốt hạ bằng cách pull theo digest cũ:

```bash
docker pull localhost:5000/app@sha256:<digest-ĐẦU-TIÊN>
docker run --rm localhost:5000/app@sha256:<digest-ĐẦU-TIÊN> cat /ban.txt
```

`BAN MOT` quay về nguyên vẹn — digest không phản bội ai bao giờ.

Dọn:

```bash
cd ~ && docker rm -f reg && rm -rf /tmp/tagdemo
docker rmi -f $(docker image ls -q localhost:5000/app)
```

## Bài tập 3 — imagePullPolicy: mảnh còn lại của câu đố

K8s thêm một biến nữa: **node có pull lại image không, hay dùng bản đã có?**

| `imagePullPolicy` | Hành vi | Mặc định khi |
| --- | --- | --- |
| `IfNotPresent` | Có sẵn trên node thì dùng luôn, kệ registry | tag thường |
| `Always` | Lần nào tạo container cũng hỏi registry | tag `:latest` hoặc không tag |
| `Never` | Không bao giờ pull | — |

**Đoán trước:** cluster 3 node chạy `app:1.0` policy `IfNotPresent`. Ai đó
push đè `app:1.0` rồi một Pod bị dời sang node **chưa từng** pull image này.
Giờ cluster đang chạy mấy phiên bản code?

Trả lời: **hai** — node cũ chạy bản cũ trong cache, node mới pull được bản
mới. Cùng manifest, cùng tag, hai hành vi. Loại bug gần như không debug nổi
nếu không biết cơ chế này.

**Cách làm đúng ngoài đời**, chọn một:

1. **Tag bất biến theo quy ước**: mỗi lần build một tag mới (`app:1.0.3`,
   `app:git-a1b2c3`), không bao giờ push đè. Rẻ, đủ dùng cho hầu hết team.
2. **Ghim digest trong manifest**: `image: app@sha256:...` — máy móc đảm bảo,
   thường do CI/CD hoặc công cụ như Flux tự điền.

## Tự kiểm

- [ ] Nói được tag và digest khác nhau ở chỗ nào bằng một câu mỗi cái
- [ ] Tự tái hiện được "cùng tag khác ruột" bằng registry local
- [ ] Giải thích được vì sao `:latest` + `IfNotPresent` là cặp đôi nguy hiểm
- [ ] Kể được hai chiến lược chống lệch version, và team nhỏ nên dùng cái nào

## Câu hỏi còn mở

- Cosign/ký image liên hệ gì với digest?
- `kubectl set image` ghi tag hay digest vào spec, và nghĩa là gì khi rollback?
- Registry garbage-collect layer mồ côi thế nào khi tag bị đè liên tục?
