"use client";

import { Check, Pencil, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { labelKindLabelData } from "~/data/admin";
import { cn } from "~/lib/utils";
import { ColorSwatches } from "../color-swatches";
import { LabelChip } from "../label-chip";
import { useLabelPicker } from "./hook";
import type { LabelPickerProps } from "./type";

/** Pick existing categories or tags, or create or edit one without leaving the form. */
export const LabelPicker = (props: LabelPickerProps) => {
  const {
    allOptions,
    editing,
    title,
    setTitle,
    color,
    setColor,
    isSaving,
    error,
    toggle,
    startEdit,
    cancelEdit,
    save,
  } = useLabelPicker(props);
  const noun = labelKindLabelData[props.kind];
  // The same inputs make a new label or change the one being edited.
  const inputName = editing ? `Edit ${noun}` : `New ${noun}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {allOptions.length === 0 && (
          <span className="text-xs text-muted-foreground">No {noun} yet.</span>
        )}
        {allOptions.map((option) => {
          const selected = props.value.includes(option.id);
          return (
            <span
              key={option.id}
              className={cn(
                "inline-flex items-center rounded-md",
                editing?.id === option.id && "ring-2 ring-ring/50",
              )}
            >
              <button
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
                      : "text-foreground/60 hover:text-foreground",
                  )}
                />
              </button>
              <button
                type="button"
                aria-label={`Edit ${noun} ${option.title}`}
                onClick={() => startEdit(option)}
                className="grid size-5 place-items-center rounded text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Pencil className="size-3" />
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            // Enter here saves the label; it must not submit the form around it.
            if (event.key === "Enter") {
              event.preventDefault();
              void save();
            }
          }}
          placeholder={inputName}
          aria-label={`${inputName} title`}
          maxLength={60}
          className="h-8 w-40"
        />
        <ColorSwatches
          value={color}
          onChange={setColor}
          label={`${inputName} colour`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSaving || title.trim() === ""}
          onClick={() => void save()}
        >
          {editing ? <Check /> : <Plus />}
          {editing ? "Save" : "Add"}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
            Cancel
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
