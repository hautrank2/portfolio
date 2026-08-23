---
title: "Bài 21 — Environment maps"
description: Thứ thật sự làm scene đẹp lên, và nó rẻ hơn thêm đèn.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, lighting, pbr]
---

Đây là bài đổi nhiều nhất về mặt hình ảnh trong cả khoá. Một dòng `scene.environment` cho
kết quả tốt hơn ba đèn cộng lại, và **rẻ hơn**.

## Vì sao

Vật thể ngoài đời không chỉ nhận ánh sáng từ nguồn sáng — nó nhận ánh sáng phản xạ từ mọi
thứ xung quanh. Environment map là một tấm ảnh 360° đóng vai trò "mọi thứ xung quanh" đó.

Với `metalness = 1`, đây là **nguồn sáng duy nhất** — kim loại không có màu khuếch tán
riêng, nó chỉ phản chiếu.

## background và environment là hai chuyện

```ts
scene.background = envMap;    // nhìn thấy làm nền
scene.environment = envMap;   // dùng để chiếu sáng vật thể
```

Gán `background` thôi thì nền đẹp mà vật vẫn tối. Gán `environment` thôi thì vật sáng đẹp
mà nền vẫn trơn. Gán cả hai cùng một texture là cách nhanh nhất để scene "có nghề".

Hai thuộc tính điều chỉnh đi kèm:

```ts
scene.backgroundBlurriness = 0.35;   // làm mờ nền, để vật thể nổi lên
scene.environmentIntensity = 1;      // độ mạnh của ánh sáng môi trường
```

## PMREMGenerator — bước không được bỏ

Ảnh HDR thô **không dùng thẳng được**. Nó phải được xử lý trước thành một chuỗi mipmap có
độ nhoè tăng dần, để `roughness` khác nhau lấy mẫu ở mức khác nhau.

```ts
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
```

Bỏ qua bước này thì bề mặt nhám vẫn phản chiếu sắc nét như gương — sai hoàn toàn.

## Ba nguồn environment map

**1. RoomEnvironment — không cần file nào**

```ts
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
```

Một căn phòng dựng sẵn bằng code. Đi kèm `three`, 0 byte tải về, và đủ tốt cho phần lớn
trường hợp. Đây là thứ nên thử **trước khi** đi tìm file HDR.

**2. File HDR/EXR**

```ts
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

new RGBELoader().load("/venice_sunset_1k.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(texture).texture;
});
```

Nguồn miễn phí phổ biến: Poly Haven. Lấy bản **1k** hoặc **2k** — bản 4k nặng hàng chục MB
mà khác biệt gần như không thấy khi đã làm mờ.

Dòng `texture.mapping = ...` là bắt buộc, quên là ảnh bị dán sai kiểu.

**3. CubeTexture — sáu ảnh vuông**

Kiểu cũ, gặp trong tutorial đời trước. Vẫn chạy, nhưng HDR tiện hơn hẳn.

## Bài tập

Năm quả cầu kim loại, `roughness` tăng dần từ trái sang phải, và **không một cái đèn nào**.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createLab } from "./lab";

// KHÔNG đèn nào cả — toàn bộ ánh sáng đến từ environment map
const { scene, renderer, camera, onTick } = createLab({ lights: false, helpers: false });
camera.position.set(0, 0, 8);

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envMap = pmrem.fromScene(room, 0.04).texture;

scene.environment = envMap;
scene.background = envMap;
scene.backgroundBlurriness = 0.35;

const geometry = new THREE.SphereGeometry(0.85, 64, 32);
const spheres: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: i / 4,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = (i - 2) * 2;
  scene.add(mesh);
  spheres.push(mesh);
}

const params = {
  background: true,
  blurriness: 0.35,
  intensity: 1,
  metalness: 1,
};

const gui = new GUI({ title: "Bài 21 — Environment map" });

gui.add(params, "background").name("dùng làm nền").onChange((on) => {
  scene.background = on ? envMap : new THREE.Color(0x0e1116);
});

gui.add(params, "blurriness", 0, 1, 0.01).onChange((v) => (scene.backgroundBlurriness = v));
gui.add(params, "intensity", 0, 3, 0.01).name("environmentIntensity").onChange((v) => (scene.environmentIntensity = v));

gui.add(params, "metalness", 0, 1, 0.01).onChange((v) => {
  spheres.forEach((mesh) => ((mesh.material as THREE.MeshStandardMaterial).metalness = v));
});

onTick((delta) => {
  spheres.forEach((mesh) => (mesh.rotation.y += 0.2 * delta));
});

// PMREMGenerator giữ render target riêng -> dọn khi không dùng nữa
addEventListener("beforeunload", () => {
  pmrem.dispose();
  room.dispose();
});
```

**Kết quả:** quả bên trái như gương, quả bên phải mờ như kim loại xước. Toàn bộ ánh sáng
đến từ căn phòng dựng sẵn.

**Thử phá:**

- Xoá dòng `scene.environment = envMap` (giữ `background`) — năm quả cầu **đen thui** trên
  nền đẹp. Đây là bằng chứng trực tiếp rằng hai thuộc tính là hai chuyện
- Kéo `metalness` xuống 0 — vật trở lại thành nhựa trắng, environment map chỉ còn đóng góp
  ánh sáng nền nhẹ
- Kéo `blurriness` từ 0 lên 1 — nền nhoè dần, vật thể nổi hẳn lên. Mẹo này dùng rất nhiều
  trong ảnh sản phẩm
- Kéo `environmentIntensity` xuống 0.2 — cả scene tối lại nhưng vẫn giữ đúng hướng phản
  chiếu, khác hẳn với việc giảm cường độ một cái đèn
- Bỏ `pmrem.fromScene(...)` và gán thẳng `scene.environment = room.background`: quả cầu
  nhám phản chiếu sắc nét sai hoàn toàn

## Nhớ dispose

`PMREMGenerator` giữ một render target riêng. Xong việc thì dọn:

```ts
pmrem.dispose();
room.dispose();
```

Với một trang tĩnh thì không sao. Trong SPA có điều hướng thì đây là một trong những chỗ
rò rỉ VRAM âm thầm nhất — xem
[phụ lục](/blog/threejs/phu-luc/dispose-va-memory-leak).
