import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** Connection type estimated by the Network Information API */
export type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

/** Signal level mapped for UI rendering (4 = strongest) */
export type SignalLevel = 0 | 1 | 2 | 3 | 4;

/** Human-readable speed bucket derived from `downlink` */
export type SpeedTier = "fast" | "medium" | "slow" | "very-slow" | "unknown";

export type NetworkInfoModel = {
  /** Whether the browser supports the Network Information API */
  supported: boolean;
  /** Whether the device is currently online */
  online: boolean;
  /** Estimated connection type: '4g' | '3g' | '2g' | 'slow-2g' */
  effectiveType: EffectiveType;
  /** Estimated download bandwidth in Mbps — main indicator of "speed" */
  downlink: number | null;
  /** Round-trip time in ms reported by the browser — indicator of "lag" */
  rtt: number | null;
  /** Whether the user has Data Saver enabled */
  saveData: boolean;
  /** Latency measured directly via fetch (ms) — null until first probe */
  latency: number | null;
  /** Signal bars 0–4 for rendering a wifi icon */
  signal: SignalLevel;
  /** Overall quality label combining bandwidth + latency */
  quality: "excellent" | "good" | "fair" | "poor" | "offline";
  /** Speed bucket derived from `downlink` only */
  speedTier: SpeedTier;
  /** Manually trigger a new latency measurement */
  refresh: () => Promise<void>;
};

interface NavigatorConnection {
  effectiveType?: EffectiveType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: "change", cb: () => void) => void;
  removeEventListener?: (type: "change", cb: () => void) => void;
}

/** Read the connection object from the navigator, handling vendor prefixes */
function getConnection(): NavigatorConnection | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    connection?: NavigatorConnection;
    mozConnection?: NavigatorConnection;
    webkitConnection?: NavigatorConnection;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

/** Map raw downlink (Mbps) into a coarse speed bucket */
function toSpeedTier(downlink: number | null): SpeedTier {
  if (downlink === null) return "unknown";
  if (downlink >= 10) return "fast"; // Broadband / strong wifi
  if (downlink >= 2) return "medium"; // Decent 4G / okay wifi
  if (downlink >= 0.5) return "slow"; // Weak signal
  return "very-slow"; // Barely usable
}

/**
 * Compute the signal bars (0–4).
 * Prefers the directly measured `latency` because it reflects real perceived
 * responsiveness; falls back to `effectiveType` from the browser otherwise.
 */
function toSignal(
  effectiveType: EffectiveType,
  latency: number | null,
  online: boolean,
): SignalLevel {
  if (!online) return 0;

  if (latency !== null) {
    if (latency < 80) return 4;
    if (latency < 150) return 3;
    if (latency < 300) return 2;
    return 1;
  }

  switch (effectiveType) {
    case "4g":
      return 4;
    case "3g":
      return 3;
    case "2g":
      return 2;
    case "slow-2g":
      return 1;
    default:
      return 3;
  }
}

/** Translate signal bars into a friendly quality label */
function toQuality(
  signal: SignalLevel,
  online: boolean,
): NetworkInfoModel["quality"] {
  if (!online) return "offline";
  if (signal >= 4) return "excellent";
  if (signal === 3) return "good";
  if (signal === 2) return "fair";
  return "poor";
}

export interface UseWifiOptions {
  /** URL used to ping for latency. Defaults to '/favicon.ico' */
  pingUrl?: string;
  /** Interval between latency probes in ms. Set to 0 to disable. Default 10_000 */
  pingInterval?: number;
  /** Whether to run a probe immediately on mount. Default true */
  pingOnMount?: boolean;
}

/**
 * React hook that exposes "wifi-like" metrics for UI rendering.
 *
 * Note: browsers do NOT expose true RSSI / SSID / dBm for security reasons.
 * This hook combines the Network Information API with a fetch-based latency
 * probe to estimate connection quality — accurate enough to render signal bars.
 *
 * Key fields:
 *   - `downlink`  → how fast the connection is (Mbps)
 *   - `latency`   → how responsive it feels (ms)
 *   - `speedTier` → coarse bucket derived from `downlink`
 *   - `signal`    → 0–4 bars for the UI
 */
const subscribeToOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// Whether the Network Information API exists never changes after load.
const subscribeToNothing = () => () => undefined;

export function useNetwork(options: UseWifiOptions = {}): NetworkInfoModel {
  const {
    // `import.meta.env` is a Vite thing and is undefined under Next.js, so
    // reading BASE_URL from it throws; the favicon is always there to ping.
    pingUrl = "/favicon.ico",
    pingInterval = 10_000,
    pingOnMount = true,
  } = options;

  // Read through useSyncExternalStore so the server render and the first
  // client render agree. A plain `useState(navigator.onLine)` does not: Node
  // has a global `navigator` whose `onLine` is undefined, so the server would
  // render "offline" and hydration would then fail against an online browser.
  const online = useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true,
  );
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => getConnection() !== null,
    () => false,
  );
  const [effectiveType, setEffectiveType] = useState<EffectiveType>("unknown");
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [saveData, setSaveData] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);

  const connection = useRef<NavigatorConnection | null>(null);

  // Measure latency manually by timing a fetch round-trip
  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) {
      setLatency(null);
      return;
    }
    try {
      const start = performance.now();
      await fetch(`${pingUrl}?_=${Date.now()}`, {
        cache: "no-store",
        method: "GET",
      });
      setLatency(Math.round(performance.now() - start));
    } catch {
      // Probe failed — likely offline or blocked by CORS
      setLatency(null);
    }
  }, [pingUrl]);

  // Subscribe to the Network Information API
  useEffect(() => {
    connection.current = getConnection();

    const sync = () => {
      const c = connection.current;
      if (!c) return;
      setEffectiveType(c.effectiveType ?? "unknown");
      setDownlink(c.downlink ?? null);
      setRtt(c.rtt ?? null);
      setSaveData(c.saveData ?? false);
    };

    sync();
    connection.current?.addEventListener?.("change", sync);
    return () => connection.current?.removeEventListener?.("change", sync);
  }, []);

  // A measured latency means nothing once the connection is gone.
  useEffect(() => {
    const onOffline = () => setLatency(null);
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, []);

  // Run the latency probe on mount and on a recurring interval
  useEffect(() => {
    // Deferred a tick: `refresh` can set state straight away (when offline),
    // and an effect body must not do that synchronously.
    const first = pingOnMount ? window.setTimeout(refresh, 0) : undefined;
    const id = pingInterval
      ? window.setInterval(refresh, pingInterval)
      : undefined;
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [refresh, pingInterval, pingOnMount]);

  const signal = toSignal(effectiveType, latency, online);
  const quality = toQuality(signal, online);
  const speedTier = toSpeedTier(downlink);

  return {
    supported,
    online,
    effectiveType,
    downlink,
    rtt,
    saveData,
    latency,
    signal,
    quality,
    speedTier,
    refresh,
  };
}
