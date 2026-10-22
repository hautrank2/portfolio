"use client";

import { useSiteFrame } from "./hook";
import type { SiteFrameProps } from "./type";

export const SiteFrame = ({ children, header, footer, effects }: SiteFrameProps) => {
  const { standalone } = useSiteFrame();

  if (standalone) return <main>{children}</main>;

  return (
    <>
      {header}
      <main className="pt-16 print:pt-0">{children}</main>
      {footer}
      {effects}
    </>
  );
};
