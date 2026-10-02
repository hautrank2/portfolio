"use client";

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
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useLogForm } from "./hook";
import type { LogFormDialogProps, LogFormProps } from "./type";

export const LogFormDialog = ({
  open,
  onOpenChange,
  ...props
}: LogFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0">
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
        <DialogTitle>{props.isEdit ? "Sửa log" : "Thêm log"}</DialogTitle>
        <DialogDescription className="sr-only">
          Form thêm hoặc sửa log công việc
        </DialogDescription>
      </DialogHeader>

      {/* Vùng field cuộn được, header và footer đứng yên */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="log-date">Ngày</Label>
            <Input
              id="log-date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...form.register("date")}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-hours">Số giờ</Label>
            <Input
              id="log-hours"
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.25}
              aria-invalid={Boolean(errors.hours)}
              {...form.register("hours", { valueAsNumber: true })}
            />
            {errors.hours && (
              <p className="text-xs text-destructive">{errors.hours.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="log-content">Đã làm gì</Label>
          <Textarea
            id="log-content"
            rows={5}
            placeholder="Hôm nay làm được gì, vướng ở đâu…"
            aria-invalid={Boolean(errors.content)}
            {...form.register("content")}
          />
          {errors.content && (
            <p className="text-xs text-destructive">{errors.content.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="log-technologies">Công nghệ</Label>
          <Input
            id="log-technologies"
            placeholder="Next.js, MongoDB, Kubernetes"
            aria-invalid={Boolean(errors.technologies)}
            {...form.register("technologies")}
          />
          <p className="text-xs text-muted-foreground">
            Cách nhau bằng dấu phẩy.
          </p>
          {errors.technologies && (
            <p className="text-xs text-destructive">
              {errors.technologies.message}
            </p>
          )}
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
