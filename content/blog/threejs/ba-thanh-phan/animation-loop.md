---
title: "Bài 12 — Animation loop và delta time"
description: Vì sao animation chạy nhanh gấp đôi trên màn 120Hz, và vì sao getDelta() gọi hai lần là hỏng.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, animation, basics]
---

`renderer.render()` vẽ đúng **một** khung hình. Muốn thấy chuyển động thì phải gọi lại
liên tục — và toàn bộ cái khó nằm ở chữ "liên tục" đó.

## setAnimationLoop, không phải requestAnimationFrame

```ts
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

renderer.setAnimationLoop(null);   // dừng
```

Tương đương `requestAnimationFrame` nhưng tiện hơn ba điểm: dừng bằng `null` chứ không
phải giữ id để `cancelAnimationFrame`, tự chuyển sang vòng lặp của thiết bị XR nếu cần,
và bớt một chỗ dễ rò rỉ khi dùng trong React.

## Bẫy 1 — cộng thẳng hằng số

```ts
mesh.rotation.y += 0.01;   // ❌
```

Dòng này chạy **mỗi frame**, nên tốc độ xoay phụ thuộc tần số quét màn hình. Màn 60Hz
một tốc độ, laptop 120Hz **nhanh gấp đôi**, máy yếu đang tụt 30 FPS thì chậm một nửa.

```ts
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();     // giây, thường ~0.016
  mesh.rotation.y += 0.5 * delta;     // 0.5 radian mỗi GIÂY, mọi máy như nhau
  renderer.render(scene, camera);
});
```

Con số giờ đọc được thành đơn vị thật.

## Bẫy 2 — gọi getDelta() hai lần

`Clock.getDelta()` **không** trả về "delta của frame này". Nó trả về thời gian kể từ
**lần gọi `getDelta()` trước đó**, rồi reset mốc.

```ts
function loop() {
  updateA(clock.getDelta());   // 0.016
  updateB(clock.getDelta());   // ~0.0001  ❌ B gần như đứng yên
}
```

Không có lỗi nào được báo — chỉ là một nửa số animation chạy chậm khó hiểu.

**Quy tắc: gọi `getDelta()` đúng một lần, ngay đầu loop, rồi truyền xuống.**

Cần thời gian tích luỹ từ lúc bắt đầu (cho `sin`, cho uniform của shader) thì dùng
`getElapsedTime()` — hàm này không reset gì cả.

## Bẫy 3 — delta nhảy vọt khi quay lại tab

Trình duyệt tạm dừng vòng lặp khi tab bị ẩn. Người dùng chuyển tab đi pha cà phê rồi
quay lại, frame đầu tiên có delta cỡ **180 giây**. Mọi thứ nhân với delta lập tức bắn ra
ngoài vũ trụ.

```ts
const delta = Math.min(clock.getDelta(), 0.1);   // ✅ chặn trên
```

Chặn ở 0.1 tương đương giả định tệ nhất là 10 FPS. Frame đó giật một cái, nhưng scene
không hỏng. `lab.ts` đã chặn sẵn.

## Thứ tự bên trong loop

```ts
controls.update();          // 1. input
updateWorld(delta);         // 2. logic, animation
mixer?.update(delta);       // 3. animation của model
renderer.render(scene, camera);   // 4. vẽ, LUÔN cuối cùng
```

Đọc trạng thái sau `render()` nghĩa là đang đọc dữ liệu của khung hình vừa vẽ xong,
không phải khung hình sắp vẽ.

## Bài tập — đặt hai cách viết cạnh nhau

Khối **đỏ** cộng hằng số, khối **xanh** nhân delta.

```ts
import * as THREE from "three";
import { createLab } from "./lab";

const { scene, onTick, readout } = createLab();

const geometry = new THREE.BoxGeometry(1, 1, 1);

const wrong = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
wrong.position.set(-1.2, 0.5, 0);
scene.add(wrong);

const right = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
right.position.set(1.2, 0.5, 0);
scene.add(right);

let frames = 0;
let acc = 0;

onTick((delta) => {
  wrong.rotation.y += 0.01;          // sai: phụ thuộc tần số quét
  right.rotation.y += 0.6 * delta;   // đúng: 0.6 radian mỗi giây

  frames++;
  acc += delta;
  if (acc >= 0.5) {
    readout(
      `${Math.round(frames / acc)} FPS\n` +
      `đỏ  (+= 0.01)      ${((wrong.rotation.y * 180) / Math.PI % 360).toFixed(0)}°\n` +
      `xanh (0.6 * delta) ${((right.rotation.y * 180) / Math.PI % 360).toFixed(0)}°`
    );
    frames = 0;
    acc = 0;
  }
});
```

**Kết quả:** trên màn 60Hz hai khối quay gần bằng nhau — không thấy vấn đề gì. Chính vì
vậy bug này sống sót rất lâu.

**Thử phá:** đây mới là phần quan trọng.

- DevTools → tab **Performance** → bật **CPU throttling 4×**. Khối đỏ chậm hẳn lại, khối
  xanh giữ nguyên tốc độ
- Đổi `Math.min(clock.getDelta(), 0.1)` thành `clock.getDelta()`, chuyển sang tab khác
  30 giây rồi quay lại: khối xanh nhảy vọt một góc lớn ngay khi quay lại
- Thêm một dòng `clock.getDelta()` thừa ở đầu tick — khối xanh gần như đứng im

## Render theo yêu cầu

Không phải scene nào cũng cần 60 FPS. Một model đứng yên cho người dùng xoay bằng
`OrbitControls` chỉ cần vẽ lại khi có tương tác:

```ts
controls.addEventListener("change", () => renderer.render(scene, camera));
```

Laptop hết quay quạt, pin điện thoại thở được. Đây là tối ưu rẻ nhất trong cả khoá, và
cũng là thứ ít người làm nhất.
