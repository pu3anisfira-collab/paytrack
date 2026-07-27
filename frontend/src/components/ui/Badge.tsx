import * as React from 'react';
import { cn } from '@/utils/cn';

type Tone = 'emerald' | 'blue' | 'teal' | 'orange' | 'purple' | 'navy' | 'gray' | 'red' | 'amber' | 'green';

const toneClasses: Record<Tone, string> = {
  emerald: 'bg-[#00D4A3]/15 text-[#008A6A] border-[#00D4A3]/40',
  blue: 'bg-[#2F6BFF]/15 text-[#1E52D8] border-[#2F6BFF]/40',
  teal: 'bg-[#15C7B8]/15 text-[#0E8A80] border-[#15C7B8]/40',
  orange: 'bg-[#FFA51F]/15 text-[#C67A00] border-[#FFA51F]/40',
  purple: 'bg-[#6C3BFF]/15 text-[#4D22D8] border-[#6C3BFF]/40',
  navy: 'bg-[#0F234F]/15 text-[#0F234F] border-[#0F234F]/30',
  gray: 'bg-[#F5F7FB] text-[#5F6C7B] border-[#D8E0EA]',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  green: 'bg-[#00D4A3]/15 text-[#008A6A] border-[#00D4A3]/40',
};

export function Badge({ tone = 'gray', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border', toneClasses[tone], className)}
      {...props}
    />
  );
}
