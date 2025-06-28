"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { AvatarFallback } from "@/components/ui/avatar"
import { AvatarImage } from "@/components/ui/avatar"
import { Avatar } from "@/components/ui/avatar"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signOut, SessionProvider } from "next-auth/react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "@/hooks/use-debounce"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { VariantProps } from "class-variance-authority"
import type { badgeVariants } from "@/components/ui/badge"
import Header from "@/components/layouts/header"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import type { GeneralSettings, SystemSettings } from "@/hooks/usePublicSettings"
import { toast } from "sonner"

// Import Icons
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  MessageSquare,
  HelpCircle,
  Settings,
  User,
  UserCog,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  LayoutDashboard,
  Target,
  Users,
  BarChart3,
  FileText,
  TrendingUp,
  CreditCard,
  DollarSign,
  Layers,
  MapPin,
  Shield,
  Cpu,
  PieChart,
  X,
  AlertCircle,
  Zap,
  ArrowRight,
  Sparkles,
  Upload,
  Download,
  Mail,
  Megaphone,
  Palette,
  Leaf,
  Glasses,
  Image,
  Home,
  Wrench,
} from "lucide-react"

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Define the NavigationItem type here since we don't have the external file
interface NavigationItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: {
    text: string
    variant?: string
  }
}

interface NavigationGroup {
  group: string
  items: NavigationItem[]
}

interface AdvertiserLayoutProps {
  children: React.ReactNode
}

type Notification = {
  id: number
  title: string
  time: string
  read: boolean
  type?: "info" | "warning" | "success" | "error"
  campaign?: string
}

type SearchResult = {
  id: string | number
  title: string
  description?: string
  type: "campaign" | "creative" | "analytics" | "report" | "audience" | "budget"
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

type CampaignStatus = "active" | "paused" | "draft" | "scheduled" | "completed" | "rejected"

type CampaignInsight = {
  id: string
  name: string
  status: CampaignStatus
  budget: number
  spent: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cpa: number
  roi: number
}

// Define badge variant type based on the component types
type BadgeVariant = Exclude<VariantProps<typeof badgeVariants>["variant"], null | undefined>

// Define the quick actions type
interface QuickAction {
  name: string
  href: string
  icon: React.ReactNode
  description?: string
  action?: () => void
}

// Extend SystemSettings to include platformName
interface ExtendedSystemSettings extends SystemSettings {
  platformName?: string
}

export default function AdvertiserLayout({ children }: AdvertiserLayoutProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { systemSettings, generalSettings } = usePublicSettings()
  const pathname = usePathname()

  // State declarations
  const [navigationItems] = useState<NavigationGroup[]>([
    {
      group: "Campaigns",
      items: [
        {
          name: "Dashboard",
          href: "/advertiser",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          name: "Campaigns",
          href: "/advertiser/campaigns",
          icon: <Target className="h-5 w-5" />,
          badge: { text: "3", variant: "outline" },
        },
        {
          name: "Creatives",
          href: "/advertiser/creatives",
          icon: <Image className="h-5 w-5" />,
        },
        {
          name: "Audiences",
          href: "/advertiser/audiences",
          icon: <Users className="h-5 w-5" />,
        },
      ],
    },
    {
      group: "Performance",
      items: [
        {
          name: "Analytics",
          href: "/advertiser/analytics",
          icon: <BarChart3 className="h-5 w-5" />,
        },
        {
          name: "Reports",
          href: "/advertiser/reports",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          name: "Conversions",
          href: "/advertiser/conversions",
          icon: <TrendingUp className="h-5 w-5" />,
        },
      ],
    },
    {
      group: "Finance",
      items: [
        {
          name: "Billing",
          href: "/advertiser/billing",
          icon: <CreditCard className="h-5 w-5" />,
        },
        {
          name: "Budgets",
          href: "/advertiser/budgets",
          icon: <DollarSign className="h-5 w-5" />,
        },
        {
          name: "Invoices",
          href: "/advertiser/invoices",
          icon: <FileText className="h-5 w-5" />,
        },
      ],
    },
    {
      group: "Management",
      items: [
        {
          name: "Ad Inventory",
          href: "/advertiser/inventory",
          icon: <Layers className="h-5 w-5" />,
        },
        {
          name: "Placements",
          href: "/advertiser/placements",
          icon: <MapPin className="h-5 w-5" />,
        },
        {
          name: "Scheduling",
          href: "/advertiser/scheduling",
          icon: <Calendar className="h-5 w-5" />,
        },
      ],
    },
    {
      group: "Settings",
      items: [
        {
          name: "Account",
          href: "/advertiser/settings",
          icon: <Settings className="h-5 w-5" />,
        },
        {
          name: "Security",
          href: "/advertiser/security",
          icon: <Shield className="h-5 w-5" />,
        },
        {
          name: "API Access",
          href: "/advertiser/api",
          icon: <Cpu className="h-5 w-5" />,
          badge: { text: "New", variant: "success" },
        },
      ],
    },
    // Conditionally show Sustainability based on settings
    ...(systemSettings?.featureFlags?.carbonTrackingEnabled
      ? [
          {
            group: "Sustainability",
            items: [
              {
                name: "Carbon Tracking",
                href: "/advertiser/sustainability",
                icon: <Leaf className="h-5 w-5" />,
                badge: { text: "New", variant: "success" as BadgeVariant },
              },
            ],
          },
        ]
      : []),
    // Conditionally show AR/VR features based on feature flags
    ...(systemSettings?.featureFlags?.arVrFeatures
      ? [
          {
            group: "Immersive",
            items: [
              {
                name: "AR/VR Experiences",
                href: "/advertiser/ar-vr",
                icon: <Glasses className="h-5 w-5" />,
                badge: { text: "Beta", variant: "outline" as BadgeVariant },
              },
            ],
          },
        ]
      : []),
  ])

  const [sidebarMode, setSidebarMode] = useState<"expanded" | "collapsed" | "iconic" | "hidden">("expanded")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [sessionExpiredDialog, setSessionExpiredDialog] = useState(false)
  const [showBetaBanner, setShowBetaBanner] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickInsights, setShowQuickInsights] = useState(false)
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)
  const [showMessagesPanel, setShowMessagesPanel] = useState(false)
  const [showHelpPanel, setShowHelpPanel] = useState(false)
  const [activeSidebarGroup, setActiveSidebarGroup] = useState<string | null>(null)
  const [sidebarAnimation, setSidebarAnimation] = useState(false)
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false)
  const [showTourGuide, setShowTourGuide] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [quickInsightsData, setQuickInsightsData] = useState<CampaignInsight[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(true)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showContextualHelp, setShowContextualHelp] = useState(false)
  const [contextualHelpTopic, setContextualHelpTopic] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiAssistantPrompt, setAIAssistantPrompt] = useState("")
  const [aiAssistantResponse, setAIAssistantResponse] = useState<string | null>(null)
  const [isAIAssistantLoading, setIsAIAssistantLoading] = useState(false)
  const [showColorThemeCustomizer, setShowColorThemeCustomizer] = useState(false)
  const [customThemeColor, setCustomThemeColor] = useState("#0070f3")
  const [customThemeMode, setCustomThemeMode] = useState(theme || "system")
  const [showLayoutCustomizer, setShowLayoutCustomizer] = useState(false)
  const [layoutDensity, setLayoutDensity] = useState<"comfortable" | "compact" | "spacious">("comfortable")
  const [fontScale, setFontScale] = useState(100)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const commandPaletteInputRef = useRef<HTMLInputElement>(null)

  // State declarations at the top of the component
  const [messages, setMessages] = useState<Message[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [quickActions] = useState<QuickAction[]>([
    {
      name: "New Campaign",
      href: "/advertiser/campaigns/new",
      icon: <Target className="h-4 w-4" />,
      description: "Create a new advertising campaign",
      action: () => router.push("/advertiser/campaigns/new")
    }
  ])

  const [commandPaletteActions] = useState<QuickAction[]>([
    {
      name: "Create Campaign",
      href: "/advertiser/campaigns/new",
      icon: <Target className="h-4 w-4" />,
      description: "Start a new advertising campaign",
      action: () => router.push("/advertiser/campaigns/new")
    }
  ])

  // Function declarations moved to the top
  const toggleSidebar = () => {
    setSidebarAnimation(true)
    setTimeout(() => setSidebarAnimation(false), 300)

    if (sidebarMode === "expanded") {
      setSidebarMode("collapsed")
    } else if (sidebarMode === "collapsed") {
      setSidebarMode("expanded")
    } else {
      setSidebarMode("expanded")
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error("Error signing out:", error)
      // Fallback redirect in case the signOut function fails
      router.push("/auth/signin")
    }
  }

  // Handle session refresh
  const handleSessionRefresh = async () => {
    try {
      if (session?.user) {
      setSessionExpiredDialog(false)
      }
    } catch (error) {
      console.error("Error refreshing session:", error)
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

    if (pathname === "/advertiser") return "Dashboard"

    // Extract the last segment of the path
    const lastSegment = pathname.split("/").pop()

    return capitalizeFirstLetter(lastSegment)
  }

  // Show loading state while session is loading
  if (session === null) {
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

  // If in maintenance mode, show maintenance message
  if (maintenanceMode) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <div className="rounded-lg border bg-card p-8 shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="mt-4 text-center text-xl font-bold">System Maintenance</h2>
          <p className="mt-2 text-center text-muted-foreground">
            {generalSettings?.platformName || "Our platform"} is currently undergoing scheduled maintenance. We'll be
            back shortly. Thank you for your patience.
          </p>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Expected duration: {systemSettings?.maintenanceDuration ?? 0} minutes</p>
            <p>Started at: {systemSettings?.maintenanceTime ? new Date(systemSettings.maintenanceTime).toLocaleTimeString() : "Unknown"}</p>
          </div>
        </div>
      </div>
    )
  }

  if (pathname === "/") {
    return <SessionProvider>{children}</SessionProvider>
  }

  // Helper functions
  const getUserInitials = () => {
    if (!session?.user?.name) return "U"
    return session.user.name
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
  }

  const getUserRole = () => {
    return "Advertiser" // Or get from session if available
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
  }

  const markAllMessagesAsRead = () => {
    setMessages(prev => prev.map(msg => ({ ...msg, read: true })))
    setUnreadMessageCount(0)
  }

  const markMessageAsRead = (id: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, read: true } : msg
    ))
    setUnreadMessageCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    setUnreadCount(0)
  }

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleAIAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement AI assistant functionality
  }

  return (
    <SessionProvider>
      {/* Include the global header on all advertiser pages */}
      <Header />

      <div className="flex h-screen bg-background pt-16">
        {" "}
        {/* Add pt-16 to account for the global header */}
        {/* Beta banner for beta features */}
        {systemSettings?.featureFlags?.betaFeatures && showBetaBanner && (
          <div className="fixed top-16 left-0 right-0 z-40 bg-primary py-2 px-4 text-center text-sm text-primary-foreground flex items-center justify-between">
            <div className="flex-1"></div>
            <p className="flex-grow text-center">
              You have access to{" "}
              <Badge variant="outline" className="ml-1 text-primary-foreground border-primary-foreground">
                Beta Features
              </Badge>
            </p>
            <div className="flex-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/80"
                onClick={() => setShowBetaBanner(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        )}
        {/* Desktop Sidebar */}
        <AnimatePresence>
          <motion.aside
            ref={sidebarRef}
            className={cn(
              "fixed inset-y-0 z-20 flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
              sidebarMode === "expanded"
                ? "w-64"
                : sidebarMode === "collapsed"
                  ? "w-48"
                  : sidebarMode === "iconic"
                    ? "w-[70px]"
                    : "w-0",
              "top-16", // Adjust top position to account for the global header
              systemSettings?.featureFlags?.betaFeatures && showBetaBanner ? "top-[72px]" : "top-16", // Adjust for beta banner
            )}
            initial={{ x: sidebarMode === "hidden" ? -100 : 0, opacity: sidebarMode === "hidden" ? 0 : 1 }}
            animate={{
              x: sidebarMode === "hidden" ? -100 : 0,
              opacity: sidebarMode === "hidden" ? 0 : 1,
              width:
                sidebarMode === "expanded"
                  ? "16rem"
                  : sidebarMode === "collapsed"
                    ? "12rem"
                    : sidebarMode === "iconic"
                      ? "4.5rem"
                      : "0rem",
            }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onMouseEnter={() => !sidebarPinned && setSidebarHovered(true)}
            onMouseLeave={() => !sidebarPinned && setSidebarHovered(false)}
          >
            {/* Sidebar Header */}
            <div
              className={cn(
                "flex h-16 items-center border-b px-4",
                sidebarMode === "iconic" || sidebarMode === "hidden" ? "justify-center" : "justify-between",
              )}
            >
              {(sidebarMode === "expanded" || sidebarMode === "collapsed") && (
                <Link href="/advertiser" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                    <Megaphone className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">{generalSettings?.platformName || "AdTech"}</span>
                </Link>
              )}
              {sidebarMode === "iconic" && (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                  <Megaphone className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              {(sidebarMode === "expanded" || sidebarMode === "collapsed") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 transition-transform hover:rotate-180"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Sidebar Content */}
            <ScrollArea className="flex-1 py-2">
              <nav className="space-y-6 px-2">
                {navigationItems.map((group) => (
                  <Collapsible
                    key={group.group}
                    defaultOpen={activeSidebarGroup === group.group || activeSidebarGroup === null}
                    onOpenChange={(open) => {
                      if (open) {
                        setActiveSidebarGroup(group.group)
                      } else if (activeSidebarGroup === group.group) {
                        setActiveSidebarGroup(null)
                      }
                    }}
                    className="space-y-2"
                  >
                    {(sidebarMode === "expanded" || sidebarMode === "collapsed") && (
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-1 cursor-pointer group">
                          <h3 className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            {group.group}
                          </h3>
                          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform ui-open:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                    )}
                    <CollapsibleContent className="space-y-1">
                      {group.items.map((item) => (
                        <TooltipProvider key={item.name} delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all",
                                  pathname === item.href
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  sidebarMode === "iconic" ? "justify-center" : "justify-start",
                                  sidebarMode === "collapsed" && "text-xs",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center justify-center",
                                    pathname === item.href ? "text-primary" : "text-muted-foreground",
                                    "transition-colors",
                                  )}
                                >
                                  {item.icon}
                                </div>
                                {(sidebarMode === "expanded" || sidebarMode === "collapsed") && (
                                  <span className={cn("ml-3 truncate", sidebarMode === "collapsed" && "text-xs")}>
                                    {item.name}
                                  </span>
                                )}
                                {(sidebarMode === "expanded" || sidebarMode === "collapsed") && item.badge && (
                                  <Badge
                                    variant={(item.badge.variant as BadgeVariant) || "default"}
                                    className="ml-auto"
                                  >
                                    {item.badge.text}
                                  </Badge>
                                )}
                              </Link>
                            </TooltipTrigger>
                            {sidebarMode === "iconic" && (
                              <TooltipContent side="right" className="flex flex-col items-start">
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
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </nav>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="mt-auto border-t p-4">
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-full justify-center", sidebarMode === "iconic" ? "h-10 px-0" : "")}
                  onClick={toggleSidebar}
                >
                  {sidebarMode === "iconic" ? (
                    <>
                      <ChevronRight className="h-4 w-4 rotate-0 mr-0" />
                      <span className="sr-only">Expand</span>
                    </>
                  ) : sidebarMode === "hidden" ? (
                    <>
                      <PanelLeft className="mr-2 h-4 w-4" />
                      <span>Show Sidebar</span>
                    </>
                  ) : (
                    <>
                      <PanelLeft className="mr-2 h-4 w-4" />
                      <span>{sidebarMode === "expanded" ? "Collapse" : "Minimize"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.aside>
        </AnimatePresence>
        {/* Mobile Sidebar */}
        <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DialogContent className="w-[300px] sm:w-[350px] p-0">
            <div className="flex h-16 items-center border-b px-6">
              <Link href="/advertiser" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                  <Megaphone className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">{generalSettings?.platformName || "AdTech"}</span>
              </Link>
            </div>
            <ScrollArea className="h-[calc(100vh-4rem)]">
              <nav className="space-y-1 p-4">
                {navigationItems.map((group) => (
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
                                ? "bg-accent text-accent-foreground dark:text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:text-muted-foreground dark:hover:text-accent-foreground",
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
                    {quickActions.map((action) => (
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
          </DialogContent>
        </Dialog>
        {/* Main Content */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            sidebarMode === "expanded"
              ? "lg:pl-64"
              : sidebarMode === "collapsed"
                ? "lg:pl-48"
                : sidebarMode === "iconic"
                  ? "lg:pl-[70px]"
                  : "lg:pl-0",
          )}
        >
          {/* Advertiser Header */}
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
                      placeholder="Search campaigns, creatives..."
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
                        <p>Search (⌘/)</p>
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

              {/* Command Palette Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowCommandPalette(true)}>
                      <Command className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Command palette (⌘K)</p>
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
                        You have {unreadMessageCount} unread message{unreadMessageCount !== 1 ? "s" : ""}
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
                            !message.read ? "border-l-indigo-500 bg-muted/50" : "border-l-transparent",
                          )}
                          onClick={() => markMessageAsRead(message.id)}
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600">
                            {message.from
                              .split(" ")
                              .map((name) => name[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={cn("text-sm truncate", !message.read && "font-medium")}>{message.from}</p>
                              <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{message.time}</p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{message.content}</p>
                            {!message.read && (
                              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 absolute right-4" />
                            )}
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
                        You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
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
                            !notification.read ? "border-l-primary bg-muted/50" : "border-l-transparent",
                          )}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full",
                              notification.type === "warning"
                                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                : notification.type === "success"
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                  : notification.type === "error"
                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                            )}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
                            {notification.campaign && <p className="text-xs text-primary">{notification.campaign}</p>}
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
                      <Button
                        variant="ghost"
                        className="w-full justify-center text-primary hover:text-primary hover:bg-primary/10"
                      >
                        View all notifications
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* AI Assistant Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowAIAssistant(true)}>
                      <Sparkles className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>AI Assistant</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Help */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowHelpPanel(true)}>
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Help & Resources (⌘H)</p>
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
                <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
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
                      href="/advertiser/profile"
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="mr-3 h-4 w-4" />
                      <span>Your Profile</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Link>
                    <Link
                      href="/advertiser/settings"
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Account Settings</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </Link>
                    <DropdownMenuItem
                      className="px-4 py-2.5 cursor-pointer"
                      onClick={() => setShowColorThemeCustomizer(true)}
                    >
                      <Palette className="mr-3 h-4 w-4" />
                      <span>Appearance</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                    </DropdownMenuItem>
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
                    <Target className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                )}
                {pathname?.includes("/creatives") && (
                  <Button size="sm" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Creative
                  </Button>
                )}
                {pathname?.includes("/analytics") && (
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (pathname?.includes("/campaigns")) {
                      router.push("/advertiser/campaigns/new")
                    } else if (pathname?.includes("/creatives")) {
                      router.push("/advertiser/creatives/new")
                    } else if (pathname?.includes("/analytics")) {
                      router.push("/advertiser/analytics/reports/new")
                    } else {
                      router.push("/advertiser/campaigns/new")
                    }
                  }}
                >
                  {pathname?.includes("/campaigns") ? (
                    <Target className="mr-2 h-4 w-4" />
                  ) : pathname?.includes("/creatives") ? (
                    <Image className="mr-2 h-4 w-4" />
                  ) : pathname?.includes("/analytics") ? (
                    <BarChart3 className="mr-2 h-4 w-4" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {pathname?.includes("/campaigns")
                    ? "New Campaign"
                    : pathname?.includes("/creatives")
                      ? "New Creative"
                      : pathname?.includes("/analytics")
                        ? "New Report"
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
                  <Megaphone className="h-3 w-3 text-primary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} {generalSettings?.platformName || "AdTech Platform"}. All rights
                  reserved.
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
        {/* Command Palette */}
        <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
          <CommandInput placeholder="Type a command or search..." ref={commandPaletteInputRef} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              {commandPaletteActions.slice(0, 5).map((action, index) => (
                <CommandItem
                  key={`quick-action-${index}`}
                  onSelect={() => {
                    if (action.action) {
                    action.action()
                    }
                    setShowCommandPalette(false)
                  }}
                >
                  {action.icon}
                  <span className="ml-2">{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Pages">
              {navigationItems.flatMap((group) =>
                group.items.map((item, index) => (
                  <CommandItem
                    key={`page-${index}`}
                    onSelect={() => {
                      router.push(item.href)
                      setShowCommandPalette(false)
                    }}
                  >
                    {item.icon}
                    <span className="ml-2">{item.name}</span>
                  </CommandItem>
                )),
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {commandPaletteActions.slice(5).map((action, index) => (
                <CommandItem
                  key={`action-${index}`}
                  onSelect={() => {
                    if (action.action) {
                    action.action()
                    }
                    setShowCommandPalette(false)
                  }}
                >
                  {action.icon}
                  <span className="ml-2">{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
        {/* Quick Insights Panel */}
        <Sheet open={showQuickInsights} onOpenChange={setShowQuickInsights}>
          <SheetContent className="w-full sm:max-w-md p-0">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <PieChart className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-medium">Quick Insights</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickInsights(false)}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <Tabs defaultValue="campaigns">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="budget">Budget</TabsTrigger>
                </TabsList>
                <TabsContent value="campaigns" className="mt-4 space-y-4">
                  {isLoadingInsights ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quickInsightsData.map((campaign) => (
                        <Card key={campaign.id} className="overflow-hidden">
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{campaign.name}</CardTitle>
                              <Badge
                                variant={
                                  campaign.status === "active"
                                    ? "success"
                                    : campaign.status === "paused"
                                      ? "warning"
                                      : campaign.status === "scheduled"
                                        ? "outline"
                                        : "default"
                                }
                              >
                                {capitalizeFirstLetter(campaign.status)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Spent</p>
                                <p className="font-medium">${campaign.spent.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Budget</p>
                                <p className="font-medium">${campaign.budget.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Impressions</p>
                                <p className="font-medium">{campaign.impressions.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">CTR</p>
                                <p className="font-medium">{campaign.ctr.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs">
                                <span>Budget used</span>
                                <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                              </div>
                              <Progress value={(campaign.spent / campaign.budget) * 100} className="h-1.5 mt-1" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button variant="outline" className="w-full" onClick={() => router.push("/advertiser/campaigns")}>
                        View All Campaigns
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="performance" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Overview</CardTitle>
                      <CardDescription>Your campaign performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] w-full bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">Performance chart will be displayed here</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total Impressions</p>
                          <p className="text-2xl font-bold">453,012</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Total Clicks</p>
                          <p className="text-2xl font-bold">13,590</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Average CTR</p>
                          <p className="text-2xl font-bold">3.0%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Conversions</p>
                          <p className="text-2xl font-bold">679</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => router.push("/advertiser/analytics")}>
                        View Detailed Analytics
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="budget" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Overview</CardTitle>
                      <CardDescription>Your spending and budget allocation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Total Budget</p>
                            <p className="text-sm font-medium">$25,500.00</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Total Spent</p>
                            <p className="text-sm font-medium">$9,913.56</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Remaining</p>
                            <p className="text-sm font-medium">$15,586.44</p>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Budget Utilization</p>
                            <p className="text-sm font-medium">38.9%</p>
                          </div>
                          <Progress value={38.9} className="h-2" />
                        </div>

                        <div className="rounded-md border p-4">
                          <h4 className="text-sm font-medium mb-2">Budget Allocation</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Summer Sale</span>
                              <span>$5,000.00</span>
                            </div>
                            <Progress value={47} className="h-1.5" />

                            <div className="flex items-center justify-between text-sm">
                              <span>New Product Launch</span>
                              <span>$10,000.00</span>
                            </div>
                            <Progress value={45.7} className="h-1.5" />

                            <div className="flex items-center justify-between text-sm">
                              <span>Holiday Special</span>
                              <span>$3,000.00</span>
                            </div>
                            <Progress value={100} className="h-1.5" />

                            <div className="flex items-center justify-between text-sm">
                              <span>Brand Awareness</span>
                              <span>$7,500.00</span>
                            </div>
                            <Progress value={0} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => router.push("/advertiser/billing")}>
                        Manage Budget
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
        {/* Help Panel */}
        <Sheet open={showHelpPanel} onOpenChange={setShowHelpPanel}>
          <SheetContent className="w-full sm:max-w-md p-0">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <HelpCircle className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-medium">Help & Resources</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelpPanel(false)}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <Tabs defaultValue="guides">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="guides">Guides</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                  <TabsTrigger value="support">Support</TabsTrigger>
                </TabsList>
                <TabsContent value="guides" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">Creating Your First Campaign</h4>
                          <p className="text-sm text-muted-foreground">Learn how to set up and launch campaigns</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">Audience Targeting Guide</h4>
                          <p className="text-sm text-muted-foreground">Optimize your audience targeting strategies</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          <Image className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">Creative Best Practices</h4>
                          <p className="text-sm text-muted-foreground">Design effective ad creatives that convert</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">Analytics & Reporting</h4>
                          <p className="text-sm text-muted-foreground">Understand your campaign performance metrics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="faq" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium">How do I create a new campaign?</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Navigate to the Campaigns section and click on "New Campaign" button. Follow the step-by-step
                        wizard to set up your campaign parameters, targeting, budget, and creatives.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium">How is my billing calculated?</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Billing is calculated based on your campaign spend. You can set daily or lifetime budgets for
                        your campaigns, and you'll only be charged for actual impressions, clicks, or conversions
                        depending on your campaign type.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium">How can I improve my campaign performance?</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Review your analytics regularly, test different creatives, refine your audience targeting, and
                        optimize your bidding strategy. Our AI Assistant can also provide personalized recommendations.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="font-medium">What ad formats are supported?</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        We support a wide range of ad formats including display banners, native ads, video ads,
                        interactive ads, and more. Each format has specific requirements that you can find in the
                        Creative Guidelines section.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="support" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Support</CardTitle>
                      <CardDescription>Our team is here to help you succeed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border p-4 flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Email Support</h4>
                          <p className="text-sm text-muted-foreground">support@adtech.com</p>
                          <p className="text-xs text-muted-foreground mt-1">Response within 24 hours</p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Live Chat</h4>
                          <p className="text-sm text-muted-foreground">Available 9am-5pm Mon-Fri</p>
                          <Button size="sm" variant="outline" className="mt-2">
                            Start Chat
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Knowledge Base</h4>
                          <p className="text-sm text-muted-foreground">Browse our extensive documentation</p>
                          <Button size="sm" variant="outline" className="mt-2">
                            View Articles
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
        {/* AI Assistant Panel */}
        <Sheet open={showAIAssistant} onOpenChange={setShowAIAssistant}>
          <SheetContent className="w-full sm:max-w-md p-0">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-medium">AI Campaign Assistant</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAIAssistant(false)}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col h-[calc(100vh-8rem)]">
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">
                      Hello! I'm your AI campaign assistant. I can help optimize your campaigns, analyze performance,
                      and suggest improvements. What would you like help with today?
                    </p>
                  </div>

                  {aiAssistantResponse && (
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <p className="text-sm">{aiAssistantResponse}</p>
                    </div>
                  )}

                  {isAIAssistantLoading && (
                    <div className="flex justify-center p-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t p-4">
                <form onSubmit={handleAIAssistantSubmit} className="flex gap-2">
                  <Input
                    placeholder="Ask about campaign optimization, audience targeting..."
                    value={aiAssistantPrompt}
                    onChange={(e) => setAIAssistantPrompt(e.target.value)}
                    disabled={isAIAssistantLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isAIAssistantLoading || !aiAssistantPrompt.trim()}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAIAssistantPrompt("How can I improve my campaign CTR?")}
                  >
                    Improve CTR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAIAssistantPrompt("Suggest audience targeting for a new product")}
                  >
                    Audience suggestions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAIAssistantPrompt("Analyze my campaign performance")}
                  >
                    Performance analysis
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        {/* Session Expired Dialog */}
        <Dialog open={sessionExpiredDialog} onOpenChange={setSessionExpiredDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Session Expired</DialogTitle>
              <DialogDescription>
                Your session has expired. Please sign in again to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSessionExpiredDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSignOut}>Sign In Again</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Maintenance Mode Dialog */}
        <Dialog open={!!systemSettings?.maintenanceMode} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Maintenance Mode</DialogTitle>
              <DialogDescription>
                The system is currently undergoing maintenance. Please try again later.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        {/* Color Theme Customizer Dialog */}
        <Dialog open={showColorThemeCustomizer} onOpenChange={setShowColorThemeCustomizer}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Theme</DialogTitle>
              <DialogDescription>
                Personalize your interface appearance
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Dark Mode</Label>
                <Switch
                  id="darkMode"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
              {systemSettings?.sustainability_settings?.carbonTrackingEnabled && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="reducedMotion">Reduced Motion</Label>
                  <Switch
                    id="reducedMotion"
                    checked={prefersReducedMotion}
                    onCheckedChange={setPrefersReducedMotion}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SessionProvider>
  )
}
