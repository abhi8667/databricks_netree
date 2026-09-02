"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg border border-rule/60 bg-fill/40",
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-lg border border-rule bg-paper text-mute transition-all duration-200 hover:border-forest-500/50 hover:bg-forest-50 hover:text-forest-700 dark:border-forest-900/50 dark:bg-forest-950/40 dark:text-forest-300 dark:hover:border-forest-500/50 dark:hover:bg-forest-900/60 dark:hover:text-forest-200",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
