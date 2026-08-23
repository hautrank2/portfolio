---
title: "Bài 14 — Object3D hierarchy"
description: Cây scene chính là phép nhân ma trận dây chuyền. Hệ mặt trời không cần một dòng lượng giác.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, math]
---

Đây là bài đáng làm nhất trong cả khoá. Làm một lần, `matrixWorld` hết trừu tượng vĩnh
viễn.

## Con thừa hưởng biến hình của cha

```ts
group.position.set(10, 0, 0);
mesh.position.set(1, 0, 0);
group.add(mesh);

mesh.position.x;                                 // 1  — không đổi, và sẽ không bao giờ đổi
mesh.getWorldPosition(new THREE.Vector3()).x;    // 11
```

`position` **luôn** là toạ độ so với node cha. Vị trí thật nằm trong `matrixWorld`, đọc
ra bằng `getWorldPosition`.

Một chú ý: `matrixWorld` chỉ được cập nhật lúc render. Vừa đổi `position` xong mà đọc
world position ngay trong cùng một tick thì phải ép cập nhật trước:

```ts
group.updateMatrixWorld(true);
```

Đây là nguồn của kiểu bug "giá trị luôn trễ một frame".

## Group không tốn gì

`Group` (và `Object3D` rỗng) **không được vẽ** — nó chỉ đóng góp một ma trận. Không tốn
draw call, dùng thoải mái làm điểm neo và tâm quay.

## Cái bẫy: scale không đều ở node cha

```ts
parent.scale.set(2, 1, 1);        // scale không đều
child.rotation.z = Math.PI / 4;   // con xoay 45°
```

Con bị **kéo xiên**, không còn là hình vuông xoay nữa. Vì phép scale không đều không giao
hoán với phép xoay.

> Quy tắc: node có con thì chỉ scale đều, hoặc không scale. Cần bóp méo thì bóp ở mesh lá.

## add và attach

```ts
scene.add(mesh);      // giữ LOCAL transform -> mesh nhảy chỗ
scene.attach(mesh);   // giữ WORLD transform -> mesh đứng yên, local được tính lại
```

`attach` là hàm cần khi "nhặt vật lên tay" rồi "đặt xuống" — sẽ dùng thật ở Bài 36.

## Bài tập 1 — hệ mặt trời hai tầng

Mặt trăng quay quanh trái đất đang quay quanh mặt trời. **Không một dòng lượng giác nào.**

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick } = createLab({ helpers: false, lights: false });

const sphere = new THREE.SphereGeometry(1, 48, 24);

const sun = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
scene.add(sun);
scene.add(new THREE.PointLight(0xffffff, 400));
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

const earthOrbit = new THREE.Object3D();
scene.add(earthOrbit);

const earth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
earth.position.x = 6;
earth.scale.setScalar(0.4);
earthOrbit.add(earth);

const moonOrbit = new THREE.Object3D();
moonOrbit.position.x = 6;
earthOrbit.add(moonOrbit);

const moon = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
moon.position.x = 1.4;
moon.scale.setScalar(0.15);
moonOrbit.add(moon);

onTick((delta) => {
  earthOrbit.rotation.y += 0.4 * delta;
  moonOrbit.rotation.y += 1.6 * delta;
});
```

Cả ba thiên thể dùng **chung một `SphereGeometry`**, chỉ khác `scale`. Đây cũng là mẹo
tiết kiệm bộ nhớ đầu tiên nên tập quen.

**Kết quả:** trái đất quay quanh mặt trời, mặt trăng bám theo trái đất. Nửa quay ra ngoài
thì tối, vì chỉ có một nguồn sáng đặt ở tâm.

**Thử phá:**

- `earthOrbit.scale.set(2, 1, 1)` — quỹ đạo méo thành elip, **và** trái đất bị kéo xiên
  theo. Đúng cái bẫy scale không đều ở trên
- Đổi `moonOrbit.position.x = 6` thành `3` — mặt trăng rơi vào giữa quãng đường, cho thấy
  nó bám vào **node quỹ đạo** chứ không bám vào trái đất
- Thêm `earth.rotation.y += 2 * delta` — trái đất tự quay quanh trục, độc lập hoàn toàn
  với chuyển động quanh mặt trời. Hai phép xoay ở hai tầng khác nhau của cây
- Đổi `earthOrbit.rotation.y` thành `earthOrbit.rotation.z` — cả hệ lật đứng dậy

## Bài tập 2 — nhìn thấy local và world cùng lúc

Mũi tên vàng vẽ vector world; hai con số góc trái nói phần còn lại.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick, readout } = createLab();

const group = new THREE.Object3D();
group.position.set(3, 0, 0);
scene.add(group);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 32, 16),
  new THREE.MeshStandardMaterial({ color: 0xf472b6 })
);
ball.position.set(1.5, 0, 0);
group.add(ball);

const arrow = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(),
  1,
  0xfacc15
);
scene.add(arrow);

const world = new THREE.Vector3();
const dir = new THREE.Vector3();

onTick((delta) => {
  group.rotation.y += 0.6 * delta;

  ball.getWorldPosition(world);
  dir.copy(world).normalize();
  arrow.setDirection(dir);
  arrow.setLength(world.length(), 0.3, 0.15);

  readout(
    `local  x=${ball.position.x.toFixed(2)}  (không bao giờ đổi)\n` +
    `world  x=${world.x.toFixed(2)}  z=${world.z.toFixed(2)}`
  );
});
```

**Kết quả:** `local x` đứng yên ở `1.50` suốt, còn `world x` và `world z` chạy liên tục.

**Thử phá:**

- Đổi `dir.copy(world).normalize()` thành `arrow.setDirection(world.normalize())` — mũi
  tên co lại rồi biến mất, vì `normalize()` **sửa luôn** `world` thành vector dài 1. Gần
  như mọi phương thức của `Vector3` đều sửa tại chỗ
- Thay `group.rotation.y += ...` bằng `group.position.x += delta` — mũi tên vẫn bám đúng,
  vì `getWorldPosition` không quan tâm cha đang xoay hay đang trượt
