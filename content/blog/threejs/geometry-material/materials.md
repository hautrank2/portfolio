---
title: "Bài 16 — Material"
description: Thuộc tính chung của mọi material, và hai thứ bắt buộc phải needsUpdate.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, material]
---

Geometry trả lời **hình dạng ở đâu**. Material trả lời **trông thế nào** — và nó cũng
quyết định shader nào được biên dịch.

## Thuộc tính chung của mọi material

```ts
material.color        // Color, không phải chuỗi -> dùng .set()
material.wireframe    // vẽ cạnh thay vì mặt
material.visible      // ẩn hẳn, khác với opacity = 0
material.opacity      // CHỈ có tác dụng khi transparent = true
material.transparent
material.side         // FrontSide (mặc định) | BackSide | DoubleSide
material.flatShading  // dùng pháp tuyến của mặt thay vì của đỉnh
material.opacity
```

Bẫy phổ biến nhất: **`opacity` không làm gì nếu chưa bật `transparent`**. Đặt
`opacity = 0.5` mà quên `transparent = true` thì vật vẫn đục hoàn toàn.

## Hai thứ cần needsUpdate

Đa số thuộc tính đổi là thấy ngay. Nhưng có nhóm thuộc tính làm **đổi cấu trúc shader**,
và shader thì phải biên dịch lại:

```ts
material.flatShading = true;
material.side = THREE.DoubleSide;
material.transparent = true;
material.needsUpdate = true;      // BẮT BUỘC sau ba dòng trên
```

Quên `needsUpdate` là kiểu bug im lặng nhất: không lỗi, không cảnh báo, chỉ là không có
gì xảy ra.

Ngược lại, **đừng** bật `needsUpdate` mỗi frame. Nó buộc biên dịch lại shader, và biên
dịch shader là một trong những việc đắt nhất trong WebGL.

## side và mặt sau

`FrontSide` (mặc định) chỉ vẽ mặt trước, để tiết kiệm một nửa số tam giác. Với vật thể
kín thì không ai thấy khác biệt.

Nhưng với mặt phẳng, mặt cắt, hay model xuất từ Blender bị lộn pháp tuyến, kết quả là
**lỗ thủng**. Cách kiểm tra nhanh: tạm đặt `DoubleSide`, nếu hiện đủ thì lỗi ở hướng
tam giác chứ không ở toạ độ.

`DoubleSide` đắt gấp đôi. Dùng để chẩn đoán, rồi sửa gốc.

## Bài tập

Một nút thắt, một mặt phẳng phía sau, và panel để vặn từng thuộc tính.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, camera } = createLab({ helpers: false });
camera.position.set(0, 0, 5);

const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });

const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.35, 128, 24), material);
scene.add(mesh);

// một mặt phẳng phía sau, để thấy rõ transparent và opacity
const back = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.MeshStandardMaterial({ color: 0x1e293b })
);
back.position.z = -2;
scene.add(back);

const params = {
  color: "#38bdf8",
  side: THREE.FrontSide as number,
  flatShading: false,
};

const gui = new GUI({ title: "Bài 16 — Material" });

gui.addColor(params, "color").onChange((v) => material.color.set(v));
gui.add(material, "wireframe");
gui.add(material, "visible");
gui.add(material, "transparent").onChange(() => (material.needsUpdate = true));
gui.add(material, "opacity", 0, 1, 0.01);
gui.add(material, "roughness", 0, 1, 0.01);
gui.add(material, "metalness", 0, 1, 0.01);

// hai thuộc tính dưới đây đổi cấu trúc shader -> BẮT BUỘC needsUpdate
gui.add(params, "flatShading").onChange((v) => {
  material.flatShading = v;
  material.needsUpdate = true;
});

gui.add(params, "side", { Front: THREE.FrontSide, Back: THREE.BackSide, Double: THREE.DoubleSide })
  .onChange((v) => {
    material.side = Number(v) as THREE.Side;
    material.needsUpdate = true;
  });
```

**Thử phá:**

- Kéo `opacity` xuống 0.3 khi `transparent` đang **tắt** — không có gì xảy ra. Bật
  `transparent` lên rồi kéo lại
- Bật `transparent` rồi xoay camera quanh nút thắt: có góc nhìn thấy phần trong của chính
  nó vẽ **sai thứ tự**. Đây là hạn chế cố hữu của alpha blending, không phải bug
- Bật `flatShading` — bề mặt vỡ thành các mảnh phẳng, thấy rõ từng tam giác
- Xoá dòng `material.needsUpdate = true` trong `onChange` của `flatShading` rồi bấm lại:
  checkbox đổi, hình không đổi
- Đổi `side` sang `Back` — chỉ còn thấy mặt trong của nút thắt
