import type React from "react"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import SiteLayout from "@/components/layouts/site-layout";
import { Toaster } from "sonner";
import { NotificationProvider } from "@/components/contexts/notification-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumen AdTech Platform",
  description: "AI-Powered Smart AdTech Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={inter.className}>
        <Providers>
		 <NotificationProvider>
          <SiteLayout>
            {children}
          </SiteLayout>
		  <Toaster position="top-right" />
		  </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
