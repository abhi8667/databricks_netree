"use client";

import * as React from "react";
import { Check, CornerDownLeft, Mic, MicOff, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MagicRings from "@/components/react-bits/magic-rings";

export interface SiriWaveSlotProps {
  isListening: boolean;
  transcript?: string;
  onStop?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function SiriWaveSlot({
  isListening,
  transcript = "",
  onStop,
  onCancel,
  className,
}: SiriWaveSlotProps) {
  const mountTimeRef = React.useRef(Date.now());

  // Keyboard shortcut support: Enter to submit, Escape to cancel (with debounced mount guard)
  React.useEffect(() => {
    if (!isListening) return;
    mountTimeRef.current = Date.now();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel ? onCancel() : onStop?.();
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Only trigger Enter after a 400ms buffer so initial button click doesn't prematurely submit
        if (Date.now() - mountTimeRef.current > 400) {
          e.preventDefault();
          onStop?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isListening, onStop, onCancel]);

  if (!isListening) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[99999] flex h-dvh w-screen flex-col items-center justify-between overflow-hidden bg-[#040a07]/95 p-6 backdrop-blur-3xl transition-all duration-300 sm:p-10",
        className,
      )}
    >
      {/* Atmospheric emerald & mint nebula lights */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-emerald-500/15 blur-[160px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full bg-teal-500/15 blur-[160px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,150,105,0.08)_0%,transparent_70%)]" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-forest-950/80 px-4 py-1.5 shadow-glow-sm backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-emerald-300">
              Netree Voice Assistant
            </span>
          </div>
          <span className="hidden font-mono text-[11px] text-zinc-500 sm:inline">
            WebGL Holographic Audio Engine
          </span>
        </div>

        <button
          type="button"
          onClick={onCancel || onStop}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          aria-label="Close voice modal"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Epicenter: Full-Scale MagicRings Holographic Orb */}
      <main className="relative z-10 my-auto flex w-full max-w-4xl flex-col items-center justify-center">
        {/* MagicRings Canvas Container */}
        <div className="relative flex h-[320px] w-[320px] items-center justify-center sm:h-[460px] sm:w-[460px] lg:h-[540px] lg:w-[540px]">
          <div className="absolute inset-0">
            <MagicRings
              color="#10b981"
              colorTwo="#34d399"
              speed={2.2}
              ringCount={8}
              attenuation={7.5}
              lineThickness={2.6}
              baseRadius={0.28}
              radiusStep={0.085}
              scaleRate={0.14}
              clickBurst={true}
              followMouse={true}
              mouseInfluence={0.2}
            />
          </div>

          {/* Central Glowing Mic Orb */}
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/80 bg-forest-950/90 shadow-glow backdrop-blur-md transition-all sm:h-24 sm:w-24">
            <Mic className="h-9 w-9 animate-pulse text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] sm:h-11 sm:w-11" />
          </div>
        </div>

        {/* Live Transcript Typography */}
        <div className="relative z-10 mt-2 max-w-2xl px-4 text-center">
          <p className="min-h-[4rem] font-read text-xl leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-2xl lg:text-3xl">
            {transcript ? (
              <span className="tracking-tight text-white">&ldquo;{transcript}&rdquo;</span>
            ) : (
              <span className="font-sans text-base text-emerald-400/70 italic sm:text-lg">
                Listening... describe your research hypothesis, technical challenge, or project thesis.
              </span>
            )}
          </p>
        </div>
      </main>

      {/* Bottom Action HUD */}
      <footer className="relative z-10 flex w-full max-w-md flex-col items-center gap-3">
        <div className="flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel || onStop}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
          >
            Cancel [Esc]
          </button>

          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500 px-7 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-forest-950 shadow-glow transition-all hover:bg-emerald-400 hover:shadow-glow active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Finish & Insert</span>
            <CornerDownLeft className="h-3 w-3 opacity-60" />
          </button>
        </div>

        <p className="font-mono text-[11px] text-zinc-500">
          Press <kbd className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">Enter</kbd> to insert · <kbd className="rounded bg-white/10 px-1 py-0.5 text-zinc-300">Esc</kbd> to exit
        </p>
      </footer>
    </div>
  );
}
