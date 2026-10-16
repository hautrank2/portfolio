---
title: "Prompt AI: thêm một câu ràng buộc, code khác hẳn"
description: Hai prompt Python cho cùng một task — một mơ hồ, một nêu rõ ràng buộc — và vì sao prompt càng rõ, AI càng ít phải đoán. Kỹ thuật prompt engineering cơ bản nhất.
status: seed
created: 2026-10-16
updated: 2026-10-16
tags: [prompting, python]
---

Cùng một task — parse một chuỗi ngày giờ — nhưng hai prompt cho ra hai đoạn code
khác nhau một trời một vực. Khác biệt duy nhất: **một câu nêu ràng buộc**.

## Prompt 1 — mơ hồ

> Write a Python function to parse a date string (DD/MM/YYYY hh:mm:ss)

AI trả về đúng thứ được hỏi, không hơn:

```python
from datetime import datetime

def parse_datetime(s: str) -> datetime:
    """Parse chuỗi 'DD/MM/YYYY hh:mm:ss' thành datetime.

    Raises ValueError nếu chuỗi không hợp lệ.
    """
    return datetime.strptime(s.strip(), "%d/%m/%Y %H:%M:%S")
```

Một dòng `strptime`. Không sai — nhưng chỉ chạy được trên *happy path*:

- `None` → `TypeError` (`.strip()` trên `None`)
- sai format, ngày không tồn tại → `ValueError`
- truyền nhầm `int`, `dict` → crash

Đưa vào production là phải tự viết thêm phần xử lý lỗi — tức là AI mới làm giúp
nửa việc.

## Prompt 2 — có ràng buộc

Vẫn prompt cũ, thêm một câu:

> ...Handle all errors: invalid format, None, wrong type, empty string.
> **Never raise; return None and log the error.**

```python
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DATE_FORMAT = "%d/%m/%Y %H:%M:%S"


def parse_datetime(value) -> datetime | None:
    """Parse chuỗi 'DD/MM/YYYY hh:mm:ss' thành datetime.

    Không bao giờ raise: trả về None và ghi log nếu có lỗi.
    """
    try:
        if value is None:
            logger.error("parse_datetime: input is None")
            return None

        if not isinstance(value, str):
            logger.error(
                "parse_datetime: expected str, got %s (%r)",
                type(value).__name__, value,
            )
            return None

        value = value.strip()
        if not value:
            logger.error("parse_datetime: input is empty string")
            return None

        return datetime.strptime(value, DATE_FORMAT)

    except ValueError as e:
        # Sai định dạng hoặc ngày không tồn tại (vd: 31/02/2026)
        logger.error(
            "parse_datetime: invalid format or value %r (expected %s): %s",
            value, DATE_FORMAT, e,
        )
        return None
    except Exception:
        # Lưới an toàn cuối cùng, đảm bảo không bao giờ raise
        logger.exception("parse_datetime: unexpected error for input %r", value)
        return None
```

Guard clause cho từng edge case, log đủ ngữ cảnh để debug, và một lưới an toàn
cuối cùng giữ đúng cam kết *never raise*. Dùng được ngay.

## Bài học

1. **Liệt kê cụ thể edge case** — đừng chỉ nói "handle all errors". Kể tên từng
   case: invalid format, `None`, wrong type, empty string.
2. **Định nghĩa rõ hành vi mong muốn** — lỗi thì return gì, log gì, có raise
   không. "Never raise; return None and log" là một dòng spec hoàn chỉnh.
3. **Ràng buộc càng rõ, AI càng ít phải đoán** — và thứ AI đoán thường là thứ
   bạn phải sửa.

Prompt giống như spec: **spec mơ hồ thì code mơ hồ.**
