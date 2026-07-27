import * as React from 'react';
import { cn } from '@/utils/cn';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm placeholder:text-text-light focus-ring',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
