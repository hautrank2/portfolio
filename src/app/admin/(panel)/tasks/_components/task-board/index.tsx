"use client";

import { Plus } from "lucide-react";
import { DataTableShell } from "~/app/admin/_components/data-table-shell";
import { LabelChip } from "~/app/admin/_components/label-chip";
import { RowActions } from "~/app/admin/_components/row-actions";
import {
  StatusDot,
  type StatusOption,
  StatusSelect,
} from "~/app/admin/_components/status-select";
import { TechnologyList } from "~/app/admin/_components/technology-list";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  taskPriorityLabelData,
  taskStatusColorData,
  taskStatusData,
  taskStatusLabelData,
} from "~/data/admin";
import { dayOf, formatDay } from "~/utils/admin-time";
import { cn } from "~/lib/utils";
import type { TaskPriorityType, TaskStatusType } from "~/types";
import { TaskFormDialog } from "../task-form";
import { ALL_PROJECTS, useTaskBoard } from "./hook";
import type { TaskBoardProps } from "./type";

const PRIORITY_VARIANTS: Record<
  TaskPriorityType,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

const STATUS_OPTIONS: StatusOption<TaskStatusType>[] = taskStatusData.map(
  (status) => ({
    value: status,
    label: taskStatusLabelData[status],
    color: taskStatusColorData[status],
  })
);

export const TaskBoard = (props: TaskBoardProps) => {
  const {
    open,
    setOpen,
    isEdit,
    defaultValues,
    formKey,
    formError,
    listError,
    statusOptions,
    projectById,
    isOverdue,
    openForm,
    handleSubmit,
    handleStatusChange,
    handleStatusFilter,
    handleProjectFilter,
  } = useTaskBoard(props);
  const { tasks, filter } = props;
  const activeStatus = filter.status ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Both filters sit together on the left; the action stays on the right. */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter by status"
            className="surface flex flex-wrap gap-1 rounded-xl border border-border/60 p-1"
          >
            {statusOptions.map((option) => (
              <button
                key={option.value ?? "all"}
                type="button"
                aria-pressed={activeStatus === option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeStatus === option.value
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {option.color && <StatusDot color={option.color} />}
                {option.label}
                <span className="text-xs tabular-nums opacity-60">
                  {option.count}
                </span>
              </button>
            ))}
          </div>

          {props.projects.length > 0 && (
            <Select
              value={filter.projectId ?? ALL_PROJECTS}
              onValueChange={handleProjectFilter}
            >
              <SelectTrigger aria-label="Filter by project" className="max-w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {props.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button onClick={() => openForm(null)}>
          <Plus />
          Add task
        </Button>
      </div>

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      <DataTableShell
        scrollable
        total={tasks.total}
        page={tasks.page}
        pageSize={tasks.pageSize}
        isEmpty={tasks.items.length === 0}
        emptyMessage={
          tasks.total === 0 ? "No tasks match these filters." : "No tasks on this page."
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.items.map((task) => {
              const closed = task.status === "DONE" || task.status === "CANCELLED";
              const overdue = isOverdue(task);
              const project = task.projectId
                ? projectById.get(task.projectId)
                : undefined;

              return (
                <TableRow key={task.id}>
                  <TableCell className="min-w-56 max-w-sm whitespace-normal pl-4">
                    <p
                      className={cn(
                        "font-medium",
                        closed && "text-foreground/50 line-through"
                      )}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p
                        className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                        title={task.description}
                      >
                        {task.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {project ? <LabelChip label={project} /> : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      aria-label="Status"
                      value={task.status}
                      options={STATUS_OPTIONS}
                      onChange={(status) => void handleStatusChange(task, status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                      {taskPriorityLabelData[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular-nums",
                      overdue ? "font-semibold text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {task.dueDate ? formatDay(dayOf(task.dueDate)) : "—"}
                    {overdue && <span className="sr-only"> (overdue)</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {task.categories.map((category) => (
                        <LabelChip key={category.id} label={category} />
                      ))}
                      {task.tags.map((tag) => (
                        <LabelChip key={tag.id} label={tag} className="rounded-full" />
                      ))}
                      <TechnologyList
                        technologies={task.technologies}
                        className="flex-nowrap"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <RowActions noun="task" onEdit={() => openForm(task)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <TaskFormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        isEdit={isEdit}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        error={formError}
        projects={props.projects}
        tags={props.tags}
        categories={props.categories}
      />
    </div>
  );
};
