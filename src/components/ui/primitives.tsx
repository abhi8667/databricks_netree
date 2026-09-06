"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Button: Modernized with vibrant emerald primary & dark mode accents.
 * ---------------------------------------------------------------------- */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        solid:
          "bg-forest-700 text-white shadow-sm shadow-forest-900/15 hover:bg-forest-800 hover:-translate-y-0.5 dark:bg-forest-600 dark:hover:bg-forest-500 dark:shadow-glow-sm",
        emerald:
          "bg-forest-600 text-white shadow-sm shadow-forest-600/25 hover:bg-forest-700 hover:shadow-md hover:shadow-forest-700/30 hover:-translate-y-0.5 dark:bg-forest-500 dark:hover:bg-forest-600 dark:shadow-glow-sm",
        outline:
          "border border-forest-600/40 bg-transparent text-forest-800 hover:border-forest-600 hover:bg-forest-50 dark:border-forest-500/50 dark:text-forest-300 dark:hover:bg-forest-950/60 dark:hover:text-forest-100",
        quiet:
          "border border-rule bg-white text-ink hover:border-forest-500 hover:bg-forest-50/50 dark:border-dark-border dark:bg-dark-card dark:text-dark-ink dark:hover:border-forest-500 dark:hover:bg-forest-950/40",
        ghost:
          "text-mute hover:bg-forest-50 hover:text-forest-800 dark:text-dark-mute dark:hover:bg-forest-950/60 dark:hover:text-forest-200",
        link:
          "text-forest-700 underline underline-offset-4 decoration-forest-300 hover:decoration-forest-700 dark:text-forest-400 dark:decoration-forest-600",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-lg",
        md: "h-10 px-4 text-sm rounded-xl",
        lg: "h-12 px-6 text-[15px] rounded-xl",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

/* ------------------------------- Inputs -------------------------------- */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-rule bg-white px-3.5 text-sm text-ink transition-all placeholder:text-faint hover:border-forest-500/50 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20 disabled:opacity-50 dark:border-dark-border dark:bg-dark-card dark:text-dark-ink dark:placeholder:text-dark-faint dark:hover:border-forest-500/50 dark:focus:border-forest-500 dark:focus:ring-forest-500/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-rule bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink transition-all placeholder:text-faint hover:border-forest-500/50 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20 dark:border-dark-border dark:bg-dark-card dark:text-dark-ink dark:placeholder:text-dark-faint dark:hover:border-forest-500/50 dark:focus:border-forest-500 dark:focus:ring-forest-500/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("eyebrow block", className)} {...props} />
));
Label.displayName = "Label";

/** Label + control + optional hint, the shape every form row in Netree uses. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {hint ? <p className="text-xs leading-relaxed text-mute dark:text-dark-mute">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------ Surfaces ------------------------------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rulebox", className)} {...props} />;
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        "bg-rule shrink-0 dark:bg-dark-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
  {
    variants: {
      tone: {
        default:
          "border-rule bg-white text-mute dark:border-dark-border dark:bg-dark-card dark:text-dark-mute",
        solid:
          "border-forest-700 bg-forest-700 text-white dark:border-forest-600 dark:bg-forest-600",
        emerald:
          "border-forest-500/30 bg-forest-50 text-forest-800 dark:border-forest-500/40 dark:bg-forest-950/60 dark:text-forest-200",
        outline:
          "border-forest-600/50 bg-transparent text-forest-800 dark:border-forest-500/50 dark:text-forest-300",
        muted:
          "border-transparent bg-fill text-mute dark:bg-dark-surface dark:text-dark-mute",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Monospace identifier chip - used for real ids like RVCE-CSE-012. */
export function Ident({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[11px] tracking-tight text-faint dark:text-dark-faint", className)}>
      {children}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-forest-600/30 bg-forest-50 font-mono text-[11px] font-semibold text-forest-800 shadow-xs dark:border-forest-500/40 dark:bg-forest-950 dark:text-forest-200",
        className,
      )}
    >
      {letters || "??"}
    </span>
  );
}

/* ------------------------------ Toggles -------------------------------- */

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-forest-600 transition-colors data-[state=checked]:bg-forest-600 data-[state=unchecked]:bg-white dark:border-forest-500 dark:data-[state=checked]:bg-forest-500 dark:data-[state=unchecked]:bg-dark-card",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-3.5 w-3.5 rounded-full bg-forest-700 transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white data-[state=unchecked]:translate-x-0.5 dark:bg-forest-300 dark:data-[state=checked]:bg-dark-paper" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "h-4 w-4 shrink-0 rounded-[5px] border border-forest-600 data-[state=checked]:bg-forest-600 data-[state=checked]:text-white dark:border-forest-500 dark:data-[state=checked]:bg-forest-500 dark:data-[state=checked]:text-dark-paper",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

/* ------------------------------- Meters -------------------------------- */

/**
 * A measure bar with an emerald gradient fill.
 */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{label}</span>
          <span className="font-mono text-[11px] text-ink dark:text-dark-ink">{value}</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-forest-100 dark:bg-dark-surface">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-forest-600 to-emerald-400 animate-sweep"
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
}

export function Empty({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rulebox grain flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-read text-lg text-ink dark:text-dark-ink">{title}</p>
      {children ? (
        <p className="max-w-sm text-sm leading-relaxed text-mute dark:text-dark-mute">
          {children}
        </p>
      ) : null}
      {action}
    </div>
  );
}
