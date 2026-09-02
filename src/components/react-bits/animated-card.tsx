"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * =========================================================================
 * REACT BITS SLOT: ANIMATED CARD
 * =========================================================================
 * You can replace or wrap your React Bits card animation (e.g. SpotlightCard,
 * TiltedCard, GradientBorderCard) directly inside this component.
 * =========================================================================
 */

export interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
}

export function AnimatedCard({
  children,
  className,
  spotlightColor = "rgba(16, 185, 129, 0.12)",
  ...props
}: AnimatedCardProps) {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = React.useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rule bg-white p-6 shadow-xs transition-all duration-300 hover:border-forest-500/50 hover:shadow-glow-sm dark:border-dark-border dark:bg-dark-card",
        className,
      )}
      {...props}
    >
      {/* Spotlight highlight tracking cursor */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
