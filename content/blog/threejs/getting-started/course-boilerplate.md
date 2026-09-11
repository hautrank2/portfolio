---
title: "Bài 8 — Bộ khung dùng lại cho 37 bài còn lại"
description: Một file lab.ts viết một lần, để mọi bài tập sau chỉ tốn 5 dòng là bắt đầu được.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, setup]
---

Bài giảng gọi đây là "course boilerplate": thay vì mỗi bài lại gõ lại renderer, camera,
resize handler và vòng lặp, gói hết vào một file rồi quên nó đi.

Bản dưới đây là bộ khung dùng cho **mọi bài tập trong track này**. Chép vào
`src/lab.ts`, và từ đây trở đi mỗi bài chỉ việc dán đè lên `src/main.ts`.

## src/lab.ts

```ts
// lab.ts — bộ khung dùng chung cho mọi bài. Viết một lần, không viết lại nữa.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type TickFn = (delta: number, elapsed: number) => void;

export function createLab({ helpers = true, lights = true } = {}) {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1116);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(4, 3, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  if (lights) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(4, 6, 3);
    scene.add(key);
  }

  if (helpers) {
    scene.add(new THREE.GridHelper(20, 20, 0x3b4252, 0x232833));
    scene.add(new THREE.AxesHelper(2));
  }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const ticks: TickFn[] = [];
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    controls.update();
    for (const tick of ticks) tick(delta, elapsed);
    renderer.render(scene, camera);
  });

  /** Góc trên trái, để in số ra màn hình thay vì mở console. */
  const readout = (text: string) => {
    let el = document.getElementById("lab-readout");
    if (!el) {
      el = document.createElement("pre");
      el.id = "lab-readout";
      el.style.cssText =
        "position:fixed;top:12px;left:12px;margin:0;padding:8px 12px;" +
        "font:12px ui-monospace,monospace;color:#e2e8f0;background:#00000080;border-radius:8px";
      document.body.append(el);
    }
    el.textContent = text;
  };

  return { scene, camera, renderer, controls, onTick: (fn: TickFn) => ticks.push(fn), readout };
}
```

## Nó gánh những gì

| Việc | Nếu tự viết mỗi bài |
|---|---|
| Tạo renderer, set size, set pixel ratio | 4 dòng |
| Camera + `lookAt` | 3 dòng |
| `OrbitControls` để xoay bằng chuột | 2 dòng |
| Xử lý resize (kèm `updateProjectionMatrix`) | 5 dòng |
| Vòng lặp có `delta` đã chặn trên | 6 dòng |
| Đèn cơ bản để `MeshStandardMaterial` không đen | 4 dòng |
| Lưới và trục toạ độ để biết đang nhìn đâu | 2 dòng |
| Ô chữ góc trái để in số | 10 dòng |

Khoảng 36 dòng mỗi bài, nhân 37 bài.

## Ba tuỳ chọn

```ts
createLab();                                    // đủ bộ
createLab({ helpers: false });                  // bỏ lưới và trục — khi cần ảnh sạch
createLab({ lights: false });                   // bỏ đèn — khi bài học TỰ bật đèn (Bài 19–21)
createLab({ helpers: false, lights: false });
```

## Bài tập — khối hộp đầu tiên

`src/main.ts`:

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick } = createLab();

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
);
cube.position.y = 0.5;
scene.add(cube);

onTick((delta) => {
  cube.rotation.y += 0.6 * delta;
});
```

**Kết quả:** một khối xanh xoay chậm trên nền lưới. Kéo chuột để xoay camera, lăn chuột
để zoom, chuột phải để dịch ngang.

**Thử phá:**

- `createLab({ lights: false })` — khối thành đen thui. Đây là nghi phạm phổ biến nhất
  của "màn hình đen", và nó sẽ quay lại ở Bài 19
- Đổi `MeshStandardMaterial` sang `MeshBasicMaterial` rồi tắt đèn lại: hiện bình thường,
  vì material này không cần ánh sáng
- Bỏ `* delta`, để `cube.rotation.y += 0.6`: khối quay như điên, vì 0.6 radian mỗi
  **frame** thay vì mỗi giây. Bài 12 nói kỹ chỗ này
- Xoá `cube.position.y = 0.5` — nửa dưới khối chìm xuống dưới lưới, vì gốc toạ độ của
  `BoxGeometry` nằm ở tâm khối chứ không ở đáy

## readout dùng để làm gì

`readout("...")` in chữ ra góc trái màn hình. Nghe thừa, nhưng `console.log` trong vòng
lặp 60 lần mỗi giây thì DevTools sẽ đứng hình sau vài giây. In ra một ô chữ thì không.

Từ Bài 9 trở đi, gần như bài nào cũng dùng nó để hiện số đang thay đổi.
