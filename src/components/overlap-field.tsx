"use client";

import * as React from "react";
import type { FacultyMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The overlap field.
 *
 * A single strong score is not evidence of a match - the dataset's own testing
 * showed an out-of-scope idea scoring higher than a legitimate third-place
 * result. What separates them is how many distinct papers clear the bar. So
 * this plots both axes at once and shades the corner where a candidate looks
 * close but has nothing behind it.
 *
 *   x - how close the single best paper is
 *   y - how many papers clear the relevance floor
 *   ring size - how many distinct topics overlap
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
    <figure className="rulebox overflow-hidden">
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
            opacity={0.07}
          />
          <text
            x={PAD.l + 8}
            y={H - PAD.b - 7}
            fill="#059669"
            style={{ fontSize: 9, letterSpacing: "0.12em", fontFamily: "var(--font-mono)", fontWeight: 600 }}
          >
            THIN OVERLAP
          </text>

          {/* Axes as hairlines only. */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#E1ECE5" />
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#E1ECE5" />

          <text
            x={PAD.l}
            y={H - 16}
            fill="#48685A"
            style={{ fontSize: 9, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}
          >
            CLOSENESS OF BEST PAPER
          </text>
          <text
            transform={`translate(18 ${H - PAD.b}) rotate(-90)`}
            fill="#48685A"
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
                {/* Elbow to the label column so crowded dots stay readable. */}
                <path
                  d={`M ${point.cx + point.r + 3} ${point.cy} H ${W - PAD.r - 16} V ${point.ly} H ${W - PAD.r - 6}`}
                  fill="none"
                  stroke={active ? "#059669" : "#E1ECE5"}
                  strokeWidth={active ? 1.5 : 1}
                  strokeDasharray={active ? undefined : "2 3"}
                />
                <circle
                  cx={point.cx}
                  cy={point.cy}
                  r={point.r}
                  fill={active ? "#059669" : "#FFFFFF"}
                  stroke={active ? "#047857" : "#10B981"}
                  strokeWidth={active ? 2 : 1.4}
                />
                <text
                  x={W - PAD.r + 2}
                  y={point.ly + 3.5}
                  fill={active ? "#0A241A" : "#48685A"}
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: active ? 600 : 400 }}
                >
                  {shortName(point.match.faculty_name)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="border-t border-rule bg-forest-50/40 px-4 py-2.5 font-mono text-[11px] leading-relaxed text-forest-800">
        Ring size is how many distinct topics overlap. Up and to the right is a real match.
      </figcaption>
    </figure>
  );
}

type Point = { match: FacultyMatch; cx: number; cy: number; r: number; ly: number };

/** Places the dots, then pushes labels apart so none of them sit on top of another. */
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

  // If the stack overflowed the plot, lift the whole column back inside.
  const overflow = floor - LABEL_GAP - (H - PAD.b);
  if (overflow > 0) for (const point of ordered) point.ly -= overflow;

  return points;
}

function shortName(name: string) {
  return name.length > 17 ? `${name.slice(0, 16)}…` : name;
}
