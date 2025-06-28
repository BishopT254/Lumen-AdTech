"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const scrollAreaVariants = cva("relative overflow-hidden", {
  variants: {
    size: {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
    },
    variant: {
      default: "bg-background",
      secondary: "bg-muted",
      outline: "border border-input",
    },
    shadow: {
      none: "",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
    shadow: "none",
  },
})

interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
    VariantProps<typeof scrollAreaVariants> {
  viewportRef?: React.RefObject<HTMLDivElement>
  orientation?: "vertical" | "horizontal" | "both"
  scrollHideDelay?: number
  type?: "auto" | "always" | "scroll" | "hover"
  hideScrollbar?: boolean
}

const ScrollArea = React.forwardRef<React.ElementRef<typeof ScrollAreaPrimitive.Root>, ScrollAreaProps>(
  (
    {
      className,
      children,
      viewportRef,
      orientation = "vertical",
      scrollHideDelay = 600,
      type = "hover",
      hideScrollbar = false,
      size,
      variant,
      shadow,
      ...props
    },
    ref,
  ) => {
    const [scrollPosition, setScrollPosition] = React.useState({ x: 0, y: 0 })
    const [isScrolling, setIsScrolling] = React.useState(false)
    const scrollTimeout = React.useRef<NodeJS.Timeout>()

    // Handle scroll events
    const handleScroll = React.useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        const target = event.target as HTMLDivElement
        setScrollPosition({
          x: target.scrollLeft,
          y: target.scrollTop,
        })

        // Show scrollbar
        setIsScrolling(true)

        // Hide scrollbar after delay
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }
        scrollTimeout.current = setTimeout(() => {
          setIsScrolling(false)
        }, scrollHideDelay)
      },
      [scrollHideDelay],
    )

    // Cleanup timeout
    React.useEffect(() => {
      return () => {
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }
      }
    }, [])

    // Keyboard navigation
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        const target = event.currentTarget
        const scrollAmount = 100 // Pixels to scroll

        switch (event.key) {
          case "ArrowUp":
            if (orientation !== "horizontal") {
              target.scrollTop -= scrollAmount
              event.preventDefault()
            }
            break
          case "ArrowDown":
            if (orientation !== "horizontal") {
              target.scrollTop += scrollAmount
              event.preventDefault()
            }
            break
          case "ArrowLeft":
            if (orientation !== "vertical") {
              target.scrollLeft -= scrollAmount
              event.preventDefault()
            }
            break
          case "ArrowRight":
            if (orientation !== "vertical") {
              target.scrollLeft += scrollAmount
              event.preventDefault()
            }
            break
          case "PageUp":
            if (orientation !== "horizontal") {
              target.scrollTop -= target.clientHeight
              event.preventDefault()
            }
            break
          case "PageDown":
            if (orientation !== "horizontal") {
              target.scrollTop += target.clientHeight
              event.preventDefault()
            }
            break
          case "Home":
            if (orientation !== "horizontal") {
              target.scrollTop = 0
              event.preventDefault()
            }
            break
          case "End":
            if (orientation !== "horizontal") {
              target.scrollTop = target.scrollHeight
              event.preventDefault()
            }
            break
        }
      },
      [orientation],
    )

    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn(scrollAreaVariants({ size, variant, shadow }), className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className="h-full w-full rounded-[inherit]"
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>

        {!hideScrollbar && (orientation === "vertical" || orientation === "both") && (
          <ScrollAreaPrimitive.Scrollbar
            orientation="vertical"
            className={cn(
              "flex select-none touch-none transition-colors",
              "data-[orientation=vertical]:w-2.5 data-[orientation=vertical]:h-full",
              "data-[orientation=vertical]:border-l border-l-transparent",
              "hover:bg-muted/50",
              type === "always" && "opacity-100",
              type === "scroll" && "opacity-0 data-[state=visible]:opacity-100",
              type === "hover" && "opacity-0 hover:opacity-100",
              type === "auto" && isScrolling ? "opacity-100" : "opacity-0",
            )}
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(
                "relative flex-1 rounded-full bg-border",
                "before:absolute before:top-1/2 before:left-1/2",
                "before:h-full before:min-h-[44px] before:w-full before:min-w-[44px]",
                "before:-translate-x-1/2 before:-translate-y-1/2",
              )}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        {!hideScrollbar && (orientation === "horizontal" || orientation === "both") && (
          <ScrollAreaPrimitive.Scrollbar
            orientation="horizontal"
            className={cn(
              "flex select-none touch-none transition-colors",
              "data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:w-full",
              "data-[orientation=horizontal]:border-t border-t-transparent",
              "hover:bg-muted/50",
              type === "always" && "opacity-100",
              type === "scroll" && "opacity-0 data-[state=visible]:opacity-100",
              type === "hover" && "opacity-0 hover:opacity-100",
              type === "auto" && isScrolling ? "opacity-100" : "opacity-0",
            )}
          >
            <ScrollAreaPrimitive.Thumb
              className={cn(
                "relative flex-1 rounded-full bg-border",
                "before:absolute before:top-1/2 before:left-1/2",
                "before:h-full before:min-h-[44px] before:w-full before:min-w-[44px]",
                "before:-translate-x-1/2 before:-translate-y-1/2",
              )}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        {/* Scroll shadows */}
        {(orientation === "vertical" || orientation === "both") && scrollPosition.y > 0 && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none" />
        )}
        {(orientation === "vertical" || orientation === "both") && scrollPosition.y < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
        {(orientation === "horizontal" || orientation === "both") && scrollPosition.x > 0 && (
          <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        )}
        {(orientation === "horizontal" || orientation === "both") && scrollPosition.x < 100 && (
          <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        )}

        <ScrollAreaPrimitive.Corner className="bg-muted" />
      </ScrollAreaPrimitive.Root>
    )
  },
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

export { ScrollArea }

