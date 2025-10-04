"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { VariantProps, cva } from "class-variance-authority"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        default: "h-4 w-4",
        sm: "h-3 w-3",
        lg: "h-6 w-6",
        xl: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  show?: boolean
}

const Spinner = ({ className, size, show = true, ...props }: SpinnerProps) => {
  if (!show) return null

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn(spinnerVariants({ size }))} />
    </div>
  )
}

export { Spinner, spinnerVariants }