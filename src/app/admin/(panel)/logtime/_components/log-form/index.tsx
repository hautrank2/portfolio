"use client";

import { Controller } from "react-hook-form";
import { DatePicker } from "~/app/admin/_components/date-picker";
import { FormField } from "~/app/admin/_components/form-field";
import { LabelPicker } from "~/app/admin/_components/label-picker";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useLogForm } from "./hook";
import type { LogFormDialogProps, LogFormProps } from "./type";

// Radix Select cannot hold an empty-string value, so "no task" needs a name.
const NO_TASK = "none";

export const LogFormDialog = ({
  open,
  onOpenChange,
  ...props
}: LogFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 bg-card p-0 sm:max-w-xl">
        <LogForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export const LogForm = (props: LogFormProps) => {
  const { form, handleSubmit, isSubmitting } = useLogForm(props);
  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
      className="flex min-h-0 flex-col"
    >
      <DialogHeader className="border-b border-border px-6 py-4">
        <DialogTitle>{props.isEdit ? "Edit logtime" : "Add logtime"}</DialogTitle>
        <DialogDescription className="sr-only">
          Form to add or edit a logtime entry
        </DialogDescription>
      </DialogHeader>

      {/* The fields scroll; header and footer stay put. */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <FormField label="Title" htmlFor="log-title" error={errors.title?.message}>
          <Input
            id="log-title"
            placeholder="What did you do?"
            autoFocus
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Date" htmlFor="log-date" error={errors.date?.message}>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="log-date"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={Boolean(errors.date)}
                />
              )}
            />
          </FormField>

          <FormField
            label="Duration (hours)"
            htmlFor="log-hours"
            error={errors.hours?.message}
          >
            <Input
              id="log-hours"
              type="number"
              inputMode="decimal"
              min={0.25}
              max={24}
              step={0.25}
              aria-invalid={Boolean(errors.hours)}
              {...form.register("hours", { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <FormField label="Task" htmlFor="log-task">
          <Controller
            control={form.control}
            name="taskId"
            render={({ field }) => (
              <Select
                value={field.value || NO_TASK}
                onValueChange={(value) =>
                  field.onChange(value === NO_TASK ? "" : value)
                }
              >
                <SelectTrigger id="log-task" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TASK}>No task</SelectItem>
                  {props.tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Category">
          <Controller
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
              <LabelPicker
                kind="categories"
                options={props.categories}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>

        <FormField
          label="Technologies"
          htmlFor="log-technologies"
          error={errors.technologies?.message}
          hint="Separate with commas."
        >
          <Input
            id="log-technologies"
            placeholder="Next.js, MongoDB, Kubernetes"
            aria-invalid={Boolean(errors.technologies)}
            {...form.register("technologies")}
          />
        </FormField>

        <FormField
          label="Note (optional)"
          htmlFor="log-note"
          error={errors.note?.message}
        >
          <Textarea
            id="log-note"
            rows={2}
            aria-invalid={Boolean(errors.note)}
            {...form.register("note")}
          />
        </FormField>

        {props.error && (
          <p role="alert" className="text-sm text-destructive">
            {props.error}
          </p>
        )}
      </div>

      <DialogFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          Submit
        </Button>
      </DialogFooter>
    </form>
  );
};
