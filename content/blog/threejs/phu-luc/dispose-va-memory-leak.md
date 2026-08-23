---
title: "dispose() và rò rỉ bộ nhớ GPU"
description: scene.remove() không giải phóng gì cả. Bug số một khi nhét Three.js vào SPA.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, performance, react]
---

Giáo trình không nói tới chuyện này, vì nó dựng một trang tĩnh chạy độc lập. Nhưng đưa
Three.js vào một ứng dụng có điều hướng thì đây là thứ hỏng đầu tiên.

Trong JavaScript, mất tham chiếu là GC dọn hộ. Trong WebGL thì không: geometry, texture và
shader nằm trên **GPU**, và trình duyệt không có cách nào biết bạn còn cần chúng hay
không. Phải nói ra.

## Xoá khỏi scene không phải là giải phóng

```ts
scene.remove(mesh);   // chỉ gỡ khỏi cây scene
```

Sau dòng này, `mesh` không được vẽ nữa. Nhưng buffer đỉnh vẫn nằm trên GPU, texture vẫn
chiếm VRAM, shader vẫn còn trong bộ nhớ đệm chương trình.

Bài kiểm tra 30 giây, chạy trong console:

```ts
setInterval(() => console.log(renderer.info.memory), 1000);
```

Chuyển route đi rồi quay lại vài lần. Nếu `geometries` và `textures` **tăng dần và không
bao giờ giảm**, bạn đang rò rỉ.

## Hàm dọn dùng chung

```ts
function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.geometry.dispose();

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      // mọi texture của material đều là một thuộc tính có cờ isTexture
      for (const value of Object.values(material)) {
        if ((value as THREE.Texture)?.isTexture) (value as THREE.Texture).dispose();
      }
      material.dispose();
    }
  });

  root.removeFromParent();
}
```

Vòng lặp qua `Object.values` bắt được cả `map`, `normalMap`, `roughnessMap`, `aoMap`,
`envMap` mà không cần liệt kê tên.

**Cảnh báo:** hàm này giả định geometry và material **không dùng chung**. Nếu cố tình chia
sẻ một geometry cho 500 mesh (điều nên làm), thì đừng dispose theo mesh.

## Danh sách dọn dẹp đầy đủ

```ts
renderer.setAnimationLoop(null);        // 1. dừng vòng lặp
controls.dispose();                     // 2. gỡ listener của OrbitControls
resizeObserver.disconnect();            // 3. hoặc removeEventListener("resize", ...)
disposeObject(scene);                   // 4. tài nguyên GPU
pmrem.dispose();                        // 5. render target của environment map
renderer.dispose();                     // 6. shader cache
renderer.domElement.remove();           // 7. gỡ canvas khỏi DOM
```

Bỏ sót bước 1 là tệ nhất: vòng lặp vẫn chạy sau khi component unmount, vẫn render vào một
canvas không còn ai nhìn, và vẫn giữ tham chiếu tới toàn bộ scene nên **không gì** được GC
dọn.

Bước 6 quan trọng vì trình duyệt giới hạn số WebGL context đồng thời (thường khoảng 16).

## Bài tập — máy đo rò rỉ

Sinh 40 mesh mới mỗi nửa giây và vứt lô cũ đi. Bấm chuột để đổi giữa `remove()` và
`dispose()`, rồi nhìn con số `geometries` ở góc trái.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, renderer, onTick, readout } = createLab({ helpers: false });

let cleanUp = false;
addEventListener("click", () => { cleanUp = !cleanUp; });

let batch: THREE.Group | null = null;
let timer = 0;

function spawn() {
  const group = new THREE.Group();
  for (let i = 0; i < 40; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
    );
    mesh.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 6
    );
    group.add(mesh);
  }
  return group;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if ((value as THREE.Texture)?.isTexture) (value as THREE.Texture).dispose();
      }
      material.dispose();
    }
  });
  root.removeFromParent();
}

onTick((delta) => {
  timer += delta;
  if (timer > 0.5) {
    timer = 0;
    if (batch) {
      if (cleanUp) disposeObject(batch);
      else scene.remove(batch);
    }
    batch = spawn();
    scene.add(batch);
  }

  readout(
    `bấm chuột để bật/tắt dispose()\n` +
    `chế độ: ${cleanUp ? "dispose()  ✅" : "chỉ remove()  ❌"}\n` +
    `geometries: ${renderer.info.memory.geometries}\n` +
    `textures:   ${renderer.info.memory.textures}`
  );
});
```

**Kết quả:** ở chế độ `chỉ remove()`, `geometries` tăng đều **40 mỗi nửa giây** và không
bao giờ giảm. Bấm chuột một cái, con số lập tức đứng yên quanh 40–80.

Đây là toàn bộ bài học, ở dạng một con số chạy trên màn hình.

**Thử phá:**

- Để chế độ rò rỉ chạy một phút rồi mở Task Manager nhìn bộ nhớ tiến trình trình duyệt
- Thêm một `map` texture vào material rồi xem `textures` cũng leo y hệt
- Đổi `new THREE.BoxGeometry(...)` thành một geometry dùng chung khai báo ngoài `spawn()`
  — `geometries` không tăng nữa kể cả khi không dispose, vì chỉ còn **một** buffer trên GPU

## Trong React

Toàn bộ phần dọn dẹp thuộc về hàm trả về của `useEffect`, và effect phải chạy **đúng một
lần**:

```tsx
useEffect(() => {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current! });
  // ... dựng scene
  renderer.setAnimationLoop(tick);

  return () => {
    renderer.setAnimationLoop(null);
    disposeObject(scene);
    renderer.dispose();
  };
}, []);
```

Ở chế độ dev, React Strict Mode **cố tình** mount → unmount → mount lại. Đây không phải
phiền toái mà là công cụ: nếu code dọn dẹp sai, bạn sẽ thấy ngay hai canvas, hoặc scene
chạy nhanh gấp đôi vì có hai vòng lặp. Đừng tắt Strict Mode để "sửa" nó.
