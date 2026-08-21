"use client";

import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { NoteStatusType } from "~/types";

export type StatusBadgeProps = {
  status: NoteStatusType;
  className?: string;
};

const STATUS = {
  seed: {
    label: "Seed",
    hint: "Vừa ghi, còn thô — có thể sai",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-300/90",
  },
  growing: {
    label: "Growing",
    hint: "Đang bồi thêm, đã dùng được",
    className: "border-sky-300/30 bg-sky-300/10 text-sky-300/90",
  },
  evergreen: {
    label: "Evergreen",
    hint: "Đã tương đối chắc, ít phải sửa",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-300/90",
  },
} as const satisfies Record<
  NoteStatusType,
  { label: string; hint: string; className: string }
>;

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const meta = STATUS[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
            meta.className,
            className
          )}
        >
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{meta.hint}</TooltipContent>
    </Tooltip>
  );
};
