---
title: "Bài 15 — Geometries"
description: Hình dạng chỉ là mảng số. Biết vậy thì tự dựng hình và tối ưu đỉnh là cùng một việc.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, geometry]
---

`BoxGeometry` nghe như một khối hộp. Thật ra nó là một hàm sinh ra vài mảng
`Float32Array` rồi gói lại. Không có "khối hộp" nào cả — chỉ có toạ độ đỉnh và thứ tự
nối chúng thành tam giác.

## Bốn attribute cần biết

| Tên | itemSize | Nội dung |
|---|---|---|
| `position` | 3 | Toạ độ đỉnh, trong **local space** |
| `normal` | 3 | Pháp tuyến — quyết định ánh sáng chiếu vào ra sao |
| `uv` | 2 | Toạ độ texture, từ 0 tới 1 |
| `color` | 3 | Màu theo từng đỉnh, cần `vertexColors: true` ở material |

Chỉ `position` là bắt buộc. Thiếu `normal` thì mọi material cần ánh sáng đều đen, thiếu
`uv` thì texture không biết dán vào đâu.

Các attribute **song song theo chỉ số**: đỉnh thứ `i` có toạ độ ở `position[3i..3i+2]`,
pháp tuyến ở `normal[3i..3i+2]`, uv ở `uv[2i..2i+1]`.

## Vì sao hộp 8 góc lại có 24 đỉnh

Mỗi góc thuộc về ba mặt, mà ba mặt đó có pháp tuyến khác nhau và uv khác nhau. Đỉnh
trong GPU không phải "một điểm trong không gian", nó là **một bộ đầy đủ các attribute** —
khác nhau dù chỉ ở một attribute là phải tách ra.

Hệ quả: hình cần cạnh sắc không tiết kiệm được đỉnh nhiều; hình mượt (cầu, mặt phẳng) thì
`index` tiết kiệm rất đáng kể.

## Segments — chỗ đốt hiệu năng dễ nhất

Số đỉnh tăng theo **tích**, không phải theo tổng:

```ts
new THREE.PlaneGeometry(10, 10, 512, 512);   // 263 nghìn đỉnh cho một mặt phẳng
new THREE.PlaneGeometry(10, 10, 1, 1);       // 4 đỉnh, nhìn GIỐNG HỆT nếu không biến dạng
```

Mặt phẳng không biến dạng thì thêm segments **không đẹp hơn một chút nào**. Chỉ tăng khi
thật sự cần dời từng đỉnh.

## Bài tập 1 — bảng tra geometry dựng sẵn

Mười hai loại đứng cạnh nhau, kèm số đỉnh và số tam giác của từng loại.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, camera, readout } = createLab({ helpers: false });
camera.position.set(0, 0, 12);

const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });

const geometries: Record<string, THREE.BufferGeometry> = {
  Box: new THREE.BoxGeometry(1.2, 1.2, 1.2),
  Sphere: new THREE.SphereGeometry(0.8, 32, 16),
  Cylinder: new THREE.CylinderGeometry(0.6, 0.6, 1.4, 32),
  Cone: new THREE.ConeGeometry(0.8, 1.5, 32),
  Torus: new THREE.TorusGeometry(0.6, 0.25, 16, 48),
  TorusKnot: new THREE.TorusKnotGeometry(0.5, 0.2, 96, 16),
  Plane: new THREE.PlaneGeometry(1.5, 1.5),
  Circle: new THREE.CircleGeometry(0.8, 32),
  Ring: new THREE.RingGeometry(0.4, 0.8, 32),
  Icosahedron: new THREE.IcosahedronGeometry(0.9, 0),
  Dodecahedron: new THREE.DodecahedronGeometry(0.9),
  Capsule: new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
};

const names = Object.keys(geometries);
const meshes: THREE.Mesh[] = [];

names.forEach((name, i) => {
  const mesh = new THREE.Mesh(geometries[name], material);
  mesh.position.set(((i % 4) - 1.5) * 3, (1 - Math.floor(i / 4)) * 3, 0);
  scene.add(mesh);
  meshes.push(mesh);
});

const params = { wireframe: false };
const gui = new GUI({ title: "Bài 15 — Geometries" });
gui.add(params, "wireframe").onChange((v) => (material.wireframe = v));

// đếm đỉnh và tam giác của từng loại
const lines = names.map((name) => {
  const geometry = geometries[name];
  const index = geometry.getIndex();
  const vertices = geometry.attributes.position.count;
  const triangles = (index ? index.count : vertices) / 3;
  return `${name.padEnd(13)} ${String(vertices).padStart(5)} đỉnh  ${String(triangles).padStart(5)} tam giác`;
});

readout(lines.join("\n"));
```

**Kết quả:** lưới 12 hình, và bảng số ở góc trái. Nhìn bảng đó một lần là hết ngạc nhiên
khi thấy `SphereGeometry` tốn gấp mấy chục lần `BoxGeometry`.

**Thử phá:**

- Bật `wireframe` để thấy từng loại được chia tam giác thế nào. `Plane` chỉ có 2 tam
  giác, `TorusKnot` có hàng nghìn
- Đổi `SphereGeometry(0.8, 32, 16)` thành `(0.8, 128, 64)` rồi nhìn lại con số — tăng
  khoảng 16 lần, mà mắt gần như không phân biệt được
- Đổi `IcosahedronGeometry(0.9, 0)` thành `(0.9, 3)`: tham số thứ hai là số lần chia nhỏ,
  và nó là cách rẻ nhất để có một quả cầu nhìn "hình học"

## Bài tập 2 — tự dựng một tam giác

Không dùng geometry dựng sẵn. Bài này nên làm đúng một lần.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick } = createLab({ helpers: false });

const geometry = new THREE.BufferGeometry();

const vertices = new Float32Array([
   0,  1, 0,
  -1, -1, 0,
   1, -1, 0,
]);

geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
geometry.computeVertexNormals();

const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
);
scene.add(mesh);

onTick((delta) => {
  mesh.rotation.y += 0.8 * delta;
});
```

**Thử phá:**

- Bỏ `side: THREE.DoubleSide` — tam giác **biến mất một nửa vòng quay**, vì lúc đó bạn
  đang nhìn vào mặt sau. Ba đỉnh xếp ngược chiều kim đồng hồ mới là mặt trước
- Đảo hai đỉnh cuối trong mảng — mặt trước thành mặt sau, hiện ngược lại
- Bỏ `computeVertexNormals()` — tam giác đen thui, vì không có pháp tuyến thì ánh sáng
  không biết chiếu vào đâu

## Bài tập 3 — sửa từng đỉnh lúc chạy

Dùng cả bốn thứ: đọc attribute, ghi attribute, `needsUpdate`, `computeVertexNormals`.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick } = createLab({ helpers: false });

const geometry = new THREE.PlaneGeometry(10, 10, 64, 64);
geometry.rotateX(-Math.PI / 2);

const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, wireframe: false })
);
scene.add(mesh);

const position = geometry.attributes.position;
const base = Float32Array.from(position.array);

onTick((_delta, elapsed) => {
  for (let i = 0; i < position.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    position.setY(i, Math.sin(x * 0.7 + elapsed) * Math.cos(z * 0.7) * 0.6);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
});
```

Chỗ đáng chú ý là `base`: phải giữ **bản gốc** của mảng toạ độ, vì nếu tính sóng chồng
lên toạ độ đã bị sửa của frame trước thì mặt phẳng sẽ trôi đi vô hạn.

**Thử phá:**

- Bỏ `position.needsUpdate = true` — mặt phẳng đứng im hoàn toàn, dù vòng lặp vẫn chạy và
  mảng vẫn đang đổi. GPU giữ bản cũ cho tới khi được báo
- Bỏ `geometry.computeVertexNormals()` — sóng vẫn nhấp nhô nhưng **sáng phẳng lì**
- Đổi `64, 64` thành `256, 256` rồi nhìn FPS. Đây chính là lý do bài này sẽ được viết lại
  bằng vertex shader nếu cần chạy thật
- Đặt `wireframe: true` để thấy đúng cái lưới đang bị dịch chuyển
