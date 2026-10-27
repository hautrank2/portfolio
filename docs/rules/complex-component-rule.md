# Component Split — `index.tsx` / `hook.ts` / `type.ts`

> **Reusable** — convention chung, copy nguyên sang dự án khác.

## Khi nào áp dụng

Chỉ tách file khi component có logic thật: state, effect, form, gọi API, hoặc
nhiều handler. Component thuần hiển thị (nhận props, trả JSX) là **một file
duy nhất** — đừng tách một badge 5 dòng thành 3 file.

Khi đã tách, component là một folder:

```
task-form/
├── index.tsx   # UI — chỉ render, không chứa logic
├── hook.ts     # logic — hook useXxx
└── type.ts     # schema (zod, nếu có) + MỌI type: props component, props hook
```

## Quy tắc

- Dùng **arrow function**: `export const Foo = (props: FooProps) => …`
- Dùng **`type`**, không dùng `interface`.
- **Mọi type đặt trong `type.ts`** — props của component, props của hook, và
  schema zod cùng type suy ra từ nó (`z.infer`) để schema và type không bao
  giờ lệch nhau. `index.tsx` và `hook.ts` chỉ import từ `./type`.
- Đặt tên: props của component là `<ComponentName>Props`, props của hook là
  `Use<ComponentName>Props`.
- Props của hook **suy ra từ props của component**: kế thừa
  (`UseFooProps = FooProps & { … }`) khi hook cần gần hết, hoặc
  `Pick<FooProps, "…">` khi chỉ cần một phần. Hook không tự bịa ra một shape
  rời rạc với component của nó.
- Hook trong `hook.ts` dùng `use*` nghĩa là component thành Client Component —
  cân nhắc ranh giới server/client trước khi tách (xem `source-code-rule.md`).

## Ví dụ

`type.ts`

```ts
export type FooProps = {
  defaultValue: string;
  onDone: (value: string) => void;
};

export type UseFooProps = Pick<FooProps, "defaultValue" | "onDone">;
```

`hook.ts`

```ts
import { useState } from "react";
import type { UseFooProps } from "./type";

export const useFoo = ({ defaultValue, onDone }: UseFooProps) => {
  const [value, setValue] = useState(defaultValue);
  return { value, setValue, submit: () => onDone(value) };
};
```

`index.tsx`

```tsx
"use client";

import { useFoo } from "./hook";
import type { FooProps } from "./type";

export const Foo = (props: FooProps) => {
  const { value, setValue, submit } = useFoo(props);
  return <div>{/* UI dùng value / setValue / submit */}</div>;
};
```

Form nằm trong dialog có thêm quy định riêng — xem Skill `dialog-form`
(`.claude/skills/dialog-form/SKILL.md`).
