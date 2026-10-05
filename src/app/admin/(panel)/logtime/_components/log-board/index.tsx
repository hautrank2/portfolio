"use client";

import { CalendarDays, Plus, Rows3, type LucideIcon } from "lucide-react";
import { DataTableShell } from "~/app/admin/_components/data-table-shell";
import { LabelChip } from "~/app/admin/_components/label-chip";
import { RowActions } from "~/app/admin/_components/row-actions";
import {
  TechnologyBadge,
  TechnologyList,
} from "~/app/admin/_components/technology-list";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { dayOf, formatDay, formatDuration } from "~/utils/admin-time";
import { cn } from "~/lib/utils";
import type {
  CategoryModel,
  LogtimeModel,
  PageQueryModel,
  TaskModel,
} from "~/types";
import { LogCalendar } from "../log-calendar";
import { LogFormDialog } from "../log-form";
import { MonthNav } from "../month-nav";
import { useLogBoard } from "./hook";
import type { LogBoardProps, LogViewType } from "./type";

const VIEWS: { value: LogViewType; label: string; Icon: LucideIcon }[] = [
  { value: "calendar", label: "Calendar", Icon: CalendarDays },
  { value: "table", label: "Table", Icon: Rows3 },
];

export const LogBoard = (props: LogBoardProps) => {
  const {
    open,
    setOpen,
    isEdit,
    defaultValues,
    formKey,
    formError,
    listError,
    taskById,
    categoryById,
    openForm,
    handleSubmit,
    handleDelete,
    handleMonthChange,
    handleViewChange,
    handleAddOn,
  } = useLogBoard(props);
  const { summary } = props;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={props.month} onChange={handleMonthChange} />

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="View"
            className="surface flex gap-1 rounded-lg border border-border/60 p-1"
          >
            {VIEWS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={props.view === value}
                onClick={() => handleViewChange(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                  props.view === value
                    ? "bg-primary/15 text-primary"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <Button onClick={() => openForm(null)}>
            <Plus />
            Add logtime
          </Button>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[auto_auto_auto_1fr]">
        <div className="surface rounded-xl border border-border/60 px-4 py-3 xl:min-w-36">
          <dt className="text-xs text-muted-foreground">Total time</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">
            {formatDuration(summary.totalMinutes)}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3 xl:min-w-36">
          <dt className="text-xs text-muted-foreground">Days logged</dt>
          <dd className="mt-0.5 text-xl font-bold tabular-nums">{summary.days}</dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3 xl:min-w-36">
          <dt className="text-xs text-muted-foreground">Days missed</dt>
          <dd
            className={cn(
              "mt-0.5 text-xl font-bold tabular-nums",
              summary.missedDays > 0 && "text-destructive"
            )}
          >
            {summary.missedDays}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 px-4 py-3 sm:col-span-3 xl:col-span-1">
          <dt className="text-xs text-muted-foreground">Technologies</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.technologies.length === 0 && (
              <span className="text-sm text-foreground/50">—</span>
            )}
            {summary.technologies.map((technology) => (
              <TechnologyBadge key={technology.name} name={technology.name}>
                <span className="tabular-nums text-foreground/50">
                  {technology.count}
                </span>
              </TechnologyBadge>
            ))}
          </dd>
        </div>
      </dl>

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      {props.view === "calendar" ? (
        <LogCalendar
          month={props.month}
          logtimesByDay={Map.groupBy(props.logtimes, (logtime) =>
            dayOf(logtime.loggedAt)
          )}
          onAdd={handleAddOn}
          onEdit={openForm}
        />
      ) : (
        <LogTable
          logtimes={props.logtimes}
          paging={props.paging}
          taskById={taskById}
          categoryById={categoryById}
          onEdit={openForm}
          onDelete={handleDelete}
        />
      )}

      <LogFormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        isEdit={isEdit}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        error={formError}
        tasks={props.tasks}
        categories={props.categories}
      />
    </div>
  );
};

type LogTableProps = {
  logtimes: LogtimeModel[];
  paging: PageQueryModel;
  taskById: Map<string, TaskModel>;
  categoryById: Map<string, CategoryModel>;
  onEdit: (logtime: LogtimeModel) => void;
  onDelete: (logtime: LogtimeModel) => void;
};

const LogTable = ({
  logtimes,
  paging,
  taskById,
  categoryById,
  onEdit,
  onDelete,
}: LogTableProps) => {
  // The whole month is already here, so a page is just a slice of it.
  const start = (paging.page - 1) * paging.pageSize;
  const rows = logtimes.slice(start, start + paging.pageSize);

  return (
      <DataTableShell
        scrollable
        total={logtimes.length}
        page={paging.page}
        pageSize={paging.pageSize}
        isEmpty={rows.length === 0}
        emptyMessage={
          logtimes.length === 0
            ? "Nothing logged this month yet."
            : "No logtimes on this page."
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Technologies</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((logtime) => {
              const task = logtime.taskId ? taskById.get(logtime.taskId) : undefined;
              const category = logtime.categoryId
                ? categoryById.get(logtime.categoryId)
                : undefined;

              return (
                <TableRow key={logtime.id}>
                  <TableCell className="pl-4 tabular-nums">
                    {formatDay(dayOf(logtime.loggedAt))}
                  </TableCell>
                  <TableCell className="min-w-56 max-w-sm whitespace-normal">
                    <p className="font-medium">{logtime.title}</p>
                    {logtime.note && (
                      <p
                        className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                        title={logtime.note}
                      >
                        {logtime.note}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDuration(logtime.durationMinutes)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate" title={task?.title}>
                    {task?.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    {category ? <LabelChip label={category} /> : "—"}
                  </TableCell>
                  <TableCell>
                    <TechnologyList
                      technologies={logtime.technologies}
                      className="flex-nowrap"
                    />
                  </TableCell>
                  <TableCell className="pr-4">
                    <RowActions
                      noun="logtime"
                      onEdit={() => onEdit(logtime)}
                      onDelete={() => onDelete(logtime)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
  );
};
