"use client";

import { cn } from "~/lib/utils";
import { formatDay, formatDuration } from "~/utils/admin-time";
import type { LogtimeGranularityType } from "~/utils/logtime-stats";
import { ActivityHeatmap } from "../activity-heatmap";
import { ChartCard } from "../chart-card";
import { ColumnChart } from "../column-chart";
import { RankBars } from "../rank-bars";
import { StatTile } from "../stat-tile";
import { RANGE_OPTIONS, useLogtimeDashboard } from "./hook";
import type { LogtimeDashboardProps } from "./type";

const UNIT_LABELS: Record<LogtimeGranularityType, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export const LogtimeDashboard = (props: LogtimeDashboardProps) => {
  const { stats, handleRangeChange } = useLogtimeDashboard(props);
  const unit = UNIT_LABELS[stats.granularity];

  return (
    // The chart colours live here, once per theme: a single blue for marks and
    // a four-step ramp of the same blue for the heatmap. On the dark surface the
    // ramp runs dark → light, so "more" still stands further off the background.
    <div
      className={cn(
        "space-y-4",
        "[--viz-1:#2a78d6] dark:[--viz-1:#3987e5]",
        "[--heat-1:#b7d3f6] [--heat-2:#6da7ec] [--heat-3:#2a78d6] [--heat-4:#104281]",
        "dark:[--heat-1:#184f95] dark:[--heat-2:#256abf] dark:[--heat-3:#3987e5] dark:[--heat-4:#9ec5f4]"
      )}
    >
      {/* The one filter, in one row above everything it controls. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Period"
          className="surface flex flex-wrap gap-1 rounded-xl border border-border/60 p-1"
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={props.range === option.value}
              onClick={() => handleRangeChange(option.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                props.range === option.value
                  ? "bg-primary/15 text-primary"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatDay(stats.from)} – {formatDay(stats.to)}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.4fr_repeat(5,1fr)]">
        <StatTile
          hero
          label="Total time"
          value={formatDuration(stats.totalMinutes)}
          detail={`${stats.entries} ${stats.entries === 1 ? "entry" : "entries"}`}
          className="sm:col-span-2 lg:col-span-4 xl:col-span-1"
        />
        <StatTile
          label="Days logged"
          value={String(stats.daysLogged)}
          detail={`of ${plural(stats.daysLogged + stats.daysMissed, "day")}`}
        />
        <StatTile
          label="Days missed"
          value={String(stats.daysMissed)}
          warning={stats.daysMissed > 0}
          detail="up to today"
        />
        <StatTile
          label="Average per day"
          value={formatDuration(stats.averageMinutesPerLoggedDay)}
          detail="on days with a log"
        />
        <StatTile
          label="Current streak"
          value={plural(stats.currentStreak, "day")}
          detail="in a row, to today"
        />
        <StatTile
          label="Longest streak"
          value={plural(stats.longestStreak, "day")}
          detail="in this period"
        />
      </dl>

      <ChartCard
        title="Time logged"
        subtitle={`Hours per ${unit.toLowerCase()}`}
      >
        <ColumnChart buckets={stats.buckets} unitLabel={unit} />
      </ChartCard>

      <ChartCard
        title="Activity"
        subtitle="One cell per day — a stronger blue is more time logged"
      >
        <ActivityHeatmap
          from={stats.from}
          to={stats.to}
          minutesByDay={stats.minutesByDay}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="By project" subtitle="Time on each project's tasks">
          <RankBars rows={stats.byProject} emptyMessage="No time logged yet." />
        </ChartCard>
        <ChartCard title="By category" subtitle="Time per kind of activity">
          <RankBars rows={stats.byCategory} emptyMessage="No time logged yet." />
        </ChartCard>
        <ChartCard
          title="By technology"
          subtitle="An entry counts in full for each technology on it"
        >
          <RankBars
            rows={stats.byTechnology}
            emptyMessage="No technologies on these entries."
          />
        </ChartCard>
        <ChartCard title="By weekday" subtitle="Total time on each day of the week">
          <RankBars rows={stats.byWeekday} emptyMessage="No time logged yet." />
        </ChartCard>
      </div>
    </div>
  );
};
