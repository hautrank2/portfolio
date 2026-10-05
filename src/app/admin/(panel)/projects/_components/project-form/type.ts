import { z } from "zod";
import { workProjectStatusData } from "~/data/admin";

export const projectFormSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200, "Too long"),
  description: z.string().max(5000, "Too long"),
  status: z.enum(workProjectStatusData),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a colour"),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export type ProjectFormProps = {
  isEdit: boolean;
  defaultValues: ProjectFormValues;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
  /** Server-side failure from the last submit, shown above the footer. */
  error?: string | null;
};

export type ProjectFormDialogProps = ProjectFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type UseProjectFormProps = ProjectFormProps & {};
