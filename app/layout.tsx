import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuchao Wang — Creative Developer",
  description:
    "The portfolio of Yuchao Wang, a Sydney-based frontend and creative technology developer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
