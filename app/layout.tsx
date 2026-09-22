import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicShield Command Center",
  description:
    "CivicShield Labs public-safety simulation command center"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
