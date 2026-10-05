"use client";

import { Controller } from "react-hook-form";
import { ColorSwatches } from "~/app/admin/_components/color-swatches";
import { FormField } from "~/app/admin/_components/form-field";
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
import { workProjectStatusData, workProjectStatusLabelData } from "~/data/admin";
import { useProjectForm } from "./hook";
import type { ProjectFormDialogProps, ProjectFormProps } from "./type";

export const ProjectFormDialog = ({
  open,
  onOpenChange,
  ...props
}: ProjectFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 bg-card p-0">
        <ProjectForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export const ProjectForm = (props: ProjectFormProps) => {
  const { form, handleSubmit, isSubmitting } = useProjectForm(props);
  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      noValidate
      className="flex min-h-0 flex-col"
    >
      <DialogHeader className="border-b border-border px-6 py-4">
        <DialogTitle>{props.isEdit ? "Edit project" : "Add project"}</DialogTitle>
        <DialogDescription className="sr-only">
          Form to add or edit a project
        </DialogDescription>
      </DialogHeader>

      {/* The fields scroll; header and footer stay put. */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <FormField
          label="Title"
          htmlFor="project-title"
          error={errors.title?.message}
        >
          <Input
            id="project-title"
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="project-description"
          error={errors.description?.message}
        >
          <Textarea
            id="project-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Status" htmlFor="project-status">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="project-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workProjectStatusData.map((status) => (
                      <SelectItem key={status} value={status}>
                        {workProjectStatusLabelData[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Colour" error={errors.color?.message}>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <ColorSwatches
                  value={field.value}
                  onChange={field.onChange}
                  label="Project colour"
                  className="h-9"
                />
              )}
            />
          </FormField>
        </div>

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
