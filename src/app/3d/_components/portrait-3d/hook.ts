import { useCallback, useEffect, useRef, useState } from "react";

import type { PortraitScene } from "./scene";
import { portraitSections } from "./sections";

/** Height of the fixed site header (`pt-16` on `<main>`). */
const HEADER = 64;

/**
 * Turns the scroll position into a fractional section index. A section's
 * pose is fully reached when its top meets the header, and the move towards
 * it starts 60% of a screen earlier — so a long section holds its pose while
 * you read it, and only the gaps between sections animate.
 */
const readProgress = (sections: (HTMLElement | null)[]) => {
  const scroll = window.scrollY;
  const lead = window.innerHeight * 0.6;
  let progress = 0;
  for (let index = 1; index < sections.length; index++) {
    const element = sections[index];
    if (!element) continue;
    const arrive = element.getBoundingClientRect().top + scroll - HEADER;
    const amount = (scroll - (arrive - lead)) / lead;
    if (amount <= 0) break;
    progress = index - 1 + Math.min(1, amount);
  }
  return progress;
};

export const usePortrait3d = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState(0);

  useEffect(() => {
    let scene: PortraitScene | null = null;
    let cancelled = false;

    const sync = () => {
      const progress = readProgress(sectionRefs.current);
      scene?.setProgress(progress);
      // CSS reads it directly (hero fade, parallax) — no React render per scroll event
      rootRef.current?.style.setProperty("--p3d-progress", progress.toFixed(3));
      setActive(Math.round(progress));
    };
    const point = (event: PointerEvent) => {
      scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };

    import("./scene").then(({ createPortraitScene }) => {
      const container = stageRef.current;
      if (cancelled || !container) return;
      try {
        scene = createPortraitScene({
          container,
          poses: portraitSections.map((section) => section.pose),
          onReady: () => setStatus("ready"),
          onError: () => setStatus("error"),
        });
        sync();
      } catch {
        setStatus("error");
      }
    });

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("pointermove", point, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("pointermove", point);
      scene?.dispose();
    };
  }, []);

  const sectionRef = useCallback(
    (index: number) => (element: HTMLElement | null) => { sectionRefs.current[index] = element; },
    [],
  );

  const goTo = useCallback((index: number) => {
    const element = sectionRefs.current[index];
    if (!element) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - HEADER, behavior: smooth ? "smooth" : "auto" });
  }, []);

  return { rootRef, stageRef, sectionRef, status, active, goTo };
};
