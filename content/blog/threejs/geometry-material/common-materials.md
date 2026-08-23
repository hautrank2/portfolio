---
title: "Bài 17 — Các material hay dùng"
description: Tám loại đặt cạnh nhau, và cây quyết định chọn loại nào.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, material]
---

Three.js có hơn chục material dựng sẵn. Thực tế chỉ dùng đi dùng lại ba, bốn cái.

## Cây quyết định

| Cần | Dùng |
|---|---|
| Màu phẳng, không phản ứng với ánh sáng | `MeshBasicMaterial` |
| Vật thể thường: kim loại, nhựa, gỗ | `MeshStandardMaterial` |
| Thêm clearcoat, kính, truyền sáng | `MeshPhysicalMaterial` |
| Phong cách hoạt hình | `MeshToonMaterial` |
| Debug pháp tuyến | `MeshNormalMaterial` |
| Tự viết toàn bộ vẻ ngoài | `ShaderMaterial` |

**`MeshStandardMaterial` là mặc định hợp lý cho gần như mọi thứ.**

## Ba thế hệ chiếu sáng

| Material | Mô hình | Chi phí | Còn nên dùng? |
|---|---|---|---|
| `Lambert` | khuếch tán, tính theo đỉnh | rẻ nhất | chỉ khi cần cực nhẹ |
| `Phong` | thêm điểm sáng bóng | vừa | hiếm |
| `Standard` | PBR: roughness + metalness | đắt hơn | **mặc định** |
| `Physical` | PBR mở rộng: clearcoat, truyền sáng | đắt nhất | vài vật đặc biệt |

`Lambert` và `Phong` là cách chiếu sáng của thời trước PBR — vẫn chạy, vẫn nhanh, nhưng
khó chỉnh cho ra vật liệu thật. `Standard` chỉ có hai tham số và cả hai đều có nghĩa vật
lý rõ ràng.

## roughness và metalness

- **`metalness`**: là kim loại hay không. Gần như luôn là **0 hoặc 1**, hiếm khi ở giữa.
  Kim loại không có màu khuếch tán riêng — nó chỉ phản chiếu môi trường
- **`roughness`**: bề mặt nhẵn (0, như gương) hay nhám (1, mờ đục hoàn toàn)

Hệ quả quan trọng: **`metalness = 1` mà không có environment map thì vật gần như đen**.
Không phải bug — kim loại chỉ phản chiếu, mà chưa có gì để phản chiếu. Bài 21 sửa chuyện
này.

## MeshBasicMaterial là công cụ debug

Không cần đèn, luôn hiện đúng màu. Khi màn hình đen, đổi tạm sang `basic`: nếu vật hiện
ra thì lỗi nằm ở **ánh sáng**, không phải ở hình học hay camera.

## Bài tập

Tám loại, cùng một quả cầu, có nhãn tên bên dưới.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, camera } = createLab({ helpers: false });
camera.position.set(0, 0, 10);

const geometry = new THREE.SphereGeometry(0.8, 64, 32);

const entries: [string, THREE.Material][] = [
  ["Basic", new THREE.MeshBasicMaterial({ color: 0x38bdf8 })],
  ["Lambert", new THREE.MeshLambertMaterial({ color: 0x38bdf8 })],
  ["Phong", new THREE.MeshPhongMaterial({ color: 0x38bdf8, shininess: 100 })],
  ["Standard", new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.4 })],
  ["Physical", new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.4, clearcoat: 1 })],
  ["Normal", new THREE.MeshNormalMaterial()],
  ["Toon", new THREE.MeshToonMaterial({ color: 0x38bdf8 })],
  ["Depth", new THREE.MeshDepthMaterial()],
];

entries.forEach(([, material], i) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(((i % 4) - 1.5) * 2.2, i < 4 ? 1.2 : -1.2, 0);
  scene.add(mesh);
});

// nhãn tên bằng canvas -> sprite, không cần font loader
entries.forEach(([name], i) => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, 128, 44);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.scale.set(2, 0.5, 1);
  sprite.position.set(((i % 4) - 1.5) * 2.2, (i < 4 ? 1.2 : -1.2) - 1.2, 0);
  scene.add(sprite);
});
```

Nhãn tên vẽ bằng canvas 2D rồi gắn lên `Sprite` — cách rẻ nhất để có chữ trong scene mà
không cần font loader.

**Kết quả:** hàng trên `Basic`, `Lambert`, `Phong`, `Standard`; hàng dưới `Physical`,
`Normal`, `Toon`, `Depth`.

**Thử phá:**

- Xoá hết đèn (`createLab({ lights: false })`): `Basic`, `Normal` và `Depth` vẫn hiện
  bình thường, năm cái còn lại đen thui. Đó là ranh giới "cần đèn / không cần đèn"
- So `Lambert` với `Standard` khi kéo camera lại gần: `Lambert` tính ánh sáng theo **đỉnh**
  nên chuyển sắc thô hơn ở quả cầu ít đoạn chia
- Đổi `metalness` của `Standard` lên 1 — nó tối sầm lại, vì chưa có environment map
- `MeshDepthMaterial` chuyển từ trắng sang đen theo khoảng cách — chính là thứ dùng để
  dựng shadow map ở Bài 20
