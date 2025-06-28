"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NotificationIndicatorProps {
  className?: string
}

export function NotificationIndicator({ className }: NotificationIndicatorProps) {
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  useEffect(() => {
    // Function to fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        // Fetch unread notifications count
        const notificationsResponse = await fetch("/api/notifications/unread-count")
        if (notificationsResponse.ok) {
          const notificationsData = await notificationsResponse.json()
          setUnreadNotificationsCount(notificationsData.count)
        }

        // Fetch unread messages count
        const messagesResponse = await fetch("/api/messages/unread-count")
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          setUnreadMessagesCount(messagesData.count)
        }
      } catch (error) {
        console.error("Error fetching unread counts:", error)
      }
    }

    // Fetch counts initially
    fetchUnreadCounts()

    // Set up polling for new notifications
    const intervalId = setInterval(fetchUnreadCounts, 30000) // Poll every 30 seconds

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link href="/messages">
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadMessagesCount > 0 && (
            <Badge variant="default" className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadMessagesCount}
            </Badge>
          )}
        </Button>
      </Link>

      <Link href="/notifications">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <Badge variant="default" className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadNotificationsCount}
            </Badge>
          )}
        </Button>
      </Link>
    </div>
  )
}
