import { z } from "zod";

export const loginFormSchema = z.object({
  username: z.string().trim().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export type LoginFormProps = {
  /** Where to go once signed in. */
  redirectTo: string;
};

export type UseLoginFormProps = LoginFormProps & {};
