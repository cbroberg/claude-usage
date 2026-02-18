import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Usage Dashboard",
  description: "Claude.ai usage limits and rate limits",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
