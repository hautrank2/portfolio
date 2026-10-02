import { Images } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Reveal } from "~/components/ui/reveal";
import { Typography } from "~/components/ui/typography";
import { experienceData } from "~/data/experiences";
import type { ExperienceModel } from "~/types";

function Experiences() {
  return (
    <ol className="relative mt-10 space-y-6 border-s border-border/60 ps-6 sm:ps-10">
      {experienceData.map((exp, index) => (
        <li key={exp.company} className="relative">
          <span
            aria-hidden
            className="absolute -start-[1.9rem] top-7 size-3 rounded-full bg-primary ring-4 ring-primary/20 sm:-start-[2.9rem]"
          />
          <Reveal delay={index * 100}>
            <Exp exp={exp} />
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

type ExpPropsType = {
  exp: ExperienceModel;
};

const Exp = ({ exp }: ExpPropsType) => {
  return (
    <div className="surface rounded-2xl border border-border/60 p-6 transition-colors hover:border-primary/50 sm:p-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href={exp.href}
          className="min-w-0"
        >
          <Typography
            variant="h2"
            className="pb-0 text-xl transition-colors hover:text-primary sm:text-2xl"
          >
            {exp.company}
          </Typography>
        </Link>

        {exp.photos.length > 0 && (
          <Dialog>
            <DialogTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary">
              <Images size={14} />
              {exp.photos.length} photos
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl bg-transparent!">
              {/*
               * Decorative sheen. Negative z-index keeps it above the panel's own
               * translucent background but behind the content, so nothing here can
               * cover the children or swallow a click.
               */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-primary/15 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-10 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              />
              <DialogHeader>
                <DialogTitle>{exp.company}</DialogTitle>
                <DialogDescription>{exp.duration}</DialogDescription>
              </DialogHeader>

              <Carousel className="mt-2">
                <CarouselContent>
                  {exp.photos.map((photo) => (
                    <CarouselItem key={photo.imageUrl}>
                      <figure className="overflow-hidden rounded-xl border border-border/60 bg-background/30">
                        <div className="relative aspect-[4/3] max-h-[52vh] w-full">
                          <Image
                            alt={photo.title}
                            fill
                            sizes="(min-width: 640px) 42rem, 100vw"
                            src={photo.imageUrl}
                            className="object-contain"
                          />
                        </div>
                        <figcaption className="border-t border-border/60 bg-background/40 px-4 py-3">
                          <Typography variant="h5" className="text-base">
                            {photo.title}
                          </Typography>
                          <Typography
                            variant="small"
                            className="mt-0.5 block text-muted-foreground"
                          >
                            {photo.description}
                          </Typography>
                        </figcaption>
                      </figure>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* Controls sit below the frame so they never cover the photo. */}
                <div className="mt-4 flex items-center justify-center gap-4">
                  <CarouselPrevious className="static size-9 translate-y-0" />
                  <CarouselDots />
                  <CarouselNext className="static size-9 translate-y-0" />
                </div>
              </Carousel>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">{exp.role}</span>
        <span aria-hidden>·</span>
        <span>{exp.duration}</span>
      </p>

      <Typography variant="p" className="mt-4 text-foreground/80">
        {exp.des}
      </Typography>
    </div>
  );
};

export default Experiences;
