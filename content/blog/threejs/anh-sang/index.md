---
title: "Chặng 5 — Ánh sáng (Bài 19–21)"
description: Bốn loại đèn, đổ bóng, và environment map — thứ thật sự làm scene đẹp lên.
status: seed
updated: 2026-08-23
order:
  - lights
  - shadows
  - environment-maps
---

Chặng này có một sự thật hơi phản trực giác: **thêm đèn thường không làm scene đẹp hơn,
mà làm nó chậm đi**. Cái tạo ra vẻ đẹp trong Three.js hiện đại chủ yếu là **environment
map** ở Bài 21, không phải số lượng nguồn sáng ở Bài 19.

Bài 20 là bài đắt nhất về hiệu năng trong cả khoá: mỗi đèn đổ bóng là một lần render lại
toàn scene từ góc nhìn của đèn.
