"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

type RevealPropsType = React.ComponentProps<"div"> & {
  /** Stagger the entrance, in milliseconds. */
  delay?: number;
};

/**
 * Fades its children in the first time they scroll into view. Replaces the old
 * `public/js/app.js` observer, which only ran on the initial page load and so
 * left sections invisible after a client-side navigation.
 */
function Reveal({ className, delay = 0, style, ...props }: RevealPropsType) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    // Already on screen at mount (above the fold, or a mid-page anchor): show it
    // straight away. IntersectionObserver only reports while the tab is being
    // rendered, so waiting on it would leave this content hidden in a
    // background tab.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      data-reveal=""
      data-visible={visible}
      className={cn(className)}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as React.CSSProperties}
      {...props}
    />
  );
}

export { Reveal };
