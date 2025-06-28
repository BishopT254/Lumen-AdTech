// @/components/ui/drawer.tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const DrawerVariants = cva(
  "fixed bg-background shadow-lg transition-transform duration-300 ease-in-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b",
        right: "inset-y-0 right-0 h-full border-l",
        bottom: "inset-x-0 bottom-0 border-t",
        left: "inset-y-0 left-0 h-full border-r",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

const DrawerOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in",
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = "DrawerOverlay"

export interface DrawerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof DrawerVariants> {
  open?: boolean
  onClose?: () => void
  closeOnClickOutside?: boolean
  closeOnEsc?: boolean
  children?: React.ReactNode
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  (
    {
      className,
      children,
      side,
      open,
      onClose,
      closeOnClickOutside = true,
      closeOnEsc = true,
      ...props
    },
    ref
  ) => {
    // Handle ESC key press
    React.useEffect(() => {
      if (!closeOnEsc) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if (open && e.key === "Escape") {
          onClose?.()
        }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [open, onClose, closeOnEsc])
    
    // Prevent body scroll when drawer is open
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = ""
      }
      return () => {
        document.body.style.overflow = ""
      }
    }, [open])

    if (!open) return null

    return (
      <>
        <DrawerOverlay
          onClick={closeOnClickOutside ? onClose : undefined}
          data-state={open ? "open" : "closed"}
        />
        <div
          ref={ref}
          className={cn(
            "fixed z-50 w-full outline-none",
            side === "left" || side === "right" ? "max-w-sm" : "",
            side === "top" ? "h-1/3" : "",
            side === "bottom" ? "h-1/3" : "",
            DrawerVariants({ side }),
            side === "top" && open ? "translate-y-0" : "",
            side === "top" && !open ? "-translate-y-full" : "",
            side === "right" && open ? "translate-x-0" : "",
            side === "right" && !open ? "translate-x-full" : "",
            side === "bottom" && open ? "translate-y-0" : "",
            side === "bottom" && !open ? "translate-y-full" : "",
            side === "left" && open ? "translate-x-0" : "",
            side === "left" && !open ? "-translate-x-full" : "",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          data-state={open ? "open" : "closed"}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)
Drawer.displayName = "Drawer"

const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-full flex-col overflow-y-auto", className)}
    {...props}
  />
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClose?: () => void
    showCloseButton?: boolean
  }
>(({ className, children, onClose, showCloseButton = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">{children}</div>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full p-1.5 hover:bg-muted"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
))
DrawerHeader.displayName = "DrawerHeader"

const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DrawerTitle.displayName = "DrawerTitle"

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = "DrawerDescription"

const DrawerFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4 sm:p-6", className)}
    {...props}
  />
))
DrawerFooter.displayName = "DrawerFooter"

export {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
}