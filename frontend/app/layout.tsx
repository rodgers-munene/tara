import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { SWRConfig } from "swr";
import { AuthProvider } from "./components/AuthProvider";
import { OfflineProvider } from "./components/OfflineProvider";
import "./globals.css";
import { SerwistProvider } from "@serwist/turbopack/react";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { InstallPrompt } from "./components/InstallPrompt";

export const metadata: Metadata = {
  title: "Tara POS",
  description: "Point of Sale for your shop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-svh flex flex-col">
        <SerwistProvider swUrl="/serwist/sw.js">
          <UpdatePrompt />
          <InstallPrompt />
          <SWRConfig
          value={{
            revalidateOnFocus: true,
            revalidateIfStale: true,
            dedupingInterval: 4000,
            errorRetryCount: 2,
          }}
        >
          <AuthProvider>
            <OfflineProvider>{children}</OfflineProvider>
          </AuthProvider>
        </SWRConfig>
        </SerwistProvider>
      </body>
    </html>
  );
}
