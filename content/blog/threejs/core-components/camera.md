---
title: "Bài 10 — Camera"
description: Bốn tham số của PerspectiveCamera, và một dòng quên gọi là hỏng cả bài.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, basics, camera]
---

Camera không phải một vật thể được vẽ ra. Nó là **một phép chiếu** — công thức biến toạ
độ 3D thành toạ độ trên màn hình.

## Bốn tham số

```ts
new THREE.PerspectiveCamera(fov, aspect, near, far);
```

**`fov`** — góc mở **theo chiều dọc**, tính bằng độ, mặc định 50. Dưới 30 cho cảm giác
tele, phẳng và tĩnh. Trên 75 thì góc rộng, méo mạnh ở rìa, hợp với cảm giác chật chội
hoặc tốc độ.

**`aspect`** — luôn là `width / height` của **canvas**, không phải của cửa sổ. Sai chỗ
này thì hình bị bóp dẹt, mà dẹt nhẹ thì rất khó nhận ra bằng mắt.

**`near` / `far`** — khoảng nhìn thấy. Ngoài khoảng này thì bị cắt.

## Dòng hay quên nhất trong cả khoá

```ts
camera.updateProjectionMatrix();
```

Đổi `fov`, `aspect`, `near` hay `far` mà không gọi dòng này thì **không có gì xảy ra**,
và cũng không có cảnh báo nào. Ma trận chiếu chỉ được dựng lại khi bị yêu cầu.

## near, far và z-fighting

Độ chính xác của depth buffer phụ thuộc vào **tỉ lệ `far / near`**, không phải khoảng
cách tuyệt đối. Đặt `near = 0.001` cho chắc ăn là cách nhanh nhất để hai mặt phẳng gần
nhau bắt đầu nhấp nháy tranh chỗ.

> Quy tắc: đặt `near` **lớn nhất có thể chấp nhận được**, rồi mới lo tới `far`.

Tỉ lệ dưới 10 000 thì thường yên ổn. `near = 0.1`, `far = 1000` là 10 000 — vừa chạm
ngưỡng.

## Camera cũng là Object3D

```ts
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);
```

`lookAt` tính **ngay tại thời điểm gọi**, không phải một ràng buộc lâu dài. Vật di
chuyển sau đó thì camera không tự nhìn theo — muốn bám thì phải gọi lại mỗi frame.

Camera mặc định nhìn về **-Z**. Nên đặt ở `(0, 0, 5)` thì nhìn vào gốc toạ độ, còn đặt ở
`(0, 0, -5)` thì mọi thứ nằm sau lưng và bạn được một màn hình đen.

## OrthographicCamera

```ts
new THREE.OrthographicCamera(left, right, top, bottom, near, far);
```

Không có phối cảnh: vật ở xa và ở gần cùng kích thước. Dùng cho bản vẽ kỹ thuật, game
isometric, và mọi thứ cần đo đạc chính xác trên màn hình.

## Bài tập

Bốn khối **giống hệt nhau** đặt xa dần. Chỉ phối cảnh mới làm chúng khác kích thước.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, camera, readout } = createLab();

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

// bốn khối giống hệt nhau, đặt xa dần — chỉ phối cảnh mới làm chúng khác kích thước
for (let i = 0; i < 4; i++) {
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(-2 + i * 1.4, 0.5, -i * 3);
  scene.add(cube);
}

const params = { fov: 50, near: 0.1, far: 200 };
const gui = new GUI({ title: "Bài 10 — Camera" });

// ĐỔI BẤT KỲ THAM SỐ NÀO CŨNG PHẢI GỌI updateProjectionMatrix()
const apply = () => {
  camera.fov = params.fov;
  camera.near = params.near;
  camera.far = params.far;
  camera.updateProjectionMatrix();
  readout(
    `fov  ${params.fov.toFixed(0)}°\n` +
    `near ${params.near.toFixed(2)}\n` +
    `far  ${params.far.toFixed(0)}\n` +
    `tỉ lệ far/near = ${(params.far / params.near).toFixed(0)}  (càng lớn càng dễ z-fighting)`
  );
};

gui.add(params, "fov", 10, 120, 1).onChange(apply);
gui.add(params, "near", 0.01, 10, 0.01).onChange(apply);
gui.add(params, "far", 5, 500, 1).onChange(apply);
apply();
```

**Kết quả:** ba thanh trượt, và ô chữ góc trái in luôn tỉ lệ `far/near` để thấy khi nào
sắp gặp z-fighting.

**Thử phá:**

- Kéo `fov` từ 10 lên 120 — ở 10 bốn khối gần như bằng nhau (nhìn như ảnh chụp tele), ở
  120 thì khối gần phình to và méo ở rìa
- Kéo `near` lên 5 — khối gần nhất bị cắt phẳng như bị dao xén ngang
- Kéo `far` xuống 6 — khối xa nhất biến mất hoàn toàn
- Xoá dòng `camera.updateProjectionMatrix()` trong hàm `apply` rồi kéo thanh trượt: số
  ở góc trái đổi, hình thì đứng im. Đây chính xác là cảm giác của bug đó
