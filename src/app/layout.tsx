import type { Metadata, Viewport } from "next";
import { Archivo, Newsreader, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/overlays";
import { ThemeProvider } from "@/components/theme-provider";
import MagnetLines from "@/components/react-bits/magnet-lines";
import { FoxbowPet } from "@/components/pet/foxbow-pet";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Netree",
  description:
    "Netree connects students to the faculty and alumni whose published work actually overlaps their idea.",
};

export const viewport: Viewport = { themeColor: "#059669" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${newsreader.variable} ${mono.variable}`}
    >
      <body className="relative min-h-dvh font-sans antialiased">
        <ThemeProvider defaultTheme="system">
          {/* Full-Website Ambient MagnetLines Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-90 dark:opacity-85"
          >
            <MagnetLines
              rows={14}
              columns={22}
              width="100vw"
              height="100vh"
              lineWidth="2px"
              lineHeight="26px"
              baseAngle={-15}
              className="h-full w-full"
            />
          </div>
          <div className="relative z-10 min-h-dvh">
            <TooltipProvider>
              {children}
              <FoxbowPet />
            </TooltipProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
