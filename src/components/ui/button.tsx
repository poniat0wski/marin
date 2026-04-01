import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-white shadow-[0_10px_30px_-10px_rgba(100,82,255,0.65)] hover:bg-[var(--brand-dark)]",
        secondary:
          "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
