import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'glass';
  className?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          'border-transparent bg-primary text-primary-foreground': variant === 'default',
          'border-transparent bg-accent text-accent-foreground': variant === 'secondary',
          'text-foreground': variant === 'outline',
          'border-white/20 bg-white/10 text-white backdrop-blur-md': variant === 'glass',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
