/**
 * The Network Information API (`navigator.connection`). Chromium only, and not
 * in TypeScript's DOM lib — so it is typed here and treated as optional.
 */
export type NetworkInformationLike = EventTarget & {
  /** `slow-2g` | `2g` | `3g` | `4g` — the browser's estimate, not the radio. */
  effectiveType?: string;
  /** Estimated bandwidth, Mbps. */
  downlink?: number;
  /** Estimated round trip, ms. */
  rtt?: number;
  saveData?: boolean;
};

export type PerfLevel = "good" | "fair" | "poor" | "unknown";

export type NetworkReading = {
  online: boolean;
  /** `false` when the browser does not expose `navigator.connection` (Safari, Firefox). */
  supported: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  level: PerfLevel;
};

export type PerfRowProps = {
  label: string;
  value: string;
  level?: PerfLevel;
};

export type FpsReading = {
  fps: number;
  /** Slowest frame in the last sample window, ms — spikes hide inside an average. */
  worstFrame: number;
  level: PerfLevel;
};
