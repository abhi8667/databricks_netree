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
        ink: "#0A241A",
        paper: "#F8FAF8",
        carbon: "#051610",
        rule: "#E1ECE5",
        fill: "#EEF5F1",
        mute: "#48685A",
        faint: "#8DA396",
        forest: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
        },
        dark: {
          paper: "#070D0A",
          card: "#0D1712",
          surface: "#111E18",
          border: "#182E22",
          rule: "#1A3326",
          mute: "#6F9380",
          faint: "#436151",
          ink: "#ECFDF5",
        },
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
      borderRadius: {
        "2xl": "18px",
        xl: "14px",
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        lift: "0 1px 0 0 #E1ECE5, 0 12px 28px -18px rgba(10,36,26,0.15)",
        press: "0 0 0 1.5px #059669",
        soft: "0 2px 10px -2px rgba(10,36,26,0.05)",
        card: "0 1px 3px 0 rgba(10,36,26,0.04), 0 6px 16px -4px rgba(10,36,26,0.04)",
        glow: "0 0 24px -4px rgba(16,185,129,0.35)",
        "glow-sm": "0 0 12px -2px rgba(16,185,129,0.25)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        draw: { from: { strokeDashoffset: "1" }, to: { strokeDashoffset: "0" } },
        sweep: { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.15" } },
        "in-out": { "0%": { opacity: "0" }, "12%": { opacity: "1" }, "88%": { opacity: "1" }, "100%": { opacity: "0" } },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        rise: "rise 520ms cubic-bezier(0.16,1,0.3,1) both",
        sweep: "sweep 700ms cubic-bezier(0.16,1,0.3,1) both",
        blink: "blink 1.1s steps(1) infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
