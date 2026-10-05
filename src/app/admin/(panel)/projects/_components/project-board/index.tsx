"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { DataTableShell } from "~/app/admin/_components/data-table-shell";
import { RowActions } from "~/app/admin/_components/row-actions";
import {
  type StatusOption,
  StatusSelect,
} from "~/app/admin/_components/status-select";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  workProjectStatusColorData,
  workProjectStatusData,
  workProjectStatusLabelData,
} from "~/data/admin";
import { dayOf, formatDay } from "~/utils/admin-time";
import type { WorkProjectStatusType } from "~/types";
import { ProjectFormDialog } from "../project-form";
import { useProjectBoard } from "./hook";
import type { ProjectBoardProps } from "./type";

const STATUS_OPTIONS: StatusOption<WorkProjectStatusType>[] =
  workProjectStatusData.map((status) => ({
    value: status,
    label: workProjectStatusLabelData[status],
    color: workProjectStatusColorData[status],
  }));

export const ProjectBoard = (props: ProjectBoardProps) => {
  const {
    open,
    setOpen,
    isEdit,
    defaultValues,
    formKey,
    formError,
    listError,
    progressById,
    openForm,
    handleSubmit,
    handleStatusChange,
  } = useProjectBoard(props);
  const { projects } = props;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm(null)}>
          <Plus />
          Add project
        </Button>
      </div>

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      <DataTableShell
        scrollable
        total={projects.total}
        page={projects.page}
        pageSize={projects.pageSize}
        isEmpty={projects.items.length === 0}
        emptyMessage={
          projects.total === 0 ? "No projects yet." : "No projects on this page."
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.items.map((project) => {
              const progress = progressById.get(project.id) ?? { total: 0, done: 0 };
              const percent =
                progress.total === 0
                  ? 0
                  : Math.round((progress.done / progress.total) * 100);

              return (
                <TableRow key={project.id}>
                  <TableCell className="min-w-56 max-w-md whitespace-normal pl-4">
                    <p className="flex items-center gap-2 font-medium">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        // The colour is user data, so it cannot be a Tailwind class.
                        style={{ backgroundColor: project.color }}
                      />
                      {project.title}
                    </p>
                    {project.description && (
                      <p
                        className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                        title={project.description}
                      >
                        {project.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      aria-label="Status"
                      value={project.status}
                      options={STATUS_OPTIONS}
                      onChange={(status) => void handleStatusChange(project, status)}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDay(dayOf(project.createdAt))}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {project.completedAt ? formatDay(dayOf(project.completedAt)) : "—"}
                  </TableCell>
                  <TableCell className="min-w-40">
                    <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
                      <Link
                        href={`/admin/tasks?project=${project.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {progress.done} / {progress.total} done
                      </Link>
                      <span className="text-muted-foreground">{percent}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Tasks done"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <RowActions noun="project" onEdit={() => openForm(project)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <ProjectFormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        isEdit={isEdit}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        error={formError}
      />
    </div>
  );
};
