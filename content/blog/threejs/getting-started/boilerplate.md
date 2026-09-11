---
title: "Bài 3 — Tạo project"
description: Vite + TypeScript trong một lệnh, và ba file cần dọn sạch trước khi bắt đầu.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, setup, vite]
---

## Một lệnh

```bash
npm create vite@latest three-lab -- --template vanilla-ts
cd three-lab
npm install
npm run dev
```

Mở `http://localhost:5173`, thấy trang mẫu của Vite là xong phần dựng.

## Dọn trước khi bắt đầu

Template mặc định có sẵn một bộ đếm và logo. Xoá hết, nếu không nó sẽ chen vào giữa
scene ở bài sau:

```bash
rm src/counter.ts src/typescript.svg public/vite.svg
: > src/style.css        # để trống, chưa xoá vội
```

`src/main.ts` để lại đúng một dòng cho chắc chắn build còn chạy:

```ts
console.log("ready");
```

Và `index.html` gọn lại còn:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>three-lab</title>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Không cần thẻ `<canvas>` trong HTML — renderer sẽ tự tạo canvas và tự chèn vào `body`.

## Bỏ margin mặc định

Đây là chỗ ai cũng vấp ở scene đầu tiên: canvas full màn hình nhưng vẫn có thanh cuộn,
vì `body` có `margin: 8px` mặc định của trình duyệt.

```css
/* src/style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { overflow: hidden; background: #0e1116; }
canvas { display: block; }
```

`canvas { display: block }` cũng quan trọng: canvas mặc định là `inline`, mà phần tử
inline thì có khoảng trắng dưới đáy theo baseline của dòng chữ — đủ để sinh thanh cuộn
dọc vài pixel.

Nhớ import nó ở đầu `main.ts`:

```ts
import "./style.css";
```

## Cấu trúc thư mục cho cả khoá

```
three-lab/
├─ public/          # file tĩnh: model .glb, texture, hdr
├─ src/
│  ├─ lab.ts        # bộ khung dùng chung (Bài 8)
│  ├─ main.ts       # bài tập hiện tại — dán đè lên đây
│  └─ style.css
└─ index.html
```

Mọi thứ trong `public/` được copy nguyên vẹn vào `dist` khi build, và truy cập bằng
đường dẫn tuyệt đối: file `public/model.glb` gọi là `/model.glb`. Nhầm chỗ này là lỗi
404 kinh điển khi deploy ở Bài 38.

## Mỗi bài một nhánh

```bash
git init && git add -A && git commit -m "03-boilerplate"
```

Về sau mỗi bài xong thì commit một lần với tên bài. Đến Bài 36 — bài dài 43 phút — bạn
sẽ rất mừng vì có chỗ để quay lại.
