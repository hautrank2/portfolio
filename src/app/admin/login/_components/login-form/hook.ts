import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getErrorMessage, httpClient } from "~/lib/http-client";
import {
  loginFormSchema,
  type LoginFormValues,
  type UseLoginFormProps,
} from "./type";

export const useLoginForm = ({ redirectTo }: UseLoginFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await httpClient.post("/api/auth/login", values);
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Sign-in failed."));
    }
  };

  return {
    form,
    handleSubmit,
    error,
    isSubmitting: form.formState.isSubmitting,
  };
};
