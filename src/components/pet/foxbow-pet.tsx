"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Compass,
  ExternalLink,
  MessageSquare,
  Moon,
  Send,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { answerFoxbowQuery, DEFAULT_NOTIFICATIONS } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface AnimationDef {
  row: number;
  frames: number;
  speedMs: number;
  loop: boolean;
}

const ANIMATIONS: Record<string, AnimationDef> = {
  idle: { row: 0, frames: 6, speedMs: 140, loop: true },
  walk: { row: 1, frames: 8, speedMs: 110, loop: true },
  shoot: { row: 2, frames: 8, speedMs: 90, loop: false },
  hurt: { row: 3, frames: 4, speedMs: 120, loop: false },
  sleep: { row: 4, frames: 5, speedMs: 260, loop: true },
  jump: { row: 5, frames: 8, speedMs: 100, loop: false },
  cheer: { row: 6, frames: 6, speedMs: 130, loop: false },
};

const BUBBLE_MESSAGES = [
  "Scouting published faculty... 🏹",
  "Your research thesis has high overlap!",
  "Try the Voice AI ideation desk!",
  "38 active researchers detected in CSE!",
  "Aim high on publication impact! ✨",
  "Paws on the keyboard, let's build!",
  "Ready to explore open lab positions?",
];

const SUGGESTED_QUESTIONS = [
  "What are my notifications?",
  "Any faculty replies?",
  "Upcoming hackathons?",
  "Go to sleep 💤",
];

const CELL_W = 192;
const CELL_H = 208;

export function FoxbowPet() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [currentAnim, setCurrentAnim] = React.useState<string>("idle");
  const [frameIndex, setFrameIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1); // 1 = right, -1 = left
  const [posX, setPosX] = React.useState(120); // offset from right edge
  const [speech, setSpeech] = React.useState<string | null>(
    "Hi, I'm Foxbow! Click me to check notifications or hover to put me to sleep. 🏹",
  );
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Foxbow Interactive Chat State
  const [showChat, setShowChat] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");
  const [chatResponse, setChatResponse] = React.useState<{
    reply: string;
    actionHref?: string;
    actionLabel?: string;
  } | null>(null);

  // Load Spritesheet
  React.useEffect(() => {
    const img = new Image();
    img.src = "/foxbow/spritesheet.webp";
    img.onload = () => {
      imgRef.current = img;
      setIsLoaded(true);
    };
  }, []);

  // Frame Animation Loop
  React.useEffect(() => {
    if (!isLoaded) return;
    const anim = ANIMATIONS[currentAnim] || ANIMATIONS.idle!;

    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= anim.frames) {
          if (!anim.loop) {
            // Revert back to idle once one-shot animation finishes
            setTimeout(() => setCurrentAnim("idle"), 50);
            return 0;
          }
          return 0;
        }
        return next;
      });
    }, anim.speedMs);

    return () => clearInterval(interval);
  }, [isLoaded, currentAnim]);

  // Autonomous wandering behavior (patrolling) - only when awake and not in chat
  React.useEffect(() => {
    if (isMinimized || currentAnim === "sleep" || showChat) return;

    const wanderTimer = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.35 && currentAnim === "idle") {
        // Start walking
        const newDir = Math.random() < 0.5 ? 1 : -1;
        setDirection(newDir as 1 | -1);
        setCurrentAnim("walk");
      } else if (rand < 0.65 && currentAnim === "walk") {
        // Stop and idle
        setCurrentAnim("idle");
      } else if (rand < 0.8 && currentAnim === "idle") {
        // Random cheer
        setCurrentAnim("cheer");
      }
    }, 4500);

    return () => clearInterval(wanderTimer);
  }, [currentAnim, isMinimized, showChat]);

  // Walking movement translation
  React.useEffect(() => {
    if (currentAnim !== "walk" || isMinimized) return;

    const moveTimer = setInterval(() => {
      setPosX((prev) => {
        const next = prev + (direction === -1 ? 2.5 : -2.5);
        if (next > 360) {
          setDirection(1);
          return 360;
        }
        if (next < 30) {
          setDirection(-1);
          return 30;
        }
        return next;
      });
    }, 40);

    return () => clearInterval(moveTimer);
  }, [currentAnim, direction, isMinimized]);

  // Draw frame to canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !isLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const anim = ANIMATIONS[currentAnim] || ANIMATIONS.idle!;
    const col = frameIndex % anim.frames;
    const row = anim.row;

    ctx.clearRect(0, 0, CELL_W, CELL_H);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Flip horizontally if facing left
    if (direction === -1) {
      ctx.translate(CELL_W, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      img,
      col * CELL_W,
      row * CELL_H,
      CELL_W,
      CELL_H,
      0,
      0,
      CELL_W,
      CELL_H,
    );

    ctx.restore();
  }, [isLoaded, currentAnim, frameIndex, direction]);

  // Auto-dismiss speech bubble after 6s
  React.useEffect(() => {
    if (!speech || showChat) return;
    const t = setTimeout(() => setSpeech(null), 6000);
    return () => clearTimeout(t);
  }, [speech, showChat]);

  // Handle Putting to Sleep
  const handleSleep = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentAnim("sleep");
    setFrameIndex(0);
    setSpeech("Zzz... resting my paws. Wake me when you need me! 💤");
    setShowChat(false);
  };

  // Handle Waking Up
  const handleWakeUp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentAnim("cheer");
    setFrameIndex(0);
    setSpeech("I'm awake and on research patrol! 🏹");
  };

  // Handle Pet Click
  const handlePetClick = () => {
    if (currentAnim === "sleep") {
      handleWakeUp();
      return;
    }

    // Toggle chat panel on click
    setShowChat((prev) => !prev);
    setSpeech(null);

    if (!showChat) {
      // Default initial query answer
      const res = answerFoxbowQuery("notifications");
      setChatResponse(res);
    }
  };

  // Ask Foxbow a Question
  const handleAskQuestion = (question: string) => {
    if (question.toLowerCase().includes("sleep")) {
      handleSleep();
      return;
    }

    const res = answerFoxbowQuery(question);
    setChatResponse(res);
    setUserQuery("");

    // Trigger archery animation on answering!
    setCurrentAnim("shoot");
    setFrameIndex(0);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-full border border-forest-500/40 bg-forest-950/90 px-3.5 py-2 font-mono text-xs text-emerald-300 shadow-glow backdrop-blur-md transition-transform hover:scale-105"
          title="Call Foxbow Ranger"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Foxbow 🏹</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed bottom-3 z-40 flex flex-col items-center select-none"
      style={{ right: `${posX}px` }}
    >
      {/* Interactive Chat & Notification Popover */}
      {showChat && (
        <div className="pointer-events-auto relative mb-3 w-[310px] animate-rise rounded-3xl border border-forest-500/30 bg-white/95 p-4 text-left shadow-2xl backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/95 sm:w-[340px]">
          <div className="flex items-center justify-between border-b border-rule/70 pb-2.5 dark:border-dark-border/70">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-glow-sm animate-pulse" />
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-forest-800 dark:text-emerald-300">
                Foxbow Campus Scout 🏹
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Suggested Chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAskQuestion(q)}
                className="rounded-lg border border-rule/80 bg-forest-50/60 px-2 py-1 font-mono text-[10px] text-forest-800 transition-colors hover:bg-forest-100 hover:text-forest-950 dark:border-dark-border dark:bg-forest-950/40 dark:text-emerald-300 dark:hover:bg-forest-900/60"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Response Box */}
          {chatResponse && (
            <div className="mt-3 rounded-2xl border border-rule/70 bg-forest-50/40 p-3 text-xs leading-relaxed text-ink dark:border-dark-border/80 dark:bg-dark-card dark:text-dark-ink">
              <p className="whitespace-pre-line">{chatResponse.reply}</p>
              {chatResponse.actionHref && (
                <div className="mt-2.5 flex justify-end">
                  <Link
                    href={chatResponse.actionHref}
                    onClick={() => setShowChat(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-mono text-[10px] font-semibold text-white shadow-xs transition-transform hover:scale-105 dark:bg-emerald-500"
                  >
                    <span>{chatResponse.actionLabel || "View"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (userQuery.trim()) handleAskQuestion(userQuery);
            }}
            className="mt-3 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask about notifications..."
              className="h-8 w-full rounded-xl border border-rule bg-white px-3 text-xs text-ink placeholder:text-zinc-400 focus:border-forest-600 focus:outline-none dark:border-dark-border dark:bg-zinc-900 dark:text-dark-ink"
            />
            <button
              type="submit"
              disabled={!userQuery.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-white transition-opacity disabled:opacity-40 dark:bg-forest-600"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Speech triangle */}
          <div className="absolute -bottom-2 right-12 h-0 w-0 border-x-4 border-x-transparent border-t-8 border-t-white dark:border-t-dark-card" />
        </div>
      )}

      {/* Autonomous Speech Bubble */}
      {!showChat && speech && (
        <div className="pointer-events-auto relative mb-2 max-w-[220px] animate-rise rounded-2xl border border-forest-500/30 bg-white/95 p-3 text-left shadow-lg backdrop-blur-md dark:border-dark-border dark:bg-dark-card/95">
          <button
            type="button"
            onClick={() => setSpeech(null)}
            className="absolute right-1.5 top-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="pr-3 text-xs leading-relaxed text-ink dark:text-dark-ink">{speech}</p>
          <div className="absolute -bottom-2 left-6 h-0 w-0 border-x-4 border-x-transparent border-t-8 border-t-white dark:border-t-dark-card" />
        </div>
      )}

      {/* Pet Interactive Canvas & Hover Action Control Wrap */}
      <div
        className="pointer-events-auto relative flex flex-col items-center group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Sleeping Particle Animation */}
        {currentAnim === "sleep" && (
          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 font-mono text-xs font-bold text-teal-400 animate-pulse">
            <span>Z</span>
            <span className="text-[10px]">z</span>
            <span className="text-[8px]">z</span>
            <span>💤</span>
          </div>
        )}

        {/* Hover Action Pill: "Ask to sleep" / "Wake up" */}
        {isHovered && !showChat && (
          <div className="absolute -top-7 z-20 animate-rise">
            {currentAnim === "sleep" ? (
              <button
                type="button"
                onClick={handleWakeUp}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300 shadow-glow backdrop-blur-md transition-transform hover:scale-105"
              >
                <Sun className="h-3 w-3 text-amber-400" />
                <span>Wake up Foxbow ☀️</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSleep}
                className="flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-forest-950/90 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-teal-300 shadow-glow backdrop-blur-md transition-transform hover:scale-105"
              >
                <Moon className="h-3 w-3 text-teal-400" />
                <span>Ask to sleep 💤</span>
              </button>
            )}
          </div>
        )}

        {/* Minimize Button on hover */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          title="Minimize Foxbow"
          className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[9px] text-zinc-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
        >
          <X className="h-2.5 w-2.5" />
        </button>

        {/* Canvas Pet Container */}
        <div
          onClick={handlePetClick}
          title={
            currentAnim === "sleep"
              ? "Click to wake up Foxbow!"
              : "Click Foxbow to ask questions about your notifications!"
          }
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        >
          <canvas
            ref={canvasRef}
            width={CELL_W}
            height={CELL_H}
            style={{ width: "80px", height: "86.6px", imageRendering: "pixelated" }}
            className={cn(
              "filter transition-all",
              currentAnim === "sleep"
                ? "opacity-80 drop-shadow-[0_4px_8px_rgba(20,184,166,0.2)]"
                : "drop-shadow-[0_8px_14px_rgba(5,150,105,0.25)]",
            )}
          />
        </div>

        {/* Small subtle namechip with sleep / wake toggle */}
        <div className="mt-0.5 flex items-center gap-1">
          <span className="rounded-full bg-forest-950/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300 shadow-sm backdrop-blur-xs">
            {currentAnim === "sleep" ? "Sleeping 💤" : "Foxbow 🏹"}
          </span>
        </div>
      </div>
    </div>
  );
}
