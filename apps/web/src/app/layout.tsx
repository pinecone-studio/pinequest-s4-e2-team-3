import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// The Polaris design pairs two typefaces:
// Plus Jakarta Sans for body/UI, Instrument Serif for display headings.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Polaris · AI Travel Companion",
  description:
    "A flexible AI travel companion that reshapes your day around the weather, crowds and how you feel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${instrument.variable}`}>
      <body className="bg-zinc-950 text-ink antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          {/* Phone shell — overflow:hidden clips rounded corners; transform contains fixed children */}
          <div
            className="relative h-[844px] w-[390px] overflow-hidden rounded-[44px] bg-sand shadow-[0_40px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.07]"
            style={{ transform: "translateZ(0)" }}
          >
            {/* Dynamic island */}
            <div
              className="pointer-events-none absolute left-1/2 top-[14px] z-[200] h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black"
              aria-hidden="true"
            />
            {/* Home indicator */}
            <div
              className="pointer-events-none absolute bottom-[8px] left-1/2 z-[200] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/25"
              aria-hidden="true"
            />
            {/* Scrollable content — pt-12 clears the dynamic island */}
            <div
              className="h-full overflow-y-auto overflow-x-hidden pt-12"
              style={{ "--device-h": "796px" } as React.CSSProperties}
            >
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
              >
                Skip to content
              </a>
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
