import * as React from 'react';
import { cn } from '@/utils/cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm placeholder:text-text-light focus-ring',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
