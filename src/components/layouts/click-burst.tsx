"use client";

import { useEffect, useRef } from "react";

type Ray = { angle: number; length: number };

type Burst = {
  x: number;
  y: number;
  rays: Ray[];
  color: string;
  /** Milliseconds lived so far. */
  age: number;
};

const RAY_COUNT = 8;
const LIFE_MS = 420;
// Gap between the click point and where a ray starts.
const INNER_RADIUS = 6;
const TRAVEL = 12;
// Long and short rays alternate, so the spark is not a perfect asterisk.
const RAY_LENGTHS = [11, 7];
// The tail leaves this far into the animation, which is what makes each ray
// read as a stroke flying outwards rather than a line that just fades.
const TAIL_DELAY = 0.3;
// A hard cap, so mashing the mouse cannot pile up work.
const MAX_BURSTS = 24;
const FALLBACK_COLOR = "#3b82f6";

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/**
 * A small spark wherever the page is clicked: a few short strokes in the
 * theme's primary colour that shoot outwards and vanish. One fixed canvas over
 * everything, drawn only while a spark is alive — an idle page costs nothing.
 * It never takes pointer events, and it stays off entirely for people who
 * asked their system for reduced motion.
 */
export const ClickBurst = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bursts: Burst[] = [];
    let frame = 0;
    let last = 0;

    const resize = () => {
      // Backing store in device pixels so the strokes stay crisp on HiDPI.
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      // Clamp the step: after a background tab wakes up, `now - last` is huge.
      const delta = Math.min(now - last, 32);
      last = now;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.lineWidth = 2;
      context.lineCap = "round";

      bursts = bursts.filter((burst) => (burst.age += delta) < LIFE_MS);
      for (const burst of bursts) {
        const progress = burst.age / LIFE_MS;
        const head = easeOut(progress);
        const tail = easeOut(Math.max(0, progress - TAIL_DELAY) / (1 - TAIL_DELAY));

        context.globalAlpha = 1 - progress ** 2;
        context.strokeStyle = burst.color;
        context.beginPath();
        for (const ray of burst.rays) {
          const reach = TRAVEL + ray.length;
          const from = INNER_RADIUS + tail * reach;
          const to = INNER_RADIUS + head * reach;
          const cos = Math.cos(ray.angle);
          const sin = Math.sin(ray.angle);
          context.moveTo(burst.x + cos * from, burst.y + sin * from);
          context.lineTo(burst.x + cos * to, burst.y + sin * to);
        }
        context.stroke();
      }
      context.globalAlpha = 1;

      frame = bursts.length > 0 ? requestAnimationFrame(draw) : 0;
    };

    const burst = (event: PointerEvent) => {
      // Primary button / touch only, and never for reduced-motion users.
      if (event.button !== 0 || reducedMotion.matches) return;

      // Read per click, so the spark follows a theme switch.
      const color =
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
        FALLBACK_COLOR;
      // Each spark is turned a little differently, so repeats do not look stamped.
      const rotation = Math.random() * Math.PI * 2;

      bursts.push({
        x: event.clientX,
        y: event.clientY,
        rays: Array.from({ length: RAY_COUNT }, (_, index) => ({
          angle: rotation + (index / RAY_COUNT) * Math.PI * 2,
          length: RAY_LENGTHS[index % RAY_LENGTHS.length],
        })),
        color,
        age: 0,
      });
      if (bursts.length > MAX_BURSTS) {
        bursts = bursts.slice(-MAX_BURSTS);
      }

      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    // Capture phase: a component that stops propagation still gets its spark.
    window.addEventListener("pointerdown", burst, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", burst, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-100 size-full print:hidden"
    />
  );
};
