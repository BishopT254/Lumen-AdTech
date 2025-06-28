"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  MapPin,
  Target,
  Users,
  Eye,
  Zap,
  BarChart2,
  Printer,
  FileText,
  FileImage,
  RefreshCw,
  Settings,
  Loader2,
  Info,
  DollarSign,
  BarChart,
  Plus,
} from "lucide-react"
import {
  ChartContainer,
  ChartProvider,
  BarChartContainer,
  LineChartContainer, 
  ChartTooltip,
  ChartLegend,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartBar,
  ChartLine,
} from "@/components/ui/chart"

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
  audienceSegment?: {
    id: string
    name: string
    description?: string | null
    type: string
    rules: any
  } | null
  rejectionReason?: string | null
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
const fetchCampaign = async (campaignId: string): Promise<Campaign> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaign details")
  }
  return response.json()
}

const fetchCampaignActivity = async (campaignId: string): Promise<ActivityLog[]> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}/activity`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaign activity")
  }
  return response.json()
}

const fetchCampaignAnalytics = async (campaignId: string, timeRange: string): Promise<CampaignAnalytics[]> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}/analytics?timeRange=${timeRange}`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaign analytics")
  }
  return response.json()
}

const updateCampaignStatus = async ({
  campaignId,
  status,
  reason,
}: {
  campaignId: string
  status: CampaignStatus
  reason?: string
}) => {
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

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const queryClient = useQueryClient()
  const { generalSettings, loading: loadingSettings } = usePublicSettings()

  // State
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("7d")

  // Fetch campaign data
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
  })

  // Fetch campaign activity
  const { data: activityData = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["campaignActivity", campaignId],
    queryFn: () => fetchCampaignActivity(campaignId),
  })

  // Fetch campaign analytics
  const { data: analyticsData = [], isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["campaignAnalytics", campaignId, timeRange],
    queryFn: () => fetchCampaignAnalytics(campaignId, timeRange),
  })

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: updateCampaignStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] })
      queryClient.invalidateQueries({ queryKey: ["campaignActivity", campaignId] })
      setIsApprovalDialogOpen(false)
      setActionType(null)
      setRejectionReason("")
      toast.success(`Campaign ${actionType === "approve" ? "approved" : "rejected"} successfully.`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred")
    },
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast.success("Campaign deleted successfully.")
      router.push("/admin/campaigns")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred")
    },
  })

  // Handle campaign approval/rejection
  const handleCampaignAction = (action: "approve" | "reject") => {
    setActionType(action)
    setIsApprovalDialogOpen(true)
  }

  // Handle campaign approval/rejection submission
  const handleApprovalSubmit = () => {
    if (!campaignId || !actionType) return

    if (actionType === "approve") {
      updateStatusMutation.mutate({
        campaignId,
        status: CampaignStatus.ACTIVE,
      })
    } else if (actionType === "reject") {
      updateStatusMutation.mutate({
        campaignId,
        status: CampaignStatus.REJECTED,
        reason: rejectionReason,
      })
    }
  }

  // Handle campaign deletion
  const handleDeleteSubmit = () => {
    if (!campaignId) return
    deleteCampaignMutation.mutate(campaignId)
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
        icon: <Pause className="h-3 w-3 mr-1" />,
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

  // Prepare analytics data for charts
  const prepareAnalyticsData = () => {
    if (!analyticsData || analyticsData.length === 0) return []

    return analyticsData.map((data) => ({
      date: format(new Date(data.date), "MMM d"),
      impressions: data.impressions,
      engagements: data.engagements,
      conversions: data.conversions,
      ctr: Number((data.ctr * 100).toFixed(2)),
      conversionRate: Number((data.conversionRate * 100).toFixed(2)),
      spend: Number(data.costData.spend),
    }))
  }

  // Loading state
  if (isLoadingCampaign) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Skeleton className="mr-2 h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (campaignError) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load campaign details</h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {campaignError instanceof Error ? campaignError.message : "An unknown error occurred"}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  const chartData = prepareAnalyticsData()

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/admin/campaigns">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {campaign.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={campaign.status} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {campaign.objective} • {campaign.pricingModel}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Created {formatTimeAgo(campaign.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/campaigns/${campaignId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Campaign
            </Link>
          </Button>

          {campaign.status === CampaignStatus.PENDING_APPROVAL && (
            <>
              <Button onClick={() => handleCampaignAction("approve")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => handleCampaignAction("reject")}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {campaign.status === CampaignStatus.ACTIVE && (
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate({ campaignId, status: CampaignStatus.PAUSED })}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause Campaign
            </Button>
          )}

          {campaign.status === CampaignStatus.PAUSED && (
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate({ campaignId, status: CampaignStatus.ACTIVE })}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume Campaign
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/campaigns/${campaignId}/analytics`}>
                  <BarChart2 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/campaigns/${campaignId}/creatives`}>
                  <FileImage className="mr-2 h-4 w-4" />
                  Manage Creatives
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/api/admin/campaigns/${campaignId}/export?format=pdf`, "_blank")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Campaign overview cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: generalSettings?.defaultCurrency || "USD",
                }).format(campaign.budget)}
              </span>
              {campaign.dailyBudget && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  (
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: generalSettings?.defaultCurrency || "USD",
                  }).format(campaign.dailyBudget)}
                  /day)
                </span>
              )}
            </div>
            {analyticsData.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Spent</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: generalSettings?.defaultCurrency || "USD",
                    }).format(analyticsData.reduce((sum, a) => sum + Number(a.costData.spend), 0))}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                    style={{
                      width: `${Math.min(100, (analyticsData.reduce((sum, a) => sum + Number(a.costData.spend), 0) / campaign.budget) * 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(
                    (analyticsData.reduce((sum, a) => sum + Number(a.costData.spend), 0) / campaign.budget) * 100,
                  )}
                  % of budget used
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Eye className="mr-1 h-3 w-3" />
                  Impressions
                </div>
                <div className="text-xl font-bold">
                  {analyticsData.reduce((sum, a) => sum + a.impressions, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Zap className="mr-1 h-3 w-3" />
                  Engagements
                </div>
                <div className="text-xl font-bold">
                  {analyticsData.reduce((sum, a) => sum + a.engagements, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Target className="mr-1 h-3 w-3" />
                  Conversions
                </div>
                <div className="text-xl font-bold">
                  {analyticsData.reduce((sum, a) => sum + a.conversions, 0).toLocaleString()}
                </div>
              </div>
            </div>
            {analyticsData.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">CTR</div>
                  <div className="text-sm font-medium">
                    {(analyticsData.reduce((sum, a) => sum + a.impressions, 0) > 0
                      ? (analyticsData.reduce((sum, a) => sum + a.engagements, 0) /
                          analyticsData.reduce((sum, a) => sum + a.impressions, 0)) *
                        100
                      : 0
                    ).toFixed(2)}
                    %
                  </div>
                </div>
                <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Conv. Rate</div>
                  <div className="text-sm font-medium">
                    {(analyticsData.reduce((sum, a) => sum + a.engagements, 0) > 0
                      ? (analyticsData.reduce((sum, a) => sum + a.conversions, 0) /
                          analyticsData.reduce((sum, a) => sum + a.engagements, 0)) *
                        100
                      : 0
                    ).toFixed(2)}
                    %
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  Start Date
                </div>
                <div className="font-medium">{formatDate(campaign.startDate)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-1 h-3 w-3" />
                  End Date
                </div>
                <div className="font-medium">{campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="mr-1 h-3 w-3" />
                  Locations
                </div>
                <div className="font-medium">
                  {campaign.targetLocations
                    ? Array.isArray(campaign.targetLocations) && campaign.targetLocations.length > 0
                      ? `${campaign.targetLocations.length} locations`
                      : "Nationwide"
                    : "Nationwide"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users className="mr-1 h-3 w-3" />
                  Audience
                </div>
                <div className="font-medium">
                  {campaign.audienceSegment ? campaign.audienceSegment.name : "All Users"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="overview" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                      <p className="mt-1">{campaign.description || "No description provided."}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Advertiser</h3>
                        <p className="mt-1 font-medium">{campaign.advertiser.companyName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {campaign.advertiser.user.name || campaign.advertiser.user.email}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign ID</h3>
                        <p className="mt-1 font-mono text-sm">{campaign.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Objective</h3>
                        <p className="mt-1">{campaign.objective.replace("_", " ")}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pricing Model</h3>
                        <p className="mt-1">
                          {campaign.pricingModel} -{" "}
                          {campaign.pricingModel === PricingModel.CPM
                            ? "Cost Per Thousand Impressions"
                            : campaign.pricingModel === PricingModel.CPE
                              ? "Cost Per Engagement"
                              : campaign.pricingModel === PricingModel.CPA
                                ? "Cost Per Action"
                                : "Hybrid Pricing"}
                        </p>
                      </div>
                    </div>

                    {campaign.status === CampaignStatus.REJECTED && (
                      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/10">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Rejection Reason</h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                              <p>{campaign.rejectionReason || "No reason provided."}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance chart */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>Campaign performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {isLoadingAnalytics ? <Skeleton className="h-5 w-32" /> : `${analyticsData.length} days of data`}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={timeRange === "7d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("7d")}
                      >
                        7D
                      </Button>
                      <Button
                        variant={timeRange === "30d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("30d")}
                      >
                        30D
                      </Button>
                      <Button
                        variant={timeRange === "90d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("90d")}
                      >
                        90D
                      </Button>
                    </div>
                  </div>

                  <div className="h-80">
                    {isLoadingAnalytics ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : chartData.length > 0 ? (
                      <ChartContainer height={300}>
						  <ChartProvider data={chartData}>
							<BarChartContainer data={chartData}>
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
            </div>

            <div>
              {/* Creatives summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Creatives</CardTitle>
                  <CardDescription>
                    {campaign.adCreatives.length} creative{campaign.adCreatives.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaign.adCreatives.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <FileImage className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No creatives found</p>
                        <Button variant="outline" size="sm" className="mt-4" asChild>
                          <Link href={`/admin/campaigns/${campaignId}/creatives/new`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Creative
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      campaign.adCreatives.slice(0, 3).map((creative) => (
                        <div key={creative.id} className="flex items-start space-x-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                            {creative.previewImage ? (
                              <img
                                src={creative.previewImage || "/placeholder.svg"}
                                alt={creative.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FileImage className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="font-medium">{creative.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {creative.type} • {creative.headline}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {creative.callToAction}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}

                    {campaign.adCreatives.length > 3 && (
                      <div className="text-center">
                        <Button variant="link" size="sm" asChild>
                          <Link href={`/admin/campaigns/${campaignId}/creatives`}>
                            View all {campaign.adCreatives.length} creatives
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/admin/campaigns/${campaignId}/creatives`}>
                      <FileImage className="mr-2 h-4 w-4" />
                      Manage Creatives
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Recent activity */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates to this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingActivity ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activityData.length > 0 ? (
                    <div className="space-y-4">
                      {activityData.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              activity.action.includes("ACTIVATE")
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : activity.action.includes("APPROVE")
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : activity.action.includes("REJECT")
                                    ? "bg-red-100 dark:bg-red-900/30"
                                    : activity.action.includes("UPDATE")
                                      ? "bg-purple-100 dark:bg-purple-900/30"
                                      : "bg-gray-100 dark:bg-gray-800"
                            }`}
                          >
                            {activity.action.includes("ACTIVATE") ? (
                              <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : activity.action.includes("APPROVE") ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : activity.action.includes("REJECT") ? (
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : activity.action.includes("UPDATE") ? (
                              <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{activity.description || activity.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {activity.user.name || activity.user.email} • {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Info className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No activity found</p>
                    </div>
                  )}
                </CardContent>
                {activityData.length > 3 && (
                  <CardFooter className="border-t px-6 py-4">
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("activity")}>
                      View All Activity
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>Detailed analytics for this campaign</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={timeRange === "7d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("7d")}
                      >
                        7D
                      </Button>
                      <Button
                        variant={timeRange === "30d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("30d")}
                      >
                        30D
                      </Button>
                      <Button
                        variant={timeRange === "90d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange("90d")}
                      >
                        90D
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Impressions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analyticsData.reduce((sum, a) => sum + a.impressions, 0).toLocaleString()}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Eye className="mr-1 h-3 w-3" />
                          Total views
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Engagements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analyticsData.reduce((sum, a) => sum + a.engagements, 0).toLocaleString()}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Zap className="mr-1 h-3 w-3" />
                          Total interactions
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Conversions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {analyticsData.reduce((sum, a) => sum + a.conversions, 0).toLocaleString()}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Target className="mr-1 h-3 w-3" />
                          Total completions
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Spend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: generalSettings?.defaultCurrency || "USD",
                            maximumFractionDigits: 0,
                          }).format(analyticsData.reduce((sum, a) => sum + Number(a.costData.spend), 0))}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <DollarSign className="mr-1 h-3 w-3" />
                          Total spent
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-80">
                    {isLoadingAnalytics ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : chartData.length > 0 ? (
                      <ChartContainer height={300}>
					  <LineChartContainer data={chartData}>
						<ChartTooltip />
						<ChartLegend />
						<ChartGrid horizontal vertical />
						<ChartXAxis dataKey="date" tickLine axisLine />
						<ChartYAxis tickLine axisLine />
						<ChartLine
						  dataKey="impressions"
						  name="Impressions"
						  stroke="#3b82f6"
						  strokeWidth={2}
						  dot={{ r: 4 }}
						/>
						<ChartLine
						  dataKey="engagements"
						  name="Engagements"
						  stroke="#8b5cf6"
						  strokeWidth={2}
						  dot={{ r: 4 }}
						/>
						<ChartLine
						  dataKey="conversions"
						  name="Conversions"
						  stroke="#10b981"
						  strokeWidth={2}
						  dot={{ r: 4 }}
						/>
					  </LineChartContainer>
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

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Metrics</CardTitle>
                    <CardDescription>CTR and conversion rates over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {isLoadingAnalytics ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : chartData.length > 0 ? (
                        <ChartContainer height={300}>
						<LineChartContainer data={chartData}>
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartGrid horizontal vertical />
                          <ChartXAxis dataKey="date" tickLine axisLine />
                          <ChartYAxis tickLine axisLine />
                          <ChartLine dataKey="ctr" name="CTR (%)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                          <ChartLine
                            dataKey="conversionRate"
                            name="Conversion Rate (%)"
                            stroke="#ec4899"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
						  </LineChartContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center">
                          <BarChart className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No engagement data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Spend Analysis</CardTitle>
                    <CardDescription>Daily spend and budget utilization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {isLoadingAnalytics ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : chartData.length > 0 ? (
                       <ChartContainer height={300}>
						<ChartProvider data={chartData}>
                         <BarChartContainer data={chartData}>
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartGrid horizontal vertical />
                          <ChartXAxis dataKey="date" tickLine axisLine />
                          <ChartYAxis tickLine axisLine />
                          <ChartBar dataKey="spend" name="Daily Spend" fill="#06b6d4" radius={[4, 4, 0, 0]} />
						 </BarChartContainer>
                        </ChartProvider>
                       </ChartContainer>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center">
                          <DollarSign className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No spend data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="creatives" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Creatives</CardTitle>
                  <CardDescription>
                    {campaign.adCreatives.length} creative{campaign.adCreatives.length !== 1 ? "s" : ""} for this
                    campaign
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/admin/campaigns/${campaignId}/creatives/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Creative
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaign.adCreatives.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileImage className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <h3 className="mt-4 text-lg font-medium">No creatives found</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    This campaign doesn't have any creatives yet. Add your first creative to get started.
                  </p>
                  <Button className="mt-6" asChild>
                    <Link href={`/admin/campaigns/${campaignId}/creatives/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Creative
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {campaign.adCreatives.map((creative) => (
                    <Card key={creative.id} className="overflow-hidden">
                      <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800">
                        {creative.type === CreativeType.VIDEO ? (
                          <video
                            src={creative.content}
                            poster={creative.previewImage}
                            controls
                            className="h-full w-full object-cover"
                          />
                        ) : creative.previewImage || creative.content ? (
                          <img
                            src={creative.previewImage || creative.content}
                            alt={creative.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FileImage className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{creative.name}</CardTitle>
                          <Badge variant="outline">{creative.type}</Badge>
                        </div>
                        <CardDescription>{creative.headline}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {creative.description.length > 100
                            ? `${creative.description.substring(0, 100)}...`
                            : creative.description}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t px-6 py-4">
                        <Badge>{creative.callToAction}</Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/campaigns/${campaignId}/creatives/${creative.id}`}>Edit</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targeting" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Location Targeting</CardTitle>
                <CardDescription>Geographic areas where this campaign is shown</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.targetLocations &&
                Array.isArray(campaign.targetLocations) &&
                campaign.targetLocations.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {campaign.targetLocations.map((location: any, index: number) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                          <MapPin className="h-3 w-3" />
                          {typeof location === "object"
							  ? location.name || 
								location.city || 
								(typeof location === "object"
								  ? JSON.stringify(location).substring(0, 20) + "..."
								  : location)
							  : location}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                      <div className="flex items-start">
                        <Info className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <div className="ml-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            This campaign is targeting {campaign.targetLocations.length} specific location
                            {campaign.targetLocations.length !== 1 ? "s" : ""}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This campaign is targeting all locations (nationwide).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audience Targeting</CardTitle>
                <CardDescription>Demographic and interest-based targeting</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.audienceSegment ? (
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <h3 className="font-medium">{campaign.audienceSegment.name}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {campaign.audienceSegment.description || "No description provided."}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {campaign.audienceSegment.type}
                      </Badge>
                    </div>
                  </div>
                ) : campaign.targetDemographics ? (
                  <div className="space-y-4">
                    {campaign.targetDemographics.ageRanges && campaign.targetDemographics.ageRanges.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Age Ranges</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.targetDemographics.ageRanges.map((age: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {age}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {campaign.targetDemographics.genders && campaign.targetDemographics.genders.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.targetDemographics.genders.map((gender: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {gender}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {campaign.targetDemographics.interests && campaign.targetDemographics.interests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Interests</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.targetDemographics.interests.map((interest: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This campaign is targeting all audiences.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule Targeting</CardTitle>
                <CardDescription>Days and times when this campaign is active</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.targetSchedule ? (
                  <div className="space-y-4">
                    {campaign.targetSchedule.weekdays && campaign.targetSchedule.weekdays.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Days of Week</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.targetSchedule.weekdays.map((day: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {campaign.targetSchedule.timeRanges && campaign.targetSchedule.timeRanges.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Ranges</h3>
                        <div className="mt-2 space-y-2">
                          {campaign.targetSchedule.timeRanges.map((timeRange: any, index: number) => (
                            <div key={index} className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{timeRange.start}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                                <span className="text-sm">{timeRange.end}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This campaign is active at all times.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
                <CardDescription>Start and end dates for this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h3>
                        <p className="mt-1 font-medium">{formatDate(campaign.startDate)}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</h3>
                        <p className="mt-1 font-medium">
                          {campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="flex items-start">
                      <Info className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div className="ml-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {campaign.endDate
                            ? `This campaign runs for ${Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24))} days.`
                            : "This campaign has no end date and will run until manually stopped or paused."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Complete history of changes and actions for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : activityData.length > 0 ? (
                <div className="space-y-4">
                  {activityData.map((activity) => (
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
                      <div className="flex-1">
                        <p className="font-medium">{activity.description || activity.action}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          By {activity.user.name || activity.user.email}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(activity.timestamp)} ({formatTimeAgo(activity.timestamp)})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Info className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <h3 className="mt-4 text-lg font-medium">No activity found</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    There is no recorded activity for this campaign yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </>
  )
}
