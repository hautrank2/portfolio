"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { Typography } from "~/components/ui/typography";
import { customDemoData } from "~/data/demos";
import { useDemoHlsjs, useDemoStats } from "./hook";
import { StatsSidebar } from "./stats-sidebar";

const SLUG = "hlsjs";
const GRID_SIZES = [4, 6, 8, 10, 12];

// Title and description come from the same entry the `/demo` card reads, so
// the two cannot drift apart.
const demo = customDemoData.find((item) => item.slug === SLUG);

export default function HlsjsDemoPage() {
  const [gridSize, setGridSize] = useState(8);
  const { gridRef, history } = useDemoStats();
  if (!demo) notFound();

  return (
    <div className="mx-auto mt-4 w-full max-w-[2560px] px-4 sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50"
      >
        <Link href="/demo" className="transition-colors hover:text-primary">
          Demo
        </Link>
        <ChevronRight size={12} className="text-foreground/25" />
        <span>{demo.slug}</span>
      </nav>

      <header className="mt-2">
        <Typography variant="p" className="mt-4 text-lg text-foreground/70">
          Demo xử lý luồng stream camera bằng thư viện hls.js và cách để chúng
          mượt mà, không giật lag khi phát nhiều video cùng lúc. Mỗi video được
          phát trong một thẻ video riêng, mỗi thẻ video có một instance hls.js
          riêng.
        </Typography>
      </header>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {GRID_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setGridSize(size)}
                aria-pressed={size === gridSize}
                className={`rounded-md border px-3 py-1 transition-colors ${
                  size === gridSize
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-foreground/15 text-foreground/70 hover:text-primary"
                }`}
              >
                {size} × {size}
              </button>
            ))}
            <span className="text-foreground/50">
              {gridSize * gridSize} video
            </span>
          </div>

          <div
            ref={gridRef}
            className="mt-4 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: gridSize * gridSize }, (_, index) => (
              <HlsVideo key={index} />
            ))}
          </div>
        </div>

        <StatsSidebar history={history} />
      </div>
    </div>
  );
}

// Each tile calls the hook itself, so every video gets its own Hls instance.
function HlsVideo() {
  const { videoRef } = useDemoHlsjs();

  return (
    <video
      ref={videoRef}
      className="aspect-video w-full bg-black rounded"
      autoPlay
      muted
      loop
      playsInline
    />
  );
}
