import * as React from "react";
import type { UseResumeSidebarProps } from "./type";

/**
 * Scroll-spy: which section is under the reading line, plus how far down the
 * page the reader is (0–1) for the progress rail.
 *
 * Measured on scroll rather than with IntersectionObserver: sections here are
 * very different heights, and "the last section whose top has passed the
 * reading line" is exact where an observer threshold would flicker between two
 * short neighbours.
 */
export const useResumeSidebar = ({ items }: UseResumeSidebarProps) => {
  const [activeId, setActiveId] = React.useState(items[0]?.id ?? "");
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      // A third of the way down the viewport reads as "the section I am in".
      const line = window.innerHeight / 3;
      let current = items[0]?.id ?? "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }

      const max = document.documentElement.scrollHeight - window.innerHeight;
      // At the very bottom the last section may be too short to reach the
      // line; the reader is still plainly on it.
      if (max > 0 && window.scrollY >= max - 2) {
        current = items[items.length - 1]?.id ?? current;
      }

      setActiveId(current);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return { activeId, progress };
};
