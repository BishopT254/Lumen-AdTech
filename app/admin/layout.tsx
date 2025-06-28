"use client"

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signOut, SessionProvider } from "next-auth/react"
import { useTheme } from "next-themes"
import { useDebounce } from '@/app/hooks/use-debounce'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Tv2,
  Megaphone,
  CreditCard,
  Settings,
  Bell,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  PanelLeft,
  Layers,
  Palette,
  Zap,
  FileText,
  HelpCircle,
  Briefcase,
  ShieldCheck,
  Gauge,
  Boxes,
  Truck,
  LineChart,
  Landmark,
  Leaf,
  User,
  UserCog,
  AlertCircle,
  MessageSquare,
  Mail,
  ArrowRight,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { VariantProps } from "class-variance-authority"
import type { badgeVariants } from "@/components/ui/badge"
import Header from "@/components/layouts/header"

interface AdminLayoutProps {
  children: React.ReactNode
}

type Notification = {
  id: number
  title: string
  time: string
  read: boolean
  type?: "info" | "warning" | "success" | "error"
}

type SearchResult = {
  id: string | number
  title: string
  description?: string
  type: 'user' | 'campaign' | 'device' | 'analytics' | 'report' | 'partner'
  icon: React.ReactNode
  href: string
  relevance: number
  createdAt?: string | Date
  updatedAt?: string | Date
}

type Message = {
  id: number
  from: string
  content: string
  time: string
  read: boolean
}

// Define badge variant type based on the component types
type BadgeVariant = Exclude<VariantProps<typeof badgeVariants>["variant"], null | undefined>

// Navigation items with grouping - move outside the component for better performance
const navigationItems = [
  {
    group: "Core",
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: <LayoutDashboard className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Users",
        href: "/admin/users",
        icon: <Users className="h-5 w-5" />,
        badge: { text: "New", variant: "default" as BadgeVariant },
      },
    ],
  },
  {
    group: "Advertising",
    items: [
      {
        name: "Campaigns",
        href: "/admin/campaigns",
        icon: <Megaphone className="h-5 w-5" />,
        badge: { text: "8", variant: "outline" as BadgeVariant },
      },
      {
        name: "Ad Creatives",
        href: "/admin/ad-creatives",
        icon: <Palette className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "AB Tests",
        href: "/admin/ab-tests",
        icon: <Layers className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Advertisers",
        href: "/admin/advertisers",
        icon: <Briefcase className="h-5 w-5" />,
        badge: null,
      },
    ],
  },
  {
    group: "Network",
    items: [
      {
        name: "Devices",
        href: "/admin/devices",
        icon: <Tv2 className="h-5 w-5" />,
        badge: { text: "3", variant: "destructive" as BadgeVariant },
      },
      {
        name: "Partners",
        href: "/admin/partners",
        icon: <Boxes className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Logistics",
        href: "/admin/logistics",
        icon: <Truck className="h-5 w-5" />,
        badge: null,
      },
    ],
  },
  {
    group: "Insights",
    items: [
      {
        name: "Analytics",
        href: "/admin/analytics",
        icon: <BarChart3 className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Performance",
        href: "/admin/performance",
        icon: <Gauge className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Reports",
        href: "/admin/reports",
        icon: <FileText className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Audience",
        href: "/admin/audience",
        icon: <Users className="h-5 w-5" />,
        badge: null,
      },
    ],
  },
  {
    group: "Finance",
    items: [
      {
        name: "Payments",
        href: "/admin/payments",
        icon: <CreditCard className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Billing",
        href: "/admin/billing",
        icon: <Landmark className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Revenue",
        href: "/admin/revenue",
        icon: <LineChart className="h-5 w-5" />,
        badge: null,
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        name: "Settings",
        href: "/admin/settings",
        icon: <Settings className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Security",
        href: "/admin/security",
        icon: <ShieldCheck className="h-5 w-5" />,
        badge: null,
      },
      {
        name: "Sustainability",
        href: "/admin/sustainability",
        icon: <Leaf className="h-5 w-5" />,
        badge: { text: "New", variant: "success" as BadgeVariant },
      },
    ],
  },
]

// Quick actions - move outside the component
const quickActions = [
  { name: "Create Campaign", icon: <Megaphone className="h-4 w-4" />, href: "/admin/campaigns/new" },
  { name: "Add Device", icon: <Tv2 className="h-4 w-4" />, href: "/admin/devices/new" },
  { name: "Generate Report", icon: <FileText className="h-4 w-4" />, href: "/admin/reports/new" },
  { name: "View Analytics", icon: <BarChart3 className="h-4 w-4" />, href: "/admin/analytics" },
]

// User navigation items - move outside the component
const userNavigation = [
  { name: "Your Profile", href: "/admin/profile", icon: <User className="h-4 w-4" /> },
  { name: "Account Settings", href: "/admin/settings", icon: <UserCog className="h-4 w-4" /> },
  { name: "Help & Support", href: "/contact", icon: <HelpCircle className="h-4 w-4" /> },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const { theme, setTheme } = useTheme()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [sessionExpiredDialog, setSessionExpiredDialog] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setIsSearchExpanded(true)
    }
    
    // Escape to close search
    if (e.key === 'Escape' && isSearchExpanded) {
      setIsSearchExpanded(false)
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isSearchExpanded])

  // Define notifications state in the main component
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: "New advertiser registered", time: "5 minutes ago", read: false, type: "info" },
    { id: 2, title: "Campaign approval required", time: "1 hour ago", read: false, type: "warning" },
    { id: 3, title: "System update completed", time: "2 hours ago", read: true, type: "success" },
    { id: 4, title: "Partner payout processed", time: "Yesterday", read: true, type: "info" },
  ])

  // Define messages state in the main component
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "Sarah Johnson",
      content: "Can you review the latest campaign?",
      time: "10 minutes ago",
      read: false,
    },
    { id: 2, from: "Mark Williams", content: "Budget approval needed", time: "1 hour ago", read: false },
    { id: 3, from: "Alex Chen", content: "Performance report is ready", time: "3 hours ago", read: true },
  ])

  // Prevent unnecessary re-renders
  const memoizedNavigationItems = React.useMemo(() => navigationItems, [])
  const memoizedQuickActions = React.useMemo(() => quickActions, [])
  const memoizedUserNavigation = React.useMemo(() => userNavigation, [])

  // Check if user is authenticated
  useEffect(() => {
    // Only redirect if we're definitely not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Session expiration check
  useEffect(() => {
    if (!session) return

    // Check if session has an expiry time
    const sessionExpiry = session.expires ? new Date(session.expires) : null
    let intervalId: NodeJS.Timeout

    if (sessionExpiry) {
      const checkSessionValidity = () => {
        const now = new Date()

        // If session is expired, show dialog
        if (sessionExpiry < now) {
          setSessionExpiredDialog(true)
          return
        }

        // If session will expire in less than 5 minutes, try to refresh it
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
        if (sessionExpiry < fiveMinutesFromNow) {
          // Try to refresh the session
          updateSession().catch((error) => {
            console.error("Error refreshing session:", error)
          })
        }
      }

      // Check immediately
      checkSessionValidity()

      // Then check periodically
      intervalId = setInterval(checkSessionValidity, 60 * 1000) // Check every minute
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [session, updateSession])

  // Automatically collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true)
      } else if (window.innerWidth >= 1600) {
        // Optionally expand on very large screens
        setIsSidebarCollapsed(false)
      }
    }

    // Run once on mount
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!session?.user?.name) return "U"
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Get user role from session
  const getUserRole = () => {
    return session?.user?.role || "Administrator"
  }

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!searchQuery.trim()) {
    return // Don't search empty queries
  }

  setIsSearching(true)

  try {
    // Create a comprehensive search across multiple entities
    const searchResults = await performSearch(searchQuery)
    
    // Store results in local state or context
    // You could add a searchResults state to store these results
    // setSearchResults(searchResults)
    
    // Navigate to search results page with the query
    router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`)
    
    // Reset search expansion on mobile after search
    if (window.innerWidth < 768) {
      setIsSearchExpanded(false)
    }
  } catch (error) {
    console.error("Search error:", error)
    // Implement error handling - you could add a toast notification here
  } finally {
    setIsSearching(false)
  }
}

// Comprehensive search function that searches across multiple entities
const performSearch = async (query: string): Promise<SearchResult[]> => {
  // You would typically make API calls to your backend search endpoints
  const normalizedQuery = query.toLowerCase().trim()
  
  try {
    // Make parallel API requests for better performance
    const [usersResults, campaignsResults, devicesResults, analyticsResults] = await Promise.all([
      // These would be actual API calls to your search endpoints
      fetch(`/api/search/users?q=${encodeURIComponent(normalizedQuery)}`).then(res => res.json()),
      fetch(`/api/search/campaigns?q=${encodeURIComponent(normalizedQuery)}`).then(res => res.json()),
      fetch(`/api/search/devices?q=${encodeURIComponent(normalizedQuery)}`).then(res => res.json()),
      fetch(`/api/search/analytics?q=${encodeURIComponent(normalizedQuery)}`).then(res => res.json()),
    ])
    
    // Process and combine results
    const combinedResults = [
      ...usersResults.map((item: any) => ({ 
        ...item, 
        type: 'user',
        icon: <Users className="h-4 w-4" />,
        href: `/admin/users/${item.id}`
      })),
      ...campaignsResults.map((item: any) => ({ 
        ...item, 
        type: 'campaign',
        icon: <Megaphone className="h-4 w-4" />,
        href: `/admin/campaigns/${item.id}`
      })),
      ...devicesResults.map((item: any) => ({ 
        ...item, 
        type: 'device',
        icon: <Tv2 className="h-4 w-4" />,
        href: `/admin/devices/${item.id}`
      })),
      ...analyticsResults.map((item: any) => ({ 
        ...item, 
        type: 'analytics',
        icon: <BarChart3 className="h-4 w-4" />,
        href: `/admin/analytics/${item.id}`
      })),
    ]
    
    // Sort results by relevance (if your API provides a relevance score)
    // or simply sort by most recent
    combinedResults.sort((a, b) => b.relevance - a.relevance)
    
    return combinedResults
  } catch (error) {
    console.error("Error performing search:", error)
    throw new Error("Failed to perform search. Please try again.")
  }
}


  // Mark all notifications as read
  const markAllAsRead = () => {
    try {
      setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  // Mark a single notification as read
  const markAsRead = (id: number) => {
    try {
      setNotifications(
        notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      )
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error)
    }
  }

  // Count unread notifications
  const unreadCount = notifications.filter((notification) => !notification.read).length

  // Count unread messages
  const unreadMessageCount = messages.filter((message) => !message.read).length

  // Mark a message as read
  const markMessageAsRead = (id: number) => {
    setMessages(messages.map((message) => (message.id === id ? { ...message, read: true } : message)))
  }

  // Mark all messages as read
  const markAllMessagesAsRead = () => {
    setMessages(messages.map((message) => ({ ...message, read: true })))
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error signing out:", error)
      // Fallback redirect in case the signOut function fails
      router.push("/auth/signin")
    }
  }

  // Handle session refresh
  const handleSessionRefresh = async () => {
    try {
      await updateSession()
      setSessionExpiredDialog(false)
    } catch (error) {
      console.error("Error refreshing session:", error)
      // If session refresh fails, we should prompt the user to log in again
      router.push("/auth/signin")
    }
  }

  // Get notification icon based on type
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "success":
        return <Zap className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "info":
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  // Helper function to safely capitalize the first letter of a string
  const capitalizeFirstLetter = (str: string | undefined | null): string => {
    if (!str) return ""
    // Replace dashes with spaces and capitalize each word
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Get the current page title from pathname
  const getPageTitle = (): string => {
    if (!pathname) return "Dashboard"

    if (pathname === "/admin") return "Dashboard"

    // Extract the last segment of the path
    const lastSegment = pathname.split("/").pop()

    return capitalizeFirstLetter(lastSegment)
  }

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-[400px]">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <Skeleton className="h-[200px] w-full rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[90%]" />
          </div>
        </div>
      </div>
    )
  }

  if (pathname === "/") {
    return <SessionProvider>{children}</SessionProvider>
  }

  return (
    <SessionProvider>
      {/* Include the global header on all admin pages */}
      <Header />

      <div className="flex h-screen bg-background pt-16">
        {" "}
        {/* Add pt-16 to account for the global header */}
        {/* Desktop Sidebar - No changes */}
        <aside
          className={cn(
            "fixed inset-y-0 z-20 flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "w-[70px]" : "w-64",
            "top-16", // Adjust top position to account for the global header
          )}
        >
          {/* Sidebar Header */}
          <div
            className={cn(
              "flex h-16 items-center border-b px-4",
              isSidebarCollapsed ? "justify-center" : "justify-between",
            )}
          >
            {!isSidebarCollapsed && (
              <Link href="/admin" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Lumen</span>
              </Link>
            )}
            {isSidebarCollapsed && (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            {!isSidebarCollapsed && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(true)} className="h-8 w-8">
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sidebar Content */}
          <ScrollArea className="flex-1 py-2">
            <nav className="space-y-6 px-2">
              {memoizedNavigationItems.map((group) => (
                <div key={group.group} className="space-y-2">
                  {!isSidebarCollapsed && (
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground">{group.group}</h3>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.name}>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                  pathname === item.href
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  isSidebarCollapsed ? "justify-center" : "justify-start",
                                )}
                              >
                                {item.icon}
                                {!isSidebarCollapsed && <span className="ml-3">{item.name}</span>}
                                {!isSidebarCollapsed && item.badge && (
                                  <Badge
                                    variant={(item.badge.variant as BadgeVariant) || "default"}
                                    className="ml-auto"
                                  >
                                    {item.badge.text}
                                  </Badge>
                                )}
                              </Link>
                            </TooltipTrigger>
                            {isSidebarCollapsed && (
                              <TooltipContent side="right">
                                <div className="flex items-center">
                                  <span>{item.name}</span>
                                  {item.badge && (
                                    <Badge variant={(item.badge.variant as BadgeVariant) || "default"} className="ml-2">
                                      {item.badge.text}
                                    </Badge>
                                  )}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="mt-auto border-t p-4">
            {!isSidebarCollapsed && (
              <div className="flex flex-col space-y-4">
                <div className="text-xs font-semibold text-muted-foreground">Quick Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {memoizedQuickActions.map((action) => (
                    <Link
                      key={action.name}
                      href={action.href}
                      className="flex items-center rounded-md border p-2 text-xs font-medium hover:bg-accent"
                    >
                      {action.icon}
                      <span className="ml-2">{action.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className={cn("w-full justify-center", isSidebarCollapsed ? "h-10 px-0" : "")}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? (
                  <>
                    <ChevronDown className="h-4 w-4 rotate-90 mr-0" />
                    <span className="sr-only">Expand</span>
                  </>
                ) : (
                  <>
                    <PanelLeft className="mr-2 h-4 w-4" />
                    <span>Collapse</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </aside>
        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
            <div className="flex h-16 items-center border-b px-6">
              <Link href="/admin" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Lumen</span>
              </Link>
            </div>
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <nav className="space-y-6 p-6">
                {memoizedNavigationItems.map((group) => (
                  <div key={group.group} className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground">{group.group}</h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              pathname === item.href
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {item.icon}
                            <span className="ml-3">{item.name}</span>
                            {item.badge && (
                              <Badge variant={(item.badge.variant as BadgeVariant) || "default"} className="ml-auto">
                                {item.badge.text}
                              </Badge>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Add Quick Actions to Mobile Menu */}
                <div className="space-y-3 mt-6">
                  <h3 className="text-xs font-semibold text-muted-foreground">Quick Actions</h3>
                  <ul className="space-y-2">
                    {memoizedQuickActions.map((action) => (
                      <li key={action.name}>
                        <Link
                          href={action.href}
                          className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {action.icon}
                          <span className="ml-3">{action.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        {/* Main Content */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "lg:pl-[70px]" : "lg:pl-64",
          )}
        >
          {/* Admin Header - Modified to move search to left and add messages */}
          <header className="sticky top-16 z-50 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search - Moved to the left side */}
              <div className={cn("relative ml-2", isSearchExpanded ? "w-full md:w-64" : "w-auto")}>
                {isSearchExpanded ? (
                  <form onSubmit={handleSearch} className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      className="w-full rounded-md border bg-background pl-8 pr-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isSearching}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 px-0"
                      onClick={() => setIsSearchExpanded(false)}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                      ) : (
                        "×"
                      )}
                    </Button>
                  </form>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setIsSearchExpanded(true)}
                        >
                          <Search className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <div className="hidden md:block ml-4">
                <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
              </div>
            </div>

            {/* Right side header items */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Theme Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="h-9 w-9"
                    >
                      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Messages */}
              <DropdownMenu>
				  <DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="h-9 w-9 relative">
					  <MessageSquare className="h-5 w-5" />
					  {unreadMessageCount > 0 && (
						<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
						  {unreadMessageCount}
						</span>
					  )}
					  <span className="sr-only">Open messages</span>
					</Button>
				  </DropdownMenuTrigger>
				  <DropdownMenuContent 
				  align="center" 
				  side="bottom"
				  sideOffset={8}
				  className="w-[320px] sm:w-[380px] max-h-[85vh] rounded-xl overflow-hidden border-0 shadow-2xl"
				  avoidCollisions={true}
				>
				  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-4">
					<div className="flex items-center justify-between">
					  <div className="flex items-center gap-2">
						<div className="bg-white/20 p-1.5 rounded-full">
						  <MessageSquare className="h-4 w-4 text-white" />
						</div>
						<DropdownMenuLabel className="text-base font-medium text-white m-0 p-0">
						  Messages
						</DropdownMenuLabel>
					  </div>
					  <Button 
						variant="ghost" 
						size="sm" 
						onClick={markAllMessagesAsRead}
						className="h-8 text-xs text-white/90 hover:text-white hover:bg-white/10"
					  >
						Mark all as read
					  </Button>
					</div>
					{unreadMessageCount > 0 && (
					  <div className="mt-2 p-1.5 bg-white/10 rounded-md text-xs text-white/90">
						You have {unreadMessageCount} unread message{unreadMessageCount !== 1 ? 's' : ''}
					  </div>
					)}
				  </div>
				  
				  {messages.length > 0 ? (
					<ScrollArea className="max-h-[320px]">
					  {messages.map((message) => (
						<div
						  key={message.id}
						  className={cn(
							"flex gap-3 p-3 transition-all duration-200 border-l-2 hover:bg-muted/70 cursor-pointer",
							!message.read 
							  ? "border-l-indigo-500 bg-muted/50" 
							  : "border-l-transparent"
						  )}
						  onClick={() => markMessageAsRead(message.id)}
						>
						  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600">
							{message.from.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()}
						  </div>
						  <div className="flex-1 space-y-1 min-w-0">
							<div className="flex items-center justify-between">
							  <p className={cn("text-sm truncate", !message.read && "font-medium")}>{message.from}</p>
							  <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{message.time}</p>
							</div>
							<p className="text-sm text-muted-foreground truncate">{message.content}</p>
							{!message.read && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 absolute right-4" />}
						  </div>
						</div>
					  ))}
					</ScrollArea>
				  ) : (
					<div className="py-12 text-center">
					  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<MessageSquare className="h-6 w-6 text-muted-foreground" />
					  </div>
					  <p className="text-sm font-medium">No messages</p>
					  <p className="mt-1 text-xs text-muted-foreground">Your inbox is empty</p>
					</div>
				  )}
				  
				  <div className="grid grid-cols-2 gap-2 p-3 border-t mt-2">
					<Link href="/messages/new">
					  <Button variant="outline" size="sm" className="w-full">
						<Mail className="mr-2 h-4 w-4" />
						New Message
					  </Button>
					</Link>
					<Link href="/messages">
					  <Button variant="default" size="sm" className="w-full">
						View All
						<ArrowRight className="ml-2 h-4 w-4" />
					  </Button>
					</Link>
				  </div>
				</DropdownMenuContent>
				</DropdownMenu>

              {/* Notifications */}
              <DropdownMenu>
				  <DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="h-9 w-9 relative">
					  <Bell className="h-5 w-5" />
					  {unreadCount > 0 && (
						<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
						  {unreadCount}
						</span>
					  )}
					  <span className="sr-only">Open notifications</span>
					</Button>
				  </DropdownMenuTrigger>
				  <DropdownMenuContent 
				  align="center" 
				  side="bottom"
				  sideOffset={8}
				  className="w-[320px] sm:w-[380px] max-h-[85vh] rounded-xl overflow-hidden border-0 shadow-2xl"
				  avoidCollisions={true}
				>
				  <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
					<div className="flex items-center justify-between">
					  <div className="flex items-center gap-2">
						<div className="bg-white/20 p-1.5 rounded-full">
						  <Bell className="h-4 w-4 text-white" />
						</div>
						<DropdownMenuLabel className="text-base font-medium text-white m-0 p-0">
						  Notifications
						</DropdownMenuLabel>
					  </div>
					  <Button 
						variant="ghost" 
						size="sm" 
						onClick={markAllAsRead}
						className="h-8 text-xs text-white/90 hover:text-white hover:bg-white/10"
					  >
						Mark all as read
					  </Button>
					</div>
					{unreadCount > 0 && (
					  <div className="mt-2 p-1.5 bg-white/10 rounded-md text-xs text-white/90">
						You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
					  </div>
					)}
				  </div>
				  
				  {notifications.length > 0 ? (
					<ScrollArea className="max-h-[320px]">
					  {notifications.map((notification) => (
						<div
						  key={notification.id}
						  className={cn(
							"flex items-start gap-3 p-3 transition-all duration-200 border-l-2 hover:bg-muted/70 cursor-pointer",
							!notification.read 
							  ? "border-l-primary bg-muted/50" 
							  : "border-l-transparent"
						  )}
						  onClick={() => markAsRead(notification.id)}
						>
						  <div className={cn(
							"flex h-9 w-9 items-center justify-center rounded-full",
							notification.type === "warning" ? "bg-amber-100 text-amber-600" :
							notification.type === "success" ? "bg-green-100 text-green-600" :
							notification.type === "error" ? "bg-red-100 text-red-600" : 
							"bg-blue-100 text-blue-600"
						  )}>
							{getNotificationIcon(notification.type)}
						  </div>
						  <div className="flex-1 space-y-1">
							<p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
							<p className="text-xs text-muted-foreground flex items-center gap-1">
							  <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60"></span>
							  {notification.time}
							</p>
						  </div>
						</div>
					  ))}
					</ScrollArea>
				  ) : (
					<div className="py-12 text-center">
					  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Bell className="h-6 w-6 text-muted-foreground" />
					  </div>
					  <p className="text-sm font-medium">No notifications</p>
					  <p className="mt-1 text-xs text-muted-foreground">We'll notify you when something arrives</p>
					</div>
				  )}
				  
				  <div className="p-3 border-t mt-2">
					<Link href="/notifications">
					  <Button variant="ghost" className="w-full justify-center text-primary hover:text-primary hover:bg-primary/10">
						View all notifications
						<ArrowRight className="ml-2 h-4 w-4" />
					  </Button>
					</Link>
				  </div>
				</DropdownMenuContent>
				</DropdownMenu>

              {/* Help */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/contact">
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <HelpCircle className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Help & Resources</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Menu - Enhanced */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 pr-1 pl-2 overflow-hidden">
                    <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                      <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex md:flex-col md:items-start md:leading-none">
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {session?.user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{getUserRole()}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="right" className="w-64 p-0 overflow-hidden">
                  {/* Ultra-modern header with gradient */}
                  <div className="bg-gradient-to-r from-primary/90 to-primary p-4 text-primary-foreground">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
                        <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                        <AvatarFallback className="text-primary-foreground">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{session?.user?.name || "User"}</p>
                        <p className="text-xs text-primary-foreground/80">{getUserRole()}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-primary-foreground/80 truncate">
                      {session?.user?.email || "user@example.com"}
                    </div>
                  </div>

                  {/* Main menu items with hover effects */}
                  <div className="py-2">
                    <Link
                      href="/admin/profile"
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="mr-3 h-4 w-4" />
                      <span>Your Profile</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Account Settings</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <HelpCircle className="mr-3 h-4 w-4" />
                      <span>Help & Support</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Link>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Sign out button */}
                  <div className="p-2">
                    <Button
                      onClick={handleSignOut}
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Sign out</span>
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Top Action Bar */}
          <div className="border-b bg-muted/40 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-lg font-semibold md:hidden">{getPageTitle()}</h1>
              <div className="flex items-center gap-2">
                {/* Contextual action buttons based on current page */}
                {pathname?.includes("/campaigns") && (
                  <Button size="sm" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                )}
                {pathname?.includes("/users") && (
                  <Button size="sm" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                )}
                <Button size="sm">
                  {pathname?.includes("/campaigns") ? (
                    <Megaphone className="mr-2 h-4 w-4" />
                  ) : pathname?.includes("/users") ? (
                    <User className="mr-2 h-4 w-4" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {pathname?.includes("/campaigns")
                    ? "New Campaign"
                    : pathname?.includes("/users")
                      ? "Add User"
                      : "Quick Action"}
                </Button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>

          {/* Footer */}
          <footer className="border-t py-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                  <Zap className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} Lumen AdTech Platform. All rights reserved.
                </p>
              </div>
              <div className="mt-4 flex space-x-4 sm:mt-0">
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                  Help
                </Link>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy
                </Link>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms
                </Link>
              </div>
            </div>
          </footer>
        </div>
        {/* Session Expired Dialog */}
        <Dialog open={sessionExpiredDialog} onOpenChange={setSessionExpiredDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Expired</DialogTitle>
              <DialogDescription>
                Your session has expired. Would you like to continue working or sign out?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
              <Button onClick={handleSessionRefresh}>Continue Working</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SessionProvider>
  )
}
