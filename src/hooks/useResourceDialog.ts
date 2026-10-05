import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "~/lib/api-client";
import { refreshApiQueries } from "./useApiQuery";

type UseResourceDialogProps<TModel, TValues, TInput> = {
  /** Collection endpoint, e.g. `/api/tasks`; items live at `<endpoint>/<id>`. */
  endpoint: string;
  emptyValues: () => TValues;
  toValues: (item: TModel) => TValues;
  toInput: (values: TValues) => TInput;
  /** The question asked before deleting. Not needed where nothing is deleted. */
  confirmDelete?: (item: TModel) => string;
};

/**
 * The add / edit / delete plumbing every admin list shares: one dialog that
 * creates or edits, a delete with confirmation, and a refetch of the page's
 * queries after each write. A `401` means the session expired, so it sends you to sign in.
 */
export const useResourceDialog = <TModel extends { id: string }, TValues, TInput>({
  endpoint,
  emptyValues,
  toValues,
  toInput,
  confirmDelete,
}: UseResourceDialogProps<TModel, TValues, TInput>) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TModel | null>(null);
  const [defaultValues, setDefaultValues] = useState<TValues>(emptyValues);
  // Bumped on every open so the form remounts with fresh default values.
  const [formKey, setFormKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  /** `preset` overrides the empty values of a new item — e.g. a clicked day. */
  const openForm = (item: TModel | null, preset?: Partial<TValues>) => {
    setEditing(item);
    setDefaultValues(item ? toValues(item) : { ...emptyValues(), ...preset });
    setFormError(null);
    setFormKey((key) => key + 1);
    setOpen(true);
  };

  /** Sends one write and reports whether it landed. */
  const write = async (
    url: string,
    method: "POST" | "PUT" | "DELETE",
    body: TInput | undefined,
    onError: (message: string) => void
  ) => {
    const result = await requestJson<unknown>(url, { method, body });
    if (result.ok) {
      refreshApiQueries();
      return true;
    }
    if (result.status === 401) router.replace("/admin/login");
    else onError(result.error);
    return false;
  };

  const handleSubmit = async (values: TValues) => {
    setFormError(null);
    const saved = editing
      ? await write(`${endpoint}/${editing.id}`, "PUT", toInput(values), setFormError)
      : await write(endpoint, "POST", toInput(values), setFormError);
    if (saved) setOpen(false);
  };

  /** Replaces an item without opening the form — for inline quick edits. */
  const handleReplace = async (item: TModel, input: TInput) => {
    setListError(null);
    await write(`${endpoint}/${item.id}`, "PUT", input, setListError);
  };

  const handleDelete = async (item: TModel) => {
    if (!window.confirm(confirmDelete?.(item) ?? "Delete this item?")) return;
    setListError(null);
    await write(`${endpoint}/${item.id}`, "DELETE", undefined, setListError);
  };

  return {
    open,
    setOpen,
    isEdit: editing !== null,
    defaultValues,
    formKey,
    formError,
    listError,
    openForm,
    handleSubmit,
    handleReplace,
    handleDelete,
  };
};
