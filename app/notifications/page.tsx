"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import {
  Bell,
  Check,
  Filter,
  Search,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  MoreHorizontal,
  Settings,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import MessagingLayout from "@/components/layouts/messaging-layout"

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

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/notifications")

        if (!response.ok) {
          throw new Error(`Error fetching notifications: ${response.status}`)
        }

        const data = await response.json()

        // Convert string dates to Date objects
        const processedData = data.map((notification: any) => ({
          ...notification,
          createdAt: new Date(notification.createdAt),
        }))

        setNotifications(processedData)
        setFilteredNotifications(processedData)

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(processedData.map((notification: Notification) => notification.category)),
        )
        setCategories(uniqueCategories)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching notifications:", error)
        toast.error("Failed to load notifications")
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  // Filter notifications based on active tab, search query, and filters
  useEffect(() => {
    if (notifications.length === 0) return

    let filtered = [...notifications]

    // Filter by tab
    if (activeTab === "unread") {
      filtered = filtered.filter((notification) => !notification.isRead)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) || notification.message.toLowerCase().includes(query),
      )
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((notification) => notification.type === selectedType)
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((notification) => notification.category === selectedCategory)
    }

    setFilteredNotifications(filtered)
  }, [notifications, activeTab, searchQuery, selectedType, selectedCategory])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/notifications")

      if (!response.ok) {
        throw new Error(`Error refreshing notifications: ${response.status}`)
      }

      const data = await response.json()

      // Convert string dates to Date objects
      const processedData = data.map((notification: any) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
      }))

      setNotifications(processedData)
      setFilteredNotifications(processedData)
      setIsRefreshing(false)
      toast.success("Notifications refreshed")
    } catch (error) {
      console.error("Error refreshing notifications:", error)
      toast.error("Failed to refresh notifications")
      setIsRefreshing(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error marking notification as read: ${response.status}`)
      }

      // Update local state
      const updatedNotifications = notifications.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      )
      setNotifications(updatedNotifications)
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error marking all notifications as read: ${response.status}`)
      }

      // Update local state
      const updatedNotifications = notifications.map((notification) => ({ ...notification, isRead: true }))
      setNotifications(updatedNotifications)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all notifications as read")
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error deleting notification: ${response.status}`)
      }

      // Update local state
      const updatedNotifications = notifications.filter((notification) => notification.id !== id)
      setNotifications(updatedNotifications)
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  // Delete all read notifications
  const deleteAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/delete-read", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error deleting read notifications: ${response.status}`)
      }

      // Update local state
      const updatedNotifications = notifications.filter((notification) => !notification.isRead)
      setNotifications(updatedNotifications)
      toast.success("All read notifications deleted")
    } catch (error) {
      console.error("Error deleting read notifications:", error)
      toast.error("Failed to delete read notifications")
    }
  }

  // View notification details
  const viewNotificationDetails = (notification: Notification) => {
    setSelectedNotification(notification)
    setIsDetailOpen(true)

    // Mark as read if not already
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
  }

  // Handle notification action
  const handleNotificationAction = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Get badge variant based on notification type
  const getNotificationBadgeVariant = (type: NotificationType) => {
    switch (type) {
      case "info":
        return "default"
      case "warning":
        return "warning"
      case "success":
        return "success"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Format notification time
  const formatNotificationTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true })
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <MessagingLayout>
        <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">Manage your notifications and preferences</p>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <Skeleton className="h-12 w-full mb-6" />

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </MessagingLayout>
    )
  }

  return (
    <MessagingLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Manage your notifications and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deleteAllRead}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete read notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/notifications/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Notification settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {notifications.filter((n) => !n.isRead).length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {notifications.filter((n) => !n.isRead).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search notifications..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="info">Information</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedType("all")
                          setSelectedCategory("all")
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="all" className="m-0">
            <NotificationsList
              notifications={filteredNotifications}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onView={viewNotificationDetails}
              formatTime={formatNotificationTime}
              getIcon={getNotificationIcon}
              getBadgeVariant={getNotificationBadgeVariant}
            />
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <NotificationsList
              notifications={filteredNotifications}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onView={viewNotificationDetails}
              formatTime={formatNotificationTime}
              getIcon={getNotificationIcon}
              getBadgeVariant={getNotificationBadgeVariant}
            />
          </TabsContent>
        </Tabs>

        {/* Notification Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedNotification && (
                  <>
                    {getNotificationIcon(selectedNotification.type)}
                    <span>{selectedNotification?.title}</span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedNotification && (
              <div className="space-y-4">
                <div>
                  <Badge variant={getNotificationBadgeVariant(selectedNotification.type)}>
                    {selectedNotification.type.charAt(0).toUpperCase() + selectedNotification.type.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="ml-2">
                    {selectedNotification.category.charAt(0).toUpperCase() + selectedNotification.category.slice(1)}
                  </Badge>
                </div>

                <p className="text-sm">{selectedNotification.message}</p>

                <div className="text-xs text-muted-foreground">
                  <p>Received: {formatNotificationTime(selectedNotification.createdAt)}</p>
                  {selectedNotification.sender && <p>From: {selectedNotification.sender}</p>}
                </div>

                {selectedNotification.actionUrl && (
                  <Button onClick={() => handleNotificationAction(selectedNotification)} className="w-full">
                    View Details
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MessagingLayout>
  )
}

// Notifications List Component
interface NotificationsListProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onView: (notification: Notification) => void
  formatTime: (date: Date) => string
  getIcon: (type: NotificationType) => React.ReactNode
  getBadgeVariant: (type: NotificationType) => string
}

function NotificationsList({
  notifications,
  onMarkAsRead,
  onDelete,
  onView,
  formatTime,
  getIcon,
  getBadgeVariant,
}: NotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No notifications found</h3>
          <p className="text-sm text-muted-foreground">
            You don't have any notifications matching your current filters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "transition-colors hover:bg-muted/50 cursor-pointer",
            !notification.isRead && "border-l-4 border-l-primary",
          )}
          onClick={() => onView(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">{getIcon(notification.type)}</div>

              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className={cn("font-medium", !notification.isRead && "font-semibold")}>{notification.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(notification.createdAt)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.isRead && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkAsRead(notification.id)
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as read
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(notification.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>

                <div className="flex items-center gap-2 pt-1">
                  <Badge variant={getBadgeVariant(notification.type)}>
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                  </Badge>
                  <Badge variant="outline">
                    {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
