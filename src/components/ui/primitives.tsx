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
 * Button. Solid is ink-on-paper inverted; there is no coloured variant,
 * because emphasis in this system is carried by inversion, not by hue.
 * ---------------------------------------------------------------------- */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        solid: "bg-ink text-white hover:bg-forest-900 shadow-xs hover:shadow",
        outline: "border border-forest-800/40 bg-transparent text-ink hover:bg-forest-50 hover:border-forest-700",
        quiet: "border border-rule bg-white text-ink hover:border-forest-600 hover:bg-forest-50/50 shadow-xs",
        ghost: "text-mute hover:bg-fill hover:text-ink",
        link: "text-forest-700 underline underline-offset-4 decoration-forest-300 hover:decoration-forest-700",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-9 w-9",
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
        "h-10 w-full rounded-lg border border-rule bg-white px-3.5 text-sm text-ink transition-all placeholder:text-faint hover:border-forest-400 focus:border-forest-600 focus:outline-none focus-visible:outline-none shadow-xs",
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
      "w-full rounded-lg border border-rule bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink transition-all placeholder:text-faint hover:border-forest-400 focus:border-forest-600 focus:outline-none focus-visible:outline-none shadow-xs",
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
      {hint ? <p className="text-xs leading-relaxed text-mute">{hint}</p> : null}
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
        "bg-rule shrink-0",
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
        default: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 font-medium",
        solid: "border-ink bg-ink text-white shadow-xs",
        outline: "border-forest-600/50 bg-transparent text-forest-800",
        muted: "border-transparent bg-fill text-mute",
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
    <span className={cn("font-mono text-[11px] tracking-tight text-faint", className)}>{children}</span>
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
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-forest-700/20 bg-forest-50 font-mono text-[11px] font-semibold text-forest-900 shadow-xs",
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
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-forest-800/30 transition-colors data-[state=checked]:bg-forest-600 data-[state=unchecked]:bg-white",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:bg-forest-700 data-[state=unchecked]:translate-x-0.5" />
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
      "h-4 w-4 shrink-0 rounded-[4px] border border-forest-800/40 data-[state=checked]:bg-forest-600 data-[state=checked]:border-forest-600 data-[state=checked]:text-white",
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
 * A measure bar. Every one of these is bound to a real count from the dataset -
 * papers on a topic, matching publications - never to a decorative percentage.
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
          <span className="font-mono text-[11px] text-forest-900 font-medium">{value}</span>
        </div>
      ) : null}
      <div className="h-[4px] w-full bg-rule rounded-full overflow-hidden">
        <div
          className="h-full origin-left bg-gradient-to-r from-forest-600 to-emerald-400 animate-sweep rounded-full"
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
      <p className="font-read text-lg text-ink">{title}</p>
      {children ? <p className="max-w-sm text-sm leading-relaxed text-mute">{children}</p> : null}
      {action}
    </div>
  );
}
