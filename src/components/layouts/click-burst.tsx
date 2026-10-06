"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  /** Milliseconds lived so far. */
  age: number;
  life: number;
};

type Ring = { x: number; y: number; age: number; color: string };

// Fallback sparks beside the theme's primary colour.
const ACCENTS = ["#fbbf24", "#fb7185", "#34d399", "#a78bfa"];

const PARTICLES_PER_CLICK = 16;
const RING_LIFE_MS = 380;
const GRAVITY = 0.0012; // px per ms²
const DRAG = 0.996; // velocity kept per ms
// A hard cap, so mashing the mouse cannot pile up work.
const MAX_PARTICLES = 320;

/**
 * A small burst of sparks wherever the page is clicked. One fixed canvas over
 * everything, drawn only while something is still flying — an idle page costs
 * nothing. It never takes pointer events, and it stays off entirely for people
 * who asked their system for reduced motion.
 */
export const ClickBurst = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles: Particle[] = [];
    let rings: Ring[] = [];
    let frame = 0;
    let last = 0;

    const resize = () => {
      // Backing store in device pixels so the sparks stay crisp on HiDPI.
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

      rings = rings.filter((ring) => (ring.age += delta) < RING_LIFE_MS);
      for (const ring of rings) {
        const progress = ring.age / RING_LIFE_MS;
        context.globalAlpha = (1 - progress) * 0.6;
        context.strokeStyle = ring.color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(ring.x, ring.y, 6 + progress * 28, 0, Math.PI * 2);
        context.stroke();
      }

      particles = particles.filter((particle) => (particle.age += delta) < particle.life);
      for (const particle of particles) {
        const drag = DRAG ** delta;
        particle.vx *= drag;
        particle.vy = particle.vy * drag + GRAVITY * delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        const remaining = 1 - particle.age / particle.life;
        context.globalAlpha = remaining;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * remaining, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;

      frame =
        particles.length > 0 || rings.length > 0 ? requestAnimationFrame(draw) : 0;
    };

    const burst = (event: PointerEvent) => {
      // Primary button / touch only, and never for reduced-motion users.
      if (event.button !== 0 || reducedMotion.matches) return;

      const primary =
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
        ACCENTS[0];
      const colors = [primary, primary, ...ACCENTS];

      for (let index = 0; index < PARTICLES_PER_CLICK; index++) {
        // Spread evenly round the circle, then jitter so it does not look drawn.
        const angle =
          (index / PARTICLES_PER_CLICK) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const speed = 0.12 + Math.random() * 0.28; // px per ms
        particles.push({
          x: event.clientX,
          y: event.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.05,
          size: 2 + Math.random() * 2.5,
          color: colors[index % colors.length],
          age: 0,
          life: 420 + Math.random() * 320,
        });
      }
      if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(-MAX_PARTICLES);
      }
      rings.push({ x: event.clientX, y: event.clientY, age: 0, color: primary });

      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    // Capture phase: a component that stops propagation still gets its burst.
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
