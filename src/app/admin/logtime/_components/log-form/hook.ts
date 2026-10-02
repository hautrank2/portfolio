import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  logFormSchema,
  type LogFormValues,
  type UseLogFormProps,
} from "./type";

export const useLogForm = ({ defaultValues, onSubmit }: UseLogFormProps) => {
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: LogFormValues) => {
    await onSubmit(values);
  };

  return { form, handleSubmit, isSubmitting: form.formState.isSubmitting };
};
