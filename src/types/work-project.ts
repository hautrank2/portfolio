// "Work" project — something tasks are grouped under in the admin area. Named
// apart from `ProjectModel`, which is a showcase entry on the public site.

export type WorkProjectStatusType =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

/** Every date is an ISO string — models cross the JSON boundary as they are. */
export type WorkProjectModel = {
  id: string;
  title: string;
  description?: string;
  status: WorkProjectStatusType;
  /** `#rrggbb`. */
  color: string;
  createdAt: string;
  updatedAt: string;
  /** Set by the server when the status becomes `COMPLETED`, cleared after. */
  completedAt?: string;
};

export type WorkProjectInputModel = Pick<
  WorkProjectModel,
  "title" | "description" | "status" | "color"
>;
