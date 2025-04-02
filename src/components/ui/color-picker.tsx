import React, { ComponentProps, forwardRef } from "react";
import { cn } from "~/lib/utils";

const ColorPicker = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="color"
        className={cn(
          "p-1 h-10 w-14 block bg-white border border-gray-200 cursor-pointer rounded-lg disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700",
          className
        )}
        id="hs-color-input"
        value="#2563eb"
        title="Choose your color"
        ref={ref}
        {...props}
      />
    );
  }
);

ColorPicker.displayName = "ColorPicker";

export { ColorPicker };
