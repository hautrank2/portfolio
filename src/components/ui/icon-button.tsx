"use client"

import { AnimatePresence, motion, type Transition } from "motion/react"
import * as React from "react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export interface IconButtonProps extends Omit<React.ComponentProps<typeof Button>, "color"> {
  icon: React.ElementType
  active?: boolean
  animate?: boolean
  /** CSS color for the icon fill, glow, and particles. Defaults to the
   *  theme's primary color so the button adapts to the active preset. */
  color?: string
  transition?: Transition
}

export function IconButton({
  icon: Icon,
  className,
  active = false,
  animate = true,
  color = "var(--primary)",
  size = "icon",
  transition = { type: "spring", stiffness: 300, damping: 15 },
  ...props
}: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      size={size}
      variant="ghost"
      className={cn(
        "relative rounded-full text-[var(--icon-button-color)]",
        "hover:bg-[var(--icon-button-color)]/10 hover:text-[var(--icon-button-color)] active:bg-[var(--icon-button-color)]/20",
        className,
      )}
      style={{ "--icon-button-color": color } as React.CSSProperties}
      {...props}
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 stroke-muted-foreground group-hover/button:stroke-[var(--icon-button-color)]"
      >
        {React.createElement(Icon as React.ComponentType<{ className?: string }>, {
          className: active ? "fill-[var(--icon-button-color)]" : "fill-transparent",
        })}
      </span>

      <AnimatePresence mode="wait">
        {active && (
          <motion.span
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-[var(--icon-button-color)] text-[var(--icon-button-color)]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={transition}
          >
            {React.createElement(Icon as React.ComponentType<unknown>)}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {animate && active && (
          <>
            <motion.span
              aria-hidden
              className="absolute inset-0 z-10 rounded-full"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: [1.2, 1.8, 1.2], opacity: [0, 0.3, 0] }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklch, var(--icon-button-color) 40%, transparent) 0%, transparent 70%)",
              }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 z-10 rounded-full"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                boxShadow:
                  "0 0 10px 2px color-mix(in oklch, var(--icon-button-color) 60%, transparent)",
              }}
            />
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.span
                aria-hidden
                key={i}
                className="absolute h-1 w-1 rounded-full bg-[var(--icon-button-color)]"
                initial={{ x: "50%", y: "50%", scale: 0, opacity: 0 }}
                animate={{
                  x: `calc(50% + ${Math.cos((i * Math.PI) / 3) * 30}px)`,
                  y: `calc(50% + ${Math.sin((i * Math.PI) / 3) * 30}px)`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </Button>
  )
}

export default IconButton
