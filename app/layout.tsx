import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import PageTransition from "@/components/PageTransition";
import CallManager from "@/components/CallManager";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRoom — Private, browser-based video calling",
  description:
    "CRoom is a privacy-first, browser-based video calling platform. No downloads, no call recordings stored, peer-to-peer by design.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable}`}>
      <body className="bg-paper font-body text-ink antialiased">
        <AuthProvider>
          <CallProvider>
            {/* CallManager is a sibling of PageTransition, not nested
                inside it — see the comment in CallManager.tsx for why
                that matters. */}
            <CallManager />
            <PageTransition>{children}</PageTransition>
          </CallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
