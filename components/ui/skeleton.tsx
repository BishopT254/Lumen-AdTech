import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the skeleton.
   * @default "default"
   */
  variant?: "default" | "circle" | "rounded" | "card" | "text" | "image" | "button" | "avatar";
  
  /**
   * Whether the skeleton should have a pulse animation.
   * @default true
   */
  pulse?: boolean;
  
  /**
   * Whether the skeleton should have a shimmer animation instead of pulse.
   * @default false
   */
  shimmer?: boolean;
  
  /**
   * The width of the skeleton. Can be any CSS width value.
   */
  width?: string | number;
  
  /**
   * The height of the skeleton. Can be any CSS height value.
   */
  height?: string | number;
  
  /**
   * Whether the skeleton is currently loading.
   * @default true
   */
  isLoading?: boolean;
  
  /**
   * Content to show when not loading.
   */
  children?: React.ReactNode;
  
  /**
   * Border radius for the skeleton. Only applies to the "default" variant.
   * @default "md"
   */
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  
  /**
   * Custom animation duration in milliseconds.
   * @default 1500
   */
  animationDuration?: number;

  /**
   * Optional element type to render the skeleton as.
   * @default "div"
   */
  as?: keyof JSX.IntrinsicElements;
}

export function Skeleton({
  className,
  variant = "default",
  pulse = true,
  shimmer = false,
  width,
  height,
  isLoading = true,
  children,
  radius = "md",
  animationDuration = 1500,
  as: Component = "div",
  ...props
}: SkeletonProps) {
  const skeletonStyle: React.CSSProperties = {
    width: width,
    height: height,
    animationDuration: `${animationDuration}ms`,
  };

  // If not in loading state, show children
  if (!isLoading && children) {
    return <>{children}</>;
  }

  const getRadiusClass = (radius: SkeletonProps["radius"]) => {
    switch (radius) {
      case "none": return "rounded-none";
      case "sm": return "rounded-sm";
      case "md": return "rounded-md";
      case "lg": return "rounded-lg";
      case "xl": return "rounded-xl";
      case "full": return "rounded-full";
      default: return "rounded-md";
    }
  };

  const getVariantClasses = (variant: SkeletonProps["variant"]) => {
    switch (variant) {
      case "circle":
        return "rounded-full aspect-square";
      case "rounded":
        return "rounded-full";
      case "card":
        return "rounded-lg h-40 w-full";
      case "text":
        return "h-4 w-full rounded";
      case "image":
        return "aspect-video rounded-md w-full";
      case "button":
        return "h-10 rounded-md w-24";
      case "avatar":
        return "rounded-full h-12 w-12";
      default:
        return getRadiusClass(radius);
    }
  };

  const pulseAnimation = pulse && !shimmer ? "animate-pulse" : "";
  const shimmerAnimation = shimmer ? "animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:500%_100%]" : "";

  return (
    <Component
      className={cn(
        "bg-gray-200/80 dark:bg-gray-700/80",
        getVariantClasses(variant),
        pulseAnimation,
        shimmerAnimation,
        className
      )}
      style={skeletonStyle}
      {...props}
    />
  );
}

export function SkeletonText({
  className,
  lines = 3,
  lastLineWidth = 70,
  spacing = "tight",
  ...props
}: Omit<SkeletonProps, "variant"> & {
  lines?: number;
  lastLineWidth?: number;
  spacing?: "tight" | "normal" | "loose";
}) {
  const getSpacingClass = () => {
    switch (spacing) {
      case "tight": return "space-y-1";
      case "normal": return "space-y-2";
      case "loose": return "space-y-4";
      default: return "space-y-2";
    }
  };

  return (
    <div className={cn("w-full", getSpacingClass(), className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lastLineWidth ? `w-${lastLineWidth}%` : "w-full"
          )}
          {...props}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className,
  hasImage = true,
  hasFooter = true,
  imageHeight = "h-48",
  contentLines = 3,
  ...props
}: Omit<SkeletonProps, "variant"> & {
  hasImage?: boolean;
  hasFooter?: boolean;
  imageHeight?: string;
  contentLines?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden",
        className
      )}
      {...props}
    >
      {hasImage && (
        <Skeleton className={cn("w-full", imageHeight)} />
      )}
      <div className="p-4">
        <Skeleton className="h-6 w-3/4 mb-4" />
        <SkeletonText lines={contentLines} spacing="normal" />
        
        {hasFooter && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <Skeleton variant="circle" className="h-8 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
  hasHeader = true,
  ...props
}: Omit<SkeletonProps, "variant"> & {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {/* Header row */}
          {hasHeader && Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="p-3 border-b border-gray-200 dark:border-gray-800">
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
          
          {/* Data rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={`cell-${rowIndex}-${colIndex}`} 
                  className={cn(
                    "p-3",
                    rowIndex < rows - 1 && "border-b border-gray-200 dark:border-gray-800"
                  )}
                >
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// Additional utility for a skeleton loader with content fallback
export function SkeletonLoader({
  isLoading,
  children,
  skeleton,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
}) {
  return isLoading ? <>{skeleton}</> : <>{children}</>;
}