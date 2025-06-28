"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

// Types
type NotificationType = "info" | "warning" | "success" | "error"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  createdAt: Date
  category: string
  actionUrl?: string
  sender?: string
  relatedEntityId?: string
  relatedEntityType?: string
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  content: string
  isRead: boolean
  isStarred: boolean
  createdAt: Date
  readAt?: Date
}

interface NotificationContextType {
  notifications: Notification[]
  unreadNotificationsCount: number
  messages: Message[]
  unreadMessagesCount: number
  markNotificationAsRead: (id: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
  refreshMessages: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate unread counts
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length
  const unreadMessagesCount = messages.filter((m) => !m.isRead).length

  // Fetch notifications and messages
  useEffect(() => {
    const fetchData = async () => {
      if (status !== "authenticated") return

      setIsLoading(true)
      try {
        // In production, these would be API calls
        // const notificationsResponse = await fetch('/api/notifications')
        // const messagesResponse = await fetch('/api/messages/unread')

        // Using mock data for now
        // This would be replaced with actual API calls in production

        // Simulate API call
        setTimeout(() => {
          // Mock notifications data
          const mockNotifications: Notification[] = [
            {
              id: "1",
              title: "New Campaign Approval Required",
              message: "A new campaign 'Summer Promotion 2025' requires your approval.",
              type: "warning",
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
              category: "campaigns",
              actionUrl: "/admin/campaigns/approve/123",
              relatedEntityId: "123",
              relatedEntityType: "campaign",
            },
            {
              id: "2",
              title: "Payment Processed Successfully",
              message: "Your payment of $1,250.00 for Campaign 'Brand Awareness Q2' has been processed successfully.",
              type: "success",
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
              category: "billing",
              actionUrl: "/admin/billing/invoice/456",
              relatedEntityId: "456",
              relatedEntityType: "payment",
            },
          ]

          // Mock messages data
          const mockMessages: Message[] = [
            {
              id: "msg-1",
              conversationId: "conv-1",
              senderId: "user-1",
              recipientId: "current-user",
              content: "Hi, can you review the latest campaign proposal I sent over?",
              isRead: false,
              isStarred: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            },
            {
              id: "msg-2",
              conversationId: "conv-4",
              senderId: "user-4",
              recipientId: "current-user",
              content: "I'm particularly interested in high-traffic shopping malls and supermarkets.",
              isRead: false,
              isStarred: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
            },
          ]

          setNotifications(mockNotifications)
          setMessages(mockMessages)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching notifications:", error)
        setIsLoading(false)
      }
    }

    fetchData()

    // Set up polling for new notifications
    const intervalId = setInterval(fetchData, 60000) // Poll every minute

    return () => clearInterval(intervalId)
  }, [status])

  // Mark notification as read
  const markNotificationAsRead = async (id: string) => {
    try {
      // In production, this would be an API call
      // await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
      throw error
    }
  }

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      // In production, this would be an API call
      // await fetch('/api/notifications/read-all', { method: 'PUT' })

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all notifications as read")
      throw error
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      // In production, this would be an API call
      // await fetch(`/api/notifications/${id}`, { method: 'DELETE' })

      // Update local state
      setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
      throw error
    }
  }

  // Refresh notifications
  const refreshNotifications = async () => {
    try {
      // In production, this would be an API call
      // const response = await fetch('/api/notifications')
      // const data = await response.json()
      // setNotifications(data)

      // Using mock data for now
      toast.success("Notifications refreshed")
    } catch (error) {
      console.error("Error refreshing notifications:", error)
      toast.error("Failed to refresh notifications")
      throw error
    }
  }

  // Refresh messages
  const refreshMessages = async () => {
    try {
      // In production, this would be an API call
      // const response = await fetch('/api/messages/unread')
      // const data = await response.json()
      // setMessages(data)

      // Using mock data for now
      toast.success("Messages refreshed")
    } catch (error) {
      console.error("Error refreshing messages:", error)
      toast.error("Failed to refresh messages")
      throw error
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadNotificationsCount,
        messages,
        unreadMessagesCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        refreshNotifications,
        refreshMessages,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
