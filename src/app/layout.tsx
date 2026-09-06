import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlipScout",
  description: "Find clearance inventory worth flipping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
