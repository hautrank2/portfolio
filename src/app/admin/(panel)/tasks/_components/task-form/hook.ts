import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  taskFormSchema,
  type TaskFormValues,
  type UseTaskFormProps,
} from "./type";

export const useTaskForm = ({ defaultValues, onSubmit }: UseTaskFormProps) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: TaskFormValues) => {
    await onSubmit(values);
  };

  return { form, handleSubmit, isSubmitting: form.formState.isSubmitting };
};
