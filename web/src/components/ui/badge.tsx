import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border-2 px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--secondary)/0.55)]",
        secondary: "border-secondary bg-secondary text-secondary-foreground shadow-[2px_2px_0_hsl(var(--primary)/0.55)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground shadow-[2px_2px_0_hsl(var(--accent)/0.55)]",
        outline: "border-secondary bg-background/70 text-secondary",
        success: "border-emerald-400/80 bg-emerald-500/80 text-emerald-950",
        warning: "border-accent bg-accent text-accent-foreground shadow-[2px_2px_0_hsl(var(--primary)/0.55)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
