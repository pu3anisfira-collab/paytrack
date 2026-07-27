import * as React from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#2F6BFF] text-white hover:bg-[#1E52D8] shadow-sm',
  secondary: 'bg-transparent border border-[#2F6BFF] text-[#2F6BFF] hover:bg-[#2F6BFF]/10 shadow-sm',
  success: 'bg-[#15C7B8] text-white hover:bg-[#0FB0A3] shadow-sm',
  warning: 'bg-[#FFA51F] text-white hover:bg-[#E69317] shadow-sm',
  danger: 'bg-[#E31E24] text-white hover:bg-[#B81419] shadow-sm',
  outline: 'border border-[#D8E0EA] bg-white hover:bg-[#F5F7FB] text-[#0F234F]',
  ghost: 'bg-transparent hover:bg-[#F5F7FB] text-[#0F234F]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
