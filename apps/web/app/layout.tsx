import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wendler 5/3/1",
  description:
    "A mobile-optimized strength training app based on the popular Jim Wendler 7-week program",
  manifest: "/manifest.webmanifest",
  themeColor: "#020617",
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  },
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
