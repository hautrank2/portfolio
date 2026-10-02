import { z } from "zod";

export const logFormSchema = z.object({
  date: z.iso.date("Chọn ngày"),
  content: z.string().trim().min(1, "Bắt buộc").max(5000, "Tối đa 5000 ký tự"),
  /** Comma-separated in the form; split into a list before it hits the API. */
  technologies: z.string().max(400, "Quá dài"),
  hours: z
    .number("Nhập số giờ")
    .min(0, "Không được âm")
    .max(24, "Tối đa 24 giờ"),
});

export type LogFormValues = z.infer<typeof logFormSchema>;

export type LogFormProps = {
  isEdit: boolean;
  defaultValues: LogFormValues;
  onSubmit: (values: LogFormValues) => void | Promise<void>;
  /** Server-side failure from the last submit, shown above the footer. */
  error?: string | null;
};

export type LogFormDialogProps = LogFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type UseLogFormProps = LogFormProps & {};
