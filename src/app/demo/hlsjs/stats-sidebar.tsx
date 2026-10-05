"use client";

import {
  CircleCheck,
  CircleX,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  TriangleAlert,
  Wifi,
  WifiHigh,
  WifiLow,
  WifiOff,
  WifiZero,
} from "lucide-react";
import { useState } from "react";
import { HISTORY_SIZE, type DemoSample } from "./hook";

type Status = "safe" | "warn" | "danger" | "idle";
type Thresholds = { warn: number; danger: number };

type Metric = {
  label: string;
  hint: string;
  unit: string;
  value: (sample: DemoSample) => number | null;
  format: (value: number) => string;
  // Không có ngưỡng thì thông số chỉ để tham khảo, không được chấm trạng thái
  thresholds?: (sample: DemoSample) => Thresholds | null;
  higherIsBetter?: boolean;
};

const integer = (value: number) => `${Math.round(value)}`;
const oneDecimal = (value: number) => value.toFixed(1);

const GROUPS: { title: string; metrics: Metric[] }[] = [
  {
    title: "Hiệu năng",
    metrics: [
      {
        label: "FPS trang",
        hint: "Số khung hình giao diện vẽ được mỗi giây.",
        unit: "fps",
        value: (sample) => sample.fps,
        format: integer,
        thresholds: () => ({ warn: 50, danger: 30 }),
        higherIsBetter: true,
      },
      {
        label: "Video đang phát",
        hint: "Tỉ lệ video đang chạy, không đứng chờ buffer.",
        unit: "%",
        value: (sample) => sample.playingPercent,
        format: integer,
        thresholds: () => ({ warn: 100, danger: 90 }),
        higherIsBetter: true,
      },
      {
        label: "Rớt khung hình",
        hint: "Tỉ lệ khung hình video bị bỏ trong giây vừa qua.",
        unit: "%",
        value: (sample) => sample.droppedPercent,
        format: oneDecimal,
        thresholds: () => ({ warn: 1, danger: 5 }),
      },
      {
        label: "Bộ nhớ JS",
        hint: "Heap JS đang dùng; ngưỡng tính theo 50% và 80% giới hạn của trình duyệt.",
        unit: "MB",
        value: (sample) => sample.memoryMb,
        format: integer,
        thresholds: (sample) =>
          sample.memoryLimitMb
            ? {
                warn: Math.round(sample.memoryLimitMb * 0.5),
                danger: Math.round(sample.memoryLimitMb * 0.8),
              }
            : null,
      },
    ],
  },
  {
    title: "Chất lượng mạng",
    metrics: [
      {
        label: "Độ trễ phản hồi",
        hint: "Thời gian từ lúc gửi request segment đến khi nhận byte đầu tiên.",
        unit: "ms",
        value: (sample) => sample.latencyMs,
        format: integer,
        thresholds: () => ({ warn: 200, danger: 1000 }),
      },
      {
        label: "Thời gian tải segment",
        hint: "So với thời lượng của segment; trên 100% là tải chậm hơn tốc độ phát.",
        unit: "%",
        value: (sample) => sample.loadPercent,
        format: integer,
        thresholds: () => ({ warn: 50, danger: 100 }),
      },
      {
        label: "Lưu lượng tải",
        hint: "Tổng dữ liệu video mọi player tải về mỗi giây.",
        unit: "Mbps",
        value: (sample) => sample.mbps,
        format: oneDecimal,
      },
    ],
  },
];

const STATUS: Record<
  Status,
  { label: string; Icon: typeof CircleCheck; className: string }
> = {
  safe: { label: "An toàn", Icon: CircleCheck, className: "text-emerald-500" },
  warn: { label: "Cảnh báo", Icon: TriangleAlert, className: "text-amber-500" },
  danger: { label: "Nguy hiểm", Icon: CircleX, className: "text-red-500" },
  idle: { label: "Chưa có dữ liệu", Icon: Minus, className: "text-foreground/40" },
};

const SEVERITY: Status[] = ["idle", "safe", "warn", "danger"];

const getStatus = (metric: Metric, sample: DemoSample | undefined): Status => {
  const value = sample ? metric.value(sample) : null;
  const thresholds = sample ? metric.thresholds?.(sample) : null;
  if (value == null || !thresholds) return "idle";

  if (metric.higherIsBetter) {
    if (value < thresholds.danger) return "danger";
    return value < thresholds.warn ? "warn" : "safe";
  }
  if (value >= thresholds.danger) return "danger";
  return value >= thresholds.warn ? "warn" : "safe";
};

type Group = (typeof GROUPS)[number];

const getGroupStatus = (group: Group, sample: DemoSample | undefined) =>
  group.metrics
    .map((metric) => getStatus(metric, sample))
    .reduce((a, b) => (SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a));


export function StatsSidebar({ history }: { history: DemoSample[] }) {
  const [open, setOpen] = useState(true);
  const latest = history.at(-1);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="order-first flex shrink-0 items-center gap-2 rounded-md border border-foreground/15 px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-primary lg:sticky lg:top-20 lg:order-last"
      >
        <PanelRightOpen size={16} />
        Thông số
      </button>
    );
  }

  return (
    <aside className="order-first w-full shrink-0 lg:sticky lg:top-20 lg:order-last lg:max-h-[calc(100vh-6rem)] lg:w-80 lg:overflow-y-auto">
      <div className="z-10 flex items-center justify-between gap-2 border-b border-foreground/10 bg-background/90 py-2 backdrop-blur lg:sticky lg:top-0">
        <h2 className="text-sm font-semibold">Thông số</h2>
        <div className="flex items-center gap-2">
          <ConnectionIndicator sample={latest} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-expanded
            aria-label="Đóng thông số"
            className="rounded-md p-1.5 text-foreground/60 transition-colors hover:text-primary"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground/50">
        Cập nhật mỗi giây, đồ thị là {HISTORY_SIZE} giây gần nhất.
      </p>

      {GROUPS.map((group) => {
        const worst = getGroupStatus(group, latest);

        return (
          <section key={group.title} className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                {group.title}
              </h3>
              <StatusBadge status={worst} />
            </div>
            <div className="mt-2 space-y-2">
              {group.metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  metric={metric}
                  history={history}
                />
              ))}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

// Số vạch sóng suy ra từ ping và tốc độ mà trình duyệt ước lượng
function ConnectionIndicator({ sample }: { sample: DemoSample | undefined }) {
  if (!sample) return null;

  if (!sample.online) {
    return (
      <span className="flex items-center gap-1 text-xs text-foreground/70">
        <WifiOff size={16} className="text-red-500" />
        Mất kết nối
      </span>
    );
  }
  if (!sample.connection) {
    return (
      <span className="flex items-center gap-1 text-xs text-foreground/50">
        <Wifi size={16} className="text-foreground/40" />
        Không đo được
      </span>
    );
  }

  const { type, pingMs, speedMbps } = sample.connection;
  let Icon = WifiZero;
  let className = "text-red-500";
  if (pingMs < 100 && speedMbps >= 5) {
    Icon = Wifi;
    className = "text-emerald-500";
  } else if (pingMs < 300 && speedMbps >= 1.5) {
    Icon = WifiHigh;
    className = "text-emerald-500";
  } else if (pingMs < 1000 && speedMbps >= 0.5) {
    Icon = WifiLow;
    className = "text-amber-500";
  }

  return (
    <span
      className="flex items-center gap-1.5 text-xs tabular-nums text-foreground/70"
      title="Loại kết nối · ping · tốc độ (trình duyệt ước lượng)"
    >
      <Icon size={16} className={className} />
      {type.toUpperCase()} · {pingMs} ms · {speedMbps} Mbps
    </span>
  );
}

function StatusBadge({
  status,
  label = STATUS[status].label,
}: {
  status: Status;
  label?: string;
}) {
  const { Icon, className } = STATUS[status];

  return (
    <span className="flex items-center gap-1 text-xs text-foreground/70">
      <Icon size={14} className={className} />
      {label}
    </span>
  );
}

function MetricCard({
  metric,
  history,
}: {
  metric: Metric;
  history: DemoSample[];
}) {
  const latest = history.at(-1);
  const value = latest ? metric.value(latest) : null;
  const thresholds = latest ? (metric.thresholds?.(latest) ?? null) : null;

  return (
    <div className="rounded-md border border-foreground/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs text-foreground/60">{metric.label}</h4>
        {metric.thresholds && (
          <StatusBadge status={getStatus(metric, latest)} />
        )}
      </div>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">
        {value != null ? metric.format(value) : "–"}
        <span className="ml-1 text-xs font-normal text-foreground/50">
          {metric.unit}
        </span>
      </p>

      <Sparkline
        label={metric.label}
        values={history.map(metric.value)}
        thresholds={thresholds}
        format={(v) => `${metric.format(v)} ${metric.unit}`}
      />

      {thresholds && (
        <ThresholdLegend
          thresholds={thresholds}
          higherIsBetter={metric.higherIsBetter}
          unit={metric.unit}
        />
      )}
      <p className="mt-2 text-[11px] leading-snug text-foreground/45">
        {metric.hint}
      </p>
    </div>
  );
}

function ThresholdLegend({
  thresholds: { warn, danger },
  higherIsBetter,
  unit,
}: {
  thresholds: Thresholds;
  higherIsBetter?: boolean;
  unit: string;
}) {
  const [low, high] = warn < danger ? [warn, danger] : [danger, warn];
  const ranges: [Status, string][] = higherIsBetter
    ? [
        ["safe", `≥ ${warn}`],
        ["warn", `${low}–${high}`],
        ["danger", `< ${danger}`],
      ]
    : [
        ["safe", `< ${warn}`],
        ["warn", `${low}–${high}`],
        ["danger", `≥ ${danger}`],
      ];

  return (
    <ul className="mt-2 space-y-0.5 text-[11px] text-foreground/60">
      {ranges.map(([status, range]) => {
        const { label, Icon, className } = STATUS[status];
        return (
          <li key={status} className="flex items-center gap-1.5">
            <Icon size={11} className={className} />
            <span className="w-16">{label}</span>
            <span className="tabular-nums">
              {range} {unit}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const WIDTH = 240;
const HEIGHT = 48;

function Sparkline({
  label,
  values,
  thresholds,
  format,
}: {
  label: string;
  values: (number | null)[];
  thresholds: Thresholds | null;
  format: (value: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  // Điểm mới nhất luôn nằm sát mép phải, kể cả khi chưa đủ HISTORY_SIZE mẫu
  const offset = HISTORY_SIZE - values.length;
  const top =
    Math.max(
      1,
      thresholds?.warn ?? 0,
      thresholds?.danger ?? 0,
      ...values.map((value) => value ?? 0),
    ) * 1.1;
  const x = (index: number) => ((index + offset) / (HISTORY_SIZE - 1)) * WIDTH;
  const y = (value: number) => HEIGHT - (value / top) * HEIGHT;

  // Mẫu null ngắt nét vẽ; "h0" để một mẫu đứng lẻ vẫn hiện thành chấm
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value == null) {
      drawing = false;
      return;
    }
    const point = `${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
    path += drawing ? `L${point}` : `M${point}h0`;
    drawing = true;
  });

  const hovered = hover != null ? (values[hover] ?? null) : null;
  const secondsAgo = hover != null ? values.length - 1 - hover : 0;

  return (
    <div
      className="relative mt-2"
      onPointerMove={(event) => {
        if (!values.length) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const slot = Math.round(
          ((event.clientX - rect.left) / rect.width) * (HISTORY_SIZE - 1),
        );
        setHover(Math.min(values.length - 1, Math.max(0, slot - offset)));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} trong ${HISTORY_SIZE} giây gần nhất`}
        className="block h-12 w-full overflow-visible"
        fill="none"
      >
        <line
          x1={0}
          x2={WIDTH}
          y1={HEIGHT}
          y2={HEIGHT}
          className="stroke-foreground/15"
          vectorEffect="non-scaling-stroke"
        />
        {thresholds &&
          (["warn", "danger"] as const).map((level) => (
            <line
              key={level}
              x1={0}
              x2={WIDTH}
              y1={y(thresholds[level])}
              y2={y(thresholds[level])}
              className={
                level === "warn" ? "stroke-amber-500/60" : "stroke-red-500/60"
              }
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        <path
          d={path}
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover != null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={0}
            y2={HEIGHT}
            className="stroke-foreground/40"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {hover != null && (
        <>
          {hovered != null && (
            <span
              className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
              style={{
                left: `${(x(hover) / WIDTH) * 100}%`,
                top: `${(y(hovered) / HEIGHT) * 100}%`,
              }}
            />
          )}
          <span
            className="pointer-events-none absolute -top-5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] tabular-nums text-background"
            style={{
              left: `${Math.min(80, Math.max(20, (x(hover) / WIDTH) * 100))}%`,
            }}
          >
            {hovered != null ? format(hovered) : "Không có dữ liệu"} ·{" "}
            {secondsAgo === 0 ? "hiện tại" : `${secondsAgo}s trước`}
          </span>
        </>
      )}
    </div>
  );
}
