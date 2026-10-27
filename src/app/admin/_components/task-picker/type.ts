import type { TaskModel } from "~/types";

export type TaskPickerProps = {
  id?: string;
  tasks: TaskModel[];
  /** Task id, or empty string for no task. */
  value: string;
  onChange: (value: string) => void;
  /** Shown first, ahead of the rest — e.g. tasks logged in the last few days. */
  recentTaskIds?: Set<string>;
  "aria-invalid"?: boolean;
};

export type UseTaskPickerProps = Pick<
  TaskPickerProps,
  "tasks" | "value" | "recentTaskIds"
>;
