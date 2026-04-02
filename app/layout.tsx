import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brotherhood",
  description: "Deep Work Accountability Brotherhood",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} dark h-full`}>
      <body className="min-h-full bg-[#0d0f14] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
