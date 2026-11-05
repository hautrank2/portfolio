import { useCallback, useEffect, useRef, useState } from "react";

import { chapters } from "./chapters";
import type { createRoomScene } from "./scene";
import type { RoomSpot } from "./type";

export const useRoom = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createRoomScene> | null>(null);
  const chapterRef = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<RoomSpot | null>(null);
  const [tvOn, setTvOn] = useState(true);

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(chapters.length - 1, index));
    chapterRef.current = next;
    setActive(next); setSelected(null);
    sceneRef.current?.goTo(next);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    const id = chapters[next].id;
    if (id !== "overview") popupTimer.current = setTimeout(() => setSelected(id), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1650);
  }, []);

  const selectSpot = useCallback((spot: RoomSpot) => {
    if (spot === "dog") { if (popupTimer.current) clearTimeout(popupTimer.current); setSelected("dog"); return; }
    const index = chapters.findIndex(chapter => chapter.id === spot);
    if (index >= 0) goTo(index);
  }, [goTo]);

  useEffect(() => {
    let cancelled = false;
    import("./scene").then(({ createRoomScene: create }) => {
      if (cancelled || !containerRef.current) return;
      try {
        sceneRef.current = create({
          container: containerRef.current,
          onReady: () => setStatus("ready"), onError: () => setStatus("error"), onSelect: selectSpot,

        });
        if (chapterRef.current > 0) sceneRef.current.goTo(chapterRef.current);
      } catch { setStatus("error"); }
    }).catch(() => setStatus("error"));
    return () => { cancelled = true; if (popupTimer.current) clearTimeout(popupTimer.current); sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [selectSpot]);

  useEffect(() => {
    let accumulated = 0; let lockedUntil = 0; let lastWheel = 0; let touchY = 0;
    const scrollable = (target: EventTarget | null, delta: number) => {
      const node = target instanceof Element ? target.closest<HTMLElement>(".room-popup-scroll") : null;
      return node && (delta > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 2 : node.scrollTop > 2);
    };
    const wheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest("header")) return;
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX) || scrollable(event.target, event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      if (now - lastWheel > 200 || Math.sign(accumulated) !== Math.sign(event.deltaY)) accumulated = 0;
      lastWheel = now;
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (Math.abs(accumulated) < 65) return;
      const next = chapterRef.current + Math.sign(accumulated);
      accumulated = 0;
      if (next < 0 || next >= chapters.length) return;
      goTo(next); lockedUntil = now + 1900;
    };
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("header, input, textarea, select, [contenteditable=true]")) return;
      if (["ArrowDown", "ArrowRight", "PageDown", "ArrowUp", "ArrowLeft", "PageUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "Home") goTo(0);
        else if (event.key === "End") goTo(chapters.length - 1);
        else goTo(chapterRef.current + (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key) ? 1 : -1));
      }
    };
    const start = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const end = (event: TouchEvent) => {
      if (event.target instanceof Element && event.target.closest(".room-popup-scroll, button, a")) return;
      const delta = touchY - (event.changedTouches[0]?.clientY ?? touchY);
      const next = chapterRef.current + Math.sign(delta);
      if (Math.abs(delta) > 65 && performance.now() > lockedUntil && next >= 0 && next < chapters.length) { goTo(next); lockedUntil = performance.now() + 1900; }
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("wheel", wheel); window.removeEventListener("keydown", key); window.removeEventListener("touchstart", start); window.removeEventListener("touchend", end); };
  }, [goTo]);

  const toggleTv = () => { setTvOn(!tvOn); sceneRef.current?.toggleTv(!tvOn); };
  return { containerRef, status, active, chapter: chapters[active], selected, setSelected, selectSpot, goTo, tvOn, toggleTv };
};
