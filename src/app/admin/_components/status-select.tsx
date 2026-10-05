"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export type StatusOption<TStatus extends string> = {
  value: TStatus;
  label: string;
  /** `#rrggbb`. */
  color: string;
};

export type StatusSelectProps<TStatus extends string> = {
  value: TStatus;
  options: StatusOption<TStatus>[];
  onChange: (value: TStatus) => void;
  "aria-label": string;
  className?: string;
};

export type StatusDotProps = {
  color: string;
  className?: string;
};

/** The colour of a status, as a dot. */
export const StatusDot = ({ color, className }: StatusDotProps) => {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
      // The colour is config data, so it cannot be a Tailwind class.
      style={{ backgroundColor: color }}
    />
  );
};

/**
 * A status shown in its own colour that can be changed in place — the only
 * way a task or a project is "closed", since neither can be deleted.
 */
export const StatusSelect = <TStatus extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  className,
}: StatusSelectProps<TStatus>) => {
  const current = options.find((option) => option.value === value);

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        // Radix hands back a plain string; only accept one of the options.
        const picked = options.find((option) => option.value === next);
        if (picked) onChange(picked.value);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn("font-medium", className)}
        // The two-digit suffixes are alpha: a faint fill and a soft border.
        style={
          current && {
            backgroundColor: `${current.color}1f`,
            borderColor: `${current.color}80`,
          }
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <StatusDot color={option.color} />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
