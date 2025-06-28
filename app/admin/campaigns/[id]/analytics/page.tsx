"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  ChartContainer,
  ChartProvider,
  LineChartContainer,
  BarChartContainer,
  PieChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartBar,
  ChartLine,
  ChartPie,
} from "@/components/ui/chart"
import {
  ArrowLeft,
  BarChart2,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  Target,
  Thermometer,
  Users,
  Zap,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Heart,
  Smile,
  Meh,
  Frown,
  Clock8,
  Smartphone,
  Tablet,
  Laptop,
  HelpCircle,
} from "lucide-react"
import { BarChart, Cell } from "recharts"

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
  AudienceSegment?: {
    id: string
    name: string
    description?: string | null
    type: string
    rules: any
  } | null
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

const fetchCampaignAnalytics = async (campaignId: string, timeRange: string): Promise<CampaignAnalytics[]> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}/analytics?timeRange=${timeRange}`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaign analytics")
  }
  return response.json()
}

// Helper function to export analytics data
const exportAnalyticsData = async (campaignId: string, format: string, timeRange: string) => {
  try {
    const response = await fetch(
      `/api/admin/campaigns/${campaignId}/analytics/export?format=${format}&timeRange=${timeRange}`,
    )

    if (!response.ok) {
      throw new Error(`Failed to export analytics as ${format}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `campaign-analytics-${campaignId}-${new Date().toISOString().split("T")[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success("Export successful", {
      description: `Analytics exported as ${format.toUpperCase()} successfully.`,
    })
  } catch (error) {
    toast.error("Export failed", {
      description: error instanceof Error ? error.message : "Failed to export analytics",
      variant: "destructive",
    })
  }
}

export default function CampaignAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const { generalSettings, loading: loadingSettings } = usePublicSettings()

  // State
  const [timeRange, setTimeRange] = useState("7d")
  const [comparisonMode, setComparisonMode] = useState<"previous" | "target" | "none">("previous")
  const [activeMetric, setActiveMetric] = useState<"impressions" | "engagements" | "conversions" | "spend">(
    "impressions",
  )
  const [chartType, setChartType] = useState<"line" | "bar">("line")

  // Fetch campaign data
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
  })

  // Fetch campaign analytics
  const {
    data: analyticsData = [],
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["campaignAnalytics", campaignId, timeRange],
    queryFn: () => fetchCampaignAnalytics(campaignId, timeRange),
  })

  // Prepare analytics data for charts
  const chartData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return []

    return analyticsData.map((data) => ({
      date: format(new Date(data.date), "MMM d"),
      impressions: data.impressions,
      engagements: data.engagements,
      conversions: data.conversions,
      ctr: Number((data.ctr * 100).toFixed(2)),
      conversionRate: Number((data.conversionRate * 100).toFixed(2)),
      spend: typeof data.costData === "string" ? JSON.parse(data.costData).spend : data.costData.spend,
      averageDwellTime: data.averageDwellTime || 0,
    }))
  }, [analyticsData])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return {
        totalImpressions: 0,
        totalEngagements: 0,
        totalConversions: 0,
        totalSpend: 0,
        averageCTR: 0,
        averageConversionRate: 0,
        averageDwellTime: 0,
      }
    }

    const totalImpressions = analyticsData.reduce((sum, data) => sum + data.impressions, 0)
    const totalEngagements = analyticsData.reduce((sum, data) => sum + data.engagements, 0)
    const totalConversions = analyticsData.reduce((sum, data) => sum + data.conversions, 0)
    const totalSpend = analyticsData.reduce((sum, data) => {
      const spend = typeof data.costData === "string" ? JSON.parse(data.costData).spend : data.costData.spend
      return sum + Number(spend)
    }, 0)

    // Calculate averages
    const averageCTR = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
    const averageConversionRate = totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0
    const averageDwellTime =
      analyticsData.reduce((sum, data) => sum + (data.averageDwellTime || 0), 0) / analyticsData.length

    return {
      totalImpressions,
      totalEngagements,
      totalConversions,
      totalSpend,
      averageCTR,
      averageConversionRate,
      averageDwellTime,
    }
  }, [analyticsData])

  // Calculate previous period metrics for comparison
  const previousPeriodMetrics = useMemo(() => {
    if (!campaign || !analyticsData || analyticsData.length === 0) {
      return {
        impressionsChange: 0,
        engagementsChange: 0,
        conversionsChange: 0,
        spendChange: 0,
      }
    }

    // Determine the date range for the previous period
    const currentPeriodDays = analyticsData.length
    const oldestDate = new Date(analyticsData[0].date)
    const previousPeriodEndDate = subDays(oldestDate, 1)
    const previousPeriodStartDate = subDays(previousPeriodEndDate, currentPeriodDays)

    // Mock previous period data (in a real app, you would fetch this from the API)
    // For this example, we'll simulate previous period data as 80-120% of current period
    const randomFactor = () => 0.8 + Math.random() * 0.4 // Random factor between 0.8 and 1.2

    const previousImpressions = summaryMetrics.totalImpressions * randomFactor()
    const previousEngagements = summaryMetrics.totalEngagements * randomFactor()
    const previousConversions = summaryMetrics.totalConversions * randomFactor()
    const previousSpend = summaryMetrics.totalSpend * randomFactor()

    return {
      impressionsChange:
        previousImpressions > 0
          ? ((summaryMetrics.totalImpressions - previousImpressions) / previousImpressions) * 100
          : 0,
      engagementsChange:
        previousEngagements > 0
          ? ((summaryMetrics.totalEngagements - previousEngagements) / previousEngagements) * 100
          : 0,
      conversionsChange:
        previousConversions > 0
          ? ((summaryMetrics.totalConversions - previousConversions) / previousConversions) * 100
          : 0,
      spendChange: previousSpend > 0 ? ((summaryMetrics.totalSpend - previousSpend) / previousSpend) * 100 : 0,
    }
  }, [campaign, analyticsData, summaryMetrics])

  // Prepare audience demographics data
  const audienceDemographicsData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return []

    // Extract and aggregate audience demographics from analytics data
    const aggregatedData: Record<string, number> = {}

    analyticsData.forEach((data) => {
      if (data.audienceMetrics) {
        const demographics =
          typeof data.audienceMetrics === "string" ? JSON.parse(data.audienceMetrics) : data.audienceMetrics

        if (demographics.ageGroups) {
          Object.entries(demographics.ageGroups).forEach(([age, count]) => {
            aggregatedData[age] = (aggregatedData[age] || 0) + Number(count)
          })
        }
      }
    })

    // If no real data, create mock data
    if (Object.keys(aggregatedData).length === 0) {
      return [
        { name: "18-24", value: 25 },
        { name: "25-34", value: 35 },
        { name: "35-44", value: 20 },
        { name: "45-54", value: 12 },
        { name: "55-64", value: 5 },
        { name: "65+", value: 3 },
      ]
    }

    // Convert to chart format
    return Object.entries(aggregatedData).map(([name, value]) => ({
      name,
      value,
    }))
  }, [analyticsData])

  // Prepare emotion metrics data
  const emotionMetricsData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return []

    // Extract and aggregate emotion metrics from analytics data
    const aggregatedData: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    analyticsData.forEach((data) => {
      if (data.emotionMetrics) {
        const emotions = typeof data.emotionMetrics === "string" ? JSON.parse(data.emotionMetrics) : data.emotionMetrics

        if (emotions.sentiments) {
          aggregatedData.positive += Number(emotions.sentiments.positive || 0)
          aggregatedData.neutral += Number(emotions.sentiments.neutral || 0)
          aggregatedData.negative += Number(emotions.sentiments.negative || 0)
        }
      }
    })

    // If no real data, create mock data
    if (aggregatedData.positive === 0 && aggregatedData.neutral === 0 && aggregatedData.negative === 0) {
      return [
        { name: "Positive", value: 65 },
        { name: "Neutral", value: 25 },
        { name: "Negative", value: 10 },
      ]
    }

    // Convert to chart format
    return Object.entries(aggregatedData).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [analyticsData])

  // Prepare device distribution data
  const deviceDistributionData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      // Mock data if no real data available
      return [
        { name: "Mobile", value: 55 },
        { name: "Desktop", value: 30 },
        { name: "Tablet", value: 12 },
        { name: "Other", value: 3 },
      ]
    }

    // In a real implementation, you would extract this from analytics data
    // For this example, we'll use mock data
    return [
      { name: "Mobile", value: 55 },
      { name: "Desktop", value: 30 },
      { name: "Tablet", value: 12 },
      { name: "Other", value: 3 },
    ]
  }, [analyticsData])

  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A"
    return format(new Date(date), "MMM d, yyyy")
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
        icon: <Info className="h-3 w-3 mr-1" />,
      },
      PAUSED: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <Info className="h-3 w-3 mr-1" />,
      },
      COMPLETED: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      REJECTED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
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
        <Button onClick={() => router.refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  // Chart colors
  const COLORS = ["#4ade80", "#facc15", "#94a3b8", "#8b5cf6", "#64748b", "#ef4444"]
  const EMOTION_COLORS = {
    Positive: "#4ade80",
    Neutral: "#94a3b8",
    Negative: "#ef4444",
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href={`/admin/campaigns/${campaignId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Analytics: {campaign.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={campaign.status} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {campaign.objective} • {campaign.pricingModel}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(campaign.startDate)} - {campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={comparisonMode} onValueChange={(value) => setComparisonMode(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Comparison mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous">Compare to previous period</SelectItem>
                <SelectItem value="target">Compare to targets</SelectItem>
                <SelectItem value="none">No comparison</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refetchAnalytics()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button variant="outline" onClick={() => exportAnalyticsData(campaignId, "csv", timeRange)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button variant="outline" onClick={() => exportAnalyticsData(campaignId, "pdf", timeRange)}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>

            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Key metrics summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{summaryMetrics.totalImpressions.toLocaleString()}</div>
              {comparisonMode === "previous" && (
                <div
                  className={`flex items-center text-sm ${previousPeriodMetrics.impressionsChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {previousPeriodMetrics.impressionsChange >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  {Math.abs(previousPeriodMetrics.impressionsChange).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Eye className="mr-1 h-3 w-3" />
              Total views
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Engagements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{summaryMetrics.totalEngagements.toLocaleString()}</div>
              {comparisonMode === "previous" && (
                <div
                  className={`flex items-center text-sm ${previousPeriodMetrics.engagementsChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {previousPeriodMetrics.engagementsChange >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  {Math.abs(previousPeriodMetrics.engagementsChange).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Zap className="mr-1 h-3 w-3" />
              Total interactions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{summaryMetrics.totalConversions.toLocaleString()}</div>
              {comparisonMode === "previous" && (
                <div
                  className={`flex items-center text-sm ${previousPeriodMetrics.conversionsChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {previousPeriodMetrics.conversionsChange >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  {Math.abs(previousPeriodMetrics.conversionsChange).toFixed(1)}%
                </div>
              )}
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
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: generalSettings?.defaultCurrency || "USD",
                  maximumFractionDigits: 0,
                }).format(summaryMetrics.totalSpend)}
              </div>
              {comparisonMode === "previous" && (
                <div
                  className={`flex items-center text-sm ${previousPeriodMetrics.spendChange >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {previousPeriodMetrics.spendChange >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  {Math.abs(previousPeriodMetrics.spendChange).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <DollarSign className="mr-1 h-3 w-3" />
              Total spent
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              CTR (Click-Through Rate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.averageCTR.toFixed(2)}%</div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Percent className="mr-1 h-3 w-3" />
              Engagements / Impressions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.averageConversionRate.toFixed(2)}%</div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Percent className="mr-1 h-3 w-3" />
              Conversions / Engagements
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Dwell Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.averageDwellTime.toFixed(1)}s</div>
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Clock8 className="mr-1 h-3 w-3" />
              Time spent viewing
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main analytics tabs */}
      <Tabs defaultValue="performance" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeMetric === "impressions" ? "default" : "outline"}
                onClick={() => setActiveMetric("impressions")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Impressions
              </Button>
              <Button
                variant={activeMetric === "engagements" ? "default" : "outline"}
                onClick={() => setActiveMetric("engagements")}
              >
                <Zap className="mr-2 h-4 w-4" />
                Engagements
              </Button>
              <Button
                variant={activeMetric === "conversions" ? "default" : "outline"}
                onClick={() => setActiveMetric("conversions")}
              >
                <Target className="mr-2 h-4 w-4" />
                Conversions
              </Button>
              <Button
                variant={activeMetric === "spend" ? "default" : "outline"}
                onClick={() => setActiveMetric("spend")}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Spend
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
              >
                <BarChart2 className="h-4 w-4" />
                <span className="sr-only">Line Chart</span>
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                <BarChart className="h-4 w-4" />
                <span className="sr-only">Bar Chart</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {activeMetric === "impressions" && "Impressions Over Time"}
                {activeMetric === "engagements" && "Engagements Over Time"}
                {activeMetric === "conversions" && "Conversions Over Time"}
                {activeMetric === "spend" && "Spend Over Time"}
              </CardTitle>
              <CardDescription>
                {timeRange === "7d" && "Last 7 days"}
                {timeRange === "30d" && "Last 30 days"}
                {timeRange === "90d" && "Last 90 days"}
                {timeRange === "all" && "All time"}
              </CardDescription>
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
                      {chartType === "line" ? (
                        <LineChartContainer data={chartData}>
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartGrid horizontal vertical />
                          <ChartXAxis dataKey="date" tickLine axisLine />
                          <ChartYAxis tickLine axisLine />
                          <ChartLine
                            dataKey={activeMetric}
                            name={activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChartContainer>
                      ) : (
                        <BarChartContainer data={chartData}>
                          <ChartTooltip />
                          <ChartLegend />
                          <ChartGrid horizontal vertical />
                          <ChartXAxis dataKey="date" tickLine axisLine />
                          <ChartYAxis tickLine axisLine />
                          <ChartBar
                            dataKey={activeMetric}
                            name={activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)}
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChartContainer>
                      )}
                    </ChartProvider>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <BarChart2 className="h-16 w-16 text-gray-300 dark:text-gray-600" />
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
                      <BarChart2 className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No engagement data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization</CardTitle>
                <CardDescription>Campaign spend vs. budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Spent</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: generalSettings?.defaultCurrency || "USD",
                      }).format(summaryMetrics.totalSpend)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Budget</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: generalSettings?.defaultCurrency || "USD",
                      }).format(campaign.budget)}
                    </span>
                  </div>
                  <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                      style={{
                        width: `${Math.min(100, (summaryMetrics.totalSpend / campaign.budget) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {Math.round((summaryMetrics.totalSpend / campaign.budget) * 100)}% of budget used
                  </div>
                </div>

                <div className="h-48">
                  {isLoadingAnalytics ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : chartData.length > 0 ? (
                    <ChartContainer height={180}>
                      <ChartProvider data={chartData}>
                        <BarChartContainer data={chartData}>
                          <ChartTooltip />
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
        </TabsContent>

        <TabsContent value="audience">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audience Demographics</CardTitle>
                <CardDescription>Age distribution of viewers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoadingAnalytics ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : audienceDemographicsData.length > 0 ? (
                    <ChartContainer height={300}>
                      <PieChartContainer data={audienceDemographicsData}>
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
                          {audienceDemographicsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </ChartPie>
                      </PieChartContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <Users className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No demographic data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotional Response</CardTitle>
                <CardDescription>Viewer sentiment analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoadingAnalytics ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : emotionMetricsData.length > 0 ? (
                    <ChartContainer height={300}>
                      <PieChartContainer data={emotionMetricsData}>
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
                          {emotionMetricsData.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={EMOTION_COLORS[entry.name as keyof typeof EMOTION_COLORS] || "#94a3b8"}
                            />
                          ))}
                        </ChartPie>
                      </PieChartContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <Heart className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No emotion data available</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <Smile className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Positive</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <Meh className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Neutral</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <Frown className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Negative</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Audience Engagement</CardTitle>
                <CardDescription>Dwell time and interaction metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2">
                      <Clock8 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-sm font-medium">Average Dwell Time</h3>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{summaryMetrics.averageDwellTime.toFixed(1)}s</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Time spent viewing content</p>
                  </div>

                  <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2">
                      <Percent className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-sm font-medium">Engagement Rate</h3>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {((summaryMetrics.totalEngagements / summaryMetrics.totalImpressions) * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Percentage of viewers who engaged</p>
                  </div>

                  <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-sm font-medium">Engagement Quality</h3>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {summaryMetrics.averageConversionRate > 5
                        ? "High"
                        : summaryMetrics.averageConversionRate > 2
                          ? "Medium"
                          : "Low"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Based on conversion rate and dwell time
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-64">
                  {isLoadingAnalytics ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : chartData.length > 0 ? (
                    <ChartContainer height={250}>
                      <LineChartContainer data={chartData}>
                        <ChartTooltip />
                        <ChartLegend />
                        <ChartGrid horizontal vertical />
                        <ChartXAxis dataKey="date" tickLine axisLine />
                        <ChartYAxis tickLine axisLine />
                        <ChartLine
                          dataKey="averageDwellTime"
                          name="Dwell Time (s)"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChartContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <Clock8 className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No dwell time data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader>
              <CardTitle>Creative Performance</CardTitle>
              <CardDescription>Performance metrics by creative</CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.adCreatives.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center">
                  <Info className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No creatives found for this campaign</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {campaign.adCreatives.map((creative) => {
                    // Mock data for creative performance
                    const impressions = Math.floor(Math.random() * summaryMetrics.totalImpressions * 0.8)
                    const engagements = Math.floor(Math.random() * impressions * 0.2)
                    const conversions = Math.floor(Math.random() * engagements * 0.1)
                    const ctr = impressions > 0 ? (engagements / impressions) * 100 : 0
                    const convRate = engagements > 0 ? (conversions / engagements) * 100 : 0

                    return (
                      <div key={creative.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 md:flex-row">
                          <div className="h-32 w-full md:w-48 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                            {creative.previewImage ? (
                              <img
                                src={creative.previewImage || "/placeholder.svg"}
                                alt={creative.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Info className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg font-medium">{creative.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {creative.type} • {creative.headline}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Impressions</p>
                                <p className="text-lg font-medium">{impressions.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Engagements</p>
                                <p className="text-lg font-medium">{engagements.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                                <p className="text-lg font-medium">{ctr.toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Conv. Rate</p>
                                <p className="text-lg font-medium">{convRate.toFixed(2)}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Performance metrics by location</CardDescription>
            </CardHeader>
            <CardContent>
              {!campaign.targetLocations ||
              !Array.isArray(campaign.targetLocations) ||
              campaign.targetLocations.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center">
                  <MapPin className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    This campaign targets all locations (nationwide)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaign.targetLocations.map((location: any, index: number) => {
                    // Mock data for location performance
                    const impressions = Math.floor(Math.random() * summaryMetrics.totalImpressions * 0.5)
                    const engagements = Math.floor(Math.random() * impressions * 0.2)
                    const conversions = Math.floor(Math.random() * engagements * 0.1)
                    const ctr = impressions > 0 ? (engagements / impressions) * 100 : 0

                    const locationName =
                      typeof location === "object"
                        ? location.name || location.city || JSON.stringify(location).substring(0, 20) + "..."
                        : location

                    return (
                      <div key={index} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <h3 className="font-medium">{locationName}</h3>
                          </div>
                          <Badge variant="outline">
                            {ctr > 3 ? "High Performing" : ctr > 1.5 ? "Average" : "Low Performing"}
                          </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Impressions</p>
                            <p className="text-lg font-medium">{impressions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Engagements</p>
                            <p className="text-lg font-medium">{engagements.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                            <p className="text-lg font-medium">{ctr.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Conversions</p>
                            <p className="text-lg font-medium">{conversions.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                            style={{
                              width: `${(impressions / summaryMetrics.totalImpressions) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {((impressions / summaryMetrics.totalImpressions) * 100).toFixed(1)}% of total impressions
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Impressions by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoadingAnalytics ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : deviceDistributionData.length > 0 ? (
                    <ChartContainer height={300}>
                      <PieChartContainer data={deviceDistributionData}>
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
                          {deviceDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </ChartPie>
                      </PieChartContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <Smartphone className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No device data available</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Mobile</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <Laptop className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Desktop</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Tablet className="h-6 w-6" />
                    </div>
                    <span className="mt-1 text-sm">Tablet</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Performance</CardTitle>
                <CardDescription>Engagement metrics by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="font-medium">Mobile</h3>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                        <p className="text-lg font-medium">2.8%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
                        <p className="text-lg font-medium">1.2%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Dwell Time</p>
                        <p className="text-lg font-medium">8.5s</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
                        <p className="text-lg font-medium">42%</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="font-medium">Desktop</h3>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                        <p className="text-lg font-medium">3.2%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
                        <p className="text-lg font-medium">1.8%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Dwell Time</p>
                        <p className="text-lg font-medium">12.3s</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
                        <p className="text-lg font-medium">35%</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Tablet className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="font-medium">Tablet</h3>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                        <p className="text-lg font-medium">2.5%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
                        <p className="text-lg font-medium">1.4%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
                        <p className="text-lg font-medium">38%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Help section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" />
            Analytics Help
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Understanding Metrics</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Learn about the key metrics and how they impact your campaign performance.
              </p>
              <Button variant="link" className="mt-2 px-0" asChild>
                <Link href="#">View Guide</Link>
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Optimizing Campaigns</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tips and strategies to improve your campaign performance based on analytics.
              </p>
              <Button variant="link" className="mt-2 px-0" asChild>
                <Link href="#">Read Tips</Link>
              </Button>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium">Export & Reporting</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Learn how to export data and create custom reports for stakeholders.
              </p>
              <Button variant="link" className="mt-2 px-0" asChild>
                <Link href="#">Export Guide</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
