---
title: Three.js
description: Note theo giáo trình 45 bài, từ dựng môi trường tới deploy. Mỗi bài một bài tập chạy được ngay.
status: seed
updated: 2026-08-23
tags: [threejs, webgl, 3d, frontend]
order:
  - chuan-bi
  - ba-thanh-phan
  - object3d
  - geometry-material
  - anh-sang
  - tai-tai-nguyen
  - tuong-tac
  - animation
  - physics
  - game
  - deploy
  - phu-luc
---

Track này bám theo đúng thứ tự **45 bài** của giáo trình đang học, chia thành 11 chặng
cộng một phần phụ lục. Mỗi note tương ứng một bài giảng, và note nào cũng kết thúc bằng
một **bài tập có code đầy đủ** — dán vào `src/main.ts` là chạy ra hình.

## Cách dùng

Ba bước, không hơn:

1. Dựng project một lần theo [Bài 2–4](/blog/threejs/chuan-bi)
2. Chép `lab.ts` ở [Bài 8](/blog/threejs/chuan-bi/course-boilerplate) vào `src/`
3. Mỗi bài tập sau đó chỉ việc dán đè lên `src/main.ts`

Không bài nào cần cài thêm gì cho tới Bài 29 — kể cả `OrbitControls`, `Stats` và
`lil-gui` đều đi kèm sẵn trong gói `three`. Chỉ hai chỗ phải `npm i`: `jeasings`
(Bài 29) và `@dimforge/rapier3d-compat` (Bài 32).

## Cấu trúc mỗi note

**Ý chính** — bài giảng nói gì, gói trong vài dòng.
**Bài tập** — một file `main.ts` hoàn chỉnh, chạy được, ra hình nhìn thấy được.
**Thử phá** — vài dòng nên sửa hoặc xoá để thấy nó đang giữ cái gì.

Học bằng cách phá cái đang chạy nhanh hơn nhiều so với đọc lý thuyết rồi tự dựng.

## Môi trường

Vite + TypeScript + three, không dùng framework. Mọi đoạn code trong track đều đã chạy
thật trên **three r182**.

```bash
npm create vite@latest three-lab -- --template vanilla-ts
cd three-lab && npm i three && npm i -D @types/three
```

Node màu xám là bài đã có trong giáo trình nhưng chưa viết note.
