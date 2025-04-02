import { Minus, Plus } from "lucide-react";
import React, { ComponentProps, forwardRef } from "react";
import { cn } from "~/lib/utils";

type Props = ComponentProps<"input"> & {
  onValueChange?: (d: number) => void;
};

const QuantityInput = forwardRef<HTMLInputElement, Props>(
  ({ onValueChange, disabled, ...props }, ref) => {
    const { min, max, value } = props;

    const disableMin =
      disabled ||
      (min !== undefined &&
        value !== undefined &&
        value !== null &&
        +value <= +min);

    const disableMax =
      disabled ||
      (max !== undefined &&
        value !== undefined &&
        value !== null &&
        +value >= +max);

    const btnClassName = "p-2";
    const btnAction = "hover:font-bold hover:cursor-pointer";
    return (
      <div className={cn("flex items-center")}>
        <div
          className={cn(btnClassName, disableMin ? "" : btnAction)}
          onClick={() =>
            !disableMin && onValueChange?.(+(props.value || 0) - 1)
          }
        >
          <Minus size={12} />
        </div>
        <p>{props.value}</p>
        <div
          className={cn(btnClassName, disableMax ? "" : btnAction)}
          onClick={() =>
            !disableMax && onValueChange?.(+(props.value || 0) + 1)
          }
        >
          <Plus size={12} />
        </div>
      </div>
    );
  }
);

QuantityInput.displayName = "QuantityInput";

export { QuantityInput };
