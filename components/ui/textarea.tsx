import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextareaElement> {
  error?: string;
  label?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextareaElement, TextareaProps>(({
  className,
  error,
  label,
  helperText,
  containerClassName,
  disabled,
  ...props
}, ref) => {
  return (
    <div className={cn('space-y-1', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          {
            'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500': error,
            'bg-gray-50 text-gray-500': disabled
          },
          className
        )}
        disabled={disabled}
        {...props}
      />
      {(error || helperText) && (
        <p className={cn(
          'text-sm',
          error ? 'text-red-600' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea'; 