import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { refreshApiQueries } from "~/hooks";
import { requestJson } from "~/lib/http-client";
import { toIso } from "~/utils/admin-time";
import type { TaskInputModel } from "~/types";
import {
  MAX_IMPORT_TASKS,
  type TaskImportItem,
  taskImportItemSchema,
  type UseTaskImportProps,
} from "./type";

const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toInput = (item: TaskImportItem, defaultProjectId?: string): TaskInputModel => ({
  title: item.title,
  description: item.description?.trim() || undefined,
  status: item.status ?? "TODO",
  priority: item.priority ?? "MEDIUM",
  // A plain day is read in the admin zone, like the date picker does.
  dueDate: item.dueDate
    ? isDay(item.dueDate)
      ? toIso(item.dueDate)
      : new Date(item.dueDate).toISOString()
    : undefined,
  projectId: item.projectId || defaultProjectId || undefined,
  tagIds: item.tagIds ?? [],
  categoryIds: item.categoryIds ?? [],
  technologies: item.technologies ?? [],
});

/** The pasted text as tasks to send, or the first problem found in it. */
const parse = (
  text: string,
  defaultProjectId?: string
): { inputs: TaskInputModel[]; error?: undefined } | { inputs?: undefined; error: string } => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "Not valid JSON." };
  }
  if (!Array.isArray(json)) return { error: "Expected a JSON array of tasks." };
  if (json.length === 0) return { error: "The array is empty." };
  if (json.length > MAX_IMPORT_TASKS) {
    return { error: `At most ${MAX_IMPORT_TASKS} tasks at a time.` };
  }

  const parsed = z.array(taskImportItemSchema).safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const [index, ...field] = issue.path;
    return {
      error: `Task ${Number(index) + 1}${field.length ? ` · ${field.join(".")}` : ""}: ${issue.message}`,
    };
  }
  return { inputs: parsed.data.map((item) => toInput(item, defaultProjectId)) };
};

export const useTaskImport = ({ onOpenChange, defaultProjectId }: UseTaskImportProps) => {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = text.trim() ? parse(text, defaultProjectId) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = parse(text, defaultProjectId);
    if (result.error) return setError(result.error);

    setIsSubmitting(true);
    const response = await requestJson<unknown>("/api/tasks/bulk", {
      method: "POST",
      body: result.inputs,
    });
    setIsSubmitting(false);

    if (response.ok) {
      refreshApiQueries();
      setText("");
      onOpenChange(false);
    } else if (response.status === 401) router.replace("/admin/login");
    else setError(response.error);
  };

  /** A server error belongs to the text that was sent; editing clears it. */
  const handleTextChange = (value: string) => {
    setText(value);
    setError(null);
  };

  return {
    text,
    handleTextChange,
    count: preview?.inputs?.length ?? 0,
    error: error ?? preview?.error ?? null,
    isSubmitting,
    handleSubmit,
  };
};
