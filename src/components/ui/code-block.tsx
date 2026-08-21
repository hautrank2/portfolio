"use client";

import { Check, Copy, X } from "lucide-react";
import * as React from "react";
import { cn } from "~/lib/utils";

type CodeBlockProps = React.ComponentProps<"pre"> & {
  /** Language label, lifted off `data-language` by the markdown pipeline. */
  language?: string;
};

/**
 * Fenced code block with a copy button. shadcn/ui has no code primitive, so
 * this follows the same conventions as the generated ones: `data-slot`, `cn`,
 * theme tokens only.
 *
 * The highlighted markup is produced at build time by rehype-pretty-code and
 * arrives as children — this component only adds the chrome around it.
 */
const CodeBlock = ({
  className,
  language,
  children,
  ...props
}: CodeBlockProps) => {
  const ref = React.useRef<HTMLPreElement>(null);
  const [state, setState] = React.useState<"idle" | "copied" | "error">("idle");

  React.useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  // Reading the DOM beats threading the raw source through as a prop: the text
  // is already here, and it stays correct whatever the highlighter emits.
  const copy = async () => {
    const text = ref.current?.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Blocked outside a secure context, or while the document is unfocused.
      // Say so rather than leaving the click looking like it did nothing.
      setState("error");
    }
  };

  const feedback = {
    idle: { label: "Sao chép đoạn mã", icon: <Copy size={13} /> },
    copied: {
      label: "Đã sao chép",
      icon: <Check size={13} className="text-emerald-400" />,
    },
    error: {
      label: "Không sao chép được — hãy bôi đen và copy tay",
      icon: <X size={13} className="text-destructive" />,
    },
  }[state];

  return (
    <div data-slot="code-block" className="group relative">
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
        {language && (
          <span className="rounded-md bg-foreground/5 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-foreground/40">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label={feedback.label}
          title={feedback.label}
          className={cn(
            "pointer-events-auto grid size-7 place-items-center rounded-md border border-border/60 bg-card/80 text-foreground/50 backdrop-blur transition hover:border-primary/50 hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100",
            state === "idle" ? "opacity-0" : "opacity-100"
          )}
        >
          {feedback.icon}
        </button>
      </div>

      <pre
        ref={ref}
        data-slot="code-block-pre"
        className={cn(
          // Padding sits on the <code>, not here: a scroll container's own
          // padding-right is dropped from its scrollable area, so a long line
          // would end flush against the border once scrolled. `min-w-max` makes
          // the grid size to its widest line so that padding lands after it.
          "overflow-x-auto rounded-lg border border-border/60 bg-card/70 py-4 text-sm leading-relaxed",
          "[&>code]:grid [&>code]:min-w-max [&>code]:px-5",
          className
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
};

export { CodeBlock };
