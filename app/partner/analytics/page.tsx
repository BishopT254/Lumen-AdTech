"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format, subDays } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  ArrowUpRight,
  CalendarIcon,
  Download,
  Eye,
  Smartphone,
  Timer,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  BarChart3,
} from "lucide-react"

// Types based on the Prisma schema
interface DeviceAnalytics {
  id: string
  deviceId: string
  date: string
  uptime: number
  impressionsServed: number
  engagementsCount: number
  averageViewerCount: number | null
  performanceMetrics?: any
  energyConsumption?: number | null
  deviceName?: string
  deviceLocation?: string
}

interface AudienceData {
  id: string
  adDeliveryId: string
  demographics?: any
  viewerCount: number
  dwellTime?: number
  timestamp: string
}

interface EmotionData {
  adDeliveryId: string
  timestamp: string
  joyScore?: number
  surpriseScore?: number
  neutralScore?: number
  dwellTime?: number
  viewerCount?: number
}

interface AnalyticsOverview {
  totalImpressions: number
  totalEngagements: number
  totalDevices: number
  activeDevices: number
  averageViewerCount: number
  engagementRate: number
  averageDwellTime: number
  totalUptimeHours: number
}

interface DailyAnalytics {
  date: string
  impressions: number
  engagements: number
  viewerCount: number
  uptimePercentage: number
}

interface LocationPerformance {
  location: string
  impressions: number
  engagements: number
  engagementRate: number
  deviceCount?: number
}

interface AudienceDemographics {
  ageGroup: string
  percentage: number
  engagementRate: number
}

interface EmotionMetrics {
  emotion: string
  percentage: number
  value: number
}

interface TimeOfDayData {
  hour: string
  impressions: number
  engagements: number
  viewers: number
}

interface DeviceStatus {
  id: string
  name: string
  location: string
  status: "online" | "offline" | "maintenance"
  lastPing: string
  uptime: number
  impressions: number
  engagements: number
  healthScore: number
}

interface ApiResponse {
  timeframe: {
    startDate: string
    endDate: string
  }
  devices: any[]
  dailyAnalytics: DailyAnalytics[]
  locationPerformance: LocationPerformance[]
  demographicsData: AudienceDemographics[]
  emotionMetrics: EmotionMetrics[]
  timeOfDayData: TimeOfDayData[]
  deviceStatuses: DeviceStatus[]
}

interface SummaryResponse {
  period: {
    name: string
    startDate: string
    endDate: string
  }
  totalDevices: number
  activeDevices: number
  totalImpressions: number
  totalRevenue: number
  averageCTR: number
  totalConversions: number
  totalViewers: number
  engagementRate: number
  averageDwellTime: number
  wallet: {
    balance: number
    pendingBalance: number
    currency: string
  } | null
  trends: {
    impressions: number
    engagements: number
  }
}

const COLORS = ["#8884d8", "#00C49F", "#FFBB28", "#FF8042", "#a256e8", "#37bd65"]

export default function AnalyticsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { toast } = useToast()
  const { analyticsSettings, loading: settingsLoading } = usePublicSettings()

  // State management
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalImpressions: 0,
    totalEngagements: 0,
    totalDevices: 0,
    activeDevices: 0,
    averageViewerCount: 0,
    engagementRate: 0,
    averageDwellTime: 0,
    totalUptimeHours: 0,
  })
  const [dailyData, setDailyData] = useState<DailyAnalytics[]>([])
  const [locationData, setLocationData] = useState<LocationPerformance[]>([])
  const [demographicsData, setDemographicsData] = useState<AudienceDemographics[]>([])
  const [emotionData, setEmotionData] = useState<EmotionMetrics[]>([])
  const [timeOfDayData, setTimeOfDayData] = useState<TimeOfDayData[]>([])
  const [deviceAnalytics, setDeviceAnalytics] = useState<DeviceAnalytics[]>([])
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [timeframe, setTimeframe] = useState("30days")
  const [locationFilter, setLocationFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)

  // Load analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (sessionStatus !== "authenticated") return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch summary data for overview metrics
        const summaryResponse = await fetch(`/api/partner/analytics/summary?period=${timeframe}`)

        if (!summaryResponse.ok) {
          throw new Error(`Failed to fetch summary data: ${summaryResponse.statusText}`)
        }

        const summaryData: SummaryResponse = await summaryResponse.json()

        // Fetch detailed analytics data
        const startDateParam = dateRange.from.toISOString()
        const endDateParam = dateRange.to.toISOString()

        const analyticsResponse = await fetch(
          `/api/partner/analytics?startDate=${startDateParam}&endDate=${endDateParam}&timeframe=${timeframe}`,
        )

        if (!analyticsResponse.ok) {
          throw new Error(`Failed to fetch analytics data: ${analyticsResponse.statusText}`)
        }

        const analyticsData: ApiResponse = await analyticsResponse.json()

        // Update state with fetched data
        setDailyData(analyticsData.dailyAnalytics)
        setLocationData(analyticsData.locationPerformance)
        setDemographicsData(analyticsData.demographicsData)
        setEmotionData(analyticsData.emotionMetrics)
        setTimeOfDayData(analyticsData.timeOfDayData)
        setDeviceStatuses(analyticsData.deviceStatuses)

        // Calculate overview from summary data
        setOverview({
          totalImpressions: summaryData.totalImpressions,
          totalEngagements: Math.round(summaryData.totalImpressions * (summaryData.engagementRate / 100)),
          totalDevices: summaryData.totalDevices,
          activeDevices: summaryData.activeDevices,
          averageViewerCount: summaryData.totalViewers / (summaryData.totalDevices || 1),
          engagementRate: summaryData.engagementRate,
          averageDwellTime: summaryData.averageDwellTime,
          totalUptimeHours: analyticsData.deviceStatuses.reduce((sum, device) => sum + (device.uptime * 24) / 100, 0),
        })
      } catch (error) {
        console.error("Error fetching analytics data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error",
          description: "Failed to load analytics data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [toast, dateRange, timeframe, sessionStatus])

  // Filter chart data based on selected timeframe
  const getFilteredChartData = () => {
    const days = {
      "7days": 7,
      "30days": 30,
      "90days": 90,
      all: dailyData.length,
    }

    const count = days[timeframe as keyof typeof days] || days["30days"]
    return dailyData.slice(-count)
  }

  // Format large numbers with K/M suffixes
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  // Generate custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-sm">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`tooltip-${index}`} className="text-sm flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span>
                {entry.name}: {formatNumber(entry.value)}
              </span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Handle date range selection
  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    if (range.from && range.to) {
      setDateRange(range)
    }
  }

  // Get status badge for device status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Online
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Offline
          </Badge>
        )
      case "maintenance":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Maintenance
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-amber-500"
    return "bg-red-500"
  }

  // Filter devices by location
  const getFilteredDevices = () => {
    if (locationFilter === "all") return deviceStatuses
    return deviceStatuses.filter((device) => device.location === locationFilter)
  }

  // Handle export functionality
  const handleExport = async () => {
    try {
      // Create CSV content
      const headers = ["Date", "Impressions", "Engagements", "Viewer Count", "Uptime %"]
      const csvRows = [headers]

      dailyData.forEach((day) => {
        csvRows.push([
          day.date,
          day.impressions.toString(),
          day.engagements.toString(),
          day.viewerCount.toString(),
          day.uptimePercentage.toFixed(2),
        ])
      })

      const csvContent = csvRows.map((row) => row.join(",")).join("\n")

      // Create a blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `analytics_${format(new Date(), "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: "Analytics data has been exported to CSV",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data",
        variant: "destructive",
      })
    }
  }

  // Return loading skeleton if data is being fetched
  if (isLoading || settingsLoading || sessionStatus === "loading") {
    return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Analytics</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Monitor performance metrics and audience insights</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && handleDateRangeChange(range)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalImpressions)}</div>
            <p className="text-xs text-muted-foreground">Content views across all devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.engagementRate.toFixed(1)}%</div>
            <div className="flex items-center mt-1">
              <span className="text-xs text-green-500 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                2.1% from previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.activeDevices} / {overview.totalDevices}
            </div>
            <p className="text-xs text-muted-foreground">Devices active in the last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Dwell Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.averageDwellTime.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">Average viewer attention span</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Impressions and engagements over time</CardDescription>
              </div>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getFilteredChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), "MMM d")} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    name="Impressions"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                  <Line type="monotone" dataKey="engagements" name="Engagements" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Time of Day Analysis</CardTitle>
                <CardDescription>Performance metrics by hour of day</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="impressions" name="Impressions" fill="#8884d8" />
                    <Bar dataKey="engagements" name="Engagements" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audience Demographics</CardTitle>
                <CardDescription>Viewer age distribution and engagement</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demographicsData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="ageGroup" type="category" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="percentage" name="Audience %" fill="#8884d8" />
                    <Bar dataKey="engagementRate" name="Engagement %" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Engagement metrics by device location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Location</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Impressions</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Engagements</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Engagement Rate</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationData.map((location, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">{location.location}</td>
                        <td className="p-4 align-middle">{formatNumber(location.impressions)}</td>
                        <td className="p-4 align-middle">{formatNumber(location.engagements)}</td>
                        <td className="p-4 align-middle">{location.engagementRate.toFixed(1)}%</td>
                        <td className="p-4 align-middle">
                          <Progress
                            value={location.engagementRate * 5}
                            className="h-2"
                            indicatorClassName={
                              location.engagementRate > 8
                                ? "bg-green-500"
                                : location.engagementRate > 5
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Viewers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(Math.round(overview.averageViewerCount))}</div>
                <p className="text-xs text-muted-foreground">Per content display</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Dwell Time</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.averageDwellTime.toFixed(1)}s</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    3.5s from previous period
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.engagementRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Interactions per impression</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Audience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(Math.round(overview.totalImpressions * 0.7))}</div>
                <p className="text-xs text-muted-foreground">Estimated unique viewers</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audience Demographics</CardTitle>
                <CardDescription>Age distribution of your audience</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demographicsData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="ageGroup" type="category" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="percentage" name="Audience %" fill="#8884d8" />
                    <Bar dataKey="engagementRate" name="Engagement %" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotional Response</CardTitle>
                <CardDescription>Viewer emotional reactions to content</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emotionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {emotionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Viewer Engagement by Time of Day</CardTitle>
              <CardDescription>When your audience is most engaged</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeOfDayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="viewers" name="Viewers" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="engagements" name="Engagements" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Device Status</h2>
              <p className="text-sm text-muted-foreground">Monitor the health and performance of your devices</p>
            </div>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locationData.map((location, index) => (
                  <SelectItem key={index} value={location.location}>
                    {location.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deviceStatuses.filter((d) => d.status === "online").length}</div>
                <p className="text-xs text-muted-foreground">Out of {deviceStatuses.length} total devices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Uptime</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(deviceStatuses.reduce((sum, device) => sum + device.uptime, 0) / deviceStatuses.length).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Health Score</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    deviceStatuses.reduce((sum, device) => sum + device.healthScore, 0) / deviceStatuses.length
                  ).toFixed(0)}
                  /100
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{
                      width: `${deviceStatuses.reduce((sum, device) => sum + device.healthScore, 0) / deviceStatuses.length}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Required</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {deviceStatuses.filter((d) => d.status === "maintenance").length}
                </div>
                <p className="text-xs text-muted-foreground">Devices needing attention</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Device Status</CardTitle>
              <CardDescription>Current status of all your devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Ping</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Health Score</TableHead>
                      <TableHead>Impressions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredDevices().map((device, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>{device.location}</TableCell>
                        <TableCell>{getStatusBadge(device.status)}</TableCell>
                        <TableCell>{device.lastPing}</TableCell>
                        <TableCell>{device.uptime}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{device.healthScore}</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`${getHealthScoreColor(device.healthScore)} h-2 rounded-full`}
                                style={{ width: `${device.healthScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(device.impressions)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
              <CardDescription>Impressions and engagements by device</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceStatuses} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tickFormatter={(value) => (value.length > 12 ? `${value.substring(0, 12)}...` : value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="impressions" name="Impressions" fill="#8884d8" />
                  <Bar dataKey="engagements" name="Engagements" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locationData.length}</div>
                <p className="text-xs text-muted-foreground">Active deployment sites</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Top Location</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locationData[0]?.location || "N/A"}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(locationData[0]?.impressions || 0)} impressions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Engagement Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(locationData.reduce((sum, loc) => sum + loc.engagementRate, 0) / locationData.length).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Across all locations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Devices per Location</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(deviceStatuses.length / locationData.length).toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Average deployment density</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>Engagement metrics by location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Engagements</TableHead>
                      <TableHead>Engagement Rate</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationData.map((location, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{location.location}</TableCell>
                        <TableCell>
                          {location.deviceCount ||
                            deviceStatuses.filter((d) => d.location === location.location).length}
                        </TableCell>
                        <TableCell>{formatNumber(location.impressions)}</TableCell>
                        <TableCell>{formatNumber(location.engagements)}</TableCell>
                        <TableCell>{location.engagementRate.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Progress
                            value={location.engagementRate * 5}
                            className="h-2"
                            indicatorClassName={
                              location.engagementRate > 8
                                ? "bg-green-500"
                                : location.engagementRate > 5
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Comparison</CardTitle>
              <CardDescription>Performance metrics across locations</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" tickFormatter={(value) => value.split(",")[0]} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="engagements" name="Engagements" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
