/**
 * @module spinner
 * Loading spinner (Loader2 icon) with size and visibility variants.
 * Depends on: @/lib/utils, class-variance-authority, lucide-react.
 * Used by: buttons, inline loading states, empty states.
 */
import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

const spinnerVariants = cva('flex-col items-center justify-center', {
  variants: {
    show: {
      true: 'flex',
      false: 'hidden',
    },
  },
  defaultVariants: {
    show: true,
  },
});

const loaderVariants = cva('animate-spin text-primary', {
  variants: {
    size: {
      small: 'size-6',
      medium: 'size-8',
      large: 'size-12',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

/**
 * @property show - When false, container is hidden (flex vs hidden).
 * @property size - Icon size: small | medium | large.
 */
interface ISpinnerContentProps extends VariantProps<typeof spinnerVariants>,
    VariantProps<typeof loaderVariants> {
  className?: string;
  children?: React.ReactNode;
}

/** Loader2 icon with spin animation; optional children below. */
export function Spinner({ size, show, children, className }: ISpinnerContentProps) {
    return (
        <span className={spinnerVariants({ show })}>
            <Loader2 className={cn(loaderVariants({ size }), className)} />
            {children}
        </span>
    );
    }
