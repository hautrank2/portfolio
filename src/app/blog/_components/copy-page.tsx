"use client";

import {
  AlignLeft,
  Check,
  ChevronDown,
  Copy,
  FileCode2,
  Link2,
  Sparkles,
  X,
} from "lucide-react";
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

type CopyFlavorType = "markdown" | "text" | "link" | "prompt";

/**
 * Markdown with its syntax taken off. Deliberately regex rather than a second
 * remark pass: this runs on the client, and pulling the whole pipeline into the
 * bundle to serve one menu item would cost more than the item is worth.
 */
function toPlainText(markdown: string) {
  return markdown
    // Fences keep their code, lose their backticks and language tag.
    .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code: string) => code)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^(\s*)[-*+]\s+/gm, "$1• ")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Site-root links are what the page itself needs, but a copy is read somewhere
 * else — so they go out absolute. The origin is only known in the browser,
 * which is why this happens at copy time rather than on the server.
 */
function absolutize(markdown: string, origin: string) {
  return origin ? markdown.replaceAll("](/", `](${origin}/`) : markdown;
}

const flavors: {
  id: CopyFlavorType;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "markdown",
    label: "Markdown",
    hint: "Cả trang dạng .md — dán vào Obsidian, Notion, GitHub",
    icon: <FileCode2 size={14} />,
  },
  {
    id: "text",
    label: "Văn bản thuần",
    hint: "Bỏ cú pháp Markdown, chỉ còn chữ",
    icon: <AlignLeft size={14} />,
  },
  {
    id: "prompt",
    label: "Kèm prompt cho AI",
    hint: "Nội dung + ngữ cảnh, dán thẳng vào chatbot",
    icon: <Sparkles size={14} />,
  },
  {
    id: "link",
    label: "Liên kết",
    hint: "URL của trang này",
    icon: <Link2 size={14} />,
  },
];

export type BlogCopyPageProps = {
  title: string;
  /** The whole page as Markdown, built server-side from the note itself. */
  markdown: string;
  className?: string;
};

/**
 * Copy the page the reader is on. The default click gives Markdown — that is
 * what the content already is, so it is the one flavor that loses nothing; the
 * caret opens the rest.
 */
const BlogCopyPage = ({ title, markdown, className }: BlogCopyPageProps) => {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState<{
    id: CopyFlavorType;
    ok: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), 2000);
    return () => clearTimeout(timer);
  }, [done]);

  const textFor = (id: CopyFlavorType) => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const full = absolutize(markdown, origin);

    switch (id) {
      case "markdown":
        return full;
      case "text":
        return toPlainText(full);
      case "link":
        return url;
      case "prompt":
        return [
          `Đây là một note trên blog: "${title}".`,
          url && `Nguồn: ${url}`,
          "Đọc nội dung Markdown dưới đây rồi trả lời câu hỏi của tôi.",
          "---",
          full,
        ]
          .filter(Boolean)
          .join("\n\n");
    }
  };

  const copy = async (id: CopyFlavorType) => {
    const text = textFor(id);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setDone({ id, ok: true });
    } catch {
      // Blocked outside a secure context, or while the document is unfocused.
      // Say so rather than leaving the click looking like it did nothing.
      setDone({ id, ok: false });
    }
  };

  const copied = done?.ok === true;
  const failed = done?.ok === false;

  const mainLabel = failed
    ? "Không sao chép được"
    : copied
      ? "Đã sao chép"
      : "Copy trang";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-stretch rounded-full border border-border/60 text-sm text-foreground/70 transition-colors focus-within:border-primary/50 hover:border-primary/50",
        className
      )}
    >
      <button
        type="button"
        onClick={() => void copy("markdown")}
        title="Sao chép cả trang dạng Markdown"
        className="inline-flex items-center gap-2 rounded-l-full py-1.5 pl-3.5 pr-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {failed ? (
          <X size={14} className="text-destructive" />
        ) : copied ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} />
        )}
        <span className="whitespace-nowrap">{mainLabel}</span>
      </button>

      <span aria-hidden className="my-1.5 w-px bg-border/60" />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label="Các kiểu sao chép khác"
          title="Các kiểu sao chép khác"
          className="grid place-items-center rounded-r-full px-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            size={14}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 p-1.5">
          <div role="menu" className="flex flex-col">
            {flavors.map((flavor) => (
              <button
                key={flavor.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  void copy(flavor.id);
                  // Short enough to read the tick, short enough not to linger.
                  setTimeout(() => setOpen(false), 700);
                }}
                className="flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="mt-0.5 text-foreground/50">
                  {done?.id === flavor.id ? (
                    done.ok ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <X size={14} className="text-destructive" />
                    )
                  ) : (
                    flavor.icon
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground/90">
                    {flavor.label}
                  </span>
                  <span className="block text-xs leading-snug text-foreground/50">
                    {flavor.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { BlogCopyPage };
