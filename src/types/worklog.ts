export type WorkLogModel = {
  id: string;
  /** Calendar day the work happened, `YYYY-MM-DD` — no time zone attached. */
  date: string;
  content: string;
  technologies: string[];
  hours: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkLogInputModel = Pick<
  WorkLogModel,
  "date" | "content" | "technologies" | "hours"
>;

export type SessionModel = {
  username: string;
  role: "admin";
};
