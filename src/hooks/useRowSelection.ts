import { useState } from "react";

/**
 * Which rows of a table are ticked. Only the rows on screen count: an id that
 * is ticked and then paged or filtered away stays remembered, but is left out
 * of `selected` until its row is back.
 */
export const useRowSelection = <T extends { id: string }>(rows: T[]) => {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  const selected = rows.filter((row) => ids.has(row.id));
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggle = (id: string) =>
    setIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAll = () =>
    setIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)));

  const clear = () => setIds(new Set());

  return {
    selected,
    allSelected,
    someSelected: selected.length > 0 && !allSelected,
    isSelected: (id: string) => ids.has(id),
    toggle,
    toggleAll,
    clear,
  };
};
