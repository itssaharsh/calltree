import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans, Martian_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const display = Funnel_Display({ subsets: ["latin"], variable: "--ff-display", weight: ["600", "800"] });
const body = Funnel_Sans({ subsets: ["latin"], variable: "--ff-body", weight: ["400", "600"] });
const mono = Martian_Mono({ subsets: ["latin"], variable: "--ff-mono", weight: ["400", "600"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://calltree.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Calltree", template: "%s · Calltree" },
  description: "When a heat warning hits, Calltree phones every isolated elderly person on a town's register, asks three questions, and sends a human only to the ones who didn't pick up or said something worrying.",
  openGraph: { title: "Calltree", description: "Heat-alert check-in calls for a town's vulnerable-persons register. Lex understands, code decides, people get the unclear ones.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#0E1220", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col contours">{children}</body>
    </html>
  );
}
