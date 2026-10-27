"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useTaskPicker } from "./hook";
import type { TaskPickerProps } from "./type";

/** Searchable task combobox — recent tasks first, done tasks hidden. */
export const TaskPicker = (props: TaskPickerProps) => {
  const { id, value, onChange, "aria-invalid": invalid } = props;
  const { open, setOpen, query, setQuery, options, selected } =
    useTaskPicker(props);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selected ? selected.title : "No task"}</span>
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks…"
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
          >
            <Check className={cn("size-4", value && "invisible")} />
            No task
          </button>
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No matching tasks.
            </p>
          )}
          {options.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => {
                onChange(task.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
            >
              <Check className={cn("size-4", task.id !== value && "invisible")} />
              <span className="truncate">{task.title}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
