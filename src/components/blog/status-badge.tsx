import { cn } from "~/lib/utils";
import type { NoteStatusType } from "~/types";

const STATUS = {
  seed: { label: "Seed", hint: "Vừa ghi, còn thô", className: "text-amber-300/90 border-amber-300/30 bg-amber-300/10" },
  growing: { label: "Growing", hint: "Đang bồi thêm", className: "text-sky-300/90 border-sky-300/30 bg-sky-300/10" },
  evergreen: { label: "Evergreen", hint: "Đã tương đối chắc", className: "text-emerald-300/90 border-emerald-300/30 bg-emerald-300/10" },
} as const;

function StatusBadge({
  status,
  className,
}: {
  status: NoteStatusType;
  className?: string;
}) {
  const meta = STATUS[status];

  return (
    <span
      title={meta.hint}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

export { StatusBadge };
