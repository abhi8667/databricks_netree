"use client";

import * as React from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FluidVoiceOrbProps {
  state: "listening" | "thinking" | "speaking" | "idle";
  size?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * Organic Fluid Voice Orb inspired by ChatGPT Voice Mode & Gemini Live.
 * Uses interactive multi-harmonic liquid physics rendered on a borderless,
 * transparent canvas with zero square boundaries or box artifacts.
 */
export default function FluidVoiceOrb({
  state,
  size = 420,
  className = "",
  onClick,
}: FluidVoiceOrbProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = React.useRef<number>(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // Rings particles for ripple emissions
    const ripples: { r: number; alpha: number; maxR: number; speed: number }[] = [];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dynamics according to conversational state
      let speed = 0.02;
      let roughness = 8;
      let amp = 14 * dpr;
      let baseR = (size * 0.28) * dpr;
      let primaryColor = "#10b981"; // emerald
      let secondaryColor = "#34d399"; // mint
      let accentColor = "#6ee7b7"; // luminous mint

      if (state === "thinking") {
        speed = 0.06;
        roughness = 12;
        amp = 22 * dpr;
        baseR = (size * 0.24) * dpr;
        primaryColor = "#06b6d4"; // cyan
        secondaryColor = "#2dd4bf"; // teal
        accentColor = "#38bdf8"; // sky blue
      } else if (state === "speaking") {
        speed = 0.035;
        roughness = 6;
        amp = 18 * dpr + Math.sin(time * 3) * (6 * dpr);
        baseR = (size * 0.3) * dpr;
        primaryColor = "#059669"; // forest
        secondaryColor = "#10b981"; // emerald
        accentColor = "#a7f3d0"; // mint white
      } else if (state === "idle") {
        speed = 0.008;
        roughness = 4;
        amp = 6 * dpr;
        baseR = (size * 0.26) * dpr;
        primaryColor = "#4b5563"; // zinc
        secondaryColor = "#6b7280";
        accentColor = "#9ca3af";
      }

      time += speed;

      // Spawn ripples when speaking or listening
      if (state === "listening" || state === "speaking") {
        if (Math.random() < 0.04) {
          ripples.push({
            r: baseR * 0.9,
            alpha: 0.5,
            maxR: (size * 0.46) * dpr,
            speed: (0.8 + Math.random() * 0.6) * dpr,
          });
        }
      }

      // Draw and update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i]!;
        rip.r += rip.speed;
        rip.alpha -= 0.008;
        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = rip.alpha * 0.4;
        ctx.lineWidth = 1.5 * dpr;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 12 * dpr;
        ctx.stroke();
        ctx.restore();
      }

      // Layer 1: Outermost Translucent Aura Blob
      drawBlob(
        ctx,
        cx,
        cy,
        baseR * 1.18,
        amp * 0.8,
        roughness - 2,
        time * 0.7,
        primaryColor,
        secondaryColor,
        0.18,
        25 * dpr,
      );

      // Layer 2: Main Fluid Liquid Blob (ChatGPT voice body)
      drawBlob(
        ctx,
        cx,
        cy,
        baseR,
        amp,
        roughness,
        time,
        primaryColor,
        secondaryColor,
        0.55,
        35 * dpr,
      );

      // Layer 3: Inner Energetic Core
      drawBlob(
        ctx,
        cx,
        cy,
        baseR * 0.72,
        amp * 0.6,
        roughness + 2,
        time * 1.3,
        secondaryColor,
        accentColor,
        0.75,
        20 * dpr,
      );

      // Layer 4: Floating High-Luminance Center Nucleus
      const nucleusR = baseR * 0.35;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR * 1.5);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.4, accentColor);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 30 * dpr;
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, size]);

  // Helper to draw organic harmonic deforming blob using cubic spline
  const drawBlob = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    amplitude: number,
    points: number,
    t: number,
    color1: string,
    color2: string,
    alpha: number,
    blur: number,
  ) => {
    const coords: { x: number; y: number }[] = [];
    const step = (Math.PI * 2) / points;

    for (let i = 0; i < points; i++) {
      const angle = i * step;
      // Multi-frequency harmonic wave displacement
      const wave1 = Math.sin(angle * 3 + t);
      const wave2 = Math.cos(angle * 2 - t * 0.8);
      const wave3 = Math.sin(angle * 5 + t * 1.5);
      const offset = (wave1 * 0.5 + wave2 * 0.35 + wave3 * 0.15) * amplitude;
      const r = radius + offset;
      coords.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(coords[0]!.x, coords[0]!.y);

    // Smooth spline through points
    for (let i = 0; i < points; i++) {
      const p1 = coords[i]!;
      const p2 = coords[(i + 1) % points]!;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    ctx.closePath();

    // Radial gradient fill
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius * 1.4);
    grad.addColorStop(0, color2);
    grad.addColorStop(0.7, color1);
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color1;
    ctx.shadowBlur = blur;
    ctx.fill();
    ctx.restore();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer items-center justify-center select-none transition-transform duration-300 hover:scale-105 active:scale-95",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* 100% Borderless Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none block"
      />

      {/* Center Icon Indicator Floating in Nucleus */}
      <div className="pointer-events-none absolute z-20 flex items-center justify-center">
        {state === "thinking" ? (
          <Sparkles className="h-8 w-8 text-cyan-900 drop-shadow-md animate-pulse sm:h-10 sm:w-10" />
        ) : state === "idle" ? (
          <MicOff className="h-8 w-8 text-zinc-600 sm:h-10 sm:w-10" />
        ) : (
          <Mic className="h-8 w-8 text-forest-950 drop-shadow-md sm:h-10 sm:w-10" />
        )}
      </div>
    </div>
  );
}
