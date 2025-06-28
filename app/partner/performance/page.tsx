"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Define types based on the Prisma schema
type DevicePerformance = {
  id: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  date: string
  impressions: number
  engagements: number
  conversions: number
  viewerCount: number
  averageDwellTime: number
  revenue: number
  currency: string
}

type Device = {
  id: string
  name: string
  location: string
  type: string
  status: string
}

type PerformanceSummary = {
  totalImpressions: number
  totalEngagements: number
  totalConversions: number
  totalRevenue: number
  averageViewerCount: number
  averageDwellTime: number
  engagementRate: number
  conversionRate: number
  currency: string
}

type DateRange = "7days" | "30days" | "90days" | "thisMonth" | "lastMonth" | "custom"

export default function PerformancePage() {
  const router = useRouter()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for performance data
  const [devices, setDevices] = useState<Device[]>([])
  const [performanceData, setPerformanceData] = useState<DevicePerformance[]>([])
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange>("30days")
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [activeTab, setActiveTab] = useState("overview")

  // Error states
  const [error, setError] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  // Fetch devices for dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/partner/devices")

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`)
        }

        const data = await response.json()
        setDevices(data)
      } catch (error) {
        console.error("Error fetching devices:", error)
        setDeviceError("Failed to load devices. Please try again later.")
      }
    }

    fetchDevices()
  }, [])

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date()
    let startDate: Date
    let endDate = today

    switch (dateRange) {
      case "7days":
        startDate = subDays(today, 7)
        break
      case "30days":
        startDate = subDays(today, 30)
        break
      case "90days":
        startDate = subDays(today, 90)
        break
      case "thisMonth":
        startDate = startOfMonth(today)
        endDate = endOfMonth(today)
        break
      case "lastMonth":
        startDate = startOfMonth(subMonths(today, 1))
        endDate = endOfMonth(subMonths(today, 1))
        break
      case "custom":
        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)
        break
      default:
        startDate = subDays(today, 30)
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    }
  }

  // Fetch performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()

        // Construct API URL with filters
        let url = `/api/partner/performance?startDate=${startDate}&endDate=${endDate}`
        if (selectedDeviceId !== "all") {
          url += `&deviceId=${selectedDeviceId}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to fetch performance data: ${response.statusText}`)
        }

        const data = await response.json()
        setPerformanceData(data.performanceData)
        setSummary(data.summary)
      } catch (error) {
        console.error("Error fetching performance data:", error)
        setError("Failed to load performance data. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerformanceData()
  }, [selectedDeviceId, dateRange, customStartDate, customEndDate])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const { startDate, endDate } = getDateRange()

      // Construct API URL with filters
      let url = `/api/partner/performance?startDate=${startDate}&endDate=${endDate}`
      if (selectedDeviceId !== "all") {
        url += `&deviceId=${selectedDeviceId}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to refresh performance data: ${response.statusText}`)
      }

      const data = await response.json()
      setPerformanceData(data.performanceData)
      setSummary(data.summary)

      toast.success("Data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing data:", error)
      setError("Failed to refresh data. Please try again later.")
      toast.error("Failed to refresh data")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle export data
  const handleExportData = async () => {
    try {
      const { startDate, endDate } = getDateRange()

      // Construct API URL with filters
      let url = `/api/partner/performance/export?startDate=${startDate}&endDate=${endDate}`
      if (selectedDeviceId !== "all") {
        url += `&deviceId=${selectedDeviceId}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to export performance data: ${response.statusText}`)
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a link element and trigger download
      const downloadLink = document.createElement("a")
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = `performance_${startDate}_to_${endDate}.csv`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  // Format time in seconds to minutes and seconds
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  // Prepare chart data
  const prepareChartData = () => {
    // Sort data by date
    const sortedData = [...performanceData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Format data for charts
    return sortedData.map((item) => ({
      date: format(new Date(item.date), "MMM d"),
      impressions: item.impressions,
      engagements: item.engagements,
      conversions: item.conversions,
      viewers: item.viewerCount,
      dwellTime: item.averageDwellTime,
      revenue: item.revenue,
    }))
  }

  // Prepare device performance data for pie chart
  const prepareDevicePerformanceData = () => {
    // Group data by device
    const deviceData: Record<
      string,
      {
        deviceName: string
        impressions: number
        engagements: number
        revenue: number
      }
    > = {}

    performanceData.forEach((item) => {
      if (!deviceData[item.deviceId]) {
        deviceData[item.deviceId] = {
          deviceName: item.deviceName,
          impressions: 0,
          engagements: 0,
          revenue: 0,
        }
      }

      deviceData[item.deviceId].impressions += item.impressions
      deviceData[item.deviceId].engagements += item.engagements
      deviceData[item.deviceId].revenue += item.revenue
    })

    // Convert to array for pie chart
    return Object.values(deviceData).map((item) => ({
      name: item.deviceName,
      value: item.revenue,
    }))
  }

  // Pie chart colors
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  if (settingsLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Performance Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={handleRefresh} variant="outline" className="mt-4" disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trying Again...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chartData = prepareChartData()
  const devicePerformanceData = prepareDevicePerformanceData()

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">Monitor your device performance and ad campaign effectiveness</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            {deviceError ? (
              <div className="p-2 text-sm text-red-500">{deviceError}</div>
            ) : devices.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No devices available</div>
            ) : (
              devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Impressions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary.totalImpressions)}</div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3 mr-1" />
                <span>Ad views</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(summary.engagementRate)}</div>
              <div className="flex items-center mt-1 text-xs">
                {summary.engagementRate > 0.05 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    <span className="text-green-500">Above average</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    <span className="text-red-500">Below average</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Viewers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageViewerCount.toFixed(1)}</div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1" />
                <span>Per ad display</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue, summary.currency)}</div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 mr-1" />
                <span>From all campaigns</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="impressions">Impressions</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Key metrics across all your devices for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Data Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There is no performance data for the selected period
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8884d8" name="Impressions" />
                    <Line yAxisId="left" type="monotone" dataKey="engagements" stroke="#82ca9d" name="Engagements" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ff7300" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Performance</CardTitle>
                <CardDescription>Revenue distribution by device</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {devicePerformanceData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Data Available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      There is no device performance data for the selected period
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devicePerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {devicePerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number, summary?.currency || "USD")} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audience Metrics</CardTitle>
                <CardDescription>Viewer engagement statistics</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Data Available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      There is no audience data for the selected period
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="viewers" fill="#8884d8" name="Viewers" />
                      <Bar yAxisId="right" dataKey="dwellTime" fill="#82ca9d" name="Dwell Time (s)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Detailed metrics for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Impressions & Engagement</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">Total Impressions:</div>
                      <div className="text-sm font-medium">{formatNumber(summary.totalImpressions)}</div>
                      <div className="text-sm">Total Engagements:</div>
                      <div className="text-sm font-medium">{formatNumber(summary.totalEngagements)}</div>
                      <div className="text-sm">Engagement Rate:</div>
                      <div className="text-sm font-medium">{formatPercentage(summary.engagementRate)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Audience & Conversions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">Average Viewers:</div>
                      <div className="text-sm font-medium">{summary.averageViewerCount.toFixed(1)}</div>
                      <div className="text-sm">Average Dwell Time:</div>
                      <div className="text-sm font-medium">{formatTime(summary.averageDwellTime)}</div>
                      <div className="text-sm">Conversion Rate:</div>
                      <div className="text-sm font-medium">{formatPercentage(summary.conversionRate)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Revenue</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">Total Revenue:</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(summary.totalRevenue, summary.currency)}
                      </div>
                      <div className="text-sm">Revenue per Impression:</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(summary.totalRevenue / summary.totalImpressions, summary.currency)}
                      </div>
                      <div className="text-sm">Revenue per Engagement:</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(summary.totalRevenue / summary.totalEngagements, summary.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" onClick={handleExportData} className="ml-auto">
                  <FileText className="mr-2 h-4 w-4" />
                  Export Detailed Report
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        {/* Impressions Tab */}
        <TabsContent value="impressions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Impressions Over Time</CardTitle>
              <CardDescription>Daily impression counts for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Data Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There is no impression data for the selected period
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" fill="#8884d8" name="Impressions" />
                    <Bar dataKey="viewers" fill="#82ca9d" name="Viewers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>Engagement and dwell time analysis</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Data Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There is no engagement data for the selected period
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="engagements" stroke="#82ca9d" name="Engagements" />
                    <Line yAxisId="right" type="monotone" dataKey="dwellTime" stroke="#ff7300" name="Dwell Time (s)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analysis</CardTitle>
              <CardDescription>Revenue trends and distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Data Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">There is no revenue data for the selected period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number, summary?.currency || "USD")} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#ff7300" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Device</CardTitle>
              <CardDescription>Distribution of revenue across devices</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {devicePerformanceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Data Available</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There is no device revenue data for the selected period
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={devicePerformanceData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => formatCurrency(value as number, summary?.currency || "USD")} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
