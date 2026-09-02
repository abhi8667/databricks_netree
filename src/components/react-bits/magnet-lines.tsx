"use client";

import * as React from "react";

export interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  width?: string;
  height?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function MagnetLines({
  rows = 9,
  columns = 9,
  containerSize = "80vmin",
  width,
  height,
  lineColor = "var(--magnet-line-color, #10b981)",
  lineWidth = "1vmin",
  lineHeight = "6vmin",
  baseAngle = -10,
  className = "",
  style = {},
}: MagnetLinesProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll("span");

    const onPointerMove = (pointer: { x: number; y: number }) => {
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        const b = pointer.x - centerX;
        const a = pointer.y - centerY;
        const c = Math.sqrt(a * a + b * b) || 1;
        const r = ((Math.acos(b / c) * 180) / Math.PI) * (pointer.y > centerY ? 1 : -1);

        item.style.setProperty("--rotate", `${r}deg`);
      });
    };

    window.addEventListener("pointermove", onPointerMove);

    if (items.length) {
      const middleIndex = Math.floor(items.length / 2);
      const rect = items[middleIndex]?.getBoundingClientRect();
      if (rect) {
        onPointerMove({ x: rect.x, y: rect.y });
      }
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [rows, columns]);

  const total = rows * columns;
  const spans = Array.from({ length: total }, (_, i) => (
    <span
      key={i}
      className="block origin-center will-change-transform rounded-full transition-transform duration-75"
      style={
        {
          "--rotate": `${baseAngle}deg`,
          transform: "rotate(var(--rotate))",
          backgroundColor: lineColor,
          width: lineWidth,
          height: lineHeight,
        } as React.CSSProperties
      }
    />
  ));

  return (
    <div
      ref={containerRef}
      className={`grid items-center justify-items-center ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: width || containerSize,
        height: height || containerSize,
        ...style,
      }}
    >
      {spans}
    </div>
  );
}
