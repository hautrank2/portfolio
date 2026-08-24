---
title: Dockerfile multi-stage và cache layer
description: Hai kỹ thuật quyết định image 1GB hay 100MB, build 5 phút hay 5 giây.
status: seed
created: 2026-08-21
updated: 2026-08-21
tags: [container, dockerfile, build]
---

Đây là bài cuối của Section 0, và là bài "thu hoạch": mọi thứ đã học về layer,
whiteout, cache — giờ đổi thành hai kỹ năng đo được bằng con số: **image nhỏ
hơn** và **build nhanh hơn**.

## Lý thuyết vừa đủ

**Cache layer** (ôn từ [bài image & layer](/blog/k8s/nen-tang/container/image-va-layer)):
Docker build từ trên xuống, gặp chỉ thị chưa đổi thì dùng lại layer cũ — nhưng
**từ chỗ đổi đầu tiên trở đi, mọi thứ build lại hết**. Suy ra nguyên tắc vàng:

> **Thứ ít đổi lên trên, thứ hay đổi xuống dưới.**

**Multi-stage**: một Dockerfile nhiều `FROM`. Stage đầu là công xưởng (đầy đồ
nghề build), stage cuối là phòng trưng bày — chỉ `COPY --from` đúng sản phẩm
sang. **Toàn bộ layer của stage trước không đi vào image cuối.** Đây là cách
duy nhất thật sự vứt được đồ nghề, vì `RUN rm` chỉ tạo whiteout như bạn đã
chứng kiến.

> **Chuẩn bị:** chạy trên VM, cần `docker`. Bài dùng một app Node tối giản —
> tạo tại chỗ, không cần code sẵn.

## Bài tập 1 — Dockerfile ngây thơ, và cái giá của nó

```bash
mkdir -p /tmp/ms && cd /tmp/ms
cat > package.json <<'EOF'
{ "name": "demo", "dependencies": { "express": "4.19.2" } }
EOF
cat > server.js <<'EOF'
require('express')().get('/', (_, res) => res.send('v1')).listen(3000);
EOF

cat > Dockerfile <<'EOF'
FROM node:20
COPY . .
RUN npm install
CMD ["node", "server.js"]
EOF
#   └─ trông vô hại — nhưng giấu HAI vấn đề, lát sẽ đo được cả hai

docker build -t app:naive .
docker image ls app:naive --format 'KICH THUOC: {{.Size}}'
```

**Đoán trước** trước khi chạy dòng cuối: bao nhiêu? App chỉ có 5 dòng code.

**Kết quả:** trên dưới **1.1GB** — cho 5 dòng code. `node:20` cõng theo cả
Debian, compiler, npm... Ghi số này lại.

## Bài tập 2 — Đo vấn đề thứ hai: sửa 1 ký tự, cài lại cả node_modules

**Đoán trước:** sửa `v1` thành `v2` trong `server.js` rồi build lại —
`npm install` có chạy lại không? Nó có liên quan gì tới thay đổi đâu?

```bash
sed -i 's/v1/v2/' server.js
time docker build -t app:naive .
#└─ đo thời gian cho chắc, khỏi cãi nhau bằng cảm giác
```

**Kết quả:** `npm install` chạy lại **toàn bộ**. Vì `COPY . .` đứng trước nó —
`server.js` đổi → layer COPY đổi → **mọi thứ phía sau mất cache**, đúng quy
tắc đã học. Mỗi lần sửa code là một lần chờ npm, nhân với số lần build mỗi
ngày là ra số phút đời người bị đốt.

**Sửa: tách phần ít đổi lên trước.**

```bash
cat > Dockerfile <<'EOF'
FROM node:20
COPY package.json .
RUN npm install
COPY . .
CMD ["node", "server.js"]
EOF
#   │ package.json ít đổi → npm install được cache
#   └─ code hay đổi COPY sau cùng — đổi code không đụng npm

docker build -t app:cached .
sed -i 's/v2/v3/' server.js
time docker build -t app:cached .
```

**Kết quả:** lần build sau khi sửa code — `npm install` hiện `CACHED`, tổng
thời gian còn **~1 giây**. Một lần đảo thứ tự hai dòng, lợi mãi mãi.

## Bài tập 3 — Multi-stage: vứt công xưởng, giữ sản phẩm

```bash
cat > Dockerfile <<'EOF'
# ---- Stage 1: cong xuong ----
FROM node:20 AS build
#             └─ đặt tên stage để tham chiếu
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY . .

# ---- Stage 2: phong trung bay ----
FROM node:20-alpine
#         └─ nền alpine nhỏ, đủ để CHẠY (không cần đủ để BUILD)
WORKDIR /app
COPY --from=build /app .
#    └─ chỉ mang sản phẩm sang; MỌI layer của stage build bị bỏ lại
USER node
#    └─ đừng chạy bằng root — sẽ gặp lại ở securityContext
CMD ["node", "server.js"]
EOF

docker build -t app:multi .
docker image ls --format '{{.Repository}}:{{.Tag}}  {{.Size}}' | grep ^app
```

**Đoán trước** trước dòng cuối: `app:multi` còn bao nhiêu so với 1.1GB?

**Kết quả điển hình:**

```
app:naive    ~1.1GB
app:cached   ~1.1GB     ← cache giúp NHANH, không giúp NHỎ
app:multi    ~140MB     ← multi-stage mới giúp nhỏ
```

Hai kỹ thuật giải hai bài toán **khác nhau** — cần cả hai. Kiểm tra sản phẩm
vẫn chạy:

```bash
docker run -d --name m -p 3000:3000 app:multi
sleep 1 && curl localhost:3000
docker rm -f m
```

Dọn:

```bash
cd ~ && docker rmi app:naive app:cached app:multi && rm -rf /tmp/ms
```

## Nối với K8s

Nhớ phép nhân ở bài image & layer: rollout 50 node. Với `app:naive` là kéo
55GB qua mạng; với `app:multi` là 7GB. Image nhỏ = Pod lên nhanh = rolling
update ngắn = autoscale phản ứng kịp. Đây không phải tối ưu cho đẹp — nó đổi
trực tiếp thành thời gian phục hồi của hệ thống.

Với stack của bạn: Next.js có `output: 'standalone'` sinh sẵn bundle tối giản
cho stage 2; NestJS build ra `dist/` chỉ cần `node_modules` production; .NET
có `dotnet publish` + image `runtime` (không cần `sdk`). Cùng một khuôn
công-xưởng/trưng-bày cho cả ba.

## Tự kiểm

- [ ] Đọc một Dockerfile chỉ ra được chỗ nào phá cache
- [ ] Giải thích được vì sao cache giúp nhanh mà không giúp nhỏ, multi-stage thì ngược lại
- [ ] Viết được Dockerfile multi-stage cho một app Node từ trí nhớ
- [ ] Nói được image nhỏ ảnh hưởng gì tới rollout trên cluster nhiều node

## Câu hỏi còn mở

- `.dockerignore` can thiệp vào cache ở bước nào? Thiếu nó mất gì?
- `COPY --link` và cache mount (`RUN --mount=type=cache`) của BuildKit thêm gì?
- Distroless so với alpine — đánh đổi gì khi image không còn cả shell?
