import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { profile, socials } from "~/data/site";
import { Typography } from "~/components/ui/typography";

function Footer() {
  return (
    <footer
      id="contact"
      className="relative mt-24 border-t border-border/60 bg-primary/5"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Contact
        </p>
        <Typography
          variant="h1"
          className="mt-4 max-w-2xl text-3xl leading-tight sm:text-4xl"
        >
          Have something useful to build? <br />
          <span className="text-gradient">Let&apos;s talk about it.</span>
        </Typography>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {socials.map((social) => (
            <Link
              key={social.title}
              href={social.href}
              target={social.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group surface flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/60"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {social.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {social.handle}
                </span>
              </span>
              <ArrowUpRight
                size={16}
                className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {profile.name}. Built with Next.js.
          </span>
          <span>{profile.location}</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
