"use client";

import { Activity, Minus } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

import { usePerfMeter } from "./hook";
import type { PerfLevel, PerfRowProps } from "./type";

const levelText: Record<PerfLevel, string> = {
  good: "text-primary",
  fair: "text-warning",
  poor: "text-destructive",
  unknown: "text-muted-foreground",
};

const levelDot: Record<PerfLevel, string> = {
  good: "bg-primary",
  fair: "bg-warning",
  poor: "bg-destructive",
  unknown: "bg-muted-foreground",
};

const rank: Record<PerfLevel, number> = { unknown: 0, good: 1, fair: 2, poor: 3 };
const worse = (a: PerfLevel, b: PerfLevel) => (rank[a] >= rank[b] ? a : b);

const Row = ({ label, value, level }: PerfRowProps) => (
  <div className="flex items-center justify-between gap-6 py-1">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("tabular-nums", level && levelText[level])}>{value}</span>
  </div>
);

/**
 * Site-wide FPS and connection readout, bottom-right. FPS is measured; the
 * network part is the browser's own estimate (Network Information API), so
 * nothing is downloaded to test it. Folds down to a dot, remembered per browser.
 */
export const PerfMeter = () => {
  const { fps, network, collapsed, toggleCollapsed } = usePerfMeter();
  const overall = worse(fps?.level ?? "unknown", network?.level ?? "unknown");

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Show FPS and network meter"
        title="FPS & network"
        className="fixed right-3 bottom-3 z-40 grid size-7 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur print:hidden"
      >
        <span className={cn("size-2 rounded-full", levelDot[overall])} />
      </button>
    );
  }

  const networkLabel = !network
    ? "…"
    : !network.online
      ? "offline"
      : network.supported
        ? `${network.effectiveType ?? "?"}${network.rtt !== null ? ` · ${network.rtt}ms` : ""}`
        : "online";

  return (
    <div className="fixed right-3 bottom-3 z-40 flex items-center rounded-full border border-border/60 bg-background/80 font-mono text-[11px] shadow-sm backdrop-blur print:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex items-center gap-2 py-1.5 pr-2 pl-3" aria-label="FPS and network details">
            <Activity size={12} className={levelText[overall]} />
            <span className={cn("tabular-nums", fps && levelText[fps.level])}>{fps ? `${fps.fps} fps` : "— fps"}</span>
            <span className="h-3 w-px bg-border" />
            <span className={cn(network && levelText[network.level])}>{networkLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 font-mono text-xs">
          <p className="mb-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Rendering</p>
          <Row label="Frame rate" value={fps ? `${fps.fps} fps` : "—"} level={fps?.level} />
          <Row label="Slowest frame" value={fps ? `${fps.worstFrame} ms` : "—"} />
          <p className="mt-3 mb-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Network</p>
          <Row label="Status" value={network?.online === false ? "offline" : "online"} level={network?.online === false ? "poor" : "good"} />
          {network?.supported ? (
            <>
              <Row label="Type" value={network.effectiveType ?? "—"} level={network.level} />
              <Row label="Downlink" value={network.downlink !== null ? `${network.downlink} Mbps` : "—"} />
              <Row label="Round trip" value={network.rtt !== null ? `${network.rtt} ms` : "—"} />
              {network.saveData && <Row label="Data saver" value="on" level="fair" />}
            </>
          ) : (
            <p className="pt-1 text-muted-foreground">This browser does not report connection quality.</p>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Network figures are the browser&apos;s estimate, not a speed test.
          </p>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Hide FPS and network meter"
        className="mr-1 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <Minus size={12} />
      </button>
    </div>
  );
};
