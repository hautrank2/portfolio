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
  // Labels made here show up at once; the refetch below brings them back
  // through `options`, at which point the duplicate is filtered out.
  const [created, setCreated] = useState<LabelModel[]>([]);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(labelColorData[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const known = new Set(options.map((option) => option.id));
  const allOptions = [...options, ...created.filter((label) => !known.has(label.id))];

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((selected) => selected !== id));
      return;
    }
    onChange(multiple ? [...value, id] : [id]);
  };

  const create = async () => {
    const trimmed = title.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    setError(null);
    const input: LabelInputModel = { title: trimmed, color };
    const result = await requestJson<{ item: LabelModel }>(`/api/${kind}`, {
      method: "POST",
      body: input,
    });
    setIsCreating(false);

    if (!result.ok) {
      if (result.status === 401) router.replace("/admin/login");
      else setError(result.error);
      return;
    }

    const { item } = result.data;
    setCreated((labels) => [...labels, item]);
    onChange(multiple ? [...value, item.id] : [item.id]);
    setTitle("");
    refreshApiQueries();
  };

  return {
    allOptions,
    title,
    setTitle,
    color,
    setColor,
    isCreating,
    error,
    toggle,
    create,
  };
};
