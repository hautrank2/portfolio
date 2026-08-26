import Link from "next/link";
import React from "react";
import { Reveal } from "~/components/ui/reveal";
import { experienceData } from "~/data/experiences";
import { profileData } from "~/data/site";

const current = experienceData[0];

const facts = [
  {
    label: "Now",
    value: current.company,
    detail: current.role,
    href: current.href,
  },
  {
    label: "Studied at",
    value: profileData.university.name,
    detail: "Software Engineering",
    href: profileData.university.href,
  },
  {
    label: "Based in",
    value: "Ho Chi Minh City",
    detail: "Vietnam",
  },
];

function QuickFacts() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-16">
      <Reveal className="surface grid gap-px overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-3">
        {facts.map((fact) => {
          const body = (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {fact.label}
              </span>
              <span className="mt-2 block text-lg font-semibold group-hover:text-primary">
                {fact.value}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {fact.detail}
              </span>
            </>
          );

          return fact.href ? (
            <Link
              key={fact.label}
              href={fact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group border-border/60 p-6 transition-colors hover:bg-primary/5 sm:border-l sm:first:border-l-0"
            >
              {body}
            </Link>
          ) : (
            <div
              key={fact.label}
              className="group border-border/60 p-6 sm:border-l sm:first:border-l-0"
            >
              {body}
            </div>
          );
        })}
      </Reveal>
    </div>
  );
}

export default QuickFacts;
