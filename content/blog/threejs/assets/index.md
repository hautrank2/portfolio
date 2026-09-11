---
title: "Chặng 6 — Tải tài nguyên (Bài 22–25)"
description: Texture, LoadingManager và glTF. Phần lớn thời gian thật nằm ở chuẩn bị file.
status: seed
updated: 2026-08-23
order:
  - loading-assets
  - loading-multiple
  - gltf-loader-1
  - gltf-loader-2
---

Tải một model chỉ vài dòng. Làm cho nó nhẹ đủ để đưa lên web mới là việc thật.

Ngưỡng nên tự đặt: một model chính dưới **2 MB** sau nén, tổng texture cả trang dưới
**5 MB**. Vượt ngưỡng thì đừng tối ưu code, quay lại xử lý file.
