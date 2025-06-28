import type React from "react"
import { LegalLayout } from "@/components/layouts/legal-layout"

export const metadata = {
  title: "Legal Information | Lumen AI-Powered Smart AdTech Platform",
  description:
    "Legal information, policies, and compliance documentation for the Lumen AI-Powered Smart AdTech Platform.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LegalLayout>{children}</LegalLayout>
}

