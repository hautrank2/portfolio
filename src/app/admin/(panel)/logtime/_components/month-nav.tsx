"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { currentMonth, formatMonth, shiftMonth } from "~/utils/admin-time";
import { cn } from "~/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const toMonth = (year: number, index: number) =>
  `${year}-${String(index + 1).padStart(2, "0")}`;

export type MonthNavProps = {
  /** `YYYY-MM`. */
  month: string;
  onChange: (month: string) => void;
};

/**
 * Picks the month the logtime page shows: the arrows step one month at a
 * time, and the label opens a year-and-month grid for jumping further.
 */
export const MonthNav = ({ month, onChange }: MonthNavProps) => {
  const thisMonth = currentMonth();
  const selectedYear = Number(month.slice(0, 4));
  const [open, setOpen] = useState(false);
  // The year the grid is browsing — it can differ from the selected one.
  const [year, setYear] = useState(selectedYear);

  const handleOpenChange = (next: boolean) => {
    // Every time it opens, start from the year that is actually selected.
    if (next) setYear(selectedYear);
    setOpen(next);
  };

  const handlePick = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-label={`Month: ${formatMonth(month)}. Choose another month`}
            className="min-w-40 justify-between tabular-nums"
          >
            {formatMonth(month)}
            <ChevronDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous year"
              onClick={() => setYear((current) => current - 1)}
            >
              <ChevronLeft />
            </Button>
            <span aria-live="polite" className="text-sm font-semibold tabular-nums">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next year"
              onClick={() => setYear((current) => current + 1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {MONTH_LABELS.map((label, index) => {
              const value = toMonth(year, index);
              const selected = value === month;
              return (
                <Button
                  key={label}
                  variant={selected ? "default" : "ghost"}
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => handlePick(value)}
                  className={cn(
                    // A ring marks today's month when it is not the selected one.
                    !selected && value === thisMonth && "ring-1 ring-primary/50"
                  )}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
      {month !== thisMonth && (
        <Button variant="ghost" size="sm" onClick={() => onChange(thisMonth)}>
          This month
        </Button>
      )}
    </div>
  );
};
