"use client";

import * as React from "react";
import type { FacultyMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The overlap field.
 *
 * Plots faculty relevance across closeness, paper count, and topic breadth.
 */

const W = 640;
const H = 320;
const PAD = { l: 54, r: 150, t: 20, b: 48 };
const LABEL_GAP = 15;

export function OverlapField({
  matches,
  activeId,
  onHover,
}: {
  matches: FacultyMatch[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const plotted = React.useMemo(() => layout(matches), [matches]);
  const bandTop = H - PAD.b - (H - PAD.t - PAD.b) * 0.22;

  return (
    <figure className="overflow-hidden rounded-2xl border border-rule bg-white shadow-soft transition-colors dark:border-dark-border dark:bg-dark-card">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={`Overlap field plotting ${matches.length} faculty by how close their closest paper is against how many of their papers match.`}
        >
          {/* The band where closeness is not backed by volume. */}
          <rect
            x={PAD.l}
            y={bandTop}
            width={W - PAD.l - PAD.r}
            height={H - PAD.b - bandTop}
            fill="#059669"
            opacity={0.06}
          />
          <text
            x={PAD.l + 8}
            y={H - PAD.b - 7}
            fill="#059669"
            opacity={0.7}
            style={{ fontSize: 9, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}
          >
            THIN OVERLAP
          </text>

          {/* Axes as hairlines */}
          <line
            x1={PAD.l}
            y1={PAD.t}
            x2={PAD.l}
            y2={H - PAD.b}
            stroke="currentColor"
            className="text-rule dark:text-dark-border"
          />
          <line
            x1={PAD.l}
            y1={H - PAD.b}
            x2={W - PAD.r}
            y2={H - PAD.b}
            stroke="currentColor"
            className="text-rule dark:text-dark-border"
          />

          <text
            x={PAD.l}
            y={H - 16}
            fill="currentColor"
            className="text-mute dark:text-dark-mute"
            style={{ fontSize: 9, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}
          >
            CLOSENESS OF BEST PAPER
          </text>
          <text
            transform={`translate(18 ${H - PAD.b}) rotate(-90)`}
            fill="currentColor"
            className="text-mute dark:text-dark-mute"
            style={{ fontSize: 9, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}
          >
            PAPERS MATCHING
          </text>

          {plotted.map((point) => {
            const active = activeId === point.match.faculty_id;
            return (
              <g
                key={point.match.faculty_id}
                onMouseEnter={() => onHover?.(point.match.faculty_id)}
                onMouseLeave={() => onHover?.(null)}
                className="cursor-pointer"
              >
                {/* Elbow to the label column */}
                <path
                  d={`M ${point.cx + point.r + 3} ${point.cy} H ${W - PAD.r - 16} V ${point.ly} H ${W - PAD.r - 6}`}
                  fill="none"
                  stroke={active ? "#059669" : "currentColor"}
                  className={active ? "dark:stroke-emerald-400" : "text-rule dark:text-dark-border"}
                  strokeDasharray={active ? undefined : "2 3"}
                />
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={point.r}
                  fill={active ? "#059669" : "currentColor"}
                  className={
                    active
                      ? "dark:fill-emerald-400"
                      : "fill-white text-forest-600 dark:fill-dark-card dark:text-emerald-400"
                  }
                  stroke={active ? "#047857" : "#059669"}
                  strokeWidth={1.4}
                />
                <text
                  x={W - PAD.r + 2}
                  y={point.ly + 3.5}
                  fill={active ? "#047857" : "currentColor"}
                  className={
                    active
                      ? "font-semibold dark:fill-emerald-300"
                      : "text-mute dark:text-dark-mute"
                  }
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  {shortName(point.match.faculty_name)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="border-t border-rule px-4 py-2.5 font-mono text-[11px] leading-relaxed text-mute dark:border-dark-border dark:text-dark-mute">
        Ring size represents topic overlap breadth. Up and to the right indicates the strongest
        research alignment.
      </figcaption>
    </figure>
  );
}

type Point = { match: FacultyMatch; cx: number; cy: number; r: number; ly: number };

function layout(matches: FacultyMatch[]): Point[] {
  const maxDepth = Math.max(4, ...matches.map((m) => m.depth));
  const maxBreadth = Math.max(1, ...matches.map((m) => m.breadth));

  const points: Point[] = matches.map((match) => {
    const cy =
      H - PAD.b - (Math.log1p(match.depth) / Math.log1p(maxDepth)) * (H - PAD.t - PAD.b - 10);
    return {
      match,
      cx: PAD.l + 14 + match.closeness * (W - PAD.l - PAD.r - 34),
      cy,
      r: 4 + (match.breadth / maxBreadth) * 6.5,
      ly: cy,
    };
  });

  const ordered = [...points].sort((a, b) => a.ly - b.ly);
  let floor = PAD.t + 6;
  for (const point of ordered) {
    point.ly = Math.max(point.ly, floor);
    floor = point.ly + LABEL_GAP;
  }

  const overflow = floor - LABEL_GAP - (H - PAD.b);
  if (overflow > 0) for (const point of ordered) point.ly -= overflow;

  return points;
}

function shortName(name: string) {
  return name.length > 17 ? `${name.slice(0, 16)}…` : name;
}
