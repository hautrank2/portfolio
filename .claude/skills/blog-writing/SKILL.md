---
name: blog-writing
description: Use when writing or editing a blog note under content/blog/ — covers which words stay in English (API names, technical terms, headings) instead of being translated into Vietnamese coinages, and keeping one term per concept across a track.
---

# Viết note cho blog

Note viết bằng tiếng Việt, nhưng một từ **không** cần dịch chỉ vì dịch được.
Người đọc sẽ gặp từ English trong code, API, docs hay output của tool — giữ
nguyên English.

## Giữ English

- **Tên API và khái niệm của nó** — `Scene`, `Mesh`, `Object3D`, property,
  method, constructor, callback, Pod, Deployment, manifest, volume, rollout.
- **Danh từ kỹ thuật phổ biến** — global property, render loop, frame,
  texture, shader, material, geometry, node, tree, state, cluster, container.
- **Heading** gồm các từ trên — `## Global properties`, không phải
  `## Ba thuộc tính toàn cục`.

## Không làm

- Tự đặt từ tiếng Việt thay thế ("thuộc tính toàn cục" cho global property,
  "bản khai" cho Kubernetes object, "lưới" cho mesh).
- Lẫn lộn hai cách trong một track: đã dùng English thì dùng English ở mọi
  note của track đó.

## Vẫn viết tiếng Việt

Phần câu xung quanh thuật ngữ — giải thích, cảnh báo, lý do. Viết
"`background` và `environment` độc lập nhau", không viết cả câu English.

Không chắc một từ có phải thuật ngữ không? Hỏi: dev Việt khi nói chuyện có
nói từ này bằng English không? Có → giữ English.

## Code bài tập dùng file chung

Người đọc có thể vào thẳng một note giữa track. Nếu code bài tập import một
file viết ở bài trước (Three.js: `createLab` từ `./lab`, viết ở Bài 8), ngay
dưới heading `## Bài tập` đầu tiên của note phải có một blockquote link về bài
đó:

```md
> Code dưới import `createLab` từ `./lab` — bộ khung dùng chung viết ở
> [Bài 8](/blog/threejs/getting-started/course-boilerplate). Chưa có thì chép `src/lab.ts` ở đó trước.
```
