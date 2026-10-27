import { useState } from "react";
import { useQueryParams, useResourceDialog } from "~/hooks";
import { currentMonth, dayOf, today, toIso } from "~/utils/admin-time";
import { splitList } from "~/utils/list";
import type { LogtimeInputModel, LogtimeModel } from "~/types";
import type { LogFormValues } from "../log-form/type";
import type { LogViewType, UseLogBoardProps } from "./type";

/** Task ids logged on the 3 most recent days that have any logtime at all. */
const recentTaskIds = (logtimes: LogtimeModel[]) => {
  const days = [...new Set(logtimes.map((logtime) => dayOf(logtime.loggedAt)))]
    .sort()
    .slice(-3);
  const recentDays = new Set(days);
  return new Set(
    logtimes
      .filter((logtime) => logtime.taskId && recentDays.has(dayOf(logtime.loggedAt)))
      .map((logtime) => logtime.taskId!),
  );
};

/** What the duration field starts at for a new entry. */
const DEFAULT_HOURS = 4;

export const emptyValues = (): LogFormValues => ({
  title: "",
  date: today(),
  hours: DEFAULT_HOURS,
  taskId: "",
  categoryIds: [],
  technologies: "",
  note: "",
});

export const toValues = (logtime: LogtimeModel): LogFormValues => ({
  title: logtime.title,
  date: dayOf(logtime.loggedAt),
  hours: logtime.durationMinutes / 60,
  taskId: logtime.taskId ?? "",
  categoryIds: logtime.categoryId ? [logtime.categoryId] : [],
  technologies: logtime.technologies.join(", "),
  note: logtime.note ?? "",
});

export const toInput = (values: LogFormValues): LogtimeInputModel => ({
  title: values.title.trim(),
  note: values.note.trim() || undefined,
  taskId: values.taskId || undefined,
  categoryId: values.categoryIds[0],
  loggedAt: toIso(values.date),
  // The form speaks hours; the API and the database keep minutes.
  durationMinutes: Math.round(values.hours * 60),
  technologies: splitList(values.technologies),
});

export const useLogBoard = ({
  tasks,
  categories,
  logtimes,
  month,
}: UseLogBoardProps) => {
  const { setParams } = useQueryParams();
  const dialog = useResourceDialog<LogtimeModel, LogFormValues, LogtimeInputModel>({
    endpoint: "/api/logtimes",
    emptyValues,
    toValues,
    toInput,
    confirmDelete: (logtime) => `Delete "${logtime.title}"?`,
  });
  // Pre-fills the task picker next time the form opens for a new entry.
  const [lastTaskId, setLastTaskId] = useState("");

  const handleMonthChange = (value: string) => {
    if (!value || value === month) return;
    // The current month is the default, so it stays out of the URL. Another
    // month has its own pages, so the page number starts over.
    setParams({ month: value === currentMonth() ? null : value, page: null });
  };

  const handleViewChange = (view: LogViewType) =>
    // The calendar is the default view, so it stays out of the URL; it has no
    // pages either, so the page number goes whenever the view changes.
    setParams({ view: view === "calendar" ? null : view, page: null });

  /** Same as the dialog's, but a new entry starts on the last task picked. */
  const openForm: typeof dialog.openForm = (item, preset) =>
    dialog.openForm(item, item ? preset : { taskId: lastTaskId, ...preset });

  const handleSubmit = async (values: LogFormValues) => {
    if (values.taskId) setLastTaskId(values.taskId);
    await dialog.handleSubmit(values);
  };

  /** Opens the form for a new entry on the day clicked in the calendar. */
  const handleAddOn = (day: string) => openForm(null, { date: day });

  return {
    ...dialog,
    openForm,
    handleSubmit,
    handleViewChange,
    handleAddOn,
    taskById: new Map(tasks.map((task) => [task.id, task])),
    categoryById: new Map(categories.map((category) => [category.id, category])),
    recentTaskIds: recentTaskIds(logtimes),
    handleMonthChange,
  };
};
