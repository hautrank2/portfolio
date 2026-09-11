---
title: "Bài 5 — Import module và chuyện bundle size"
description: Namespace import hay named import? Đo bundle thật rồi mới kết luận.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, vite, bundle]
---

Ba kiểu import, và một niềm tin phổ biến hoá ra sai.

## Ba kiểu

```ts
// 1. namespace — gõ THREE. là editor gợi ý mọi thứ
import * as THREE from "three";

// 2. named — chỉ lấy đúng thứ cần
import { Scene, PerspectiveCamera, WebGLRenderer } from "three";

// 3. addons — KHÔNG nằm trong core, phải lấy từ three/addons
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
```

Kiểu 3 là chỗ hay sai nhất. `OrbitControls`, `GLTFLoader`, `EffectComposer`, `Stats`,
`lil-gui` — tất cả đều **không** có trong `three`, chúng nằm ở `three/addons/*` (đường
dẫn thật là `three/examples/jsm/*`, `addons` chỉ là alias ngắn hơn).

Đuôi `.js` trong đường dẫn addon là **bắt buộc**, kể cả khi file bạn viết là `.ts`.

## Niềm tin phổ biến: "namespace import làm bundle nặng"

Nghe rất hợp lý. Đo thử thì không phải.

Hai file, cùng nội dung, khác kiểu import, build bằng Vite:

```ts
// a.ts
import * as THREE from "three";
const s = new THREE.Scene();
s.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
```

```ts
// b.ts
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from "three";
const s = new Scene();
s.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()));
```

Kết quả `npm run build`:

| Kiểu import | Bundle | Gzip |
|---|---|---|
| `import * as THREE` | 115.64 kB | 32.46 kB |
| named import | 115.64 kB | 32.46 kB |

**Giống hệt nhau** — kể cả hash tên file cũng trùng, nghĩa là output y hệt từng byte.
Rollup phân tích được các thuộc tính truy cập tĩnh trên namespace và loại bỏ phần không
dùng như thường.

Nên chọn kiểu nào là chuyện **đọc code cho dễ**, không phải chuyện hiệu năng. Track này
dùng `import * as THREE` vì nó nói rõ thứ gì đến từ đâu.

## Thứ thật sự làm bundle nặng

Vẫn project đó, thêm `WebGLRenderer`, `MeshStandardMaterial`, một đèn và `OrbitControls`:

| Nội dung | Bundle | Gzip |
|---|---|---|
| Scene + Mesh + MeshBasicMaterial | 115.6 kB | 32.5 kB |
| **+ WebGLRenderer, StandardMaterial, đèn, OrbitControls** | 508.5 kB | **128.7 kB** |

Gấp bốn lần. Thủ phạm là `WebGLRenderer` — nó kéo theo toàn bộ thư viện shader, và
`MeshStandardMaterial` kéo theo phần PBR trong đó.

Kết luận dùng được: **một scene Three.js thật khó xuống dưới ~130 kB gzip**. Đó là cái
giá sàn, nên nếu trang có ngân sách JS chặt thì phải tách route và tải động, chứ không
phải đi tỉa từng import.

## Bài tập

Tự đo lại trên máy mình, đừng tin bảng trên:

```bash
npm run build
```

Vite in ra kích thước từng file kèm gzip. Đổi `MeshStandardMaterial` thành
`MeshBasicMaterial` rồi build lại — chênh lệch chính là cái giá của PBR.

**Thử phá:**

- Bỏ dòng import `OrbitControls` đi rồi build lại: bundle giảm khoảng 30 kB
- Đổi `import { OrbitControls } from "three/addons/controls/OrbitControls.js"` thành
  `.../OrbitControls` (bỏ đuôi `.js`) — Vite dev vẫn chạy, nhưng `npm run build` gãy
- Thêm `import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"`
  nhưng **không dùng tới** — build lại, kích thước không đổi. Đó là tree-shaking đang làm việc
