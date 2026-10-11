"use client";

import { cn } from "~/lib/utils";

export type RowCheckboxProps = Omit<
  React.ComponentProps<"input">,
  "type" | "checked" | "onChange"
> & {
  checked: boolean;
  /** Some but not all rows ticked — only the header box uses it. */
  indeterminate?: boolean;
  onChange: () => void;
};

/** The tick box that starts an admin table row, and the header's "all" box. */
export const RowCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  className,
  ...props
}: RowCheckboxProps) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      // `indeterminate` is a DOM property with no attribute behind it.
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      className={cn("block size-4 cursor-pointer accent-primary", className)}
      {...props}
    />
  );
};
