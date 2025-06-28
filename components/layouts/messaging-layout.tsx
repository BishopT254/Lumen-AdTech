"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { NotificationIndicator } from "@/components/ui/notification-indicator"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MessagingLayoutProps {
  children: React.ReactNode
}

export default function MessagingLayout({ children }: MessagingLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Check authentication
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md p-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex justify-between items-center p-4 border-b">
        <Link href="/advertiser">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <NotificationIndicator />
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}
