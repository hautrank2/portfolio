import { useQueryParams, useResourceDialog } from "~/hooks";
import { currentMonth, dayOf, today, toIso } from "~/utils/admin-time";
import { splitList } from "~/lib/api-client";
import type { LogtimeInputModel, LogtimeModel } from "~/types";
import type { LogFormValues } from "../log-form/type";
import type { LogViewType, UseLogBoardProps } from "./type";

/** What the duration field starts at for a new entry. */
const DEFAULT_HOURS = 4;

const emptyValues = (): LogFormValues => ({
  title: "",
  date: today(),
  hours: DEFAULT_HOURS,
  taskId: "",
  categoryIds: [],
  technologies: "",
  note: "",
});

const toValues = (logtime: LogtimeModel): LogFormValues => ({
  title: logtime.title,
  date: dayOf(logtime.loggedAt),
  hours: logtime.durationMinutes / 60,
  taskId: logtime.taskId ?? "",
  categoryIds: logtime.categoryId ? [logtime.categoryId] : [],
  technologies: logtime.technologies.join(", "),
  note: logtime.note ?? "",
});

const toInput = (values: LogFormValues): LogtimeInputModel => ({
  title: values.title.trim(),
  note: values.note.trim() || undefined,
  taskId: values.taskId || undefined,
  categoryId: values.categoryIds[0],
  loggedAt: toIso(values.date),
  // The form speaks hours; the API and the database keep minutes.
  durationMinutes: Math.round(values.hours * 60),
  technologies: splitList(values.technologies),
});

export const useLogBoard = ({ tasks, categories, month }: UseLogBoardProps) => {
  const { setParams } = useQueryParams();
  const dialog = useResourceDialog<LogtimeModel, LogFormValues, LogtimeInputModel>({
    endpoint: "/api/logtimes",
    emptyValues,
    toValues,
    toInput,
    confirmDelete: (logtime) => `Delete "${logtime.title}"?`,
  });

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

  /** Opens the form for a new entry on the day clicked in the calendar. */
  const handleAddOn = (day: string) => dialog.openForm(null, { date: day });

  return {
    ...dialog,
    handleViewChange,
    handleAddOn,
    taskById: new Map(tasks.map((task) => [task.id, task])),
    categoryById: new Map(categories.map((category) => [category.id, category])),
    handleMonthChange,
  };
};
