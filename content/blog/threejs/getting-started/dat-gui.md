---
title: "Bài 7 — GUI để vặn tham số"
description: Vì sao dat.GUI đã cũ, dùng lil-gui thay thế, và cách gắn vào bất cứ thứ gì.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, tools]
---

Công cụ đứng thứ hai về mức độ dùng lại trong cả khoá, sau `lab.ts`. Ý tưởng đơn giản
tới mức dễ coi thường: **đổi tham số mà không phải sửa code rồi reload**.

Không có nó, tìm ra `roughness` đẹp nhất là 20 lần sửa số và 20 lần chờ trang tải lại.

## dat.GUI hay lil-gui

Giáo trình gọi bài này là "Dat GUI", nhưng `dat.gui` đã ngừng phát triển. Bản thay thế
chính thức là **lil-gui** — cùng API, nhẹ hơn, và **đi kèm sẵn trong gói `three`**:

```ts
import GUI from "three/addons/libs/lil-gui.module.min.js";
```

Không phải `npm install` gì cả. Bài 18 sẽ quay lại đào sâu hơn.

## Bốn kiểu control, tự chọn theo giá trị

`gui.add()` nhìn **kiểu dữ liệu** của thuộc tính để quyết định vẽ gì:

| Giá trị | Control |
|---|---|
| `number` + min/max | thanh trượt |
| `number` không min/max | ô nhập số |
| `boolean` | checkbox |
| `string` | ô nhập chữ |
| hàm | nút bấm |
| có mảng/object lựa chọn | dropdown |

Riêng màu phải gọi `gui.addColor()`, vì màu trong JS cũng chỉ là chuỗi hoặc số.

## Bài tập

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, onTick } = createLab();

const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), material);
cube.position.y = 0.75;
scene.add(cube);

const params = {
  speed: 0.6,
  color: "#38bdf8",
  wireframe: false,
  reset: () => cube.rotation.set(0, 0, 0),
};

const gui = new GUI({ title: "Bài 7 — GUI" });

gui.add(params, "speed", 0, 3, 0.01).name("tốc độ xoay");
gui.addColor(params, "color").name("màu").onChange((value) => material.color.set(value));
gui.add(params, "wireframe").onChange((value) => (material.wireframe = value));
gui.add(params, "reset").name("đặt lại góc xoay");

const folder = gui.addFolder("Vị trí");
folder.add(cube.position, "x", -4, 4, 0.01);
folder.add(cube.position, "y", 0, 4, 0.01);
folder.add(cube.position, "z", -4, 4, 0.01);

onTick((delta) => {
  cube.rotation.y += params.speed * delta;
});
```

**Kết quả:** panel ở góc phải với thanh trượt tốc độ, ô chọn màu, checkbox wireframe,
một nút reset, và một thư mục `Vị trí` chứa ba thanh trượt.

**Thử phá:**

- `gui.add(params, "speed")` bỏ hết min/max/step — thanh trượt biến thành ô nhập số
- Trỏ thẳng vào object của Three.js thay vì `params`:
  `gui.add(material, "roughness", 0, 1, 0.01)`. Không cần `onChange`, vì lil-gui ghi
  thẳng vào thuộc tính
- Đổi `gui.add(params, "wireframe")` thành `gui.add(material, "wireframe")` — ngắn hơn
  hẳn, và đây là cách nên dùng cho mọi thuộc tính material
- Thêm `gui.close()` ở cuối để panel gập lại lúc mở trang

## Vì sao có onChange, có chỗ lại không

```ts
gui.add(material, "roughness", 0, 1, 0.01);                       // không cần onChange
gui.addColor(params, "color").onChange((v) => material.color.set(v));  // cần
```

Dòng trên ghi trực tiếp vào `material.roughness` — một con số, gán là xong.

Dòng dưới thì `material.color` là một object `Color`, không thể gán chuỗi `"#38bdf8"`
vào được. Phải qua `onChange` để gọi `.set()`.

**Quy tắc: thuộc tính là số hoặc boolean thì trỏ thẳng; là object (Color, Vector3) thì
cần `onChange`.**
