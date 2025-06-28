"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        default: "h-2",
        sm: "h-1",
        lg: "h-3",
        xl: "h-4",
      },
      variant: {
        default: "",
        success: "",
        info: "",
        warning: "",
        destructive: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number
  max?: number
  showValue?: boolean
  label?: string
  indicatorClassName?: string
  isIndeterminate?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size, variant, showValue, label, indicatorClassName, isIndeterminate, ...props }, ref) => {
    const percentage = value != null ? Math.min(Math.max(value, 0), max) / max * 100 : 0

    return (
      <div className="w-full space-y-2">
        {(showValue || label) && (
          <div className="flex justify-between text-sm">
            {label && <span className="text-gray-700 dark:text-gray-300">{label}</span>}
            {showValue && (
              <span className="text-gray-500 dark:text-gray-400">
                {value}/{max}
              </span>
            )}
          </div>
        )}
        <div
          ref={ref}
          className={cn(progressVariants({ size, variant }), className)}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          data-state={value === 0 ? "zero" : undefined}
          {...props}
        >
          <div
            className={cn(
              "h-full w-full flex-1 bg-primary transition-all",
              isIndeterminate && "animate-indeterminate-progress",
              variant === "success" && "bg-green-600 dark:bg-green-500",
              variant === "info" && "bg-blue-600 dark:bg-blue-500",
              variant === "warning" && "bg-yellow-600 dark:bg-yellow-500",
              variant === "destructive" && "bg-red-600 dark:bg-red-500",
              indicatorClassName
            )}
            style={!isIndeterminate ? { transform: `translateX(-${100 - percentage}%)` } : undefined}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

const CircularProgress = React.forwardRef<SVGSVGElement, ProgressProps & { strokeWidth?: number }>(
  (
    {
      className,
      value = 0,
      max = 100,
      size = "default",
      variant = "default",
      strokeWidth = 4,
      ...props
    },
    ref
  ) => {
    // Convert size from variant to number if needed
    const sizeValue = typeof size === 'string' 
      ? (size === 'sm' ? 32 : size === 'lg' ? 64 : size === 'xl' ? 80 : 48) 
      : 48;
    
    const radius = (sizeValue - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(Math.max(value, 0), max) / max) * circumference;

    const variantColors = {
      default: "text-primary",
      success: "text-green-600 dark:text-green-500",
      info: "text-blue-600 dark:text-blue-500",
      warning: "text-yellow-600 dark:text-yellow-500",
      destructive: "text-red-600 dark:text-red-500",
    };

    return (
      <div className="relative inline-flex" style={{ width: sizeValue, height: sizeValue }}>
        <svg
          ref={ref}
          className={cn('rotate-[-90deg]', className)}
          viewBox={`0 0 ${sizeValue} ${sizeValue}`}
          {...props}
        >
          <circle
            className="text-gray-200 dark:text-gray-800"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={sizeValue / 2}
            cy={sizeValue / 2}
          />
          <circle
            className={variantColors[variant as keyof typeof variantColors]}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            r={radius}
            cx={sizeValue / 2}
            cy={sizeValue / 2}
          />
        </svg>
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

// Indeterminate progress component
const IndeterminateProgress = React.forwardRef<HTMLDivElement, Omit<ProgressProps, 'value' | 'max'>>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(progressVariants({ variant, size }), className)}
        role="progressbar"
        aria-valuetext="Loading..."
        {...props}
      >
        <div
          className={cn(
            'h-full w-full animate-indeterminate-progress',
            variant === 'default' ? 'bg-gradient-to-r from-primary/20 via-primary to-primary/20' : 
            variant === 'success' ? 'bg-gradient-to-r from-green-500/20 via-green-500 to-green-500/20' :
            variant === 'info' ? 'bg-gradient-to-r from-blue-500/20 via-blue-500 to-blue-500/20' :
            variant === 'warning' ? 'bg-gradient-to-r from-yellow-500/20 via-yellow-500 to-yellow-500/20' :
            'bg-gradient-to-r from-red-500/20 via-red-500 to-red-500/20'
          )}
        />
      </div>
    );
  }
);
IndeterminateProgress.displayName = 'IndeterminateProgress';

// Progress with label
const ProgressWithLabel = React.forwardRef<HTMLDivElement, ProgressProps & { labelPosition?: 'top' | 'side' }>(
  ({ labelPosition = 'top', ...props }, ref) => {
    return <Progress ref={ref} {...props} />;
  }
);
ProgressWithLabel.displayName = 'ProgressWithLabel';

// Progress group for multiple progress bars
const ProgressGroup = React.forwardRef<
  HTMLDivElement, 
  React.HTMLAttributes<HTMLDivElement> & { spacing?: 'default' | 'compact' | 'loose' }
>(
  ({ className, spacing = 'default', ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          'space-y-4',
          spacing === 'compact' ? 'space-y-2' : spacing === 'loose' ? 'space-y-6' : 'space-y-4',
          className
        )} 
        {...props} 
      />
    );
  }
);
ProgressGroup.displayName = 'ProgressGroup';

export { 
  Progress, 
  CircularProgress, 
  IndeterminateProgress, 
  ProgressWithLabel, 
  ProgressGroup,
  progressVariants 
};
