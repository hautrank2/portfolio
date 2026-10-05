import { useRouter } from "next/navigation";
import * as React from "react";
import { normalizeCv, tidyCv } from "~/utils/cv";
import {
  clearCvDraft,
  readCvDraft,
  readServerCvDraft,
  subscribeCvDraft,
  writeCvDraft,
} from "~/utils/cv-draft";
import type { CvModel } from "~/types";
import type {
  CvListItem,
  CvListKey,
  CvTextKey,
  UseCvEditorProps,
} from "./type";

const emptyItems: { [K in CvListKey]: CvListItem<K> } = {
  links: { label: "", url: "" },
  education: { school: "", period: "", major: "", specialty: "" },
  skills: { label: "", items: [] },
  experiences: { company: "", role: "", period: "", note: "", highlights: [] },
  projects: {
    name: "",
    kind: "Work project",
    period: "",
    role: "",
    stack: [],
    highlights: [],
  },
};

const fileSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "cv";

export const useCvEditor = ({ initialCv }: UseCvEditorProps) => {
  const draft = React.useSyncExternalStore(
    subscribeCvDraft,
    readCvDraft,
    readServerCvDraft
  );
  // What was last written to `cv.json` from this tab. Bridges the moment
  // between clearing the draft and the refreshed `initialCv` arriving, so the
  // form does not flash back to the old file contents.
  const [saved, setSaved] = React.useState<CvModel | null>(null);
  const cv = draft ?? saved ?? initialCv;
  const [message, setMessage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();

  // Every edit is a full write: the CV is a few KB, and "saved as you type"
  // is worth more than debouncing a localStorage call nobody can feel.
  const commit = (next: CvModel) => writeCvDraft(next);

  const setText = (key: CvTextKey, value: string) =>
    commit({ ...cv, [key]: value });

  const setObjective = (text: string) =>
    commit({ ...cv, objective: text.split(/\n\s*\n/) });

  const updateItem = <K extends CvListKey>(
    key: K,
    index: number,
    patch: Partial<CvListItem<K>>
  ) => {
    const list: CvListItem<K>[] = cv[key];
    commit({
      ...cv,
      [key]: list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const addItem = (key: CvListKey) => {
    const list: object[] = cv[key];
    commit({ ...cv, [key]: [...list, emptyItems[key]] });
  };

  const removeItem = (key: CvListKey, index: number) => {
    const list: object[] = cv[key];
    commit({ ...cv, [key]: list.filter((_, i) => i !== index) });
  };

  const moveItem = (key: CvListKey, index: number, offset: -1 | 1) => {
    const list: object[] = [...cv[key]];
    const target = index + offset;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    commit({ ...cv, [key]: list });
  };

  const reset = () => {
    if (!window.confirm("Discard unsaved changes and go back to the saved CV?"))
      return;
    clearCvDraft();
    setMessage("Unsaved changes discarded.");
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cv),
      });
      if (!response.ok) throw new Error(String(response.status));
      setSaved(tidyCv(cv));
      clearCvDraft();
      router.refresh();
      setMessage("Saved to src/data/cv.json — commit and push to deploy.");
    } catch {
      setMessage("Save failed. Is the dev server running?");
    } finally {
      setIsSaving(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tidyCv(cv), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cv-${fileSlug(cv.name)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(tidyCv(cv), null, 2));
      setMessage("JSON copied to clipboard.");
    } catch {
      setMessage("Clipboard is blocked here — use Export instead.");
    }
  };

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear it so picking the same file twice still fires `change`.
    event.target.value = "";
    if (!file) return;

    try {
      const next = normalizeCv(JSON.parse(await file.text()));
      if (!next) {
        setMessage(`${file.name} is not a CV file.`);
        return;
      }
      commit(next);
      setMessage(`Imported ${file.name}.`);
    } catch {
      setMessage(`${file.name} is not valid JSON.`);
    }
  };

  return {
    cv,
    hasDraft: draft !== null,
    isSaving,
    save,
    message,
    setText,
    setObjective,
    updateItem,
    addItem,
    removeItem,
    moveItem,
    reset,
    exportJson,
    copyJson,
    importJson,
    print: () => window.print(),
  };
};

export type CvEditorApi = ReturnType<typeof useCvEditor>;
