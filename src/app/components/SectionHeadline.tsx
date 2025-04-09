"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Typography } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

function SectionHeadline({ title, href }: { title: string; href: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="mb-4 border-b">
      <Link href={`#${href}`}>
        <Typography
          variant="h1"
          className="hover:text-primary w-fit hover:cursor-pointer"
          onMouseOver={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {title}{" "}
          <span
            className={cn(
              "transition-all duration-400 ease opacity-0",
              hover && "opacity-100"
            )}
          >
            #
          </span>
        </Typography>
      </Link>
    </div>
  );
}

export default SectionHeadline;
