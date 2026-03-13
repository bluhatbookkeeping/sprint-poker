import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprint Poker",
  description: "Fun planning poker for agile teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
