import { z } from "zod";
import { taskPriorityData, taskStatusData } from "~/data/admin";
/** Same cap as `POST /api/tasks/bulk`. */
export const MAX_IMPORT_TASKS = 100;

// The same check as `objectIdSchema`, with a message a person can act on.
const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Not a valid id");

// Lenient on purpose — pasted JSON is hand-written or generated: only `title`
// is required, `null` counts as missing, and unknown keys (an `id`, the
// `projectTitle` of a copied row) are dropped.
export const taskImportItemSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200, "Too long"),
  description: z.string().max(5000, "Too long").nullish(),
  status: z.enum(taskStatusData).nullish(),
  priority: z.enum(taskPriorityData).nullish(),
  /** `YYYY-MM-DD` or a full ISO date-time. */
  dueDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullish(),
  projectId: idSchema.nullish(),
  tagIds: z.array(idSchema).max(30, "At most 30").nullish(),
  categoryIds: z.array(idSchema).max(30, "At most 30").nullish(),
  technologies: z
    .array(z.string().trim().min(1, "Empty name").max(40, "Too long"))
    .max(20, "At most 20")
    .nullish(),
});

export type TaskImportItem = z.infer<typeof taskImportItemSchema>;

export type TaskImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tasks without a `projectId` go to this one — the project being filtered. */
  defaultProjectId?: string;
};

export type UseTaskImportProps = TaskImportDialogProps & {};
