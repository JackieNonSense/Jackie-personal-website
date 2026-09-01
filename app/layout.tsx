import type { Metadata } from "next";
import {
  Caveat,
  Patrick_Hand,
  Courier_Prime,
  Ma_Shan_Zheng,
  IBM_Plex_Mono,
  VT323,
} from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  variable: "--font-hand-display",
  weight: "600",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-type",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const maShanZheng = Ma_Shan_Zheng({
  variable: "--font-hand-cn",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "600"],
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jackie · 深夜书房",
  description:
    "Yuchao Wang's study, late at night. Click around — things respond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${caveat.variable} ${patrickHand.variable} ${courierPrime.variable} ${maShanZheng.variable} ${ibmPlexMono.variable} ${vt323.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
