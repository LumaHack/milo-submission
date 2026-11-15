import type { Metadata } from "next";
import { Gaegu, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const gaegu = Gaegu({ variable: "--font-gaegu", subsets: ["latin"], weight: ["700"] });

export const metadata: Metadata = {
  title: "Milo",
  description: "Explain it out loud. Milo draws what you say and grows up as you get it right.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${gaegu.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
