---
title: "Chặng 2 — Scene, Camera, Renderer (Bài 9–12)"
description: Bộ ba tối thiểu để có pixel, và vòng lặp giữ cho nó sống.
status: seed
updated: 2026-08-23
order:
  - scene
  - camera
  - renderer
  - animation-loop
---

Bốn bài này là phần "bắt buộc" của Three.js. Mọi thứ còn lại — hình học, vật liệu, ánh
sáng, shader — chỉ là nội dung nhét vào giữa ba object này.

Nếu chỉ nhớ được một thứ từ cả chặng: **màn hình đen luôn có đúng bốn nghi phạm** —
camera nhìn sai hướng, vật nằm ngoài `near`–`far`, chưa có đèn, hoặc chưa gọi `render`.
