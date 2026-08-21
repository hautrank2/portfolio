import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { readingTime } from "./markdown";
import type { BlogNodeType } from "~/types";
import { StatusBadge } from "./status-badge";

export type NoteListProps = {
  notes: BlogNodeType[];
  /** Slug to section title, so each row can say where it sits in the roadmap. */
  sectionOf: Record<string, string>;
};

export const NoteList = ({ notes, sectionOf }: NoteListProps) => {
  if (notes.length === 0) {
    return (
      <p className="py-8 text-sm text-foreground/50">
        Chưa có note nào trong track này.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {notes.map((note) => (
        <li key={note.href}>
          <Link
            href={note.href}
            className="group flex flex-col gap-1.5 py-4 transition-colors"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium tracking-tight transition-colors group-hover:text-primary">
                {note.title}
              </span>
              {note.status && <StatusBadge status={note.status} />}
            </div>

            {note.description && (
              <p className="text-sm leading-relaxed text-foreground/60">
                {note.description}
              </p>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/40">
              {sectionOf[note.href] && (
                <span className="text-primary/60">{sectionOf[note.href]}</span>
              )}
              {note.updated && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} />
                  {note.updated}
                </span>
              )}
              <span>{readingTime(note.body)} phút đọc</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};
