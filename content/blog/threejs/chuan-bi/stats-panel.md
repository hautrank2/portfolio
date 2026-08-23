---
title: "Bài 6 — Stats panel"
description: Ba con số ở góc màn hình, và lý do nên bật nó ngay từ bài đầu.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, performance, tools]
---

Không phải bài phụ. Đây là thứ duy nhất cho biết scene đang chạy 120 FPS hay 24 FPS —
mà mắt thường thì rất khó phân biệt 60 với 40.

## Không cần cài gì

`Stats` đi kèm luôn trong gói `three`, và type của nó do `@types/three` kéo về:

```ts
import Stats from "three/addons/libs/stats.module.js";

const stats = new Stats();
document.body.append(stats.dom);
```

Rồi gọi `stats.update()` mỗi frame. Hết.

## Ba bảng, bấm để đổi

| Bảng | `showPanel` | Đọc thế nào |
|---|---|---|
| FPS | `0` | Càng cao càng tốt. 60 là trần trên đa số màn hình |
| MS | `1` | Mili-giây mỗi frame. **Đây mới là con số dùng để tối ưu** |
| MB | `2` | Bộ nhớ JS heap. Chỉ Chrome có |

Nên nhìn **MS** chứ không phải FPS, vì FPS bị trần bởi tần số quét: đi từ 8ms xuống 4ms
là nhanh gấp đôi nhưng FPS vẫn đứng yên ở 60. Ngưỡng: dưới 16.7ms là mượt ở 60Hz, dưới
8.3ms là mượt ở 120Hz.

Bấm vào panel để đổi bảng.

## Bài tập — nhìn FPS tụt theo thời gian thực

Bấm chuột vào scene để thêm 20 khối mỗi lần, và nhìn con số ở góc trái trôi xuống.

```ts
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { createLab } from "./lab";

const { scene, onTick } = createLab();

const stats = new Stats();
stats.showPanel(0); // 0 = FPS, 1 = ms mỗi frame, 2 = bộ nhớ
document.body.append(stats.dom);

const geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });

const knots: THREE.Mesh[] = [];

// bấm chuột để thêm 20 cái nữa — nhìn FPS tụt theo thời gian thực
function addKnots(count: number) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 12
    );
    scene.add(mesh);
    knots.push(mesh);
  }
}

addKnots(20);
addEventListener("click", () => addKnots(20));

onTick((delta) => {
  stats.update();
  for (const knot of knots) knot.rotation.y += 0.4 * delta;
});
```

**Kết quả:** khoảng 20 `TorusKnot` đầu vẫn 60 FPS. Bấm chuột vài lần tới khi thấy con số
tụt — trên laptop tầm trung thường bắt đầu tụt quanh 200–300 cái.

**Thử phá:**

- Bấm panel để chuyển sang bảng **MS**, rồi bấm chuột thêm khối. MS tăng dần rất đều
  trong khi FPS đứng ở 60 rồi rơi đột ngột — đó là lý do MS đáng tin hơn
- Đổi `TorusKnotGeometry(0.7, 0.25, 128, 32)` thành `(0.7, 0.25, 16, 8)`: cùng số mesh
  nhưng nhẹ hơn nhiều lần, vì tham số cuối là số đoạn chia
- Bỏ `stats.update()` ra khỏi tick — panel đứng hình. Nó không tự đo, nó đo mỗi lần bị gọi

## Đặt ở đâu trong loop

```ts
stats.begin();
// ... cập nhật + render
stats.end();
```

Cách này đo **đúng phần code của bạn**, không tính thời gian trình duyệt chờ. Bản
`stats.update()` gọn hơn nhưng đo cả khoảng nghỉ giữa hai frame. Với việc học thì
`update()` là đủ; khi thật sự đi săn hiệu năng thì dùng cặp `begin`/`end`.

## Nhớ gỡ khi lên production

`stats.dom` là một `<div>` cắm cứng vào `body`. Bọc nó lại:

```ts
if (import.meta.env.DEV) document.body.append(stats.dom);
```

`import.meta.env.DEV` là của Vite, tự thành `false` khi `npm run build`.
