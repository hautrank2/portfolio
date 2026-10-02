"use client";

import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LogFormDialog } from "../log-form";
import { useLogBoard } from "./hook";
import type { LogBoardProps } from "./type";

// Fixed locale and UTC so the server render and the browser agree on the text.
const dayFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const formatDay = (date: string) =>
  dayFormatter.format(new Date(`${date}T00:00:00Z`));

const formatHours = (hours: number) => `${Number(hours.toFixed(2))}h`;

export const LogBoard = (props: LogBoardProps) => {
  const {
    open,
    setOpen,
    isEdit,
    defaultValues,
    formKey,
    formError,
    listError,
    days,
    totalHours,
    technologies,
    openForm,
    handleSubmit,
    handleDelete,
    handleMonthChange,
    handleLogout,
  } = useLogBoard(props);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <label
            htmlFor="log-month"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40"
          >
            Tháng
          </label>
          <Input
            id="log-month"
            type="month"
            value={props.month}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="w-44"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => openForm(null)}>
            <Plus />
            Thêm log
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            title={`Đăng xuất ${props.username}`}
          >
            <LogOut />
            Đăng xuất
          </Button>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="surface rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-muted-foreground">Tổng giờ</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">
            {formatHours(totalHours)}
          </dd>
        </div>
        <div className="surface rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-muted-foreground">Số ngày có log</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{days.length}</dd>
        </div>
        <div className="surface rounded-xl border border-border/60 p-4">
          <dt className="text-xs text-muted-foreground">Công nghệ</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {technologies.length === 0 && (
              <span className="text-sm text-foreground/50">—</span>
            )}
            {technologies.map((technology) => (
              <Badge key={technology.name} variant="secondary">
                {technology.name}
                <span className="ml-1.5 tabular-nums text-foreground/50">
                  {technology.count}
                </span>
              </Badge>
            ))}
          </dd>
        </div>
      </dl>

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      {days.length === 0 && (
        <p className="text-foreground/50">Tháng này chưa có log nào.</p>
      )}

      <div className="space-y-8">
        {days.map((day) => (
          <section key={day.date}>
            <h2 className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
              <span className="text-sm font-semibold capitalize">
                {formatDay(day.date)}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatHours(day.hours)}
              </span>
            </h2>

            <ul className="mt-4 space-y-3">
              {day.logs.map((log) => (
                <li
                  key={log.id}
                  className="surface rounded-xl border border-border/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground/90">
                      {log.content}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-2 text-xs tabular-nums text-muted-foreground">
                        {formatHours(log.hours)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Sửa log"
                        onClick={() => openForm(log)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Xoá log"
                        onClick={() => handleDelete(log)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {log.technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {log.technologies.map((name) => (
                        <Badge key={name} variant="outline">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <LogFormDialog
        key={formKey}
        open={open}
        onOpenChange={setOpen}
        isEdit={isEdit}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        error={formError}
      />
    </div>
  );
};
