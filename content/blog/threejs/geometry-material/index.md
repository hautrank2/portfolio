---
title: "Chặng 4 — Geometry và Material (Bài 15–18)"
description: Hình dạng là mảng số, vẻ ngoài là material. Cộng thêm lil-gui để vặn thử.
status: seed
updated: 2026-08-23
order:
  - geometries
  - materials
  - common-materials
  - lil-gui
---

`Mesh` = `Geometry` + `Material`. Geometry trả lời **hình dạng ở đâu**, material trả lời
**trông thế nào**.

Điều đáng nhớ nhất: geometry không phải "một khối hộp", nó là vài mảng `Float32Array`
đặt cạnh nhau. Hiểu vậy thì tự dựng hình, biến dạng bằng shader, hay tối ưu số đỉnh đều
là cùng một việc.

Bài 18 thêm `lil-gui` — từ đây mọi bài tập đều nên có vài thanh trượt để vặn.
