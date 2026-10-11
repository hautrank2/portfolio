"use client";

import { Braces, Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export type SelectionBarProps = {
  /** The ticked rows, already shaped the way they should read as JSON. */
  rows: unknown[];
  onClear: () => void;
};

type CopyJsonButtonProps = {
  json: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
};

const CopyJsonButton = ({ json, variant = "outline" }: CopyJsonButtonProps) => {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setState("copied");
    } catch {
      // Blocked outside a secure context, or while the document is unfocused.
      setState("error");
    }
  };

  const feedback = {
    idle: { label: "Copy JSON", icon: <Copy /> },
    copied: { label: "Copied", icon: <Check /> },
    error: { label: "Clipboard blocked", icon: <X /> },
  }[state];

  return (
    <Button variant={variant} size="sm" onClick={() => void copy()}>
      {feedback.icon}
      <span aria-live="polite">{feedback.label}</span>
    </Button>
  );
};

/**
 * The strip under an admin table while rows are ticked: shows them as JSON, or
 * copies that JSON to the clipboard, to paste somewhere else.
 */
export const SelectionBar = ({ rows, onClear }: SelectionBarProps) => {
  if (rows.length === 0) return null;

  const json = JSON.stringify(rows, null, 2);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-primary/5 px-4 py-2 text-sm">
      <p className="mr-auto tabular-nums text-muted-foreground">
        {rows.length} selected
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Braces />
            View JSON
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Selected rows</DialogTitle>
            <DialogDescription>
              {rows.length} {rows.length === 1 ? "row" : "rows"} as JSON.
            </DialogDescription>
          </DialogHeader>
          {/* `min-w-0` lets a long line scroll here instead of widening the grid. */}
          <pre className="max-h-[60dvh] min-w-0 overflow-auto rounded-lg border border-border/60 bg-foreground/5 p-3 font-mono text-xs leading-relaxed">
            {json}
          </pre>
          <DialogFooter>
            <CopyJsonButton json={json} variant="default" />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CopyJsonButton json={json} />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
};
