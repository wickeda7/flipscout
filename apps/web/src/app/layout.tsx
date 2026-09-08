import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
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
      <body>
        <I18nProvider><AuthProvider>{children}</AuthProvider></I18nProvider>
      </body>
    </html>
  );
}
