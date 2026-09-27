import * as React from "react";
import type { CvCopiedField, UseCvContactActionsProps } from "./type";

const RESET_AFTER_MS = 2000;

export const useCvContactActions = ({
  name,
  phone,
  email,
}: UseCvContactActionsProps) => {
  const [copied, setCopied] = React.useState<CvCopiedField | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const writeClipboard = async (field: CvCopiedField, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked (insecure origin, permissions): fall back to a
      // prompt the visitor can copy from by hand.
      window.prompt("Copy:", text);
      return;
    }
    setCopied(field);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), RESET_AFTER_MS);
  };

  const copy = (field: "phone" | "email") =>
    // Digits only for the phone: that is what a dialer or a form field wants.
    writeClipboard(field, field === "phone" ? phone.replace(/\s/g, "") : email);

  /** Native share sheet on phones; everywhere else, copy the link. */
  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name} — CV`, url });
        return;
      } catch (error) {
        // Closing the sheet is a choice, not a failure — do not copy then.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await writeClipboard("link", url);
  };

  return { copied, copy, share };
};
