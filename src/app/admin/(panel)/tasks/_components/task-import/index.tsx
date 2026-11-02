"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useTaskImport } from "./hook";
import type { TaskImportDialogProps } from "./type";

// Radix Select cannot hold an empty-string value, so "no project" needs a name.
const NO_PROJECT = "none";

const EXAMPLE = `[
  {
    "title": "Write the deploy guide",
    "description": "Optional",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2026-11-15",
    "technologies": ["Docker", "Kubernetes"]
  }
]`;

export const TaskImportDialog = (props: TaskImportDialogProps) => {
  const {
    text,
    handleTextChange,
    projectId,
    setProjectId,
    count,
    error,
    isSubmitting,
    handleSubmit,
  } = useTaskImport(props);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 bg-card p-0 sm:max-w-xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-col">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Import tasks</DialogTitle>
            <DialogDescription>
              Paste a JSON array. Only <code>title</code> is required; status defaults
              to TODO and priority to MEDIUM.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <FormField
              label="Project"
              htmlFor="task-import-project"
              hint="For tasks without a projectId."
            >
              <Select
                value={projectId || NO_PROJECT}
                onValueChange={(value) => setProjectId(value === NO_PROJECT ? "" : value)}
              >
                <SelectTrigger id="task-import-project" className="w-full">
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
            </FormField>

            <Textarea
              aria-label="Tasks as JSON"
              rows={14}
              spellCheck={false}
              placeholder={EXAMPLE}
              value={text}
              onChange={(event) => handleTextChange(event.target.value)}
              aria-invalid={Boolean(error)}
              className="font-mono text-xs"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || count === 0}>
              {count > 0 ? `Import ${count} ${count === 1 ? "task" : "tasks"}` : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
