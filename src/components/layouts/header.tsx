import React from "react";
import { Typography } from "../ui/typography";

async function Header() {
  return (
    <header className="flex justify-between items-center w-full fixed top-0 h-16 px-16 border-b z-20 bg-background/90">
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
