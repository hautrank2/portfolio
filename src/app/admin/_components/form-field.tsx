"use client";

import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export type FormFieldProps = {
  label: string;
  /** Id of the control inside; omit for a group of controls. */
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

/** Label, control, then a hint or the validation error — one admin form row. */
export const FormField = ({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: FormFieldProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
