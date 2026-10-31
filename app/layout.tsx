import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title: "PaintMix Studio", description: "Paint inventory, mixing recipes, calibration tests, and live USB scale."};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
