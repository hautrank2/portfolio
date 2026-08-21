import * as React from "react";

/**
 * Calls `handler` when a pointer or touch lands outside `ref`.
 *
 * Listens on `mousedown`/`touchstart` rather than `click`: by the time a click
 * completes the element underneath may already have been unmounted, which makes
 * `contains()` report a false negative and the dismissal never fire.
 */
function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  // Keeps the effect from re-subscribing on every render when the caller
  // passes an inline arrow function, which is the normal way to use this.
  const savedHandler = React.useRef(handler);

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      savedHandler.current(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);
}

export { useOnClickOutside };
