import { useEffect, useRef } from "react";

export const useThemeEffects = () => {
  const light = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (event: PointerEvent) => {
      if (motion.matches || !finePointer.matches) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        light.current?.style.setProperty("--pointer-x", `${x}px`);
        light.current?.style.setProperty("--pointer-y", `${y}px`);
        frame = 0;
      });
    };
    const scroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${height > 0 ? window.scrollY / height : 0})`;
    };
    const resize = new ResizeObserver(scroll);
    resize.observe(document.body);
    scroll();
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
    };
  }, []);

  return { light, progress };
};
