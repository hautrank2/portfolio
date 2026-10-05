import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  projectFormSchema,
  type ProjectFormValues,
  type UseProjectFormProps,
} from "./type";

export const useProjectForm = ({ defaultValues, onSubmit }: UseProjectFormProps) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: ProjectFormValues) => {
    await onSubmit(values);
  };

  return { form, handleSubmit, isSubmitting: form.formState.isSubmitting };
};
