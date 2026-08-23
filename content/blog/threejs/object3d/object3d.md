---
title: "Bài 13 — Object3D"
description: position, rotation, scale chỉ là lớp vỏ. Bên dưới là một ma trận 4×4.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, math, basics]
---

`Object3D` là lớp cha của gần như mọi thứ: `Mesh`, `Group`, `Camera`, `Light`, `Sprite`,
và cả `Scene`. Học nó một lần là dùng được cho tất cả.

## Ba thuộc tính, một ma trận

`mesh.position.x = 5` nhìn như gán một biến. Thật ra nó chỉ đặt cờ để tới lúc render,
Three.js **dựng lại** ma trận 4×4 của object từ ba thành phần rời.

| Thuộc tính | Là gì |
|---|---|
| `position`, `quaternion`, `scale` | Ba thành phần rời, thứ bạn sửa |
| `matrix` | Ma trận **local** — so với node cha |
| `matrixWorld` | Ma trận **world** — so với gốc toạ độ |

Mỗi frame, nếu `matrixAutoUpdate` còn bật (mặc định bật):

```
matrix      = compose(position, quaternion, scale)
matrixWorld = parent.matrixWorld × matrix
```

## rotation tính bằng radian

```ts
mesh.rotation.y = Math.PI / 2;                 // 90 độ
mesh.rotation.y = THREE.MathUtils.degToRad(90); // rõ ràng hơn
```

`rotation` là một `Euler`, còn `quaternion` là dạng thật sự được đưa vào ma trận. Sửa
cái này thì Three.js tự đồng bộ cái kia — không bao giờ cần sửa cả hai.

`Euler` có thuộc tính `order`, mặc định `"XYZ"`. Đổi thứ tự thì kết quả khác, vì xoay
quanh X rồi Y **không** bằng xoay quanh Y rồi X.

## Thứ tự cố định: scale → rotate → translate

`compose()` luôn ghép theo đúng thứ tự đó:

```
matrix = T × R × S
```

Hệ quả thực dụng: `scale` không bao giờ làm lệch `position`. Nhân đôi scale thì vật
phình ra tại chỗ chứ không bị bắn đi xa gấp đôi.

## Vài phương thức đáng nhớ

```ts
mesh.translateX(1);          // dịch theo trục CỦA CHÍNH NÓ, không phải trục thế giới
mesh.rotateOnAxis(axis, a);  // xoay quanh một trục bất kỳ
mesh.lookAt(0, 0, 0);        // xoay để trục -Z hướng về điểm đó
mesh.getWorldPosition(v);    // vị trí thật, sau khi tính cả cha ông
mesh.clone();                // bản sao — DÙNG CHUNG geometry và material
```

`clone()` chia sẻ geometry và material với bản gốc. Đổi màu bản sao là đổi luôn màu bản
gốc. Muốn tách thì `mesh.material = mesh.material.clone()`.

## Bài tập

Vặn từng thuộc tính và nhìn ma trận đổi theo.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, onTick, readout } = createLab();

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
);
cube.position.y = 0.5;
scene.add(cube);

// mỗi Object3D có đúng ba thuộc tính này, và một matrix dựng từ chúng
const gui = new GUI({ title: "Bài 13 — Object3D" });

const position = gui.addFolder("position");
position.add(cube.position, "x", -4, 4, 0.01);
position.add(cube.position, "y", -4, 4, 0.01);
position.add(cube.position, "z", -4, 4, 0.01);

// rotation tính bằng RADIAN, không phải độ
const rotation = gui.addFolder("rotation (radian)");
rotation.add(cube.rotation, "x", -Math.PI, Math.PI, 0.01);
rotation.add(cube.rotation, "y", -Math.PI, Math.PI, 0.01);
rotation.add(cube.rotation, "z", -Math.PI, Math.PI, 0.01);

const scale = gui.addFolder("scale");
scale.add(cube.scale, "x", 0.1, 3, 0.01);
scale.add(cube.scale, "y", 0.1, 3, 0.01);
scale.add(cube.scale, "z", 0.1, 3, 0.01);

gui.add(cube, "visible");
gui.add(cube, "castShadow");

const deg = (rad: number) => ((rad * 180) / Math.PI).toFixed(0);

onTick(() => {
  readout(
    `rotation  x=${deg(cube.rotation.x)}°  y=${deg(cube.rotation.y)}°  z=${deg(cube.rotation.z)}°\n` +
    `order     ${cube.rotation.order}   (đổi thứ tự -> kết quả khác)\n` +
    `matrix[12..14]  ${cube.matrix.elements.slice(12, 15).map((n) => n.toFixed(2)).join("  ")}`
  );
});
```

**Kết quả:** ba thư mục thanh trượt. Góc trái in góc xoay quy ra độ, thứ tự Euler, và ba
phần tử `12..14` của ma trận — chính là cột dịch chuyển.

**Thử phá:**

- Kéo `position.x` và nhìn `matrix[12]` đổi theo đúng con số đó. Ba ô cuối của ma trận
  4×4 **chính là** `position`
- Kéo `scale.y` lên 3 rồi kéo `position.y`: vật cao lên nhưng không bị bắn đi xa, vì
  scale được áp *trước* phép dịch
- Đặt `rotation.x` và `rotation.z` cùng khác 0, rồi thêm dòng
  `cube.rotation.order = "ZYX"` — hình xoay sang tư thế khác hẳn với cùng ba con số
- Thêm `cube.matrixAutoUpdate = false` ngay sau khi tạo: mọi thanh trượt ngừng có tác
  dụng. Phải tự gọi `cube.updateMatrix()` mới thấy đổi
