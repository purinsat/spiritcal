import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpiritCal - SpiritVale Stat Calculator",
  description:
    "A free, fun character stat calculator for the game SpiritVale. Compute attack, defense, crit, HP/MP and more, compare builds, and save presets. Made by KRUN-KID.",
  applicationName: "SpiritCal",
  authors: [{ name: "KRUN-KID", url: "https://www.youtube.com/@KRUN-KID" }],
  keywords: ["SpiritVale", "SpiritCal", "calculator", "stats", "damage", "KRUN-KID"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid a flash of the wrong palette. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('spiritcal.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
