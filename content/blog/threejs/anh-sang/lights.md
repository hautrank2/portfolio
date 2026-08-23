---
title: "Bài 19 — Lights"
description: Sáu loại đèn, cái nào rẻ cái nào đắt, và vì sao RectAreaLight hay đen thui.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, lighting]
---

Đèn trong Three.js không phải vật thể phát sáng — chúng là **tham số truyền vào shader**.
Thêm một đèn nghĩa là mọi material chịu ảnh hưởng phải biên dịch lại và tính thêm một
vòng mỗi pixel.

Đó là lý do câu hỏi đúng không phải "thêm đèn nào nữa", mà "**bớt được đèn nào**".

## Sáu loại

| Đèn | Có hướng? | Có vị trí? | Chi phí | Đổ bóng |
|---|---|---|---|---|
| `AmbientLight` | không | không | gần như 0 | không |
| `HemisphereLight` | trên/dưới | không | rất rẻ | không |
| `DirectionalLight` | có | không*| rẻ | có |
| `PointLight` | toả mọi hướng | có | vừa | có (6 mặt) |
| `SpotLight` | nón | có | vừa | có |
| `RectAreaLight` | tấm phát sáng | có | **đắt** | không |

*`DirectionalLight` có `position`, nhưng chỉ để suy ra **hướng** — nó mô phỏng mặt trời ở
vô cực, nên dời xa hay gần không làm sáng thêm.

## Cường độ giờ theo đơn vị vật lý

Từ r155, Three.js dùng chiếu sáng đúng vật lý mặc định. Hệ quả rất thực tế:

- `DirectionalLight` và `AmbientLight` nhận giá trị nhỏ — quanh **1–5**
- `PointLight` và `SpotLight` nhận giá trị **lớn hơn nhiều** — hàng chục tới hàng trăm,
  vì cường độ giảm theo bình phương khoảng cách (`decay = 2`)

Đây là lý do code cũ trên mạng chép về thì scene tối om: `new THREE.PointLight(0xffffff, 1)`
ngày xưa là vừa, giờ gần như không thấy gì.

## RectAreaLight cần một dòng khởi tạo

```ts
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();   // BẮT BUỘC, gọi MỘT LẦN trước khi tạo đèn
```

Thiếu dòng này thì đèn tồn tại, không lỗi, và **không chiếu sáng gì cả**. Nó cần một bảng
tra được nạp sẵn dưới dạng texture.

Thêm hai hạn chế: `RectAreaLight` chỉ tác động lên `MeshStandardMaterial` và
`MeshPhysicalMaterial`, và **không đổ bóng được**.

## Helper — nhìn thấy đèn đang ở đâu

```ts
scene.add(new THREE.DirectionalLightHelper(directional, 1));
scene.add(new THREE.PointLightHelper(point, 0.3));
scene.add(new THREE.SpotLightHelper(spot));
scene.add(new THREE.HemisphereLightHelper(hemisphere, 1));
```

`SpotLightHelper` phải gọi `.update()` mỗi khi đèn đổi góc hoặc vị trí.

`RectAreaLightHelper` là ngoại lệ: nó phải là **con của đèn**, không phải con của scene.

```ts
rect.add(new RectAreaLightHelper(rect));
```

## Bài tập

Sáu đèn, bật tắt từng cái, có helper và thanh trượt cường độ.

```ts
import * as THREE from "three";
import GUI from "three/addons/libs/lil-gui.module.min.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { createLab } from "./lab";

// tắt đèn mặc định của lab: bài này tự bật từng cái một
const { scene, camera, onTick, readout } = createLab({ lights: false, helpers: false });
camera.position.set(0, 4, 9);

RectAreaLightUniformsLib.init(); // BẮT BUỘC, nếu không RectAreaLight sẽ đen

// sân khấu
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const props = new THREE.Group();
scene.add(props);

const material = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.1 });

const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
sphere.position.set(-2.5, 1, 0);
props.add(sphere);

const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), material);
box.position.set(0, 0.8, 0);
props.add(box);

const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.24, 128, 24), material);
knot.position.set(2.5, 1, 0);
props.add(knot);

// ---- năm loại đèn ----
const ambient = new THREE.AmbientLight(0xffffff, 0.15);

const hemisphere = new THREE.HemisphereLight(0x60a5fa, 0xb45309, 0.6);
hemisphere.position.set(0, 8, 0);

const directional = new THREE.DirectionalLight(0xffffff, 2);
directional.position.set(5, 6, 4);

const point = new THREE.PointLight(0xf472b6, 30, 0, 2);
point.position.set(-3, 2.5, 2);

const spot = new THREE.SpotLight(0xfacc15, 60, 0, Math.PI / 8, 0.4, 2);
spot.position.set(0, 7, 3);
spot.target.position.set(0, 0, 0);
scene.add(spot.target);

const rect = new THREE.RectAreaLight(0x4ade80, 8, 4, 2);
rect.position.set(0, 3, -4);
rect.lookAt(0, 1, 0);

const helpers = {
  directional: new THREE.DirectionalLightHelper(directional, 1, 0xffffff),
  point: new THREE.PointLightHelper(point, 0.3),
  spot: new THREE.SpotLightHelper(spot),
  hemisphere: new THREE.HemisphereLightHelper(hemisphere, 1),
  rect: new RectAreaLightHelper(rect),
};
rect.add(helpers.rect); // helper của RectAreaLight phải là CON của đèn

const lights = { ambient, hemisphere, directional, point, spot, rect };
type LightName = keyof typeof lights;

const on: Record<LightName, boolean> = {
  ambient: true,
  hemisphere: false,
  directional: true,
  point: false,
  spot: false,
  rect: false,
};

function sync() {
  (Object.keys(lights) as LightName[]).forEach((name) => {
    const light = lights[name];
    if (on[name]) scene.add(light);
    else scene.remove(light);
  });

  (Object.keys(helpers) as (keyof typeof helpers)[]).forEach((name) => {
    const helper = helpers[name];
    if (name === "rect") return; // đã gắn vào đèn
    if (on[name as LightName] && params.helpers) scene.add(helper);
    else scene.remove(helper);
  });

  readout(
    (Object.keys(lights) as LightName[])
      .map((name) => `${on[name] ? "●" : "○"} ${name}`)
      .join("\n") + `\n\nđang bật: ${(Object.keys(on) as LightName[]).filter((n) => on[n]).length}/6`
  );
}

const params = { helpers: true };
const gui = new GUI({ title: "Bài 19 — Lights" });
gui.add(params, "helpers").name("hiện helper").onChange(sync);

const toggles = gui.addFolder("Bật / tắt");
(Object.keys(lights) as LightName[]).forEach((name) => toggles.add(on, name).onChange(sync));

const intensity = gui.addFolder("Cường độ");
intensity.add(ambient, "intensity", 0, 2, 0.01).name("ambient");
intensity.add(hemisphere, "intensity", 0, 3, 0.01).name("hemisphere");
intensity.add(directional, "intensity", 0, 8, 0.01).name("directional");
intensity.add(point, "intensity", 0, 120, 0.5).name("point");
intensity.add(spot, "intensity", 0, 300, 1).name("spot");
intensity.add(rect, "intensity", 0, 30, 0.1).name("rect");

const spotFolder = gui.addFolder("Spot");
spotFolder.add(spot, "angle", 0.05, Math.PI / 3, 0.01).onChange(() => helpers.spot.update());
spotFolder.add(spot, "penumbra", 0, 1, 0.01);
spotFolder.add(spot, "decay", 0, 3, 0.01);

sync();

onTick((delta) => {
  props.rotation.y += 0.15 * delta;
  if (on.spot) helpers.spot.update();
});
```

**Kết quả:** mặc định bật `ambient` + `directional` — bố cục cơ bản nhất và cũng đủ dùng
cho phần lớn trường hợp. Góc trái liệt kê đèn nào đang bật.

**Thử phá:** đây là bài đáng nghịch lâu nhất trong cả chặng.

- Tắt hết đèn — đen thui. Bật **một mình** `ambient` lên: mọi thứ sáng đều tăm tắp, hoàn
  toàn phẳng, không phân biệt được hình khối. Ambient không có hướng nên không tạo được
  chiều sâu
- Bật một mình `directional`: có chiều sâu ngay, nhưng vùng khuất tối đen. **Cặp
  ambient + directional** giải quyết đúng chuyện đó, và đó là lý do nó là bố cục mặc định
- Bật một mình `hemisphere`: trên xanh, dưới nâu — bắt chước trời và đất. Rẻ ngang ambient
  mà tự nhiên hơn nhiều
- Bật `point`, kéo `intensity` từ 0 lên 120 để cảm nhận thang đo mới. Thử đổi `decay`
  xuống 0 trong code — ánh sáng không giảm theo khoảng cách nữa, sai vật lý nhưng dễ chỉnh
- Bật `spot`, kéo `angle` và `penumbra`. `penumbra = 0` cho viền sắc như cắt, `= 1` cho
  viền mềm
- Xoá dòng `RectAreaLightUniformsLib.init()` rồi bật `rect` — đèn có đó, helper vẽ ra
  khung, mà không chiếu sáng gì cả

## Bố cục nên dùng

Với scene thường, hai đèn là đủ:

```ts
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const key = new THREE.DirectionalLight(0xffffff, 3);
key.position.set(4, 6, 3);
scene.add(key);
```

Cần đẹp hơn nữa thì **đừng thêm đèn thứ ba** — thêm environment map ở
[Bài 21](/blog/threejs/anh-sang/environment-maps). Rẻ hơn và cho kết quả tốt hơn hẳn.
