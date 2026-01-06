import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        // Custom Evently variants
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        soft: "border-transparent bg-primary-soft text-primary",
        "soft-secondary": "border-transparent bg-secondary-soft text-secondary",
        "soft-success": "border-transparent bg-success-soft text-success",
        "soft-warning": "border-transparent bg-warning-soft text-warning",
        "soft-destructive": "border-transparent bg-destructive-soft text-destructive",
        verified: "border-transparent bg-secondary text-secondary-foreground",
        pending: "border-transparent bg-warning-soft text-warning",
        rejected: "border-transparent bg-destructive-soft text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
