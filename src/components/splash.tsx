"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * The splash draws the product's actual premise: one idea at the root, edges
 * reaching up to the people whose work it touches.
 */

type Node = { x: number; y: number; r: number };

const ROOT: Node = { x: 300, y: 300, r: 5.5 };

const BRANCH: { node: Node; from: Node }[] = [
  { node: { x: 180, y: 214, r: 3.8 }, from: ROOT },
  { node: { x: 300, y: 196, r: 3.8 }, from: ROOT },
  { node: { x: 420, y: 214, r: 3.8 }, from: ROOT },
];

const LEAF: { node: Node; from: Node }[] = [
  { node: { x: 112, y: 132, r: 2.8 }, from: BRANCH[0]!.node },
  { node: { x: 206, y: 118, r: 2.8 }, from: BRANCH[0]!.node },
  { node: { x: 262, y: 96, r: 2.8 }, from: BRANCH[1]!.node },
  { node: { x: 344, y: 106, r: 2.8 }, from: BRANCH[1]!.node },
  { node: { x: 400, y: 124, r: 2.8 }, from: BRANCH[2]!.node },
  { node: { x: 488, y: 138, r: 2.8 }, from: BRANCH[2]!.node },
];

function curve(from: Node, to: Node) {
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

export function Splash({ destination }: { destination: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? 200 : 2350;
    const fade = setTimeout(() => setLeaving(true), hold);
    const go = setTimeout(() => router.replace(destination), hold + 320);
    return () => {
      clearTimeout(fade);
      clearTimeout(go);
    };
  }, [router, destination]);

  const skip = () => router.replace(destination);

  return (
    <main
      onClick={skip}
      className={`grain fixed inset-0 flex cursor-pointer flex-col items-center justify-center bg-paper transition-all duration-300 dark:bg-dark-paper ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes netree-draw { to { stroke-dashoffset: 0 } }
        @keyframes netree-pop { from { opacity: 0; transform: scale(0.2) } to { opacity: 1; transform: none } }
        @keyframes netree-word { from { opacity: 0; letter-spacing: 0.4em } to { opacity: 1; letter-spacing: -0.04em } }
        .nt-edge { stroke-dasharray: 1; stroke-dashoffset: 1; animation: netree-draw 620ms cubic-bezier(0.6,0,0.2,1) forwards }
        .nt-node { transform-box: fill-box; transform-origin: center; animation: netree-pop 320ms cubic-bezier(0.16,1,0.3,1) both }
        .nt-word { animation: netree-word 780ms cubic-bezier(0.16,1,0.3,1) both }
      `}</style>

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -inset-20 opacity-25 blur-3xl dark:opacity-20">
        <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-forest-400 to-teal-500" />
      </div>

      <svg viewBox="0 0 600 340" className="relative z-10 w-[min(78vw,560px)]" aria-hidden>
        {[...BRANCH, ...LEAF].map((edge, i) => (
          <path
            key={`e${i}`}
            className="nt-edge"
            pathLength={1}
            d={curve(edge.from, edge.node)}
            fill="none"
            stroke="currentColor"
            strokeWidth={i < BRANCH.length ? 1.5 : 1}
            style={{
              animationDelay: `${(i < BRANCH.length ? 180 : 620) + i * 90}ms`,
              color: i < BRANCH.length ? "#059669" : "#10B981",
            }}
          />
        ))}
        <circle
          cx={ROOT.x}
          cy={ROOT.y}
          r={ROOT.r}
          className="nt-node fill-forest-600 dark:fill-emerald-400"
        />
        {[...BRANCH, ...LEAF].map((edge, i) => (
          <circle
            key={`n${i}`}
            cx={edge.node.x}
            cy={edge.node.y}
            r={edge.node.r}
            className={`nt-node ${
              i < BRANCH.length
                ? "fill-forest-600 stroke-forest-700 dark:fill-emerald-400 dark:stroke-emerald-300"
                : "fill-white stroke-forest-600 dark:fill-dark-card dark:stroke-emerald-400"
            }`}
            strokeWidth={1.2}
            style={{ animationDelay: `${(i < BRANCH.length ? 760 : 1180) + i * 90}ms` }}
          />
        ))}
      </svg>

      <h1
        className="nt-word relative z-10 mt-2 text-[clamp(2.6rem,9vw,5.5rem)] font-semibold leading-none text-ink dark:text-dark-ink"
        style={{ animationDelay: "1500ms" }}
      >
        <span className="bg-gradient-to-r from-forest-800 via-forest-600 to-emerald-500 bg-clip-text text-transparent dark:from-white dark:via-emerald-300 dark:to-emerald-500">
          Netree
        </span>
      </h1>
      <p
        className="nt-word eyebrow relative z-10 mt-5"
        style={{ animationDelay: "1850ms", letterSpacing: "0.14em" }}
      >
        Ideas find the people who already work on them
      </p>
      <span className="absolute bottom-8 font-mono text-[11px] text-faint dark:text-dark-faint">
        Tap to skip
      </span>
    </main>
  );
}
