---
title: "Bài 1 — Học thế nào cho hết 45 bài"
description: Bốn bước cho mỗi bài, và ba cái bẫy làm người ta bỏ dở giữa chừng.
status: seed
created: 2026-08-23
updated: 2026-08-23
tags: [threejs, mindset]
---

45 bài, 8 giờ 24 phút video. Xem hết là chuyện của vài buổi; **nhớ** được thì không.
Khác biệt nằm ở chỗ có gõ lại hay không.

## Bốn bước cho mỗi bài

1. **Xem một lượt**, không gõ gì. Chỉ để biết bài này nói về cái gì
2. **Gõ lại từ đầu**, không tua lại video trừ khi kẹt thật
3. **Phá nó** — mỗi note trong track này có mục "Thử phá" chính là bước này
4. **Commit** với message là tên bài, ví dụ `19-lights`

Bước 3 là bước học được nhiều nhất và cũng là bước hay bị bỏ nhất. Biết một dòng code
làm gì thì dễ; biết chuyện gì xảy ra khi thiếu nó mới là thứ dùng được lúc debug.

## Ba cái bẫy

**Bẫy 1 — xem liền 5 bài rồi mới gõ.** Tới lúc gõ thì không nhớ bài 2 nói gì, phải tua
lại từ đầu. Xem một bài, gõ một bài.

**Bẫy 2 — copy code từ phần Resources.** Mỗi bài đều có link tải code. Rất tiện, và
cũng là cách nhanh nhất để kết thúc khoá học mà không viết nổi một scene từ số 0. Dùng
nó để *đối chiếu* khi kẹt, không phải để bắt đầu.

**Bẫy 3 — bỏ qua Bài 6 và 7.** Stats và GUI trông như hai bài phụ. Thật ra chúng là hai
công cụ dùng ở 37 bài còn lại: một cái cho biết đang chậm, một cái cho phép vặn tham số
mà không phải sửa code rồi reload.

## Nhịp đề xuất

| Chặng | Bài | Thời lượng video | Nên dành |
|---|---|---|---|
| Chuẩn bị | 1–8 | 48 phút | 1 buổi |
| Scene / Camera / Renderer | 9–12 | 43 phút | 1 buổi |
| Object3D | 13–14 | 12 phút | nửa buổi |
| Geometry / Material | 15–18 | 34 phút | 1 buổi |
| Ánh sáng | 19–21 | 43 phút | 1–2 buổi |
| Tải tài nguyên | 22–25 | 60 phút | 2 buổi |
| Tương tác | 26–27 | 28 phút | 1 buổi |
| Animation | 28–31 | 63 phút | 2 buổi |
| Physics | 32–35 | 68 phút | 2–3 buổi |
| Game | 36–37 | 65 phút | 3 buổi |
| Deploy | 38–45 | 39 phút | 1 buổi |

Quy đổi thô: **thời gian thật ≈ 3 lần thời lượng video**, vì phần lớn nằm ở gõ lại và
sửa lỗi chính tả trong code.

## Cần biết trước

JavaScript ở mức thoải mái, và TypeScript ở mức đọc hiểu `interface` với generic đơn
giản. **Không cần** biết toán 3D trước — ma trận và vector sẽ xuất hiện dần ở Bài 13–14,
đúng lúc cần tới.
