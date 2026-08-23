---
title: "Bài 18 — lil-gui"
description: "Bảng điều khiển đầy đủ: thư mục, dropdown, preset, và mẹo trỏ thẳng vào object Three.js."
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, tools]
---

Bài 7 đã dùng GUI ở mức tối thiểu. Bài này là bản đầy đủ — và từ đây trở đi, mọi bài tập
đều nên có vài thanh trượt.

## Không cần cài

```ts
import GUI from "three/addons/libs/lil-gui.module.min.js";
```

`lil-gui` đi kèm gói `three`. Cài riêng bằng `npm i lil-gui` cũng được và có bản mới hơn,
nhưng với việc học thì bản kèm sẵn là đủ.

## Mẹo quan trọng nhất: trỏ thẳng vào object Three.js

```ts
gui.add(material, "roughness", 0, 1, 0.01);   // ✅ không cần onChange
gui.add(mesh.position, "y", -5, 5, 0.01);     // ✅
gui.add(light, "intensity", 0, 10, 0.1);      // ✅
```

lil-gui ghi **trực tiếp** vào thuộc tính. Không cần object `params` trung gian, không cần
`onChange`, không có chuyện quên đồng bộ hai bên.

Chỉ cần `onChange` khi:

- Thuộc tính là **object** (`Color`, `Vector3`) — phải gọi `.set()`
- Đổi giá trị **kéo theo việc khác** (`updateProjectionMatrix`, `needsUpdate`, dựng lại
  geometry)

## Các kiểu control

```ts
gui.add(obj, "num", 0, 10, 0.1);              // thanh trượt
gui.add(obj, "num");                          // ô nhập số
gui.add(obj, "flag");                         // checkbox
gui.add(obj, "text");                         // ô nhập chữ
gui.add(obj, "fn");                           // nút bấm
gui.add(obj, "choice", ["a", "b", "c"]);      // dropdown từ mảng
gui.add(obj, "mode", { Thấp: 0, Cao: 1 });    // dropdown có nhãn
gui.addColor(obj, "color");                   // ô chọn màu
```

## Thư mục và preset

```ts
const folder = gui.addFolder("Vẻ ngoài");
folder.add(material, "roughness", 0, 1, 0.01);
folder.close();                 // gập lại lúc mở trang

console.log(gui.save());        // xuất toàn bộ giá trị hiện tại
gui.load(preset);               // nạp lại
```

`gui.save()` là thứ dùng thật sự nhiều: vặn tới lúc ưng mắt, in ra console, rồi chép
những con số đó thẳng vào code.

## Bài tập

Một dashboard đầy đủ: đổi hình bằng dropdown, đổi vật liệu bằng thư mục riêng, và một
nút in preset ra console.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, onTick } = createLab();

const shapes: Record<string, THREE.BufferGeometry> = {
  Box: new THREE.BoxGeometry(1.4, 1.4, 1.4),
  Sphere: new THREE.SphereGeometry(0.9, 48, 24),
  Torus: new THREE.TorusGeometry(0.7, 0.3, 24, 64),
  Knot: new THREE.TorusKnotGeometry(0.6, 0.25, 128, 24),
};

const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
const mesh = new THREE.Mesh(shapes.Box, material);
mesh.position.y = 0.7;
scene.add(mesh);

const params = {
  shape: "Box",
  color: "#38bdf8",
  speed: 0.6,
  spin: true,
  luuPreset: () => console.log(JSON.stringify(gui.save(), null, 2)),
};

const gui = new GUI({ title: "Bài 18 — lil-gui" });

gui.add(params, "shape", Object.keys(shapes)).name("hình").onChange((name) => {
  mesh.geometry = shapes[name];
});

const look = gui.addFolder("Vẻ ngoài");
look.addColor(params, "color").onChange((v) => material.color.set(v));
look.add(material, "roughness", 0, 1, 0.01);
look.add(material, "metalness", 0, 1, 0.01);
look.add(material, "wireframe");

const motion = gui.addFolder("Chuyển động");
motion.add(params, "spin").name("đang xoay");
motion.add(params, "speed", 0, 4, 0.01).name("tốc độ");

gui.add(params, "luuPreset").name("in preset ra console");

onTick((delta) => {
  if (params.spin) mesh.rotation.y += params.speed * delta;
});
```

Chú ý chỗ đổi hình:

```ts
mesh.geometry = shapes[name];
```

Chỉ gán lại `geometry` là xong — `Mesh` không quan tâm geometry nào, miễn là một
`BufferGeometry`. Bốn hình được tạo sẵn **một lần** ở trên chứ không tạo mới mỗi lần đổi,
nếu không là rò rỉ bộ nhớ GPU.

**Thử phá:**

- Đổi `gui.add(params, "shape", Object.keys(shapes))` thành `gui.add(params, "shape")` —
  dropdown thành ô nhập chữ, gõ sai một chữ là `mesh.geometry` thành `undefined` và scene
  gãy
- Bấm nút "in preset ra console", vặn loạn hết lên, rồi dùng `gui.load()` với JSON vừa in
  để quay lại
- Thêm `gui.close()` ở cuối file — panel gập lại, hợp khi có nhiều thư mục
- Bỏ object `shapes` đi và tạo geometry mới ngay trong `onChange`. Mở DevTools, chuyển
  hình 50 lần, rồi xem `renderer.info.memory.geometries` leo mãi không xuống
