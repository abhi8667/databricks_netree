"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * =========================================================================
 * REACT BITS SLOT: BACKGROUND MESH / AURORA / PARTICLES
 * =========================================================================
 * You can replace this component with your React Bits background component
 * (e.g. Waves, GridDistortion, Particles, Aurora).
 * =========================================================================
 */

import MagnetLines from "./magnet-lines";

export interface BackgroundMeshProps {
  className?: string;
  children?: React.ReactNode;
  showMagnetLines?: boolean;
}

export function BackgroundMesh({
  className,
  children,
  showMagnetLines = false,
}: BackgroundMeshProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[500px] w-[500px] rounded-full bg-forest-500/10 blur-[120px] dark:bg-emerald-500/10" />
        <div className="absolute -right-[10%] top-[40%] h-[450px] w-[450px] rounded-full bg-teal-500/10 blur-[100px] dark:bg-teal-500/10" />
        {showMagnetLines ? (
          <div className="absolute inset-0 flex items-center justify-center opacity-15">
            <MagnetLines
              rows={8}
              columns={8}
              containerSize="70vmin"
              lineColor="#10b981"
              lineWidth="0.8vmin"
              lineHeight="4vmin"
            />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
