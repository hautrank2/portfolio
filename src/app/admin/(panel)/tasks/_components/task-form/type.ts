import { z } from "zod";
import { taskPriorityData, taskStatusData } from "~/data/admin";
import type { CategoryModel, TagModel, WorkProjectModel } from "~/types";

// Shaped like the inputs, not like the API: the due date is a plain day and
// technologies are typed as text. The board turns it into a `TaskInputModel`.
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200, "Too long"),
  description: z.string().max(5000, "Too long"),
  status: z.enum(taskStatusData),
  priority: z.enum(taskPriorityData),
  /** `YYYY-MM-DD`, or empty for no due date. */
  dueDate: z.union([z.literal(""), z.iso.date("Pick a date")]),
  /** Empty string means no project. */
  projectId: z.string(),
  tagIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  /** Comma-separated. */
  technologies: z.string().max(400, "Too long"),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export type TaskFormProps = {
  isEdit: boolean;
  defaultValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => void | Promise<void>;
  /** Server-side failure from the last submit, shown above the footer. */
  error?: string | null;
  projects: WorkProjectModel[];
  tags: TagModel[];
  categories: CategoryModel[];
};

export type TaskFormDialogProps = TaskFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type UseTaskFormProps = TaskFormProps & {};
