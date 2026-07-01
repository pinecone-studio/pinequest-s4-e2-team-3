import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CheckInBanner } from "@/components/CheckInBanner";
import { OnlineStatusProvider } from "@/context/OnlineStatus";

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
  title: "PineQuest",
  description: "AI travel companion for Mongolia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PineQuest",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${instrument.variable}`}>
      <body className="bg-sand text-ink antialiased">
        <OnlineStatusProvider>
          {children}
          <CheckInBanner />
        </OnlineStatusProvider>
      </body>
    </html>
  );
}
