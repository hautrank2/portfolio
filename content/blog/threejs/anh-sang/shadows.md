---
title: "Bài 20 — Shadows"
description: Ba công tắc phải bật cùng lúc, và cách chữa shadow acne mà không tạo peter-panning.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, lighting, performance]
---

Bóng đổ là thứ đắt nhất trong cả khoá: mỗi đèn đổ bóng là **một lần render lại toàn bộ
scene** từ góc nhìn của đèn, trước khi render lần thật.

## Ba công tắc, thiếu một là không có bóng

```ts
renderer.shadowMap.enabled = true;    // 1. ở RENDERER
light.castShadow = true;              // 2. ở ĐÈN
mesh.castShadow = true;               // 3a. ở vật ĐỔ bóng
floor.receiveShadow = true;           // 3b. ở vật NHẬN bóng
```

Ba cấp độc lập nhau. Quên cấp nào cũng ra "không có bóng" mà không báo lỗi — nên khi
debug thì kiểm tra đủ ba, theo thứ tự đó.

Một vật có thể vừa `castShadow` vừa `receiveShadow`.

## Shadow camera — nguồn của "bóng bị cắt cụt"

Đèn render scene qua một camera riêng: `light.shadow.camera`. Vật nằm ngoài camera đó thì
**không có bóng**.

Với `DirectionalLight`, đó là một `OrthographicCamera` mặc định khá nhỏ:

```ts
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 1;
light.shadow.camera.far = 30;
```

Đây là đánh đổi trực tiếp: khung càng rộng thì càng nhiều vật có bóng, nhưng cùng một
`mapSize` trải trên diện tích lớn hơn nên bóng càng mờ và răng cưa.

**Đặt khung vừa khít vùng cần bóng, không rộng hơn.**

Nhìn thấy nó bằng `CameraHelper`:

```ts
scene.add(new THREE.CameraHelper(light.shadow.camera));
```

## Shadow acne và hai cách chữa

Sọc vằn đen trên bề mặt lẽ ra được chiếu sáng, do sai số làm điểm tự che chính nó.

```ts
light.shadow.bias = -0.0005;    // đẩy độ sâu đi một chút
light.shadow.normalBias = 0.02; // đẩy điểm lấy mẫu theo pháp tuyến
```

`bias` quá tay thì sinh **peter-panning**: bóng tách rời khỏi chân vật, nhìn như vật đang
bay. `normalBias` ít gây chuyện đó hơn, nên thử nó trước.

## Bốn kiểu shadow map

| Kiểu | Viền | Chi phí |
|---|---|---|
| `BasicShadowMap` | răng cưa rõ | rẻ nhất |
| `PCFShadowMap` | mềm vừa (mặc định) | vừa |
| `PCFSoftShadowMap` | mềm hơn | vừa |
| `VSMShadowMap` | mềm nhất, chỉnh được `radius` | đắt, dễ lộ artifact |

## Bài tập

Năm quả cầu nhấp nhô trên sàn, có helper vẽ khung shadow camera.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, renderer, onTick } = createLab({ lights: false, helpers: false });

// 1. bật shadow map ở RENDERER
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// 2. bật castShadow ở ĐÈN
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(5, 8, 4);
light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
light.shadow.camera.near = 1;
light.shadow.camera.far = 30;
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
scene.add(light);

const shadowCameraHelper = new THREE.CameraHelper(light.shadow.camera);
scene.add(shadowCameraHelper);

// 3. bật castShadow / receiveShadow ở TỪNG MESH
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const material = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
const movers: THREE.Mesh[] = [];

for (let i = 0; i < 5; i++) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16), material);
  mesh.position.set(-4 + i * 2, 1.5, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  movers.push(mesh);
}

const params = {
  mapSize: 1024,
  helper: true,
  type: THREE.PCFSoftShadowMap as number,
};

const gui = new GUI({ title: "Bài 20 — Shadows" });

gui.add(params, "helper").name("hiện shadow camera").onChange((v) => (shadowCameraHelper.visible = v));

gui.add(params, "mapSize", [256, 512, 1024, 2048, 4096]).name("mapSize").onChange((value) => {
  light.shadow.mapSize.set(Number(value), Number(value));
  light.shadow.map?.dispose();   // buộc dựng lại shadow map với kích thước mới
  light.shadow.map = null;
});

gui.add(light.shadow, "bias", -0.005, 0.005, 0.0001).name("bias (chống acne)");
gui.add(light.shadow, "normalBias", 0, 0.1, 0.001).name("normalBias");
gui.add(light.shadow, "radius", 0, 10, 0.1).name("radius (PCF)");

gui.add(params, "type", {
  Basic: THREE.BasicShadowMap,
  PCF: THREE.PCFShadowMap,
  PCFSoft: THREE.PCFSoftShadowMap,
  VSM: THREE.VSMShadowMap,
}).onChange((value) => {
  renderer.shadowMap.type = Number(value) as THREE.ShadowMapType;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) (mesh.material as THREE.Material).needsUpdate = true;
  });
});

onTick((_delta, elapsed) => {
  movers.forEach((mesh, i) => {
    mesh.position.y = 1.5 + Math.sin(elapsed * 1.5 + i * 0.7) * 1.1;
  });
});
```

**Thử phá:**

- Đổi `mapSize` xuống 256 — viền bóng vỡ thành bậc thang rất rõ. Lên 4096 thì mịn, nhưng
  đó là một texture 4096×4096 nằm trên GPU
- Thu khung shadow camera lại (`left = -3`, `right = 3` trong code): bóng của quả cầu
  ngoài rìa **biến mất hoàn toàn**, và `CameraHelper` cho thấy chính xác vì sao
- Kéo `bias` sang dương mạnh (0.005) — bóng tách khỏi chân quả cầu, đúng hiện tượng
  peter-panning
- Kéo `bias` về 0 rồi nhìn kỹ mặt sàn dưới ánh sáng xiên — sọc acne bắt đầu hiện
- Đổi kiểu sang `VSM` rồi kéo `radius` lên 5: bóng mềm hẳn. `radius` chỉ có tác dụng với
  VSM và PCFSoft
- Xoá `floor.receiveShadow = true` — bóng biến mất sạch, dù đèn và vật vẫn `castShadow`

## Mẹo tiết kiệm

Bóng đổ thật rất đắt. Với nhiều trường hợp, một **vệt mờ giả** dán dưới chân vật cho kết
quả gần như tương đương với chi phí gần bằng 0:

```ts
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(1, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.01;   // nhích lên để không z-fighting với sàn
```
