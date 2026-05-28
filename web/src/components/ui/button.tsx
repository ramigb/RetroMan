import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border-2 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 active:translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--secondary)/0.55)] hover:brightness-110",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground shadow-[3px_3px_0_hsl(var(--accent)/0.55)] hover:brightness-110",
        outline:
          "border-secondary bg-background/80 text-secondary shadow-[3px_3px_0_hsl(var(--muted))] hover:bg-secondary hover:text-secondary-foreground",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground shadow-[3px_3px_0_hsl(var(--primary)/0.55)] hover:brightness-110",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-accent hover:bg-accent hover:text-accent-foreground",
        link: "border-transparent text-secondary underline-offset-4 hover:text-accent hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
