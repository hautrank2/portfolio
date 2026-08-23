---
title: "Chặng 11 — Deploy (Bài 38–45)"
description: Từ npm run build tới HTTPS trên domain riêng. Ba đường đi, chọn một.
status: seed
updated: 2026-08-23
order:
  - build-production
  - github-pages
  - gitlab-pages
  - cloud-server
  - nginx
  - deploy-files
  - domain
  - ssl
---

Tám bài cuối chia làm ba đường độc lập, **không cần làm cả ba**:

| Đường | Bài | Hợp khi |
|---|---|---|
| GitHub Pages | 39 | Demo cá nhân, không cần domain riêng |
| GitLab Pages | 40 | Đã dùng GitLab CI sẵn |
| VPS + Nginx | 41–45 | Cần domain riêng, cần kiểm soát header |

Bài 38 thì bắt buộc, vì cả ba đường đều bắt đầu từ thư mục `dist`.

Với người đã quen deploy web, đường thứ ba chỉ có đúng một chỗ đặc thù Three.js: cấu
hình cache và MIME cho file `.glb`, `.hdr`, `.wasm` — nằm ở Bài 42.
