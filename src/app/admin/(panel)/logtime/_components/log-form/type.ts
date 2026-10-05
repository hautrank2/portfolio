import { z } from "zod";
import type { CategoryModel, TaskModel } from "~/types";

// Shaped like the inputs, not like the API: the day is a plain date, the
// duration is in hours and lists are typed as text. The board turns it into a
// `LogtimeInputModel` on submit.
export const logFormSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200, "Too long"),
  date: z.iso.date("Pick a date"),
  /** Hours — stored as minutes. */
  hours: z
    .number("Enter the hours")
    .positive("Must be more than 0")
    .max(24, "At most 24 hours"),
  /** Empty string means no task. */
  taskId: z.string(),
  /** Zero or one id — an array so it can share the label picker. */
  categoryIds: z.array(z.string()),
  /** Comma-separated. */
  technologies: z.string().max(400, "Too long"),
  note: z.string().max(5000, "Too long"),
});

export type LogFormValues = z.infer<typeof logFormSchema>;

export type LogFormProps = {
  isEdit: boolean;
  defaultValues: LogFormValues;
  onSubmit: (values: LogFormValues) => void | Promise<void>;
  /** Server-side failure from the last submit, shown above the footer. */
  error?: string | null;
  tasks: TaskModel[];
  categories: CategoryModel[];
};

export type LogFormDialogProps = LogFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type UseLogFormProps = LogFormProps & {};
