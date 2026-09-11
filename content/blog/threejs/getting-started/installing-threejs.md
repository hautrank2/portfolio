---
title: "Bài 4 — Cài three và @types/three"
description: Hai gói, và một quy tắc về phiên bản khiến nhiều tutorial trên mạng chạy không được.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, setup]
---

```bash
npm i three
npm i -D @types/three
```

Hết. Nhưng có hai chuyện đáng biết.

## three không tự đem theo type

Không như phần lớn thư viện hiện đại, `three` **không** ship file `.d.ts` trong gói.
Type nằm ở gói riêng `@types/three` do cộng đồng DefinitelyTyped duy trì.

Hệ quả: hai gói này phải **khớp phiên bản minor**.

```bash
npm ls three @types/three
```

Nếu `three@0.182.0` mà `@types/three@0.170.x` thì trình biên dịch sẽ mô tả một API cũ
hơn thứ đang chạy — báo lỗi ở chỗ code đúng, hoặc tệ hơn là không báo ở chỗ code sai.

Ghim cả hai cho chắc:

```json
{
  "dependencies": { "three": "0.182.0" },
  "devDependencies": { "@types/three": "0.182.0" }
}
```

## Vì sao số phiên bản mãi là 0.x

Three.js đánh số theo *revision*: `r182` chính là `0.182.0`. Nó chưa bao giờ lên 1.0 và
cũng không hứa tương thích ngược giữa các revision.

Nghĩa là: **một đoạn code Three.js trên blog năm 2021 rất có thể không chạy hôm nay**.
Ba thứ đổi nhiều nhất trong vài năm gần đây:

| Cũ | Nay |
|---|---|
| `Geometry` | bỏ hẳn, chỉ còn `BufferGeometry` |
| `renderer.outputEncoding = sRGBEncoding` | `renderer.outputColorSpace = SRGBColorSpace` |
| `texture.encoding` | `texture.colorSpace` |

Gặp code không chạy trên mạng, kiểm tra ba dòng đó trước khi nghi ngờ mình.

## @types/three kéo theo gì

```bash
npm ls @types/stats.js
```

Kết quả cho thấy `@types/stats.js` được cài kèm — đó là lý do `Stats` ở Bài 6 có type
sẵn mà không phải cài thêm gì.

## Kiểm tra đã cài đúng

Dán vào `src/main.ts`:

```ts
import * as THREE from "three";

console.log("three", THREE.REVISION);
console.log(new THREE.Vector3(1, 2, 3));
```

Console in ra `three 182` là xong bài.
