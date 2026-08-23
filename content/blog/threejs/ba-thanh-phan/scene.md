---
title: "Bài 9 — Scene"
description: Scene chỉ là node gốc của một cái cây, cộng ba thuộc tính toàn cục.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, basics]
---

`Scene` kế thừa `Object3D`. Nó không vẽ, không tính, không giữ trạng thái WebGL nào —
chỉ là **node gốc của một cái cây**, cộng thêm ba thuộc tính có tác dụng lên toàn bộ
scene.

## Ba thuộc tính toàn cục

```ts
scene.background = new THREE.Color(0x0e1116);   // màu, Texture, hoặc CubeTexture
scene.fog = new THREE.Fog(0x0e1116, 6, 40);     // mờ dần theo khoảng cách
scene.environment = envMap;                     // ánh sáng môi trường cho vật liệu PBR
```

`background` và `environment` **độc lập nhau**, và đây là chỗ hay nhầm nhất: gán ảnh HDR
vào `background` thì thấy nền đẹp nhưng vật thể *không* sáng lên. Muốn nó chiếu sáng thì
phải gán vào `environment`. Bài 21 quay lại chuyện này.

## Fog có hai loại

```ts
scene.fog = new THREE.Fog(color, near, far);      // tuyến tính: near trong suốt, far đục hẳn
scene.fog = new THREE.FogExp2(color, 0.02);       // theo hàm mũ, tự nhiên hơn
```

Bẫy: **màu fog nên trùng màu background**. Lệch nhau thì vật ở xa mờ về một màu, còn nền
lại là màu khác — nhìn như dán ảnh.

Fog chỉ tác động lên material có `fog: true` (mặc định bật ở mọi material dựng sẵn).
`ShaderMaterial` tự viết thì không, trừ khi tự xử lý.

## Thêm, bớt, và tìm

```ts
scene.add(mesh);            // thêm; nhận nhiều tham số: scene.add(a, b, c)
scene.remove(mesh);         // gỡ khỏi cây — KHÔNG giải phóng bộ nhớ GPU
mesh.removeFromParent();    // tiện hơn khi không giữ tham chiếu tới cha

scene.getObjectByName("hang-khoi");   // tìm theo obj.name
scene.traverse((obj) => { ... });      // duyệt CẢ CÂY, kể cả cháu chắt
```

Khác nhau giữa `scene.children.length` và số node `traverse` đếm được chính là số node
lồng bên trong. Bài tập dưới in cả hai để thấy rõ.

`scene.remove()` không dọn bộ nhớ GPU — chuyện đó thuộc về `dispose()`, và giáo trình
không nói tới. Có một note riêng ở
[phụ lục](/blog/threejs/phu-luc/dispose-va-memory-leak).

## Bài tập

Một hàng khối chạy về phía xa, để nhìn thấy fog đang làm gì.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { createLab } from "./lab";

const { scene, camera, readout } = createLab({ helpers: false });
camera.position.set(0, 2, 8);

// Scene chỉ là node gốc, cộng ba thuộc tính toàn cục: background, fog, environment
scene.background = new THREE.Color(0x0e1116);
scene.fog = new THREE.Fog(0x0e1116, 6, 40);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

// một hàng khối chạy về phía xa — để nhìn thấy fog
const row = new THREE.Group();
row.name = "hang-khoi";
for (let i = 0; i < 24; i++) {
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(i % 2 ? 1.5 : -1.5, 0, -i * 1.4);
  row.add(cube);
}
scene.add(row);

const params = {
  fog: true,
  near: 6,
  far: 40,
  background: "#0e1116",
  removeRow: () => scene.remove(row),
  addRow: () => scene.add(row),
};

const gui = new GUI({ title: "Bài 9 — Scene" });
gui.add(params, "fog").onChange((on) => (scene.fog = on ? new THREE.Fog(params.background, params.near, params.far) : null));
gui.add(params, "near", 0, 30, 0.1).onChange((v) => scene.fog && ((scene.fog as THREE.Fog).near = v));
gui.add(params, "far", 5, 80, 0.1).onChange((v) => scene.fog && ((scene.fog as THREE.Fog).far = v));
gui.addColor(params, "background").onChange((value) => {
  (scene.background as THREE.Color).set(value);
  if (scene.fog) (scene.fog as THREE.Fog).color.set(value);
});
gui.add(params, "removeRow").name("scene.remove(row)");
gui.add(params, "addRow").name("scene.add(row)");

// đếm bằng traverse: cả cây, không chỉ con trực tiếp
let total = 0;
scene.traverse(() => total++);
readout(`scene.children: ${scene.children.length}\ntraverse đếm được: ${total}`);
```

**Kết quả:** hàng khối nhạt dần về phía xa và tan vào nền. Góc trái in số con trực tiếp
của scene (rất ít) so với tổng số node (nhiều hơn hẳn).

**Thử phá:**

- Tắt checkbox `fog` — khối ở xa hiện rõ mồn một, nhìn phẳng và giả ngay lập tức
- Kéo `far` xuống gần bằng `near` — chuyển tiếp thành gắt như một bức tường sương mù
- Đổi màu `background` mà **không** đổi màu fog (xoá dòng `fog.color.set` đi): vật ở xa
  tan vào một màu, nền lại màu khác. Đây là bug hay gặp khi đổi theme sáng/tối
- Bấm `scene.remove(row)` rồi `scene.add(row)` — chú ý `scene.children` đổi đúng 1 đơn
  vị dù cả hàng có 24 khối, vì cả hàng nằm trong một `Group`
