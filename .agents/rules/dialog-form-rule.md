- Quy định về tạo Form trong Dialog cho tính năng A
- Áp dụng chung với `complex-component-rule.md`: vẫn tách `index.tsx` / `hook.ts` / `type.ts`
- Phải có ít nhất 2 component đặt vào file `index.tsx`

> Stack ở repo này là **shadcn/ui + Tailwind**, không phải MUI. Dialog lấy từ
> `~/components/ui/dialog`, và không có `sx` — style bằng `className`.
> Bảng đối chiếu nếu bạn mang code từ dự án MUI sang:
>
> | MUI | shadcn |
> | --- | --- |
> | `<Box component="form">` | `<form>` |
> | `<DialogActions sx={{ borderTop: 1 }}>` | `<DialogFooter className="border-t">` |
> | `<DialogTitle>` đứng một mình | `<DialogHeader><DialogTitle>` |
> | `sx={{ ... }}` | `className="..."` |
>
> `Dialog` export: `Dialog` `DialogTrigger` `DialogContent` `DialogHeader`
> `DialogFooter` `DialogTitle` `DialogDescription` `DialogClose`.
> **Không có `DialogActions`.**

## `index.tsx`

```tsx
"use client";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useAForm } from "./hook";
import type { AFormDialogProps, AFormProps } from "./type";

export const AFormDialog = ({ open, onOpenChange, ...props }: AFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0">
        <AForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export const AForm = (props: AFormProps) => {
  const { form, handleSubmit, isSubmitting } = useAForm(props);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <DialogHeader className="border-b border-border px-6 py-4">
        <DialogTitle>{props.isEdit ? "Sửa A" : "Thêm A"}</DialogTitle>
        <DialogDescription className="sr-only">
          Form thêm hoặc sửa A
        </DialogDescription>
      </DialogHeader>

      {/* Vùng field cuộn được, header và footer đứng yên */}
      <div className="flex-1 overflow-y-auto px-6 py-4">{/* các field */}</div>

      <DialogFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          Submit
        </Button>
      </DialogFooter>
    </form>
  );
};
```

- `AFormDialog` chỉ lo phần vỏ Dialog, `AForm` lo form. Tách ra để `AForm`
  dùng lại được ở ngoài Dialog (trang riêng, drawer…) mà không phải sửa gì.
- Footer có đúng 2 nút: **Cancel** và **Submit**. Cancel dùng `DialogClose asChild`
  để Radix tự đóng, không cần tự quản state.
- `DialogContent` là flex column; phần field `overflow-y-auto` để form dài vẫn
  cuộn được mà header/footer không trôi.

## `type.ts`

```ts
import type { z } from "zod";

export const aFormSchema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  // ...
});

export type AFormValues = z.infer<typeof aFormSchema>;

export type AFormProps = {
  isEdit: boolean;
  defaultValues: AFormValues;
  onSubmit: (values: AFormValues) => void | Promise<void>;
};

export type AFormDialogProps = AFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type UseAFormProps = AFormProps & {};
```

- Props bắt buộc: **`isEdit`** và **`defaultValues`**.
- `AFormDialogProps` kế thừa `AFormProps`, đúng như `complex-component-rule.md`.
- **Định nghĩa zod đặt trong `type.ts`**, cùng chỗ với type suy ra từ nó
  (`z.infer`) để schema và type không bao giờ lệch nhau.

## `hook.ts`

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { aFormSchema, type AFormValues, type UseAFormProps } from "./type";

export const useAForm = ({ defaultValues, onSubmit }: UseAFormProps) => {
  const form = useForm<AFormValues>({
    resolver: zodResolver(aFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: AFormValues) => {
    await onSubmit(values);
  };

  return { form, handleSubmit, isSubmitting: form.formState.isSubmitting };
};
```

## Thư viện cần cài

Repo hiện **chưa có** các gói dưới đây. Cài khi làm form đầu tiên:

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

Nếu cần field component của shadcn (`Form`, `FormField`, `FormItem`,
`FormLabel`, `FormMessage`) thì thêm:

```bash
npx shadcn@latest add form
```
