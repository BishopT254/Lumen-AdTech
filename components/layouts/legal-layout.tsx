import type React from "react"

interface LegalLayoutProps {
  children: React.ReactNode
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ children }) => {
  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto py-12">{children}</main>
    </div>
  )
}

