"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Typography } from "~/components/ui/typography";
import { customDemoData } from "~/data/demos";
import { useDemoHlsjs } from "./hook";

const SLUG = "hlsjs";

// Title and description come from the same entry the `/demo` card reads, so
// the two cannot drift apart.
const demo = customDemoData.find((item) => item.slug === SLUG);

export default function HlsjsDemoPage() {
  const { videoRef, url } = useDemoHlsjs();
  if (!demo) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:py-16">
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

      <header className="mt-10">
        <Typography
          variant="h1"
          className="text-gradient text-3xl font-extrabold leading-tight sm:text-4xl"
        >
          {demo.title}
        </Typography>
        <Typography variant="p" className="mt-4 text-lg text-foreground/70">
          {demo.description}
        </Typography>
      </header>

      <div className="mt-8">
        <video ref={videoRef} className="h-120 w-full bg-black rounded-lg" />
      </div>
    </div>
  );
}
