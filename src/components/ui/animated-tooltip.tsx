"use client"

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { useRef, useState } from "react"

export interface AnimatedTooltipItem {
  id: number
  name: string
  designation: string
  image: string
}

export interface AnimatedTooltipProps {
  items: AnimatedTooltipItem[]
}

export const AnimatedTooltip = ({ items }: AnimatedTooltipProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const springConfig = { stiffness: 100, damping: 15 }
  const x = useMotionValue(0)
  const animationFrameRef = useRef<number | null>(null)

  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig)
  const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig)

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Read the geometry now — the event is pooled and `nativeEvent` must not be
    // touched inside the deferred frame callback.
    const halfWidth = event.currentTarget.offsetWidth / 2
    const offsetX = event.nativeEvent.offsetX

    animationFrameRef.current = requestAnimationFrame(() => {
      x.set(offsetX - halfWidth)
    })
  }

  return (
    <>
      {items.map((item) => (
        <div
          className="group relative -mr-4"
          key={item.name}
          role="button"
          tabIndex={0}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === item.id && (
              <motion.div
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                className="absolute -top-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs shadow-xl"
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX,
                  rotate,
                  whiteSpace: "nowrap",
                }}
              >
                <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
                <div className="relative z-30 text-base font-bold text-white">{item.name}</div>
                <div className="text-xs text-white">{item.designation}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <img
            alt={item.name}
            className="relative !m-0 h-14 w-14 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105"
            height={100}
            onMouseMove={handleMouseMove}
            src={item.image}
            width={100}
          />
        </div>
      ))}
    </>
  )
}

// Demo
const demoItems: AnimatedTooltipItem[] = [
  {
    id: 1,
    name: "John Doe",
    designation: "Software Engineer",
    image: "https://i.pravatar.cc/100?img=1",
  },
  {
    id: 2,
    name: "Jane Smith",
    designation: "Product Manager",
    image: "https://i.pravatar.cc/100?img=2",
  },
  { id: 3, name: "Bob Wilson", designation: "Designer", image: "https://i.pravatar.cc/100?img=3" },
  {
    id: 4,
    name: "Alice Brown",
    designation: "Data Scientist",
    image: "https://i.pravatar.cc/100?img=4",
  },
]

export function Demo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex">
        <AnimatedTooltip items={demoItems} />
      </div>
    </div>
  )
}
