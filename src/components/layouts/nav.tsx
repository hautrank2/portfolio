import Link from "next/link";
import React from "react";
import { cn } from "~/lib/utils";

function Nav({}) {
  const navs = [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Experiences",
      href: "#experiences",
    },
    {
      title: "Projects",
      href: "#projects",
    },
    {
      title: "Contact",
      href: "#contact",
    },
  ];
  const classLink = "hover:bg-primary/10 active:bg-primary/10";

  return (
    <div className="header-extra">
      <div className="items-center hidden md:flex gap-2">
        {navs.map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className={cn("px-4 py-2", classLink)}
          >
            <h4 className="text-2xl">{nav.title}</h4>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Nav;
