---
title: "Bài 11 — Renderer"
description: Nơi duy nhất chạm vào GPU, và ba thiết lập quyết định scene đẹp hay nhoè.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, basics, performance]
---

`WebGLRenderer` là thứ nặng nhất trong bộ ba: nó giữ WebGL context, biên dịch shader,
quản lý buffer và texture trên GPU.

## Chỉ tạo một lần

Trình duyệt giới hạn số WebGL context đồng thời — thường khoảng 16. Tạo renderer mới mỗi
lần chuyển trang là cách chắc chắn nhất để nhận `Context Lost` sau vài lần điều hướng.

Trong React/Next.js, đây chính là lý do renderer phải nằm ngoài thân component.

## Ba dòng gần như luôn đi cùng nhau

```ts
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
```

`setPixelRatio` quyết định canvas có nhoè trên màn Retina hay không. Chặn ở **2** vì số
pixel phải vẽ tăng theo **bình phương**: điện thoại có DPR 3 nghĩa là gấp 9 lần công
việc so với DPR 1, đổi lấy khác biệt gần như không nhìn thấy.

## Tone mapping

Ảnh HDR và đèn cường độ cao cho ra giá trị màu vượt quá 1. Tone mapping là bước nén dải
đó về khoảng hiển thị được.

```ts
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
```

`NoToneMapping` (mặc định) thì vùng sáng bị cắt phẳng thành mảng trắng bệt.
`ACESFilmic` giữ được chi tiết ở vùng sáng, và đó là lý do nó gần như luôn là lựa chọn
đúng khi có environment map.

## Ba con số để nhìn

```ts
renderer.info.render.calls;       // draw call mỗi frame — dưới 100 là ổn
renderer.info.render.triangles;   // tam giác mỗi frame — dưới 200 nghìn là ổn
renderer.info.memory.geometries;  // đang giữ bao nhiêu trên GPU
```

Con số cuối là bài kiểm tra rò rỉ bộ nhớ: chuyển trang đi rồi quay lại mà nó tăng mãi
thì có chỗ chưa `dispose()`.

## Bài tập

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, renderer, onTick, readout } = createLab({ helpers: false });

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.35, 200, 32),
  new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.25 })
);
scene.add(knot);

const params: { pixelRatio: number; toneMapping: number; exposure: number } = {
  pixelRatio: Math.min(devicePixelRatio, 2),
  toneMapping: THREE.ACESFilmicToneMapping,
  exposure: 1,
};

const gui = new GUI({ title: "Bài 11 — Renderer" });

gui.add(params, "pixelRatio", 0.25, 3, 0.25).name("devicePixelRatio").onChange((value) => {
  renderer.setPixelRatio(value);
  renderer.setSize(innerWidth, innerHeight);
});

gui.add(params, "toneMapping", {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping,
}).onChange((value) => (renderer.toneMapping = Number(value) as THREE.ToneMapping));

gui.add(params, "exposure", 0, 3, 0.01).onChange((value) => (renderer.toneMappingExposure = value));

renderer.toneMapping = params.toneMapping as THREE.ToneMapping;

let frames = 0;
let acc = 0;

onTick((delta) => {
  knot.rotation.y += 0.4 * delta;

  frames++;
  acc += delta;
  if (acc >= 0.5) {
    readout(
      `FPS        ${Math.round(frames / acc)}\n` +
      `draw call  ${renderer.info.render.calls}\n` +
      `tam giác   ${renderer.info.render.triangles.toLocaleString("vi-VN")}\n` +
      `pixel vẽ   ${(innerWidth * innerHeight * params.pixelRatio ** 2 / 1e6).toFixed(1)}M`
    );
    frames = 0;
    acc = 0;
  }
});
```

**Kết quả:** một nút thắt kim loại quay, panel bên phải để đổi pixel ratio và tone
mapping, góc trái in FPS, draw call, số tam giác và số **triệu pixel** phải vẽ mỗi frame.

**Thử phá:**

- Kéo `devicePixelRatio` từ 0.25 lên 3 và nhìn hai con số cùng lúc: "pixel vẽ" tăng theo
  bình phương, FPS tụt theo. Ở 0.25 thì hình vỡ hạt nhưng cực mượt
- Đổi tone mapping sang `None` — vùng sáng trên kim loại cháy thành mảng trắng bệt
- Kéo `exposure` lên 3 — cả scene sáng rực như thiếu sáng bị bù quá tay
- Đổi `TorusKnotGeometry(1, 0.35, 200, 32)` thành `(1, 0.35, 1000, 64)` rồi nhìn dòng
  "tam giác". Draw call vẫn là 1, nhưng số tam giác nhân lên nhiều lần — hai chỉ số này
  đo hai thứ khác nhau

## antialias không đổi được lúc chạy

`antialias` là tuỳ chọn lúc **tạo** renderer, không có thuộc tính để bật tắt sau đó. Muốn
đổi thì phải tạo renderer mới — và nhớ `dispose()` cái cũ, nếu không là rò rỉ context.
