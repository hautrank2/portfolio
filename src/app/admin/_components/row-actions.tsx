"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";

export type RowActionsProps = {
  /** What the row is, for the buttons' accessible names: "task", "logtime". */
  noun: string;
  onEdit: () => void;
  /** Leave out for rows that cannot be deleted (tasks, projects). */
  onDelete?: () => void;
  /** Extra buttons of this row, shown before edit. */
  children?: React.ReactNode;
};

/** The buttons at the end of an admin table row: edit, and delete if allowed. */
export const RowActions = ({
  noun,
  onEdit,
  onDelete,
  children,
}: RowActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-1">
      {children}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${noun}`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${noun}`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
};
