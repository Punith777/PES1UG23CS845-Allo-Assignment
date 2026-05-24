import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Multi-warehouse inventory & order fulfillment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 px-4 py-4 shadow-lg shadow-black/20 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black text-white shadow-lg shadow-violet-950/50 ring-1 ring-white/20 transition-transform group-hover:scale-105">
              A
            </div>
            <span className="text-3xl font-black leading-none tracking-tight text-white drop-shadow-sm">Allo</span>
            <span className="font-mono text-lg font-semibold text-neutral-300">/ inventory</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-lg font-semibold text-neutral-200">
            <Link href="/" className="rounded-xl px-4 py-2.5 transition-colors hover:bg-white/10 hover:text-white">Products</Link>
            <Link href="/reservations" className="rounded-xl px-4 py-2.5 transition-colors hover:bg-white/10 hover:text-white">Reservations</Link>
            <a href="/api/warehouses" target="_blank" className="rounded-xl px-4 py-2.5 transition-colors hover:bg-white/10 hover:text-white">Warehouses API</a>
          </nav>
          </div>
        </header>
        <main className="min-h-[calc(100vh-65px)]">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
