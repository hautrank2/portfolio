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
import {
  taskPriorityData,
  taskPriorityLabelData,
  taskStatusData,
  taskStatusLabelData,
} from "~/data/admin";
import { useTaskForm } from "./hook";
import type { TaskFormDialogProps, TaskFormProps } from "./type";

// Radix Select cannot hold an empty-string value, so "no project" needs a name.
const NO_PROJECT = "none";

export const TaskFormDialog = ({
  open,
  onOpenChange,
  ...props
}: TaskFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 bg-card p-0 sm:max-w-xl">
        <TaskForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export const TaskForm = (props: TaskFormProps) => {
  const { form, handleSubmit, isSubmitting } = useTaskForm(props);
  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
      className="flex min-h-0 flex-col"
    >
      <DialogHeader className="border-b border-border px-6 py-4">
        <DialogTitle>{props.isEdit ? "Edit task" : "Add task"}</DialogTitle>
        <DialogDescription className="sr-only">
          Form to add or edit a task
        </DialogDescription>
      </DialogHeader>

      {/* The fields scroll; header and footer stay put. */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <FormField label="Title" htmlFor="task-title" error={errors.title?.message}>
          <Input
            id="task-title"
            placeholder="What needs doing?"
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="task-description"
          error={errors.description?.message}
        >
          <Textarea
            id="task-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField label="Status" htmlFor="task-status">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="task-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatusData.map((status) => (
                      <SelectItem key={status} value={status}>
                        {taskStatusLabelData[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Priority" htmlFor="task-priority">
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="task-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskPriorityData.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {taskPriorityLabelData[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Due date"
            htmlFor="task-due"
            error={errors.dueDate?.message}
          >
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker
                  id="task-due"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="No due date"
                  clearable
                  aria-invalid={Boolean(errors.dueDate)}
                />
              )}
            />
          </FormField>
        </div>

        <FormField label="Project" htmlFor="task-project">
          <Controller
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <Select
                value={field.value || NO_PROJECT}
                onValueChange={(value) =>
                  field.onChange(value === NO_PROJECT ? "" : value)
                }
              >
                <SelectTrigger id="task-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>No project</SelectItem>
                  {props.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Categories">
          <Controller
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
              <LabelPicker
                kind="categories"
                options={props.categories}
                value={field.value}
                onChange={field.onChange}
                multiple
              />
            )}
          />
        </FormField>

        <FormField label="Tags">
          <Controller
            control={form.control}
            name="tagIds"
            render={({ field }) => (
              <LabelPicker
                kind="tags"
                options={props.tags}
                value={field.value}
                onChange={field.onChange}
                multiple
              />
            )}
          />
        </FormField>

        <FormField
          label="Technologies"
          htmlFor="task-technologies"
          error={errors.technologies?.message}
          hint="Separate with commas."
        >
          <Input
            id="task-technologies"
            placeholder="Next.js, MongoDB, Kubernetes"
            aria-invalid={Boolean(errors.technologies)}
            {...form.register("technologies")}
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
