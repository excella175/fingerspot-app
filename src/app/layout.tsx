import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fingerspot Dashboard",
  description: "Dashboard integrasi Fingerspot Attendance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f8fafc] font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: "13px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#0f172a",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}
