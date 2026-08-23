---
title: "Bài 2 — Môi trường phát triển"
description: Node, VS Code, và hai extension đáng cài. Ngắn nhưng sai ở đây thì mắc kẹt cả khoá.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, setup]
---

Bài ngắn nhất khoá (2 phút), nhưng có đúng một chỗ đáng kiểm tra kỹ: **phiên bản Node**.

## Kiểm tra trước khi bắt đầu

```bash
node -v    # cần >= 20.19, tốt nhất là bản LTS hiện hành
npm -v
```

Vite 6 trở lên bỏ hỗ trợ Node 16 và 18. Nếu `node -v` ra số nhỏ hơn, cài lại qua
[nvm-windows](https://github.com/coreybutler/nvm-windows) thay vì gỡ đi cài lại:

```bash
nvm install lts
nvm use lts
```

## VS Code — hai extension đủ dùng

| Extension | Vì sao |
|---|---|
| **ESLint** | Bắt lỗi `const` chưa dùng, `any` lọt lưới |
| **glsl-canvas** hoặc **Shader languages support** | Tô màu cú pháp GLSL khi viết shader |

Không cần extension riêng cho Three.js — `@types/three` đã lo phần gợi ý code, và nó
đến từ `npm`, không phải từ editor.

## Một thiết lập nên bật ngay

Trong `settings.json` của VS Code:

```json
{
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

Dòng thứ hai buộc VS Code dùng đúng bản TypeScript của project, không phải bản đi kèm
editor. Khác phiên bản là nguồn của kiểu lỗi "máy tôi không báo lỗi mà `tsc` thì báo".

## Trình duyệt

Chrome hoặc Edge, và bật sẵn hai thứ trong DevTools:

- Tab **Console** — mọi lỗi shader hiện ở đây, không hiện trên màn hình
- Tab **Network** → tick **Disable cache** — model `.glb` bị cache là nguồn của bug
  "sửa file rồi mà không thấy đổi"

Kiểm tra WebGL còn sống bằng cách mở [get.webgl.org](https://get.webgl.org). Nếu ra
khối lập phương quay thì máy sẵn sàng.
