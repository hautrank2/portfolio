---
title: "Chặng 7 — Tương tác (Bài 26–27)"
description: Raycaster và OrbitControls. Cầu nối giữa chuột 2D và không gian 3D.
status: seed
updated: 2026-08-23
order:
  - raycaster
  - orbit-controls
---

Canvas là **một** phần tử DOM. Trình duyệt không biết gì về các object bên trong, nên
không có `onClick` cho mesh — phải tự bắn một tia từ camera qua vị trí chuột.

Hai bài này ngắn nhưng là thứ dùng lại nhiều nhất về sau: game ở Bài 36–37 sống bằng
raycast.
