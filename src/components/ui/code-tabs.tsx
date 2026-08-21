"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

type CodeTabsProps = Omit<
  React.ComponentProps<typeof Tabs>,
  "children" | "defaultValue"
> & {
  /** Tab label to code, e.g. `{ pnpm: "pnpm add x", npm: "npm i x" }`. */
  codes: Record<string, string>;
  lang?: string;
  /** Any Shiki bundled theme name. */
  theme?: string;
  copyButton?: boolean;
  onCopy?: (content: string) => void;
  defaultValue?: string;
};

type CopyCodeButtonProps = {
  content: string;
  onCopy?: (content: string) => void;
};

const CopyCodeButton = ({ content, onCopy }: CopyCodeButtonProps) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.(content);
    } catch {
      // Blocked outside a secure context — leave the icon alone.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Đã sao chép" : "Sao chép"}
      className="grid size-7 shrink-0 place-items-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <Check size={13} className="text-emerald-400" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
};

/**
 * The same command shown for several tools — pnpm/npm/yarn, or kubectl vs Helm.
 *
 * Unlike <CodeBlock>, the snippets arrive as props at runtime, so highlighting
 * has to happen in the browser. Shiki is loaded with a dynamic import to keep it
 * out of the initial chunk, and the raw code renders immediately underneath so
 * there is never an empty box. Do not use this for markdown in `content/` —
 * that pipeline highlights at build time and must stay that way.
 */
const CodeTabs = ({
  codes,
  lang = "bash",
  theme = "github-dark-default",
  copyButton = true,
  onCopy,
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}: CodeTabsProps) => {
  const entries = React.useMemo(() => Object.entries(codes), [codes]);
  const first = entries[0]?.[0] ?? "";

  const [selected, setSelected] = React.useState(defaultValue ?? first);
  const active = value ?? selected;

  const [highlighted, setHighlighted] = React.useState<Record<string, string>>(
    {}
  );

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const rendered = await Promise.all(
          entries.map(
            async ([label, code]) =>
              [label, await codeToHtml(code, { lang, theme })] as const
          )
        );
        if (!cancelled) setHighlighted(Object.fromEntries(rendered));
      } catch {
        // Unknown language or theme — the plain fallback below still shows.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, lang, theme]);

  const handleChange = (next: string) => {
    setSelected(next);
    onValueChange?.(next);
  };

  return (
    <Tabs
      value={active}
      onValueChange={handleChange}
      className={cn(
        "w-full gap-0 overflow-hidden rounded-xl border border-border/60 bg-card/70",
        className
      )}
      {...props}
    >
      <TabsList className="h-10 w-full justify-between rounded-none border-b border-border/60 bg-transparent px-3 py-0">
        <div className="flex h-full gap-3">
          {entries.map(([label]) => (
            <TabsTrigger
              key={label}
              value={label}
              className="rounded-none border-b-2 border-transparent bg-transparent px-1 text-foreground/60 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </div>

        {copyButton && (
          <CopyCodeButton content={codes[active] ?? ""} onCopy={onCopy} />
        )}
      </TabsList>

      {entries.map(([label, code]) => (
        <TabsContent
          key={label}
          value={label}
          className="mt-0 overflow-x-auto px-5 py-4 text-sm [&_pre]:m-0 [&_pre]:border-none [&_pre]:!bg-transparent [&_pre]:p-0"
        >
          {highlighted[label] ? (
            <div dangerouslySetInnerHTML={{ __html: highlighted[label] }} />
          ) : (
            <pre>
              <code>{code}</code>
            </pre>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export { CodeTabs, type CodeTabsProps };
