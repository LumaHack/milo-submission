import type { Metadata } from "next";
import { Caveat, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500", "600"] });
// Nolan's handwriting. Only used for the notes he writes down.
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Nolan",
  description: "Nolan interviews each witness alone, out loud, and shows the investigator where the accounts agree and differ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
