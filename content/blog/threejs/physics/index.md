---
title: "Chặng 9 — Physics với Rapier (Bài 32–35)"
description: Thế giới vật lý chạy song song với scene, và cách đồng bộ hai bên.
status: seed
updated: 2026-08-23
order:
  - rapier
  - rapier-debug
  - pointer-lock-controls
  - impulse-joint-motors
---

Ý tưởng trung tâm của cả chặng: **Rapier không biết Three.js tồn tại**. Nó chạy một thế
giới riêng gồm rigid body và collider, mỗi frame tính ra vị trí mới, còn việc chép vị trí
đó sang `mesh.position` là việc của bạn.

Nhìn ra được điều này thì mọi bug "hình một đằng, va chạm một nẻo" đều tự giải thích —
và đó cũng là lý do Bài 33 tồn tại.

```bash
npm i @dimforge/rapier3d-compat
```

Bản `-compat` nhúng sẵn WASM nên chạy với Vite không cần cấu hình thêm, đổi lại bundle
nặng hơn bản thường.
