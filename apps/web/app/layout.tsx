import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wendler 5/3/1",
  description: "A mobile-optimized strength training app based on the popular Jim Wendler 7-week program",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
