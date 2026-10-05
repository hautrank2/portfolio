"use client";

import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { labelKindLabelData } from "~/data/admin";
import { cn } from "~/lib/utils";
import { ColorSwatches } from "../color-swatches";
import { LabelChip } from "../label-chip";
import { useLabelPicker } from "./hook";
import type { LabelPickerProps } from "./type";

/** Pick existing categories or tags, or create one without leaving the form. */
export const LabelPicker = (props: LabelPickerProps) => {
  const {
    allOptions,
    title,
    setTitle,
    color,
    setColor,
    isCreating,
    error,
    toggle,
    create,
  } = useLabelPicker(props);
  const noun = labelKindLabelData[props.kind];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {allOptions.length === 0 && (
          <span className="text-xs text-muted-foreground">No {noun} yet.</span>
        )}
        {allOptions.map((option) => {
          const selected = props.value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              title={option.description}
              onClick={() => toggle(option.id)}
              className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <LabelChip
                label={option}
                className={cn(
                  "cursor-pointer transition-colors",
                  selected
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            // Enter here adds the label; it must not submit the form around it.
            if (event.key === "Enter") {
              event.preventDefault();
              void create();
            }
          }}
          placeholder={`New ${noun}`}
          aria-label={`New ${noun} title`}
          maxLength={60}
          className="h-8 w-40"
        />
        <ColorSwatches
          value={color}
          onChange={setColor}
          label={`New ${noun} colour`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isCreating || title.trim() === ""}
          onClick={() => void create()}
        >
          <Plus />
          Add
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
