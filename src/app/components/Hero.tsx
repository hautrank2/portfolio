import { ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "~/components/ui/button";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { profileData, stackData } from "~/data/site";

function Hero() {
  return (
    <section id="banner" className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-8 lg:px-16 lg:pb-24 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <Reveal>
            <p className="surface inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <MapPin size={14} className="text-primary" />
              {profileData.role} · {profileData.location}
            </p>

            <Typography
              variant="h1"
              className="mt-6 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl xl:text-8xl"
            >
              <span className="block text-2xl font-medium normal-case tracking-normal text-muted-foreground sm:text-3xl">
                I am
              </span>
              <span className="text-gradient block">{profileData.name}</span>
            </Typography>

            <Typography
              variant="p"
              className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80 sm:text-xl"
            >
              {profileData.tagline}
            </Typography>

            <div className="mt-8 flex flex-wrap gap-2">
              {stackData.map((stack) => (
                <span
                  key={stack.title}
                  className="surface rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium"
                >
                  {stack.title}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group rounded-full">
                <Link href="/showcase">
                  View showcase
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full"
              >
                <Link href="/about">More about me</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={120} className="order-first lg:order-none">
            <div className="relative mx-auto w-fit">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full bg-primary/25 blur-3xl"
              />
              <div className="relative rounded-full bg-gradient-to-br from-primary via-primary/40 to-transparent p-[3px]">
                <Image
                  className="size-48 rounded-full object-cover sm:size-64 lg:size-80"
                  src={profileData.avatar}
                  alt={profileData.name}
                  width={320}
                  height={320}
                  priority
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default Hero;
