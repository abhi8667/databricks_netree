import type { Config } from "tailwindcss";

/**
 * Netree is a two-ink system: ink on paper. There is no accent hue anywhere.
 * Emphasis is carried by inversion (a black block on white) and by hairlines,
 * which is why the palette below is deliberately short.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0C",
        paper: "#FBFBFA",
        carbon: "#131315",
        rule: "#E3E3E1",
        fill: "#F2F2F0",
        mute: "#73736F",
        faint: "#A3A39E",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
        read: ["var(--font-newsreader)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.12em" }],
        display: ["clamp(2.4rem, 6vw, 4.5rem)", { lineHeight: "0.94", letterSpacing: "-0.045em" }],
        hero: ["clamp(3.2rem, 11vw, 8rem)", { lineHeight: "0.86", letterSpacing: "-0.055em" }],
      },
      borderRadius: { xl: "14px", lg: "10px", md: "8px", sm: "6px" },
      boxShadow: {
        lift: "0 1px 0 0 #E3E3E1, 0 12px 28px -18px rgba(11,11,12,0.35)",
        press: "0 0 0 1.5px #0B0B0C",
      },
      keyframes: {
        "rise": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        "draw": { from: { strokeDashoffset: "1" }, to: { strokeDashoffset: "0" } },
        "sweep": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        "blink": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.15" } },
        "in-out": { "0%": { opacity: "0" }, "12%": { opacity: "1" }, "88%": { opacity: "1" }, "100%": { opacity: "0" } },
      },
      animation: {
        rise: "rise 520ms cubic-bezier(0.16,1,0.3,1) both",
        sweep: "sweep 700ms cubic-bezier(0.16,1,0.3,1) both",
        blink: "blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
