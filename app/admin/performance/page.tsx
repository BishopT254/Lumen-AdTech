"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Download, RefreshCw, Filter, AlertTriangle, TrendingUp, Zap, Activity, Globe } from "lucide-react"
import { BarChart, Gauge, Rocket, Cpu, Smartphone, Server, Users, Leaf, Clock, HardDrive, Wifi } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

// Dynamically import the PerformanceChart component to avoid SSR issues
const PerformanceChart = dynamic(() => import("@/components/performance-chart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  ),
})

// Define types based on Prisma schema
interface DeviceAnalytics {
  id: string
  deviceId: string
  date: string
  uptime: number | string
  impressionsServed: number
  engagementsCount: number
  averageViewerCount: number | string | null
  performanceMetrics: {
    cpu: number | string
    memory: number | string
    network: number | string
    responseTime: number | string
  } | null
  energyConsumption: number | string | null
}

interface Device {
  id: string
  name: string
  deviceType: string
  status: string
  healthStatus: string
  lastActive: string | null
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  impressions?: number
  revenue?: number
}

interface SustainabilityMetrics {
  id: string
  deviceId: string | null
  campaignId: string | null
  date: string
  energyUsage: number
  carbonFootprint: number
}

interface SystemPerformanceMetrics {
  uptime: number
  peakPerformance: number
  responseTime: number
  errorRate: number
  activeDevices: number
  totalDevices: number
  activeUsers: number
  cpuUsage: number
  memoryUsage: number
  networkUsage: number
  diskUsage: number
  apiRequests: {
    total: number
    successful: number
    failed: number
  }
  alerts: {
    critical: number
    warning: number
    info: number
  }
  chartData: {
    timestamp: string
    cpu: number
    memory: number
    network: number
    responseTime: number
    activeUsers: number
    apiRequests: number
  }[]
  devicePerformance: {
    deviceType: string
    count: number
    uptime: number
    impressions: number
    engagements: number
    errorRate: number
  }[]
  sustainabilityData: {
    date: string
    energyUsage: number
    carbonFootprint: number
  }[]
  recentAlerts: {
    id: string
    timestamp: string
    type: "critical" | "warning" | "info"
    message: string
    source: string
  }[]
}

export default function PerformancePage() {
  const { data: session } = useSession()
  const { generalSettings, systemSettings, loading: settingsLoading } = usePublicSettings()
  const [timeRange, setTimeRange] = useState<string>("7d")
  const [deviceFilter, setDeviceFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Format date based on system settings
  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      const dateFormat = generalSettings?.dateFormat || "yyyy-MM-dd"
      return format(dateObj, "MMM dd, yyyy")
    } catch (e) {
      return typeof date === "string" ? date : date.toISOString()
    }
  }

  // Format currency based on system settings
  const formatCurrency = (value: number) => {
    try {
      const currency = generalSettings?.defaultCurrency || "USD"
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    } catch (e) {
      return `$${value.toFixed(2)}`
    }
  }

  // Calculate date range parameters for API calls
  const dateParams = useMemo(() => {
    if (timeRange === "custom" && dateRange.from && dateRange.to) {
      return {
        startDate: startOfDay(dateRange.from).toISOString(),
        endDate: endOfDay(dateRange.to).toISOString(),
      }
    }

    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "24h":
        startDate = subDays(now, 1)
        break
      case "7d":
        startDate = subDays(now, 7)
        break
      case "30d":
        startDate = subDays(now, 30)
        break
      case "90d":
        startDate = subDays(now, 90)
        break
      default:
        startDate = subDays(now, 7)
    }

    return {
      startDate: startOfDay(startDate).toISOString(),
      endDate: endOfDay(now).toISOString(),
    }
  }, [timeRange, dateRange])

  // Fetch system performance metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery<SystemPerformanceMetrics>({
    queryKey: ["performance", dateParams.startDate, dateParams.endDate, deviceFilter, locationFilter],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/admin/performance?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}&deviceType=${deviceFilter}&location=${locationFilter}`,
        )
        if (!res.ok) {
          throw new Error("Failed to fetch performance metrics")
        }
        return res.json()
      } catch (error) {
        console.error("Error fetching performance metrics:", error)
        // Return default data structure to prevent UI errors
        return {
          uptime: 0,
          peakPerformance: 0,
          responseTime: 0,
          errorRate: 0,
          activeDevices: 0,
          totalDevices: 0,
          activeUsers: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          networkUsage: 0,
          diskUsage: 0,
          apiRequests: { total: 0, successful: 0, failed: 0 },
          alerts: { critical: 0, warning: 0, info: 0 },
          chartData: [],
          devicePerformance: [],
          sustainabilityData: [],
          recentAlerts: [],
        }
      }
    },
    refetchInterval: refreshInterval,
  })

  // Fetch device analytics
  const {
    data: deviceAnalytics,
    isLoading: deviceAnalyticsLoading,
    error: deviceAnalyticsError,
    refetch: refetchDeviceAnalytics,
  } = useQuery<DeviceAnalytics[]>({
    queryKey: ["deviceAnalytics", dateParams.startDate, dateParams.endDate, deviceFilter, locationFilter],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/admin/devices/analytics?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}&deviceType=${deviceFilter}&location=${locationFilter}`,
        )
        if (!res.ok) {
          throw new Error("Failed to fetch device analytics")
        }
        return res.json()
      } catch (error) {
        console.error("Error fetching device analytics:", error)
        return []
      }
    },
    refetchInterval: refreshInterval,
  })

  // Fetch devices
  const {
    data: devices,
    isLoading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = useQuery<Device[]>({
    queryKey: ["devices", deviceFilter, locationFilter],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/admin/devices?deviceType=${deviceFilter}&location=${locationFilter}`)
        if (!res.ok) {
          throw new Error("Failed to fetch devices")
        }
        return res.json()
      } catch (error) {
        console.error("Error fetching devices:", error)
        return []
      }
    },
    refetchInterval: refreshInterval,
  })

  // Fetch sustainability metrics
  const {
    data: sustainabilityMetrics,
    isLoading: sustainabilityLoading,
    error: sustainabilityError,
    refetch: refetchSustainability,
  } = useQuery<SustainabilityMetrics[]>({
    queryKey: ["sustainability", dateParams.startDate, dateParams.endDate, deviceFilter, locationFilter],
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/admin/sustainability?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}&deviceType=${deviceFilter}&location=${locationFilter}`,
        )
        if (!res.ok) {
          throw new Error("Failed to fetch sustainability metrics")
        }
        return res.json()
      } catch (error) {
        console.error("Error fetching sustainability metrics:", error)
        return []
      }
    },
    refetchInterval: refreshInterval,
  })

  // Handle refresh interval changes
  useEffect(() => {
    return () => {
      // Clean up interval when component unmounts
      if (refreshInterval) {
        setRefreshInterval(null)
      }
    }
  }, [refreshInterval])

  // Refresh all data
  const refreshAllData = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchMetrics(), refetchDeviceAnalytics(), refetchDevices(), refetchSustainability()])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Export data as CSV
  const exportData = async () => {
    try {
      const response = await fetch(
        `/api/admin/performance/export?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}&deviceType=${deviceFilter}&location=${locationFilter}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to export data: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `performance-data-${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting data:", error)
      // Show an error toast or alert here
      alert(`Error exporting data: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Calculate device type distribution for charts
  const deviceTypeData = useMemo(() => {
    if (!devices || !Array.isArray(devices) || devices.length === 0) return []

    const deviceTypes: Record<string, number> = {}
    devices.forEach((device) => {
      deviceTypes[device.deviceType] = (deviceTypes[device.deviceType] || 0) + 1
    })

    return Object.entries(deviceTypes).map(([type, count]) => ({
      name: type,
      value: count,
    }))
  }, [devices])

  // Calculate device health distribution for charts
  const deviceHealthData = useMemo(() => {
    if (!devices || !Array.isArray(devices) || devices.length === 0) return []

    const healthStatus: Record<string, number> = {}
    devices.forEach((device) => {
      healthStatus[device.healthStatus] = (healthStatus[device.healthStatus] || 0) + 1
    })

    return Object.entries(healthStatus).map(([status, count]) => ({
      name: status,
      value: count,
    }))
  }, [devices])

  // Prepare sustainability data for charts
  const sustainabilityChartData = useMemo(() => {
    if (!sustainabilityMetrics || !Array.isArray(sustainabilityMetrics) || sustainabilityMetrics.length === 0) return []

    return sustainabilityMetrics.map((metric) => ({
      timestamp: metric.date,
      energyUsage: metric.energyUsage,
      carbonFootprint: metric.carbonFootprint,
    }))
  }, [sustainabilityMetrics])

  // Prepare system metrics data for charts
  const systemMetricsChartData = useMemo(() => {
    if (!metrics?.chartData || !Array.isArray(metrics.chartData)) return []

    return metrics.chartData
  }, [metrics])

  // Determine if maintenance mode is active
  const isMaintenanceMode = useMemo(() => {
    return systemSettings?.maintenanceMode || false
  }, [systemSettings])

  // Get device types for filter
  const deviceTypes = useMemo(() => {
    if (!devices || !Array.isArray(devices) || devices.length === 0) return []

    const types = new Set<string>()
    devices.forEach((device) => {
      types.add(device.deviceType)
    })

    return Array.from(types)
  }, [devices])

  // Get locations for filter
  const locations = useMemo(() => {
    if (!devices || !Array.isArray(devices) || devices.length === 0) return []

    const locationSet = new Set<string>()
    devices.forEach((device) => {
      if (device.location?.city && device.location?.country) {
        locationSet.add(`${device.location.city}, ${device.location.country}`)
      }
    })

    return Array.from(locationSet)
  }, [devices])

  // Calculate total energy usage and carbon footprint
  const totalSustainabilityMetrics = useMemo(() => {
    if (!sustainabilityMetrics || !Array.isArray(sustainabilityMetrics) || sustainabilityMetrics.length === 0)
      return { energyUsage: 0, carbonFootprint: 0 }

    return sustainabilityMetrics.reduce(
      (acc, metric) => {
        return {
          energyUsage: acc.energyUsage + metric.energyUsage,
          carbonFootprint: acc.carbonFootprint + metric.carbonFootprint,
        }
      },
      { energyUsage: 0, carbonFootprint: 0 },
    )
  }, [sustainabilityMetrics])

  // Loading state for the entire page
  const isLoading =
    metricsLoading || deviceAnalyticsLoading || devicesLoading || sustainabilityLoading || settingsLoading

  // Error state for the entire page
  const hasError = metricsError || deviceAnalyticsError || devicesError || sustainabilityError

  // Default values for sustainability settings
  const defaultSustainabilitySettings = {
    energyOptimizationEnabled: false,
    offHoursPowerSaving: false,
    carbonTrackingEnabled: false,
    brightnessThreshold: 50,
    offsetPercentage: 0,
    offsetProgram: "Default Program",
    offsetProvider: "Default Provider",
    ecoFriendlyDiscounts: false,
    ecoDiscountPercentage: 10,
    partnerEnergyBonuses: false,
    reportingFrequency: "Monthly",
  }

  // Merge sustainability settings with default values
  const sustainabilitySettings = useMemo(() => {
    return {
      ...defaultSustainabilitySettings,
      ...(systemSettings?.sustainabilitySettings || {}),
    }
  }, [systemSettings?.sustainabilitySettings])

  return (
    <div className="space-y-6">
      {/* Header with title and controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Performance Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze the performance of your Lumen AdTech Platform</p>
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Time Range</SelectLabel>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {timeRange === "custom" && (
            <DatePickerWithRange
              className="w-full sm:w-auto"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to })
                }
              }}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="p-2">
                <p className="mb-2 text-sm font-medium">Device Type</p>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    {deviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2">
                <p className="mb-2 text-sm font-medium">Location</p>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={refreshAllData} disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Data
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportData}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            value={refreshInterval ? refreshInterval.toString() : "none"}
            onValueChange={(value) => setRefreshInterval(value === "none" ? null : Number.parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Auto-refresh" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Auto-refresh</SelectLabel>
                <SelectItem value="none">Off</SelectItem>
                <SelectItem value="30000">Every 30 seconds</SelectItem>
                <SelectItem value="60000">Every minute</SelectItem>
                <SelectItem value="300000">Every 5 minutes</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refreshAllData} disabled={isRefreshing} className="ml-2">
            {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Maintenance mode alert */}
      {isMaintenanceMode && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Maintenance Mode Active</AlertTitle>
          <AlertDescription>
            The system is currently in maintenance mode. Some features may be unavailable.
            {systemSettings?.maintenanceDay && systemSettings?.maintenanceTime && (
              <span className="block mt-2">
                Scheduled maintenance: {systemSettings.maintenanceDay} at {systemSettings.maintenanceTime}
                {systemSettings.maintenanceDuration && ` (${systemSettings.maintenanceDuration} minutes)`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Error alert */}
      {hasError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            There was an error loading performance data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Key metrics cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.uptime || 0}%</div>
                <div className="mt-1">
                  <Progress value={metrics?.uptime || 0} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics?.uptime && metrics.uptime >= 99.9
                    ? "Excellent uptime"
                    : metrics?.uptime && metrics.uptime >= 99
                      ? "Good uptime"
                      : "Needs attention"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peak Performance</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.peakPerformance || 0} req/s</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average:{" "}
                  {metrics?.apiRequests?.total
                    ? (metrics.apiRequests.total / (Number.parseInt(timeRange) || 7) / 86400).toFixed(2)
                    : 0}{" "}
                  req/s
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.activeDevices || 0}</div>
                <div className="mt-1">
                  <Progress
                    value={metrics?.totalDevices ? (metrics.activeDevices / metrics.totalDevices) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics?.totalDevices
                    ? `${metrics.activeDevices} of ${metrics.totalDevices} devices online`
                    : "No devices"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.errorRate !== undefined ? Number(metrics.errorRate).toFixed(2) : "0"}%
                </div>
                <div className="mt-1">
                  <Progress value={100 - (metrics?.errorRate || 0)} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics?.apiRequests
                    ? `${metrics.apiRequests.failed} failed of ${metrics.apiRequests.total} requests`
                    : "No requests"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System resource metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.cpuUsage !== undefined ? Number(metrics.cpuUsage).toFixed(1) : "0"}%
                </div>
                <div className="mt-1">
                  <Progress
                    value={metrics?.cpuUsage || 0}
                    className={`h-2 ${metrics?.cpuUsage && metrics.cpuUsage > 80 ? "bg-red-500" : ""}`}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.memoryUsage !== undefined ? Number(metrics.memoryUsage).toFixed(1) : "0"}%
                </div>
                <div className="mt-1">
                  <Progress
                    value={metrics?.memoryUsage || 0}
                    className={`h-2 ${metrics?.memoryUsage && metrics.memoryUsage > 80 ? "bg-red-500" : ""}`}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Network Usage</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.networkUsage !== undefined ? Number(metrics.networkUsage).toFixed(1) : "0"}%
                </div>
                <div className="mt-1">
                  <Progress
                    value={metrics?.networkUsage || 0}
                    className={`h-2 ${metrics?.networkUsage && metrics.networkUsage > 80 ? "bg-red-500" : ""}`}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.diskUsage !== undefined ? Number(metrics.diskUsage).toFixed(1) : "0"}%
                </div>
                <div className="mt-1">
                  <Progress
                    value={metrics?.diskUsage || 0}
                    className={`h-2 ${metrics?.diskUsage && metrics.diskUsage > 80 ? "bg-red-500" : ""}`}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Smartphone className="mr-2 h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="sustainability">
            <Leaf className="mr-2 h-4 w-4" />
            Sustainability
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>CPU, Memory, Network, and Response Time metrics over time</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] w-full">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <PerformanceChart
                      data={{
                        series: [
                          {
                            name: "CPU",
                            data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.cpu })),
                            color: "#2563eb",
                          },
                          {
                            name: "Memory",
                            data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.memory })),
                            color: "#16a34a",
                          },
                          {
                            name: "Network",
                            data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.network })),
                            color: "#ea580c",
                          },
                          {
                            name: "Response Time",
                            data: systemMetricsChartData.map((d) => ({
                              timestamp: d.timestamp,
                              value: d.responseTime,
                            })),
                            color: "#8b5cf6",
                          },
                        ],
                      }}
                      title="System Resource Usage"
                      defaultConfig={{
                        type: "line",
                        showGrid: true,
                        showLegend: true,
                        colorScheme: "categorical",
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Requests</CardTitle>
                <CardDescription>Total API requests and success/failure rates</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Total Requests</div>
                        <div className="text-sm font-medium">{metrics?.apiRequests?.total || 0}</div>
                      </div>
                      <Progress value={100} className="h-2 mt-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Successful</div>
                        <div className="text-sm font-medium">{metrics?.apiRequests?.successful || 0}</div>
                      </div>
                      <Progress
                        value={
                          metrics?.apiRequests?.total
                            ? (metrics.apiRequests.successful / metrics.apiRequests.total) * 100
                            : 0
                        }
                        className="h-2 mt-2 bg-green-100"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Failed</div>
                        <div className="text-sm font-medium">{metrics?.apiRequests?.failed || 0}</div>
                      </div>
                      <Progress
                        value={
                          metrics?.apiRequests?.total
                            ? (metrics.apiRequests.failed / metrics.apiRequests.total) * 100
                            : 0
                        }
                        className="h-2 mt-2 bg-red-100"
                      />
                    </div>

                    <div className="pt-4">
                      <div className="text-sm font-medium mb-2">Response Time</div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{metrics?.responseTime || 0} ms</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Average API response time</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>Current active users and session metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                      <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
                    </div>

                    <div className="pt-4">
                      <div className="text-sm font-medium mb-2">User Activity</div>
                      <div className="h-[200px]">
                        <PerformanceChart
                          data={{
                            series: [
                              {
                                name: "Active Users",
                                data: systemMetricsChartData.map((d) => ({
                                  timestamp: d.timestamp,
                                  value: d.activeUsers,
                                })),
                                color: "#2563eb",
                              },
                            ],
                          }}
                          height={200}
                          defaultConfig={{
                            type: "area",
                            showGrid: false,
                            showLegend: false,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent System Alerts</CardTitle>
              <CardDescription>Latest alerts and notifications from the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : metrics?.recentAlerts && Array.isArray(metrics.recentAlerts) && metrics.recentAlerts.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {metrics.recentAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-4 rounded-md border p-4">
                        {alert.type === "critical" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : alert.type === "warning" ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-blue-500" />
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{alert.message}</p>
                          <div className="flex items-center pt-2">
                            <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{formatDate(alert.timestamp)}</span>
                            <span className="mx-2 text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{alert.source}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            alert.type === "critical"
                              ? "destructive"
                              : alert.type === "warning"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {alert.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No alerts found</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Status</CardTitle>
                <CardDescription>Overview of all devices in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Total Devices</div>
                        <div className="text-2xl font-bold">{metrics?.totalDevices || 0}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Active Devices</div>
                        <div className="text-2xl font-bold">{metrics?.activeDevices || 0}</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Healthy</div>
                        <div className="text-2xl font-bold">
                          {devices && Array.isArray(devices)
                            ? devices.filter((d) => d.healthStatus === "HEALTHY").length
                            : 0}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Needs Attention</div>
                        <div className="text-2xl font-bold">
                          {devices && Array.isArray(devices)
                            ? devices.filter((d) => ["WARNING", "CRITICAL", "OFFLINE"].includes(d.healthStatus)).length
                            : 0}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="text-sm font-medium mb-2">Device Types</div>
                      <div className="h-[200px]">
                        <PerformanceChart
                          data={{
                            series: deviceTypeData.map((item) => ({
                              name: item.name,
                              data: [{ timestamp: "current", value: item.value }],
                            })),
                          }}
                          height={200}
                          defaultConfig={{
                            type: "pie",
                            showLegend: true,
                            colorScheme: "categorical",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Health</CardTitle>
                <CardDescription>Health status distribution across devices</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-[200px]">
                      <PerformanceChart
                        data={{
                          series: deviceHealthData.map((item) => ({
                            name: item.name,
                            data: [{ timestamp: "current", value: item.value }],
                          })),
                        }}
                        height={200}
                        defaultConfig={{
                          type: "pie",
                          showLegend: true,
                          colorScheme: "categorical",
                        }}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {deviceHealthData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={`mr-2 h-3 w-3 rounded-full ${
                                item.name === "HEALTHY"
                                  ? "bg-green-500"
                                  : item.name === "WARNING"
                                    ? "bg-amber-500"
                                    : item.name === "CRITICAL"
                                      ? "bg-red-500"
                                      : item.name === "OFFLINE"
                                        ? "bg-gray-500"
                                        : "bg-blue-500"
                              }`}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
              <CardDescription>Performance metrics by device type</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Engagements</TableHead>
                      <TableHead>Error Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics?.devicePerformance && Array.isArray(metrics.devicePerformance) ? (
                      metrics.devicePerformance.map((device) => (
                        <TableRow key={device.deviceType}>
                          <TableCell className="font-medium">{device.deviceType}</TableCell>
                          <TableCell>{device.count}</TableCell>
                          <TableCell>{device.uptime}%</TableCell>
                          <TableCell>{device.impressions}</TableCell>
                          <TableCell>{device.engagements}</TableCell>
                          <TableCell>{device.errorRate}%</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                device.errorRate < 1 ? "success" : device.errorRate < 5 ? "default" : "destructive"
                              }
                            >
                              {device.errorRate < 1 ? "Excellent" : device.errorRate < 5 ? "Good" : "Poor"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No device performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Device List</CardTitle>
                <CardDescription>All registered devices in the system</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices && Array.isArray(devices) && devices.length > 0 ? (
                      devices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell>{device.deviceType}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                device.status === "ACTIVE"
                                  ? "success"
                                  : device.status === "PENDING"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {device.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div
                                className={`mr-2 h-2 w-2 rounded-full ${
                                  device.healthStatus === "HEALTHY"
                                    ? "bg-green-500"
                                    : device.healthStatus === "WARNING"
                                      ? "bg-amber-500"
                                      : device.healthStatus === "CRITICAL"
                                        ? "bg-red-500"
                                        : "bg-gray-500"
                                }`}
                              />
                              {device.healthStatus}
                            </div>
                          </TableCell>
                          <TableCell>
                            {device.location?.city && device.location?.country
                              ? `${device.location.city}, ${device.location.country}`
                              : device.location?.latitude && device.location?.longitude
                                ? `${device.location.latitude.toFixed(2)}, ${device.location.longitude.toFixed(2)}`
                                : "Unknown location"}
                          </TableCell>
                          <TableCell>{device.lastActive ? formatDate(device.lastActive) : "Never"}</TableCell>
                          <TableCell>{device.impressions || 0}</TableCell>
                          <TableCell>{formatCurrency(device.revenue || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          No devices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Key performance indicators over time</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] w-full">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PerformanceChart
                    data={{
                      series: [
                        {
                          name: "API Requests",
                          data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.apiRequests })),
                          color: "#2563eb",
                        },
                        {
                          name: "Response Time (ms)",
                          data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.responseTime })),
                          color: "#16a34a",
                        },
                      ],
                    }}
                    title="API Performance"
                    defaultConfig={{
                      type: "line",
                      showGrid: true,
                      showLegend: true,
                      colorScheme: "categorical",
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Analytics</CardTitle>
                <CardDescription>Performance metrics by device</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : deviceAnalytics && Array.isArray(deviceAnalytics) && deviceAnalytics.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Uptime</TableHead>
                        <TableHead>Impressions</TableHead>
                        <TableHead>Engagements</TableHead>
                        <TableHead>Viewers</TableHead>
                        <TableHead>Energy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceAnalytics.map((analytics) => (
                        <TableRow key={analytics.id}>
                          <TableCell>{formatDate(analytics.date)}</TableCell>
                          <TableCell>{Number(analytics.uptime).toFixed(1)}%</TableCell>
                          <TableCell>{analytics.impressionsServed}</TableCell>
                          <TableCell>{analytics.engagementsCount}</TableCell>
                          <TableCell>
                            {analytics.averageViewerCount !== null && analytics.averageViewerCount !== undefined
                              ? Number(analytics.averageViewerCount).toFixed(1)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {analytics.energyConsumption !== null && analytics.energyConsumption !== undefined
                              ? Number(analytics.energyConsumption).toFixed(2) + " kWh"
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-[300px] items-center justify-center">
                    <div className="text-center">
                      <BarChart className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">No analytics data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>System performance trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Response Time Trend</div>
                        <Badge variant={metrics?.responseTime && metrics.responseTime < 100 ? "success" : "default"}>
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Good
                        </Badge>
                      </div>
                      <div className="h-[50px]">
                        <PerformanceChart
                          data={{
                            series: [
                              {
                                name: "Response Time",
                                data: systemMetricsChartData.map((d) => ({
                                  timestamp: d.timestamp,
                                  value: d.responseTime,
                                })),
                                color: "#2563eb",
                              },
                            ],
                          }}
                          height={50}
                          defaultConfig={{
                            type: "area",
                            showGrid: false,
                            showLegend: false,
                            showTooltip: false,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">CPU Usage Trend</div>
                        <Badge variant={metrics?.cpuUsage && metrics.cpuUsage < 70 ? "success" : "default"}>
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Stable
                        </Badge>
                      </div>
                      <div className="h-[50px]">
                        <PerformanceChart
                          data={{
                            series: [
                              {
                                name: "CPU",
                                data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.cpu })),
                                color: "#16a34a",
                              },
                            ],
                          }}
                          height={50}
                          defaultConfig={{
                            type: "area",
                            showGrid: false,
                            showLegend: false,
                            showTooltip: false,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Memory Usage Trend</div>
                        <Badge variant={metrics?.memoryUsage && metrics.memoryUsage < 70 ? "success" : "default"}>
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Stable
                        </Badge>
                      </div>
                      <div className="h-[50px]">
                        <PerformanceChart
                          data={{
                            series: [
                              {
                                name: "Memory",
                                data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.memory })),
                                color: "#ea580c",
                              },
                            ],
                          }}
                          height={50}
                          defaultConfig={{
                            type: "area",
                            showGrid: false,
                            showLegend: false,
                            showTooltip: false,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Network Usage Trend</div>
                        <Badge variant={metrics?.networkUsage && metrics.networkUsage < 70 ? "success" : "default"}>
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Stable
                        </Badge>
                      </div>
                      <div className="h-[50px]">
                        <PerformanceChart
                          data={{
                            series: [
                              {
                                name: "Network",
                                data: systemMetricsChartData.map((d) => ({ timestamp: d.timestamp, value: d.network })),
                                color: "#8b5cf6",
                              },
                            ],
                          }}
                          height={50}
                          defaultConfig={{
                            type: "area",
                            showGrid: false,
                            showLegend: false,
                            showTooltip: false,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sustainability Tab */}
        <TabsContent value="sustainability" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Energy Usage</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {Number(totalSustainabilityMetrics.energyUsage).toFixed(2)} kWh
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">For the selected time period</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Carbon Footprint</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {Number(totalSustainabilityMetrics.carbonFootprint).toFixed(2)} kg CO₂
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Equivalent to {Number(totalSustainabilityMetrics.carbonFootprint / 2.3).toFixed(1)} km driven by
                      car
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Energy Efficiency</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {devices && sustainabilityMetrics
                        ? Number(totalSustainabilityMetrics.energyUsage / (devices.length || 1)).toFixed(2)
                        : "0.00"}{" "}
                      kWh/device
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Average energy consumption per device</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sustainability Score</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {devices && sustainabilityMetrics
                        ? Math.max(
                            0,
                            100 - (totalSustainabilityMetrics.carbonFootprint / (devices.length || 1)) * 10,
                          ).toFixed(0)
                        : "0"}
                      /100
                    </div>
                    <div className="mt-1">
                      <Progress
                        value={
                          devices && sustainabilityMetrics
                            ? Math.max(
                                0,
                                100 - (totalSustainabilityMetrics.carbonFootprint / (devices.length || 1)) * 10,
                              )
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Energy Usage Over Time</CardTitle>
              <CardDescription>Energy consumption and carbon footprint metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] w-full">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PerformanceChart
                    data={{
                      series: [
                        {
                          name: "Energy Usage (kWh)",
                          data: sustainabilityChartData.map((d) => ({ timestamp: d.timestamp, value: d.energyUsage })),
                          color: "#2563eb",
                        },
                        {
                          name: "Carbon Footprint (kg CO₂)",
                          data: sustainabilityChartData.map((d) => ({
                            timestamp: d.timestamp,
                            value: d.carbonFootprint,
                          })),
                          color: "#16a34a",
                        },
                      ],
                    }}
                    title="Sustainability Metrics"
                    defaultConfig={{
                      type: "line",
                      showGrid: true,
                      showLegend: true,
                      colorScheme: "categorical",
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Energy Optimization</CardTitle>
                <CardDescription>Energy-saving features and their impact</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || settingsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`mr-2 h-3 w-3 rounded-full ${sustainabilitySettings?.energyOptimizationEnabled ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span className="text-sm font-medium">Energy Optimization</span>
                      </div>
                      <Badge variant={sustainabilitySettings?.energyOptimizationEnabled ? "success" : "secondary"}>
                        {sustainabilitySettings?.energyOptimizationEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`mr-2 h-3 w-3 rounded-full ${sustainabilitySettings?.offHoursPowerSaving ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span className="text-sm font-medium">Off-Hours Power Saving</span>
                      </div>
                      <Badge variant={sustainabilitySettings?.offHoursPowerSaving ? "success" : "secondary"}>
                        {sustainabilitySettings?.offHoursPowerSaving ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`mr-2 h-3 w-3 rounded-full ${sustainabilitySettings?.carbonTrackingEnabled ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span className="text-sm font-medium">Carbon Tracking</span>
                      </div>
                      <Badge variant={sustainabilitySettings?.carbonTrackingEnabled ? "success" : "secondary"}>
                        {sustainabilitySettings?.carbonTrackingEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    {sustainabilitySettings?.brightnessThreshold && (
                      <div className="pt-2">
                        <div className="text-sm font-medium mb-2">Brightness Threshold</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">0%</span>
                          <span className="text-sm">100%</span>
                        </div>
                        <Progress value={sustainabilitySettings.brightnessThreshold} className="h-2" />
                        <div className="mt-1 text-xs text-muted-foreground text-right">
                          Current: {sustainabilitySettings.brightnessThreshold}%
                        </div>
                      </div>
                    )}

                    {sustainabilitySettings?.offsetPercentage && (
                      <div className="pt-2">
                        <div className="text-sm font-medium mb-2">Carbon Offset</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">0%</span>
                          <span className="text-sm">100%</span>
                        </div>
                        <Progress value={sustainabilitySettings.offsetPercentage} className="h-2" />
                        <div className="mt-1 text-xs text-muted-foreground text-right">
                          Current: {sustainabilitySettings.offsetPercentage}%
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sustainability Programs</CardTitle>
                <CardDescription>Active sustainability initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading || settingsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <div className="font-medium">Carbon Offset Program</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {sustainabilitySettings?.offsetProgram || "No program configured"}
                      </div>
                      {sustainabilitySettings?.offsetProvider && (
                        <div className="mt-2 text-sm">Provider: {sustainabilitySettings.offsetProvider}</div>
                      )}
                    </div>

                    <div className="rounded-md border p-4">
                      <div className="font-medium">Eco-Friendly Discounts</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {sustainabilitySettings?.ecoFriendlyDiscounts
                          ? `Enabled (${sustainabilitySettings.ecoDiscountPercentage || 0}% discount)`
                          : "Disabled"}
                      </div>
                    </div>

                    <div className="rounded-md border p-4">
                      <div className="font-medium">Partner Energy Bonuses</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {sustainabilitySettings?.partnerEnergyBonuses
                          ? "Enabled - Partners receive bonuses for energy-efficient devices"
                          : "Disabled"}
                      </div>
                    </div>

                    <div className="rounded-md border p-4">
                      <div className="font-medium">Reporting Frequency</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {sustainabilitySettings?.reportingFrequency || "Not configured"}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>All system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : metrics?.recentAlerts && metrics.recentAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.recentAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge
                            variant={
                              alert.type === "critical"
                                ? "destructive"
                                : alert.type === "warning"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {alert.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{alert.message}</TableCell>
                        <TableCell>{alert.source}</TableCell>
                        <TableCell>{formatDate(alert.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No alerts found</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">
                    {metrics?.alerts?.critical || 0}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {metrics?.alerts?.critical === 1 ? "alert" : "alerts"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Warning Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">
                    {metrics?.alerts?.warning || 0}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {metrics?.alerts?.warning === 1 ? "alert" : "alerts"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Info Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">
                    {metrics?.alerts?.info || 0}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {metrics?.alerts?.info === 1 ? "alert" : "alerts"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Performance Recommendations</CardTitle>
          <CardDescription>Intelligent suggestions to improve system performance</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {metrics?.cpuUsage && metrics.cpuUsage > 70 && (
                <Alert>
                  <Cpu className="h-4 w-4" />
                  <AlertTitle>High CPU Usage Detected</AlertTitle>
                  <AlertDescription>
                    CPU usage is currently at {Number(metrics.cpuUsage).toFixed(1)}%. Consider scaling up your
                    infrastructure or optimizing resource-intensive processes.
                  </AlertDescription>
                </Alert>
              )}

              {metrics?.memoryUsage && metrics.memoryUsage > 80 && (
                <Alert>
                  <HardDrive className="h-4 w-4" />
                  <AlertTitle>Memory Usage Warning</AlertTitle>
                  <AlertDescription>
                    Memory usage is currently at {Number(metrics.memoryUsage).toFixed(1)}%. Consider increasing
                    available memory or identifying memory leaks.
                  </AlertDescription>
                </Alert>
              )}

              {metrics?.errorRate && metrics.errorRate > 5 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Error Rate</AlertTitle>
                  <AlertDescription>
                    System error rate is {Number(metrics.errorRate).toFixed(1)}%, which is above the acceptable
                    threshold. Investigate recent changes or deployments.
                  </AlertDescription>
                </Alert>
              )}

              {metrics?.activeDevices &&
                metrics?.totalDevices &&
                metrics.activeDevices < metrics.totalDevices * 0.8 && (
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>Device Connectivity Issues</AlertTitle>
                    <AlertDescription>
                      Only {metrics.activeDevices} out of {metrics.totalDevices} devices are currently active. Check
                      network connectivity and device health.
                    </AlertDescription>
                  </Alert>
                )}

              {sustainabilityMetrics &&
                devices &&
                totalSustainabilityMetrics.energyUsage / (devices.length || 1) > 5 && (
                  <Alert>
                    <Leaf className="h-4 w-4" />
                    <AlertTitle>Energy Optimization Opportunity</AlertTitle>
                    <AlertDescription>
                      Average energy consumption is{" "}
                      {Number(totalSustainabilityMetrics.energyUsage / (devices.length || 1)).toFixed(2)} kWh per
                      device, which is higher than recommended. Consider enabling power-saving features.
                    </AlertDescription>
                  </Alert>
                )}

              {(!metrics?.cpuUsage || metrics.cpuUsage <= 70) &&
                (!metrics?.memoryUsage || metrics.memoryUsage <= 80) &&
                (!metrics?.errorRate || metrics.errorRate <= 5) &&
                (!metrics?.activeDevices ||
                  !metrics?.totalDevices ||
                  metrics.activeDevices >= metrics.totalDevices * 0.8) &&
                (!sustainabilityMetrics ||
                  !devices ||
                  totalSustainabilityMetrics.energyUsage / (devices.length || 1) <= 5) && (
                  <div className="flex items-center justify-center p-6">
                    <div className="text-center">
                      <Rocket className="mx-auto h-8 w-8 text-green-500" />
                      <h3 className="mt-2 text-lg font-medium">All Systems Optimal</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No performance issues detected. Your system is running smoothly.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
