import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { localKeys, readLocal, writeLocal } from "~/utils/local";

import type { FpsReading, NetworkInformationLike, NetworkReading, PerfLevel } from "./type";

const SAMPLE_MS = 500;

const fpsLevel = (fps: number): PerfLevel => (fps >= 50 ? "good" : fps >= 30 ? "fair" : "poor");

const readConnection = (): NetworkInformationLike | null =>
  "connection" in navigator ? (navigator.connection as NetworkInformationLike) : null;

const readNetwork = (): NetworkReading => {
  const online = navigator.onLine;
  const connection = readConnection();
  const effectiveType = connection?.effectiveType ?? null;
  const rtt = connection?.rtt ?? null;
  // offline beats everything; then the browser's own estimate; RTT breaks ties inside "4g"
  const level: PerfLevel = !online
    ? "poor"
    : !connection
      ? "unknown"
      : effectiveType === "slow-2g" || effectiveType === "2g" || (rtt ?? 0) > 600
        ? "poor"
        : effectiveType === "3g" || (rtt ?? 0) > 250
          ? "fair"
          : "good";
  return {
    online,
    supported: connection !== null,
    effectiveType,
    downlink: connection?.downlink ?? null,
    rtt,
    saveData: connection?.saveData ?? false,
    level,
  };
};

/** Counts frames with requestAnimationFrame; stops while the tab is hidden, where rAF is paused anyway. */
const useFps = () => {
  const [reading, setReading] = useState<FpsReading | null>(null);

  useEffect(() => {
    let frame = 0;
    let frames = 0;
    let worst = 0;
    let windowStart = performance.now();
    let last = windowStart;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      const elapsed = now - windowStart;
      if (elapsed < SAMPLE_MS) return;
      const fps = Math.round((frames * 1000) / elapsed);
      setReading({ fps, worstFrame: Math.round(worst), level: fpsLevel(fps) });
      frames = 0;
      worst = 0;
      windowStart = now;
    };

    const visibility = () => {
      cancelAnimationFrame(frame);
      if (document.visibilityState !== "visible") return;
      // a long pause would read as one giant frame, so restart the window
      frames = 0;
      worst = 0;
      windowStart = last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return reading;
};

/** Reads only what the browser already knows — no test request is sent. */
const useNetwork = () => {
  const [reading, setReading] = useState<NetworkReading | null>(null);

  useEffect(() => {
    const update = () => setReading(readNetwork());
    const connection = readConnection();
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener("change", update);
    };
  }, []);

  return reading;
};

// The folded state lives in localStorage; read it as an external store so the
// server render (always expanded) and the first client render agree.
const collapsedListeners = new Set<() => void>();
const subscribeCollapsed = (listener: () => void) => {
  collapsedListeners.add(listener);
  return () => { collapsedListeners.delete(listener); };
};
const readCollapsed = () => readLocal(localKeys.perfMeterCollapsed) === "1";
const serverCollapsed = () => false;

export const usePerfMeter = () => {
  const fps = useFps();
  const network = useNetwork();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, serverCollapsed);

  const toggleCollapsed = useCallback(() => {
    writeLocal(localKeys.perfMeterCollapsed, readCollapsed() ? null : "1");
    collapsedListeners.forEach((listener) => listener());
  }, []);

  return { fps, network, collapsed, toggleCollapsed };
};
