import { useRouter } from "next/navigation";
import { useState } from "react";
import { labelColorData } from "~/data/admin";
import { refreshApiQueries } from "~/hooks";
import { requestJson } from "~/lib/api-client";
import type { LabelInputModel, LabelModel } from "~/types";
import type { UseLabelPickerProps } from "./type";

export const useLabelPicker = ({
  kind,
  options,
  value,
  onChange,
  multiple = false,
}: UseLabelPickerProps) => {
  const router = useRouter();
  // Labels made or changed here show up at once; the refetch below brings them
  // back through `options`, which these copies then simply agree with.
  const [saved, setSaved] = useState<LabelModel[]>([]);
  /** The label the inputs are changing; `null` while they describe a new one. */
  const [editing, setEditing] = useState<LabelModel | null>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(labelColorData[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedById = new Map(saved.map((label) => [label.id, label]));
  const known = new Set(options.map((option) => option.id));
  const allOptions = [
    ...options.map((option) => savedById.get(option.id) ?? option),
    ...saved.filter((label) => !known.has(label.id)),
  ];

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((selected) => selected !== id));
      return;
    }
    onChange(multiple ? [...value, id] : [id]);
  };

  const startEdit = (label: LabelModel) => {
    setEditing(label);
    setTitle(label.title);
    setColor(label.color);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setTitle("");
    setError(null);
  };

  /** Creates the label in the inputs, or saves it over the one being edited. */
  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    setError(null);
    // The update replaces the label, so the description has to ride along.
    const input: LabelInputModel = {
      title: trimmed,
      color,
      description: editing?.description,
    };
    const result = await requestJson<{ item: LabelModel }>(
      editing ? `/api/${kind}/${editing.id}` : `/api/${kind}`,
      { method: editing ? "PUT" : "POST", body: input },
    );
    setIsSaving(false);

    if (!result.ok) {
      if (result.status === 401) router.replace("/admin/login");
      else setError(result.error);
      return;
    }

    const { item } = result.data;
    setSaved((labels) => [
      ...labels.filter((label) => label.id !== item.id),
      item,
    ]);
    if (!editing) onChange(multiple ? [...value, item.id] : [item.id]);
    setEditing(null);
    setTitle("");
    refreshApiQueries();
  };

  return {
    allOptions,
    editing,
    title,
    setTitle,
    color,
    setColor,
    isSaving,
    error,
    toggle,
    startEdit,
    cancelEdit,
    save,
  };
};
