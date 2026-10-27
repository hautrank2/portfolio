# Rules — cách dùng và tái sử dụng

Trước đây bộ rule này nằm ở `.agents/rules/` (frontmatter `trigger`), đọc bởi
một agent khác. Đã migrate sang cơ chế của Claude Code:

| File / Folder | Loại | Cơ chế nạp | Khi sang dự án mới |
| --- | --- | --- | --- |
| `CLAUDE.md` (root) | **Project-specific** | Claude Code tự nạp mỗi session | Viết lại toàn bộ, giữ khung mục lục (What it is → Stack → Content/Domain → Structure → Verification → What to Avoid → Agent Behaviour) |
| `docs/rules/source-code-rule.md` | Reusable | `@import` từ `CLAUDE.md` — luôn nạp cùng | Copy nguyên |
| `docs/rules/complex-component-rule.md` | Reusable | `@import` từ `CLAUDE.md` — luôn nạp cùng | Copy nguyên |
| `.claude/skills/dialog-form/SKILL.md` | Reusable (giả định shadcn/ui) | **Skill** — Claude tự gọi khi task khớp `description` trong frontmatter, không nạp sẵn | Copy nguyên cả folder nếu dự án dùng shadcn; dự án MUI thì dùng bảng đối chiếu trong file theo chiều ngược lại |

Vì sao hai cơ chế khác nhau: `trigger: always_on` cũ tương đương một file được
`CLAUDE.md` `@import` (Claude Code đọc đệ quy tới 5 cấp, nên tách file vẫn luôn
nạp); `trigger: model_decision` cũ (có `description`) tương đương một **Skill**
— Claude chỉ nạp nội dung khi thấy task khớp mô tả, đỡ tốn context cho quy tắc
không phải lúc nào cũng cần.

Nguyên tắc giữ ranh giới (không đổi so với trước):

- **Convention file không được chứa trạng thái repo** (gói đã cài hay chưa,
  folder nào đang có gì, file legacy nào) — mấy thứ đó mục theo thời gian và
  thuộc về `CLAUDE.md`.
- **`CLAUDE.md` không chứa convention viết code** — chỉ chứa kiến thức về
  chính dự án và các *ngoại lệ* của dự án đối với convention.
- Khi hai file mâu thuẫn: file cụ thể hơn thắng (skill/rule của component >
  `source-code-rule.md`); riêng chuyện của dự án hiện tại thì `CLAUDE.md` thắng.

## Mang sang dự án khác

1. Copy `docs/rules/source-code-rule.md` và
   `docs/rules/complex-component-rule.md` nguyên văn.
2. Copy cả folder `.claude/skills/dialog-form/` nếu dự án mới dùng shadcn/ui.
3. Viết `CLAUDE.md` mới ở root dự án đó theo khung mục lục ở trên, với hai dòng
   `@docs/rules/source-code-rule.md` và
   `@docs/rules/complex-component-rule.md` để hai file reusable luôn được nạp.
