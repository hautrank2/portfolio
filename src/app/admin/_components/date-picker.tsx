"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const DAY_FORMAT = "yyyy-MM-dd";

export type DatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD`, or an empty string for no date — the shape the forms keep. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shows a button that empties the field. */
  clearable?: boolean;
  "aria-invalid"?: boolean;
  className?: string;
};

/** shadcn's date picker (Popover + Calendar) speaking plain day strings. */
export const DatePicker = ({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = false,
  "aria-invalid": invalid,
  className,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const parsed = value ? parse(value, DAY_FORMAT, new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "min-w-0 flex-1 justify-start font-normal",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarIcon />
            <span className="truncate">
              {selected ? format(selected, "dd MMM yyyy") : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              // Clicking the selected day again would unselect it; clearing
              // is the clear button's job, so keep the value instead.
              if (day) onChange(format(day, DAY_FORMAT));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {clearable && selected && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear date"
          onClick={() => onChange("")}
        >
          <X />
        </Button>
      )}
    </div>
  );
};
