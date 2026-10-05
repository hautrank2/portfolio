import type {
  LabelKindType,
  NavItemModel,
  TaskPriorityType,
  TaskStatusType,
  WorkProjectStatusType,
} from "~/types";

export const adminNavData: NavItemModel[] = [
  { title: "Logtime", href: "/admin/logtime" },
  { title: "Task", href: "/admin/tasks" },
  { title: "Project", href: "/admin/projects" },
];

export const workProjectStatusData = [
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly WorkProjectStatusType[];

export const workProjectStatusLabelData: Record<WorkProjectStatusType, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// `as const` so `z.enum()` can take these directly; `satisfies` keeps them in
// step with the union types.
export const taskStatusData = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const satisfies readonly TaskStatusType[];

export const taskPriorityData = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const satisfies readonly TaskPriorityType[];

/** One colour per status (`#rrggbb`) — the same wherever a status is shown. */
export const workProjectStatusColorData: Record<WorkProjectStatusType, string> = {
  PLANNED: "#94a3b8",
  ACTIVE: "#38bdf8",
  ON_HOLD: "#fbbf24",
  COMPLETED: "#34d399",
  CANCELLED: "#fb7185",
};

export const taskStatusColorData: Record<TaskStatusType, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#38bdf8",
  DONE: "#34d399",
  CANCELLED: "#fb7185",
};

export const taskStatusLabelData: Record<TaskStatusType, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const taskPriorityLabelData: Record<TaskPriorityType, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const labelKindLabelData: Record<LabelKindType, string> = {
  categories: "category",
  tags: "tag",
};

/** Swatches offered when picking a colour for a project, category or tag. */
export const labelColorData = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#94a3b8",
];
