"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * =========================================================================
 * REACT BITS SLOT: TEXT REVEAL / DECRYPTED TEXT
 * =========================================================================
 * You can replace this component with your React Bits typography animation
 * (e.g. DecryptedText, BlurText, TrueFocus, ShinyText).
 * =========================================================================
 */

export interface TextRevealProps {
  text: string;
  className?: string;
  highlightWords?: string[];
}

export function TextReveal({ text, className, highlightWords = [] }: TextRevealProps) {
  const words = text.split(" ");

  return (
    <span className={cn("inline-block", className)}>
      {words.map((word, i) => {
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase() === word.replace(/[^a-zA-Z]/g, "").toLowerCase(),
        );

        return (
          <span
            key={i}
            className={cn(
              "inline-block mr-1.5 transition-all duration-300",
              isHighlight
                ? "bg-gradient-to-r from-forest-600 to-emerald-500 bg-clip-text font-semibold text-transparent dark:from-emerald-400 dark:to-teal-300"
                : "",
            )}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}
