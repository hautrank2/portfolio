import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";

function AboutCta() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-16">
      <Reveal className="relative overflow-hidden rounded-3xl border border-primary/40 bg-primary/10 p-8 sm:p-12">
        <div
          aria-hidden
          className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]"
        />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Typography variant="h2" className="pb-0 text-2xl sm:text-3xl">
              Curious who is behind the code?
            </Typography>
            <Typography variant="p" className="mt-3 text-foreground/80">
              Where I studied, how I ended up doing frontend, and the kind of
              websites I like to build.
            </Typography>
          </div>
          <Button asChild size="lg" className="group shrink-0 rounded-full">
            <Link href="/about">
              About me
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}

export default AboutCta;
