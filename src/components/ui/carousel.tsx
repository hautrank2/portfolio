"use client"

import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"

type CarouselApiType = UseEmblaCarouselType[1]
type CarouselParametersType = Parameters<typeof useEmblaCarousel>
type CarouselOptionsType = CarouselParametersType[0]
type CarouselPluginType = CarouselParametersType[1]
type CarouselOrientationEnum = "horizontal" | "vertical"

type CarouselPropsType = {
  opts?: CarouselOptionsType
  plugins?: CarouselPluginType
  orientation?: CarouselOrientationEnum
  setApi?: (api: CarouselApiType) => void
}

type CarouselContextType = CarouselPropsType & {
  carouselRef: UseEmblaCarouselType[0]
  api: CarouselApiType
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  selectedIndex: number
  slideCount: number
}

const CarouselContext = React.createContext<CarouselContextType | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselPropsType) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const subscribeToSelect = React.useCallback(
    (onStoreChange: () => void) => {
      if (!api) return () => {}
      api.on("reInit", onStoreChange)
      api.on("select", onStoreChange)

      return () => {
        api.off("reInit", onStoreChange)
        api.off("select", onStoreChange)
      }
    },
    [api]
  )

  const canScrollPrev = React.useSyncExternalStore(
    subscribeToSelect,
    () => api?.canScrollPrev() ?? false,
    () => false
  )
  const canScrollNext = React.useSyncExternalStore(
    subscribeToSelect,
    () => api?.canScrollNext() ?? false,
    () => false
  )
  // Both snapshots stay primitives so useSyncExternalStore can compare them.
  const selectedIndex = React.useSyncExternalStore(
    subscribeToSelect,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0
  )
  const slideCount = React.useSyncExternalStore(
    subscribeToSelect,
    () => api?.scrollSnapList().length ?? 0,
    () => 0
  )

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        selectedIndex,
        slideCount,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-10 rounded-full border-border/60 bg-background/50 backdrop-blur",
        "transition-colors hover:border-primary/60 hover:bg-background/80 hover:text-primary",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-10 rounded-full border-border/60 bg-background/50 backdrop-blur",
        "transition-colors hover:border-primary/60 hover:bg-background/80 hover:text-primary",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

function CarouselDots({ className, ...props }: React.ComponentProps<"div">) {
  const { api, selectedIndex, slideCount } = useCarousel()

  if (slideCount <= 1) return null

  return (
    <div
      data-slot="carousel-dots"
      className={cn("flex items-center justify-center gap-2", className)}
      {...props}
    >
      {Array.from({ length: slideCount }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === selectedIndex}
          onClick={() => api?.scrollTo(index)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === selectedIndex
              ? "w-6 bg-primary"
              : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
          )}
        />
      ))}
    </div>
  )
}

export {
  type CarouselApiType,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
}
