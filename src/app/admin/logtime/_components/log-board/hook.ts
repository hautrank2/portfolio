import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkLogInputModel, WorkLogModel } from "~/types";
import type { LogFormValues } from "../log-form/type";
import type { LogDayGroup, TechnologyCount, UseLogBoardProps } from "./type";

const pad = (value: number) => String(value).padStart(2, "0");

/** Today in the browser's own time zone — `toISOString` would give UTC's day. */
const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const toPayload = (values: LogFormValues): WorkLogInputModel => ({
  date: values.date,
  content: values.content.trim(),
  hours: values.hours,
  technologies: values.technologies
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
});

const readError = async (response: Response, fallback: string) => {
  const body: { error?: string } = await response.json().catch(() => ({}));
  return body.error ?? fallback;
};

const groupByDay = (logs: WorkLogModel[]): LogDayGroup[] => {
  const days = new Map<string, LogDayGroup>();
  for (const log of logs) {
    const day = days.get(log.date) ?? { date: log.date, hours: 0, logs: [] };
    day.hours += log.hours;
    day.logs.push(log);
    days.set(log.date, day);
  }
  // `logs` arrives newest-first and a Map keeps insertion order.
  return [...days.values()];
};

const countTechnologies = (logs: WorkLogModel[]): TechnologyCount[] => {
  const counts = new Map<string, number>();
  for (const name of logs.flatMap((log) => log.technologies)) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

export const useLogBoard = ({ logs, month }: UseLogBoardProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLogModel | null>(null);
  const [defaultValues, setDefaultValues] = useState<LogFormValues>({
    date: "",
    content: "",
    technologies: "",
    hours: 1,
  });
  // Bumped on every open so the form remounts with fresh default values.
  const [formKey, setFormKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const openForm = (log: WorkLogModel | null) => {
    setEditing(log);
    setDefaultValues(
      log
        ? {
            date: log.date,
            content: log.content,
            technologies: log.technologies.join(", "),
            hours: log.hours,
          }
        : { date: todayLocal(), content: "", technologies: "", hours: 1 }
    );
    setFormError(null);
    setFormKey((key) => key + 1);
    setOpen(true);
  };

  const handleSubmit = async (values: LogFormValues) => {
    setFormError(null);
    try {
      const response = await fetch(
        editing ? `/api/worklogs/${editing.id}` : "/api/worklogs",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(values)),
        }
      );
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        setFormError(await readError(response, "Không lưu được log."));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setFormError("Không kết nối được máy chủ.");
    }
  };

  const handleDelete = async (log: WorkLogModel) => {
    if (!window.confirm(`Xoá log ngày ${log.date}?`)) return;
    setListError(null);
    try {
      const response = await fetch(`/api/worklogs/${log.id}`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        setListError(await readError(response, "Không xoá được log."));
        return;
      }
      router.refresh();
    } catch {
      setListError("Không kết nối được máy chủ.");
    }
  };

  const handleMonthChange = (value: string) => {
    if (value && value !== month) {
      router.push(`/admin/logtime?month=${value}`);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  };

  const days = groupByDay(logs);

  return {
    open,
    setOpen,
    isEdit: editing !== null,
    defaultValues,
    formKey,
    formError,
    listError,
    days,
    totalHours: days.reduce((sum, day) => sum + day.hours, 0),
    technologies: countTechnologies(logs),
    openForm,
    handleSubmit,
    handleDelete,
    handleMonthChange,
    handleLogout,
  };
};
