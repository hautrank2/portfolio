"use client";

import React, { useEffect, useState } from "react";
import { Typography } from "../ui/typography";
import { cn } from "~/lib/utils";

function Header() {
  const headerHeight = 64;
  const [headerBg, setHeaderBg] = useState(false);

  useEffect(() => {
    const trackingScroll = () => {
      if (window.scrollY > headerHeight + 20) {
        setHeaderBg(true);
      } else {
        setHeaderBg(false);
      }
    };

    trackingScroll();
    window.addEventListener("scroll", trackingScroll);

    return () => {
      window.removeEventListener("scroll", trackingScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "flex justify-between items-center w-full fixed top-0 h-16 px-16 border-b z-20",
        "transition-colors easy duration-500",
        headerBg ? "bg-background/90" : ""
      )}
    >
      <div className="header-branch">
        <Typography variant={"h3"}>
          <span className="font-light">Portfolio</span> |{" "}
          <span className="bg-foreground text-background rounded-full px-4">
            hautrank2
          </span>
        </Typography>
      </div>
      <div className="header-search px-16"></div>
      <div className="header-extra flex items-center gap-4"></div>
    </header>
  );
}

export default Header;
