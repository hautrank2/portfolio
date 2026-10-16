# Rules — cách dùng và tái sử dụng

Bộ rule chia làm hai loại:

| File | Loại | Khi sang dự án mới |
| --- | --- | --- |
| `global.md` | **Project-specific** | Viết lại toàn bộ, giữ khung mục lục (What it is → Stack → Content/Domain → Structure → Verification → What to Avoid → Agent Behaviour) |
| `source-code-rule.md` | Reusable | Copy nguyên |
| `complex-component-rule.md` | Reusable | Copy nguyên |
| `dialog-form-rule.md` | Reusable (giả định shadcn/ui) | Copy nếu dự án dùng shadcn; dự án MUI thì dùng bảng đối chiếu trong file theo chiều ngược lại |

Nguyên tắc giữ ranh giới:

- **Convention file không được chứa trạng thái repo** (gói đã cài hay chưa,
  folder nào đang có gì, file legacy nào) — mấy thứ đó mục theo thời gian và
  thuộc về `global.md`.
- **`global.md` không chứa convention viết code** — chỉ chứa kiến thức về
  chính dự án và các *ngoại lệ* của dự án đối với convention.
- Khi hai file mâu thuẫn: file cụ thể hơn thắng (component rule >
  `source-code-rule.md`); riêng chuyện của dự án hiện tại thì `global.md` thắng.

Frontmatter `trigger`: `always_on` cho rule nền, `model_decision` + `description`
cho rule tình huống (như `dialog-form-rule.md`) để đỡ tốn context.
