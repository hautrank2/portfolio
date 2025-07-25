import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-semibold tracking-tight",
      h2: "scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight",
      p: "leading-6 text-foreground/80",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      small: "text-sm font-medium leading-none",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
}

function Typography({
  className,
  variant,
  asChild = false,
  ...props
}: TypographyProps) {
  const Comp = asChild ? Slot : variant || "p";

  return (
    <Comp
      data-slot="typography"
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Typography, typographyVariants };
