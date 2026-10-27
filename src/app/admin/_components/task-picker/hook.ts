import { useMemo, useState } from "react";
import type { UseTaskPickerProps } from "./type";

export const useTaskPicker = ({
  tasks,
  value,
  recentTaskIds,
}: UseTaskPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    // A done task no longer needs new logtime entries, unless one already
    // points at it — then it must stay pickable so editing doesn't lose it.
    const visible = tasks.filter(
      (task) => task.status !== "DONE" || task.id === value,
    );
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? visible.filter((task) => task.title.toLowerCase().includes(trimmed))
      : visible;

    return [...matching].sort((a, b) => {
      const aRecent = recentTaskIds?.has(a.id) ? 1 : 0;
      const bRecent = recentTaskIds?.has(b.id) ? 1 : 0;
      return aRecent !== bRecent
        ? bRecent - aRecent
        : a.title.localeCompare(b.title);
    });
  }, [tasks, query, recentTaskIds, value]);

  const selected = tasks.find((task) => task.id === value);

  return { open, setOpen, query, setQuery, options, selected };
};
