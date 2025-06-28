"use client"

import React, { useRef, useEffect, forwardRef, createContext, useContext, useState } from "react"
import { ChevronDownIcon, CheckIcon, ChevronRightIcon } from "@heroicons/react/24/solid"
import { cn } from "@/lib/utils"
import { useOnClickOutside } from "@/hooks/useClickOutside"
import { createPortal } from "react-dom"

type ReactNode = React.ReactNode

interface DropdownContextValue {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Context for the dropdown state
const DropdownContext = createContext<DropdownContextValue>({
  isOpen: false,
  onOpenChange: () => {},
})

interface DropdownSubContextValue {
  isSubOpen: boolean;
  onSubOpenChange: (open: boolean) => void;
}

// Context for the sub-dropdown state
const DropdownSubContext = createContext<DropdownSubContextValue>({
  isSubOpen: false,
  onSubOpenChange: () => {},
})

// Context for radio groups
interface DropdownRadioContextValue {
  value?: string;
  onValueChange: (value: string) => void;
}

const DropdownRadioContext = createContext<DropdownRadioContextValue>({
  value: undefined,
  onValueChange: () => {},
})

interface DropdownMenuProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(({ 
  children, 
  defaultOpen = false,
  open,
  onOpenChange,
  modal = false,
}, forwardedRef) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const ref = useRef<HTMLDivElement>(null)
  const mergedRef = useMergedRef(ref, forwardedRef)
  
  // Support controlled mode
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen

  // Handle controlled/uncontrolled state
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  // Close dropdown when clicking outside if not modal
  useOnClickOutside(ref, () => !modal && handleOpenChange(false))

  // Close dropdown when pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  return (
    <DropdownContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      <div className="relative inline-block text-left" ref={mergedRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
})

DropdownMenu.displayName = "DropdownMenu"

// Helper function to merge refs
function useMergedRef<T>(...refs: (React.Ref<T> | null | undefined)[]) {
  return React.useCallback((value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref != null) {
        (ref as React.MutableRefObject<T>).current = value
      }
    })
  }, [refs])
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
  [key: string]: any;
}

export const DropdownMenuTrigger = forwardRef<HTMLDivElement, DropdownMenuTriggerProps>(({
  children,
  className,
  asChild = false,
  ...props
}, ref) => {
  const { isOpen, onOpenChange } = useContext(DropdownContext)

  // If asChild is true, we should render the children with the props
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onOpenChange(!isOpen);
        children.props.onClick?.(e);
      },
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      'data-state': isOpen ? 'open' : 'closed',
      ref,
      ...props
    });
  }

  return (
    <div
      ref={ref}
      role="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      data-state={isOpen ? 'open' : 'closed'}
      onClick={(e) => {
        e.preventDefault();
        onOpenChange(!isOpen);
      }}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200",
        className,
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenChange(!isOpen)
        }
      }}
      {...props}
    >
      {children}
      <ChevronDownIcon className={cn(
        "ml-2 h-4 w-4 transition-transform duration-200",
        isOpen ? "transform rotate-180" : ""
      )} />
    </div>
  )
})

DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: "left" | "right" | "center";
  sideOffset?: number;
  alignOffset?: number;
  className?: string;
  forceMount?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onInteractOutside?: (event: MouseEvent | TouchEvent) => void;
  portal?: boolean;
  collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  avoidCollisions?: boolean;
  [key: string]: any;
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(({
  children,
  align = "left",
  sideOffset = 4,
  alignOffset = 0,
  className,
  forceMount,
  portal = false,
  onEscapeKeyDown,
  onInteractOutside,
  collisionPadding = 8,
  avoidCollisions = true,
  ...props
}, ref) => {
  const { isOpen } = useContext(DropdownContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen && !forceMount) return null

  const content = (
    <div
      ref={ref}
      role="menu"
      aria-orientation="vertical"
      data-state={isOpen ? 'open' : 'closed'}
      style={{
        marginTop: sideOffset,
        marginLeft: align === "center" ? alignOffset : undefined,
        marginRight: align === "center" ? alignOffset : undefined,
      }}
      className={cn(
        "absolute z-50 min-w-[8rem] w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        {
          "origin-top-right right-0": align === "right",
          "origin-top-left left-0": align === "left",
          "origin-top left-1/2 transform -translate-x-1/2": align === "center",
        },
        className,
      )}
      onKeyDown={(e) => {
        // Handle arrow key navigation
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault()
          
          const menuItems = Array.from(
            e.currentTarget.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]')
          ).filter(item => !(item as HTMLElement).hasAttribute('data-disabled')) as HTMLElement[]
          
          if (!menuItems.length) return
          
          const currentIndex = menuItems.findIndex(item => item === document.activeElement)
          
          if (e.key === "ArrowDown") {
            const nextIndex = currentIndex < 0 || currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1
            menuItems[nextIndex].focus()
          } else if (e.key === "ArrowUp") {
            const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1
            menuItems[prevIndex].focus()
          } else if (e.key === "Home") {
            menuItems[0].focus()
          } else if (e.key === "End") {
            menuItems[menuItems.length - 1].focus()
          }
        }
        
        if (e.key === "Escape") {
          e.preventDefault()
          onEscapeKeyDown?.(e)
        }
      }}
      {...props}
    >
      <div role="none" className="py-1">{children}</div>
    </div>
  )

  if (portal && mounted) {
    return createPortal(content, document.body)
  }

  return content
})

DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  className?: string;
  disabled?: boolean;
  destructive?: boolean;
  inset?: boolean;
  active?: boolean;
  icon?: ReactNode;
  textValue?: string;
  [key: string]: any;
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(({
  children,
  onClick,
  className,
  disabled = false,
  destructive = false,
  inset = false,
  active,
  icon,
  textValue,
  ...props
}, ref) => {
  const { onOpenChange } = useContext(DropdownContext)

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (disabled) return
    onClick?.(event)
    onOpenChange(false)
  }

  return (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled}
      data-disabled={disabled ? true : undefined}
      data-destructive={destructive ? true : undefined}
      data-active={active ? true : undefined}
      data-text-value={textValue}
      onClick={handleClick}
      className={cn(
        "relative cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150",
        {
          "opacity-50 cursor-not-allowed pointer-events-none": disabled,
          "text-red-600 hover:bg-red-50 focus:bg-red-50": destructive,
          "pl-8": inset,
          "bg-gray-100": active,
        },
        className,
      )}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          handleClick(e as unknown as React.MouseEvent<HTMLDivElement, MouseEvent>)
        }
      }}
      {...props}
    >
      {icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{icon}</span>}
      {children}
    </div>
  )
})

DropdownMenuItem.displayName = "DropdownMenuItem"

interface DropdownMenuCheckboxItemProps {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  textValue?: string;
  [key: string]: any;
}

export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(({
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  textValue,
  ...props
}, ref) => {
  const { onOpenChange } = useContext(DropdownContext)

  const handleCheckedChange = () => {
    if (disabled) return
    onCheckedChange(!checked)
  }

  return (
    <div
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked}
      aria-disabled={disabled}
      data-disabled={disabled ? true : undefined}
      data-checked={checked ? true : undefined}
      data-text-value={textValue}
      onClick={() => handleCheckedChange()}
      className={cn(
        "cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150",
        {
          "opacity-50 cursor-not-allowed pointer-events-none": disabled,
        },
        className,
      )}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          handleCheckedChange()
        }
      }}
      {...props}
    >
      <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300 bg-white">
        {checked ? (
          <CheckIcon className="h-3 w-3 text-blue-600" />
        ) : null}
      </div>
      <span className="flex-1">{children}</span>
    </div>
  )
})

DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

interface DropdownMenuRadioGroupProps {
  children: ReactNode;
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
  [key: string]: any;
}

export const DropdownMenuRadioGroup = forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(({
  children,
  value,
  onValueChange,
  className,
  ...props
}, ref) => {
  return (
    <DropdownRadioContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} role="group" className={cn("py-1", className)} {...props}>
        {children}
      </div>
    </DropdownRadioContext.Provider>
  )
})

DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

interface DropdownMenuRadioItemProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
  textValue?: string;
  [key: string]: any;
}

export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(({
  children,
  value,
  disabled = false,
  className,
  textValue,
  ...props
}, ref) => {
  const { value: groupValue, onValueChange } = useContext(DropdownRadioContext)
  const { onOpenChange } = useContext(DropdownContext)
  const checked = value === groupValue

  const handleValueChange = () => {
    if (disabled) return
    onValueChange(value)
    onOpenChange(false)
  }

  return (
    <div
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={disabled}
      data-disabled={disabled ? true : undefined}
      data-checked={checked ? true : undefined}
      data-value={value}
      data-text-value={textValue}
      onClick={() => handleValueChange()}
      className={cn(
        "relative cursor-pointer flex items-center w-full px-4 py-2 pl-8 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150",
        {
          "opacity-50 cursor-not-allowed pointer-events-none": disabled,
        },
        className,
      )}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          handleValueChange()
        }
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked ? (
          <div className="h-2 w-2 rounded-full bg-blue-600" />
        ) : null}
      </span>
      {children}
    </div>
  )
})

DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

interface DropdownMenuLabelProps {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  [key: string]: any;
}

export const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(({
  children,
  className,
  inset = false,
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      role="presentation"
      className={cn(
        "px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider", 
        inset && "pl-8",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
})

DropdownMenuLabel.displayName = "DropdownMenuLabel"

interface DropdownMenuSeparatorProps {
  className?: string;
  [key: string]: any;
}

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(({
  className,
  ...props
}, ref) => {
  return <div ref={ref} className={cn("border-t border-gray-200 my-1", className)} role="separator" {...props} />
})

DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

interface DropdownMenuGroupProps {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export const DropdownMenuGroup = forwardRef<HTMLDivElement, DropdownMenuGroupProps>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} role="group" className={cn("py-1", className)} {...props}>
      {children}
    </div>
  )
})

DropdownMenuGroup.displayName = "DropdownMenuGroup"

interface DropdownMenuShortcutProps {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export const DropdownMenuShortcut = forwardRef<HTMLSpanElement, DropdownMenuShortcutProps>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn("ml-auto text-xs tracking-widest text-gray-500", className)} 
      {...props}
    >
      {children}
    </span>
  )
})

DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

interface DropdownMenuSubProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenuSub = forwardRef<HTMLDivElement, DropdownMenuSubProps>(({ 
  children, 
  defaultOpen = false,
  open,
  onOpenChange
}, ref) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  
  // Support controlled mode
  const isControlled = open !== undefined
  const isSubOpen = isControlled ? open : uncontrolledOpen

  // Handle controlled/uncontrolled state
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <div ref={ref}>
      <DropdownSubContext.Provider value={{ isSubOpen: !!isSubOpen, onSubOpenChange: handleOpenChange }}>
        {children}
      </DropdownSubContext.Provider>
    </div>
  )
})

DropdownMenuSub.displayName = "DropdownMenuSub"

interface DropdownMenuSubTriggerProps {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  [key: string]: any;
}

export const DropdownMenuSubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(({
  children,
  className,
  inset = false,
  ...props
}, ref) => {
  const { isSubOpen, onSubOpenChange } = useContext(DropdownSubContext)

  return (
    <div
      ref={ref}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={isSubOpen}
      data-state={isSubOpen ? 'open' : 'closed'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSubOpenChange(!isSubOpen)
      }}
      className={cn(
        "relative cursor-pointer flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors duration-150",
        inset && "pl-8",
        className
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSubOpenChange(!isSubOpen)
        } else if (e.key === "ArrowRight") {
          e.preventDefault()
          onSubOpenChange(true)
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          onSubOpenChange(false)
        }
      }}
      {...props}
    >
      <span>{children}</span>
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </div>
  )
})

DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

interface DropdownMenuSubContentProps {
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
  sideOffset?: number;
  alignOffset?: number;
  forceMount?: boolean;
  collisionPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  avoidCollisions?: boolean;
  [key: string]: any;
}

export const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(({
  children,
  className,
  align = "end",
  sideOffset = 4,
  alignOffset = 0,
  forceMount,
  collisionPadding = 8,
  avoidCollisions = true,
  ...props
}, ref) => {
  const { isSubOpen } = useContext(DropdownSubContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isSubOpen && !forceMount) return null

  const content = (
    <div
      ref={ref}
      role="menu"
      aria-orientation="vertical"
      data-state={isSubOpen ? 'open' : 'closed'}
      style={{
        position: 'absolute',
        top: alignOffset,
        [align === "end" ? "left" : "right"]: "100%",
        marginLeft: align === "end" ? sideOffset : undefined,
        marginRight: align === "start" ? sideOffset : undefined,
      }}
      className={cn(
        "z-50 min-w-[8rem] w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden animate-in fade-in-80 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2",
        className
      )}
      onKeyDown={(e) => {
        // Handle arrow key navigation
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault()
          
          const menuItems = Array.from(
            e.currentTarget.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]')
          ).filter(item => !(item as HTMLElement).hasAttribute('data-disabled')) as HTMLElement[]
          
          if (!menuItems.length) return
          
          const currentIndex = menuItems.findIndex(item => item === document.activeElement)
          
          if (e.key === "ArrowDown") {
            const nextIndex = currentIndex < 0 || currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1
            menuItems[nextIndex].focus()
          } else if (e.key === "ArrowUp") {
            const prevIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1
            menuItems[prevIndex].focus()
          } else if (e.key === "Home") {
            menuItems[0].focus()
          } else if (e.key === "End") {
            menuItems[menuItems.length - 1].focus()
          }
        }
      }}
      {...props}
    >
      <div role="none" className="py-1">{children}</div>
    </div>
  )

  // Handle multiple nested portals
  return mounted ? createPortal(content, document.body) : null
})

DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

interface DropdownMenuPortalProps {
  children: ReactNode;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export const DropdownMenuPortal = ({ 
  children,
  container,
  forceMount = false
}: DropdownMenuPortalProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted && !forceMount) return null

  return createPortal(children, container || document.body)
}

DropdownMenuPortal.displayName = "DropdownMenuPortal"

// Context hooks for consumer use
export const useDropdownMenu = () => useContext(DropdownContext)
export const useDropdownMenuSub = () => useContext(DropdownSubContext)
export const useDropdownMenuRadioGroup = () => useContext(DropdownRadioContext)

