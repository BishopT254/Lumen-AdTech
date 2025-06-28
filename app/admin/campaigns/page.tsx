"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  ChartContainer,
  ChartProvider,
  BarChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartBar,
  ChartPie,
} from "@/components/ui/chart"
import {
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  ChevronDown,
  Calendar,
  Clock,
  MapPin,
  Zap,
  Eye,
  BarChart2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  ArrowUpRight,
  Edit,
  Play,
  RefreshCw,
  Loader2,
  BarChart,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Info,
  Clipboard,
  ChevronUp,
} from "lucide-react"
import { Cell } from "recharts"

// Types based on Prisma schema
type Campaign = {
  id: string
  advertiserId: string
  name: string
  description?: string | null
  status: CampaignStatus
  objective: CampaignObjective
  budget: number
  dailyBudget?: number | null
  startDate: string
  endDate?: string | null
  targetLocations?: any
  targetSchedule?: any
  targetDemographics?: any
  pricingModel: PricingModel
  createdAt: string
  updatedAt: string
  advertiser: {
    id: string
    companyName: string
    user: {
      id: string
      name: string | null
      email: string
    }
  }
  adCreatives: AdCreative[]
  analytics?: CampaignAnalytics[]
}

type AdCreative = {
  id: string
  campaignId: string
  name: string
  type: CreativeType
  status: CreativeStatus
  content: string
  format: string
  duration?: number | null
  previewImage?: string | null
  headline: string
  description: string
  callToAction: string
  isApproved: boolean
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

type CampaignAnalytics = {
  id: string
  campaignId: string
  date: string
  impressions: number
  engagements: number
  conversions: number
  ctr: number
  conversionRate: number
  averageDwellTime?: number | null
  audienceMetrics?: any
  emotionMetrics?: any
  costData: any
}

type ActivityLog = {
  id: string
  userId: string
  action: string
  description?: string | null
  timestamp: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

// Enums from Prisma schema
enum CampaignStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

enum CampaignObjective {
  AWARENESS = "AWARENESS",
  CONSIDERATION = "CONSIDERATION",
  CONVERSION = "CONVERSION",
  TRAFFIC = "TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT",
}

enum PricingModel {
  CPM = "CPM",
  CPE = "CPE",
  CPA = "CPA",
  HYBRID = "HYBRID",
}

enum CreativeType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  TEXT = "TEXT",
  HTML = "HTML",
  INTERACTIVE = "INTERACTIVE",
  AR_EXPERIENCE = "AR_EXPERIENCE",
  VOICE_INTERACTIVE = "VOICE_INTERACTIVE",
}

enum CreativeStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

// API functions
const fetchCampaigns = async (
  params: Record<string, any> = {},
): Promise<{ campaigns: Campaign[]; pagination: any }> => {
  const queryString = new URLSearchParams(params).toString()
  const response = await fetch(`/api/admin/campaigns?${queryString}`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaigns")
  }
  return response.json()
}

const fetchCampaignActivity = async (): Promise<ActivityLog[]> => {
  const response = await fetch("/api/admin/campaigns/activity")
  if (!response.ok) {
    throw new Error("Failed to fetch campaign activity")
  }
  return response.json()
}

const fetchCampaignAnalytics = async (): Promise<any> => {
  const response = await fetch("/api/admin/campaigns/analytics")
  if (!response.ok) {
    throw new Error("Failed to fetch campaign analytics")
  }
  return response.json()
}

const updateCampaignStatus = async ({
  campaignId,
  status,
  reason,
}: { campaignId: string; status: CampaignStatus; reason?: string }) => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, reason }),
  })

  if (!response.ok) {
    throw new Error("Failed to update campaign status")
  }

  return response.json()
}

const deleteCampaign = async (campaignId: string) => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete campaign")
  }

  return response.json()
}

export default function AdminCampaigns() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { generalSettings, loading: loadingSettings } = usePublicSettings()

  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCampaignForAction, setSelectedCampaignForAction] = useState<string | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [bulkRejectionReason, setBulkRejectionReason] = useState("")

  // Initialize filters from URL
  useEffect(() => {
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || ""
    const pageParam = searchParams.get("page") || "1"
    const limitParam = searchParams.get("limit") || "10"
    const sort = searchParams.get("sort") || "createdAt"
    const order = searchParams.get("order") || "desc"

    setFilterStatus(status)
    setSearchTerm(search)
    setPage(Number.parseInt(pageParam, 10))
    setPageSize(Number.parseInt(limitParam, 10))
    setSortField(sort)
    setSortOrder(order)
  }, [searchParams])

  // Update URL with filters
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (filterStatus !== "all") params.set("status", filterStatus)
    params.set("page", page.toString())
    params.set("limit", pageSize.toString())
    params.set("sort", sortField)
    params.set("order", sortOrder)

    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, "", url)
  }, [searchTerm, filterStatus, page, pageSize, sortField, sortOrder])

  // Fetch campaigns data with filters
  const {
    data: campaignsData,
    isLoading: isLoadingCampaigns,
    error: campaignsError,
    isFetching,
  } = useQuery({
    queryKey: ["campaigns", searchTerm, filterStatus, sortField, sortOrder, page, pageSize],
    queryFn: () =>
      fetchCampaigns({
        search: searchTerm,
        status: filterStatus !== "all" ? filterStatus : undefined,
        sort: sortField,
        order: sortOrder,
        page,
        limit: pageSize,
      }),
    keepPreviousData: true,
  })

  // Fetch campaign activity
  const { data: activityData = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["campaignActivity"],
    queryFn: fetchCampaignActivity,
  })

  // Fetch campaign analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["campaignAnalytics"],
    queryFn: fetchCampaignAnalytics,
  })

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: updateCampaignStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaignActivity"] })
      setIsApprovalDialogOpen(false)
      setSelectedCampaignForAction(null)
      setActionType(null)
      setRejectionReason("")
      toast.success("Success", {
        description: `Campaign ${actionType === "approve" ? "approved" : "rejected"} successfully.`,
      })
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaignActivity"] })
      setIsDeleteDialogOpen(false)
      setSelectedCampaignForAction(null)
      toast.success("Success", {
        description: "Campaign deleted successfully.",
      })
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      campaignIds,
      status,
      reason,
    }: { campaignIds: string[]; status: CampaignStatus; reason?: string }) => {
      return Promise.all(campaignIds.map((id) => updateCampaignStatus({ campaignId: id, status, reason })))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaignActivity"] })
      setIsBulkActionDialogOpen(false)
      setBulkAction(null)
      setBulkRejectionReason("")
      setSelectedCampaigns([])
      toast.success("Success", {
        description: `Bulk action completed successfully.`,
      })
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  // Derived state
  const campaigns = campaignsData?.campaigns || []
  const pagination = campaignsData?.pagination || { total: 0, page: 1, limit: 10, pages: 1 }
  const totalPages = pagination.pages || Math.ceil(pagination.total / pagination.limit)

  // Calculate status counts
  const statusCounts = campaigns.reduce((acc: Record<string, number>, campaign) => {
    acc[campaign.status] = (acc[campaign.status] || 0) + 1
    return acc
  }, {})

  // Prepare analytics data for charts
  const performanceData = analyticsData?.performanceData || []
  const statusDistributionData = analyticsData?.statusDistribution || []
  const COLORS = ["#4ade80", "#facc15", "#94a3b8", "#8b5cf6", "#64748b", "#ef4444"]

  // Handle campaign selection
  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId],
    )
  }

  // Handle select all campaigns
  const handleSelectAllCampaigns = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(campaigns.map((campaign) => campaign.id))
    } else {
      setSelectedCampaigns([])
    }
  }

  // Handle campaign approval/rejection
  const handleCampaignAction = (campaignId: string, action: "approve" | "reject" | "delete") => {
    setSelectedCampaignForAction(campaignId)
    setActionType(action)
    if (action === "delete") {
      setIsDeleteDialogOpen(true)
    } else {
      setIsApprovalDialogOpen(true)
    }
  }

  // Handle campaign approval/rejection submission
  const handleApprovalSubmit = () => {
    if (!selectedCampaignForAction || !actionType) return

    if (actionType === "approve") {
      updateStatusMutation.mutate({
        campaignId: selectedCampaignForAction,
        status: CampaignStatus.ACTIVE,
      })
    } else if (actionType === "reject") {
      updateStatusMutation.mutate({
        campaignId: selectedCampaignForAction,
        status: CampaignStatus.REJECTED,
        reason: rejectionReason,
      })
    }
  }

  // Handle campaign deletion
  const handleDeleteSubmit = () => {
    if (!selectedCampaignForAction) return
    deleteCampaignMutation.mutate(selectedCampaignForAction)
  }

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedCampaigns.length === 0) return

    setBulkAction(action)
    setIsBulkActionDialogOpen(true)
  }

  // Handle bulk action submission
  const handleBulkActionSubmit = () => {
    if (!bulkAction || selectedCampaigns.length === 0) return

    let status: CampaignStatus
    switch (bulkAction) {
      case "approve":
        status = CampaignStatus.ACTIVE
        bulkUpdateStatusMutation.mutate({
          campaignIds: selectedCampaigns,
          status,
        })
        break
      case "reject":
        status = CampaignStatus.REJECTED
        bulkUpdateStatusMutation.mutate({
          campaignIds: selectedCampaigns,
          status,
          reason: bulkRejectionReason,
        })
        break
      case "pause":
        status = CampaignStatus.PAUSED
        bulkUpdateStatusMutation.mutate({
          campaignIds: selectedCampaigns,
          status,
        })
        break
      case "activate":
        status = CampaignStatus.ACTIVE
        bulkUpdateStatusMutation.mutate({
          campaignIds: selectedCampaigns,
          status,
        })
        break
      default:
        break
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Export campaigns
  const handleExport = async (format: string) => {
    try {
      const response = await fetch(
        `/api/admin/campaigns/export?format=${format}&${new URLSearchParams({
          search: searchTerm,
          status: filterStatus !== "all" ? filterStatus : "",
        }).toString()}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to export campaigns as ${format}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `campaigns-export-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Export successful", {
        description: `Campaigns exported as ${format.toUpperCase()} successfully.`,
      })
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Failed to export campaigns",
        variant: "destructive",
      })
    }
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      ACTIVE: {
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      PENDING_APPROVAL: {
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      DRAFT: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        icon: <Edit className="h-3 w-3 mr-1" />,
      },
      PAUSED: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <PauseCircle className="h-3 w-3 mr-1" />,
      },
      COMPLETED: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      REJECTED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["DRAFT"]

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.replace("_", " ")}
      </Badge>
    )
  }

  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A"
    return format(new Date(date), "MMM d, yyyy")
  }

  // Format time ago
  const formatTimeAgo = (date: string | null | undefined) => {
    if (!date) return "N/A"
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  // Loading state
  if (isLoadingCampaigns && !isFetching) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (campaignsError) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load campaigns</h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {campaignsError instanceof Error ? campaignsError.message : "An unknown error occurred"}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["campaigns"] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Campaign Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor all advertising campaigns across the platform
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Link
            href="/admin/campaigns/approvals"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:bg-yellow-700 dark:hover:bg-yellow-600"
          >
            <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-yellow-800">
              {statusCounts[CampaignStatus.PENDING_APPROVAL] || 0}
            </span>
            Pending Approvals
          </Link>
          <Link
            href="/admin/campaigns/new"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={filterStatus === "all" ? "all" : filterStatus} className="mb-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="all" onClick={() => setFilterStatus("all")}>
            All ({pagination.total || 0})
          </TabsTrigger>
          <TabsTrigger value="ACTIVE" onClick={() => setFilterStatus("ACTIVE")}>
            Active ({statusCounts[CampaignStatus.ACTIVE] || 0})
          </TabsTrigger>
          <TabsTrigger value="PENDING_APPROVAL" onClick={() => setFilterStatus("PENDING_APPROVAL")}>
            Pending ({statusCounts[CampaignStatus.PENDING_APPROVAL] || 0})
          </TabsTrigger>
          <TabsTrigger value="PAUSED" onClick={() => setFilterStatus("PAUSED")}>
            Paused ({statusCounts[CampaignStatus.PAUSED] || 0})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" onClick={() => setFilterStatus("COMPLETED")}>
            Completed ({statusCounts[CampaignStatus.COMPLETED] || 0})
          </TabsTrigger>
          <TabsTrigger value="DRAFT" onClick={() => setFilterStatus("DRAFT")}>
            Draft ({statusCounts[CampaignStatus.DRAFT] || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {/* Search and filter bar */}
          <div className="mb-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search campaigns..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="right" className="w-56">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Campaigns</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("ACTIVE")}>Active Campaigns</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("PENDING_APPROVAL")}>
                    Pending Approval
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField("createdAt")
                      setSortOrder("desc")
                    }}
                  >
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>Newest First</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField("createdAt")
                      setSortOrder("asc")
                    }}
                  >
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField("budget")
                      setSortOrder("desc")
                    }}
                  >
                    Budget: High to Low
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField("budget")
                      setSortOrder("asc")
                    }}
                  >
                    Budget: Low to High
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedCampaigns.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedCampaigns.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="right">
                    <DropdownMenuItem onClick={() => handleBulkAction("approve")}>Approve Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("reject")}>Reject Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("pause")}>Pause Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>Activate Selected</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("delete")}
                      className="text-red-600 dark:text-red-400"
                    >
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Campaigns table */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={campaigns.length > 0 && selectedCampaigns.length === campaigns.length}
                      onCheckedChange={handleSelectAllCampaigns}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Campaign
                      {sortField === "name" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                    <div className="flex items-center">
                      Status
                      {sortField === "status" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("budget")}>
                    <div className="flex items-center">
                      Budget
                      {sortField === "budget" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("startDate")}>
                    <div className="flex items-center">
                      Timeline
                      {sortField === "startDate" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={() => handleSelectCampaign(campaign.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/campaigns/${campaign.id}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {campaign.name}
                          </Link>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {campaign.objective} • {campaign.pricingModel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{campaign.advertiser.companyName}</TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: generalSettings?.defaultCurrency || "USD",
                            }).format(campaign.budget)}
                          </span>
                          {campaign.analytics && campaign.analytics.length > 0 && (
                            <div className="mt-1 flex items-center text-xs">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                                  style={{
                                    width: `${(campaign.analytics.reduce((sum, a) => sum + Number(a.costData.spend), 0) / campaign.budget) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="ml-2 text-gray-500 dark:text-gray-400">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: generalSettings?.defaultCurrency || "USD",
                                }).format(
                                  campaign.analytics.reduce((sum, a) => sum + Number(a.costData.spend), 0),
                                )}{" "}
                                spent
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm">
                              {campaign.analytics
                                ? campaign.analytics.reduce((sum, a) => sum + a.impressions, 0).toLocaleString()
                                : 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm">
                              {campaign.analytics
                                ? campaign.analytics.reduce((sum, a) => sum + a.engagements, 0).toLocaleString()
                                : 0}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            <span>
                              {formatDate(campaign.startDate)} -{" "}
                              {campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            <span>
                              {campaign.targetLocations
                                ? Array.isArray(campaign.targetLocations) && campaign.targetLocations.length > 1
                                  ? `${campaign.targetLocations[0].name || campaign.targetLocations[0]} +${campaign.targetLocations.length - 1}`
                                  : Array.isArray(campaign.targetLocations)
                                    ? campaign.targetLocations[0]?.name || campaign.targetLocations[0] || "Nationwide"
                                    : "Nationwide"
                                : "Nationwide"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="right">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/campaigns/${campaign.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/campaigns/${campaign.id}/edit`}>Edit Campaign</Link>
                            </DropdownMenuItem>
                            {campaign.status === CampaignStatus.PENDING_APPROVAL && (
                              <>
                                <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, "approve")}>
                                  Approve Campaign
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, "reject")}>
                                  Reject Campaign
                                </DropdownMenuItem>
                              </>
                            )}
                            {campaign.status === CampaignStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    campaignId: campaign.id,
                                    status: CampaignStatus.PAUSED,
                                  })
                                }
                              >
                                Pause Campaign
                              </DropdownMenuItem>
                            )}
                            {campaign.status === CampaignStatus.PAUSED && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    campaignId: campaign.id,
                                    status: CampaignStatus.ACTIVE,
                                  })
                                }
                              >
                                Resume Campaign
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => handleCampaignAction(campaign.id, "delete")}
                            >
                              Delete Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {campaigns.length} of {pagination.total} campaigns
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page - 2 + i
                  if (page < 3) {
                    pageNum = i + 1
                  } else if (page > totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  }

                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        className="mx-0.5 h-8 w-8 p-0"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  }
                  return null
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Other tab contents would be similar but pre-filtered by status */}
        <TabsContent value="ACTIVE" className="mt-6">
          {/* Similar content as "all" but pre-filtered for active campaigns */}
        </TabsContent>
        <TabsContent value="PENDING_APPROVAL" className="mt-6">
          {/* Similar content as "all" but pre-filtered for pending campaigns */}
        </TabsContent>
        <TabsContent value="PAUSED" className="mt-6">
          {/* Similar content as "all" but pre-filtered for paused campaigns */}
        </TabsContent>
        <TabsContent value="COMPLETED" className="mt-6">
          {/* Similar content as "all" but pre-filtered for completed campaigns */}
        </TabsContent>
        <TabsContent value="DRAFT" className="mt-6">
          {/* Similar content as "all" but pre-filtered for draft campaigns */}
        </TabsContent>
      </Tabs>

      {/* Campaign Analytics Overview */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Campaign Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              Campaign Performance
            </CardTitle>
            <CardDescription>Comparison of impressions, engagements, and conversions for top campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingAnalytics ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : performanceData.length > 0 ? (
                <ChartContainer height={300}>
				  <ChartProvider data={performanceData}>
					<BarChartContainer data={performanceData}>
					  <ChartTooltip />
					  <ChartLegend />
					  <ChartGrid horizontal vertical />
					  <ChartXAxis dataKey="name" tickLine axisLine />
					  <ChartYAxis tickLine axisLine />
					  <ChartBar dataKey="impressions" name="Impressions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
					  <ChartBar dataKey="engagements" name="Engagements" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
					  <ChartBar dataKey="conversions" name="Conversions" fill="#10b981" radius={[4, 4, 0, 0]} />
					</BarChartContainer>
				  </ChartProvider>
				</ChartContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <BarChart className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No performance data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Campaign Status Distribution
            </CardTitle>
            <CardDescription>Overview of campaign statuses across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingAnalytics ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : statusDistributionData.length > 0 ? (
                <ChartContainer height={300} data={statusDistributionData}>
                  <ChartTooltip />
                  <ChartLegend />
                  <ChartPie
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    innerRadius={80}
                    outerRadius={120}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </ChartPie>
                </ChartContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <PieChart className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No status distribution data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaign Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Campaign Activity</CardTitle>
          <CardDescription>Latest updates and changes to campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityData.length > 0 ? (
            <div className="space-y-4">
              {activityData.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      activity.action.includes("ACTIVATE")
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : activity.action.includes("APPROVE")
                          ? "bg-green-100 dark:bg-green-900/30"
                          : activity.action.includes("REJECT")
                            ? "bg-red-100 dark:bg-red-900/30"
                            : activity.action.includes("UPDATE")
                              ? "bg-purple-100 dark:bg-purple-900/30"
                              : activity.action.includes("CREATE")
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    {activity.action.includes("ACTIVATE") ? (
                      <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : activity.action.includes("APPROVE") ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : activity.action.includes("REJECT") ? (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : activity.action.includes("UPDATE") ? (
                      <Edit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    ) : activity.action.includes("CREATE") ? (
                      <Plus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <Info className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{activity.description || activity.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      By {activity.user.name || activity.user.email} • {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clipboard className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No recent activity found</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/admin/campaigns/activity">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              View All Activity
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {/* Campaign Approval/Rejection Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve Campaign" : "Reject Campaign"}</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Are you sure you want to approve this campaign? Once approved, it will be live according to its schedule."
                : "Please provide a reason for rejecting this campaign. This will be sent to the advertiser."}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="mt-4">
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejection Reason
              </label>
              <Textarea
                id="rejection-reason"
                className="mt-1 block w-full"
                rows={4}
                placeholder="Please explain why this campaign is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovalSubmit}
              disabled={(actionType === "reject" && !rejectionReason.trim()) || updateStatusMutation.isPending}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {actionType === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : actionType === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
              disabled={deleteCampaignMutation.isPending}
            >
              {deleteCampaignMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Campaign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "approve"
                ? "Approve Campaigns"
                : bulkAction === "reject"
                  ? "Reject Campaigns"
                  : bulkAction === "pause"
                    ? "Pause Campaigns"
                    : bulkAction === "activate"
                      ? "Activate Campaigns"
                      : bulkAction === "delete"
                        ? "Delete Campaigns"
                        : "Bulk Action"}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "approve"
                ? `Are you sure you want to approve ${selectedCampaigns.length} campaigns?`
                : bulkAction === "reject"
                  ? `Please provide a reason for rejecting ${selectedCampaigns.length} campaigns.`
                  : bulkAction === "pause"
                    ? `Are you sure you want to pause ${selectedCampaigns.length} campaigns?`
                    : bulkAction === "activate"
                      ? `Are you sure you want to activate ${selectedCampaigns.length} campaigns?`
                      : bulkAction === "delete"
                        ? `Are you sure you want to delete ${selectedCampaigns.length} campaigns? This action cannot be undone.`
                        : "Please confirm this bulk action."}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === "reject" && (
            <div className="mt-4">
              <label
                htmlFor="bulk-rejection-reason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Rejection Reason
              </label>
              <Textarea
                id="bulk-rejection-reason"
                className="mt-1 block w-full"
                rows={4}
                placeholder="Please explain why these campaigns are being rejected..."
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkActionSubmit}
              disabled={(bulkAction === "reject" && !bulkRejectionReason.trim()) || bulkUpdateStatusMutation.isPending}
              variant={bulkAction === "delete" ? "destructive" : "default"}
            >
              {bulkUpdateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : bulkAction === "approve" ? (
                "Approve All"
              ) : bulkAction === "reject" ? (
                "Reject All"
              ) : bulkAction === "pause" ? (
                "Pause All"
              ) : bulkAction === "activate" ? (
                "Activate All"
              ) : bulkAction === "delete" ? (
                "Delete All"
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
