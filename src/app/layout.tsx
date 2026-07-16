import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Engineer",
  description: "A chess training UI for playing positions against human-like policy models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <div className="phone-landscape-blocker" role="status" aria-live="polite">
          <div>
            <p className="ce-section-title">Screen too short</p>
            <strong>Rotate your device</strong>
            <span>Chess Engineer needs portrait mode on phones.</span>
          </div>
        </div>
      </body>
    </html>
  );
}
