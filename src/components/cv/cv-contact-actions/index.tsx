"use client";

import { Check, Copy, Download, Mail, Share2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useCvContactActions } from "./hook";
import type { CvContactActionsProps } from "./type";

export const CvContactActions = (props: CvContactActionsProps) => {
  const { copied, copy, share } = useCvContactActions(props);
  const size = props.size ?? "lg";

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-wrap items-center",
          size === "sm" ? "gap-2" : "gap-3"
        )}
      >
        <Button
          asChild
          size={size}
          // In a narrow column the primary action takes its own full row.
          className={cn("rounded-full", size === "sm" && "w-full")}
        >
          <a href={`mailto:${props.email}`}>
            <Mail />
            Contact me
          </a>
        </Button>
        <Button asChild size={size} variant="outline" className="rounded-full">
          <a href={props.pdfHref} download>
            <Download />
            Download PDF
          </a>
        </Button>
        <Button
          type="button"
          size={size}
          variant="outline"
          className="rounded-full"
          onClick={share}
        >
          {copied === "link" ? <Check className="text-primary" /> : <Share2 />}
          {copied === "link" ? "Link copied" : "Share"}
        </Button>
      </div>
      {(props.showCopy ?? true) && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => copy("phone")}
          >
            {copied === "phone" ? <Check className="text-primary" /> : <Copy />}
            {copied === "phone" ? "Copied" : props.phone}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => copy("email")}
          >
            {copied === "email" ? <Check className="text-primary" /> : <Copy />}
            {copied === "email" ? "Copied" : props.email}
          </Button>
        </div>
      )}
    </div>
  );
};
