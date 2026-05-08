import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { POSITION_COLORS, type Position } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'position'
  position?: Position
}

function Badge({ className, variant = 'default', position, children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-2 text-muted border-border',
    success: 'bg-primary/20 text-primary border-primary/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-destructive/20 text-destructive border-destructive/30',
    position: position ? POSITION_COLORS[position] : 'bg-surface-2 text-muted border-border',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge }
