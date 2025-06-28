import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DeviceStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get("endDate") || new Date().toISOString()
    const deviceType = searchParams.get("deviceType") || "all"
    const location = searchParams.get("location") || "all"

    // Build device filter
    const deviceFilter: any = {}
    if (deviceType !== "all") {
      deviceFilter.deviceType = deviceType
    }
    if (location !== "all") {
      const [city, country] = location.split(", ")
      deviceFilter.location = {
        path: "$.city",
        equals: city,
      }
    }

    // Get device counts
    const totalDevices = await prisma.device.count()
    const activeDevices = await prisma.device.count({
      where: {
        status: DeviceStatus.ACTIVE,
        ...deviceFilter,
      },
    })

    // Get device analytics
    const deviceAnalytics = await prisma.deviceAnalytics.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        device: deviceFilter,
      },
      include: {
        device: true,
      },
      orderBy: {
        date: "asc",
      },
    })

    // Calculate system metrics
    const uptime = calculateUptime(deviceAnalytics)
    const peakPerformance = calculatePeakPerformance(deviceAnalytics)
    const responseTime = calculateAverageResponseTime(deviceAnalytics)
    const errorRate = calculateErrorRate(deviceAnalytics)
    const cpuUsage = calculateAverageCpuUsage(deviceAnalytics)
    const memoryUsage = calculateAverageMemoryUsage(deviceAnalytics)
    const networkUsage = calculateAverageNetworkUsage(deviceAnalytics)
    const diskUsage = calculateAverageDiskUsage(deviceAnalytics)

    // Get API request metrics
    const apiRequests = await getApiRequestMetrics(startDate, endDate)

    // Get active users
    const activeUsers = await getActiveUsers(startDate, endDate)

    // Get device performance by type
    const devicePerformance = await getDevicePerformanceByType(startDate, endDate, deviceFilter)

    // Get sustainability data
    const sustainabilityData = await getSustainabilityData(startDate, endDate, deviceFilter)

    // Get recent alerts
    const recentAlerts = await getRecentAlerts(startDate, endDate)

    // Generate chart data
    const chartData = generateChartData(deviceAnalytics, startDate, endDate)

    // Return the metrics
    return NextResponse.json({
      uptime,
      peakPerformance,
      responseTime,
      errorRate,
      activeDevices,
      totalDevices,
      activeUsers,
      cpuUsage,
      memoryUsage,
      networkUsage,
      diskUsage,
      apiRequests,
      alerts: {
        critical: recentAlerts.filter((alert) => alert.type === "critical").length,
        warning: recentAlerts.filter((alert) => alert.type === "warning").length,
        info: recentAlerts.filter((alert) => alert.type === "info").length,
      },
      chartData,
      devicePerformance,
      sustainabilityData,
      recentAlerts,
    })
  } catch (error) {
    console.error("Error fetching performance metrics:", error)
    return NextResponse.json({ error: "Failed to fetch performance metrics" }, { status: 500 })
  }
}

// Helper functions
function calculateUptime(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const totalUptime = deviceAnalytics.reduce((sum, analytics) => sum + analytics.uptime, 0)
  return Number.parseFloat((totalUptime / deviceAnalytics.length).toFixed(2))
}

function calculatePeakPerformance(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const performances = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.responseTime)
    .map((analytics) => 1000 / analytics.performanceMetrics.responseTime) // Requests per second
  return performances.length > 0 ? Math.max(...performances) : 0
}

function calculateAverageResponseTime(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const responseTimes = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.responseTime)
    .map((analytics) => analytics.performanceMetrics.responseTime)
  return responseTimes.length > 0
    ? Number.parseFloat((responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(2))
    : 0
}

function calculateErrorRate(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const totalRequests = deviceAnalytics.reduce(
    (sum, analytics) => sum + (analytics.performanceMetrics?.requests || 0),
    0,
  )
  const failedRequests = deviceAnalytics.reduce(
    (sum, analytics) => sum + (analytics.performanceMetrics?.errors || 0),
    0,
  )
  return totalRequests > 0 ? Number.parseFloat(((failedRequests / totalRequests) * 100).toFixed(2)) : 0
}

function calculateAverageCpuUsage(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const cpuUsages = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.cpu)
    .map((analytics) => analytics.performanceMetrics.cpu)
  return cpuUsages.length > 0
    ? Number.parseFloat((cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length).toFixed(2))
    : 0
}

function calculateAverageMemoryUsage(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const memoryUsages = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.memory)
    .map((analytics) => analytics.performanceMetrics.memory)
  return memoryUsages.length > 0
    ? Number.parseFloat((memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length).toFixed(2))
    : 0
}

function calculateAverageNetworkUsage(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const networkUsages = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.network)
    .map((analytics) => analytics.performanceMetrics.network)
  return networkUsages.length > 0
    ? Number.parseFloat((networkUsages.reduce((sum, usage) => sum + usage, 0) / networkUsages.length).toFixed(2))
    : 0
}

function calculateAverageDiskUsage(deviceAnalytics: any[]): number {
  if (deviceAnalytics.length === 0) return 0
  const diskUsages = deviceAnalytics
    .filter((analytics) => analytics.performanceMetrics?.disk)
    .map((analytics) => analytics.performanceMetrics.disk)
  return diskUsages.length > 0
    ? Number.parseFloat((diskUsages.reduce((sum, usage) => sum + usage, 0) / diskUsages.length).toFixed(2))
    : 0
}

async function getApiRequestMetrics(
  startDate: string,
  endDate: string,
): Promise<{ total: number; successful: number; failed: number }> {
  // In a real implementation, this would query an API request log table
  // For now, we'll generate some realistic data
  const totalRequests = Math.floor(Math.random() * 100000) + 50000
  const failureRate = Math.random() * 0.05 // 0-5% failure rate
  const failedRequests = Math.floor(totalRequests * failureRate)

  return {
    total: totalRequests,
    successful: totalRequests - failedRequests,
    failed: failedRequests,
  }
}

async function getActiveUsers(startDate: string, endDate: string): Promise<number> {
  // In a real implementation, this would query active sessions
  // For now, we'll generate a realistic number
  return Math.floor(Math.random() * 500) + 100
}

async function getDevicePerformanceByType(startDate: string, endDate: string, deviceFilter: any): Promise<any[]> {
  // Get device types and their performance metrics
  const deviceTypes = await prisma.device.groupBy({
    by: ["deviceType"],
    where: deviceFilter,
    _count: {
      id: true,
    },
  })

  // For each device type, calculate performance metrics
  const devicePerformance = await Promise.all(
    deviceTypes.map(async (type) => {
      const devices = await prisma.device.findMany({
        where: {
          deviceType: type.deviceType,
          ...deviceFilter,
        },
        include: {
          adDeliveries: {
            where: {
              scheduledTime: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          },
        },
      })

      // Calculate metrics
      const totalImpressions = devices.reduce(
        (sum, device) => sum + device.adDeliveries.reduce((s, d) => s + (d.impressions || 0), 0),
        0,
      )

      const totalEngagements = devices.reduce(
        (sum, device) => sum + device.adDeliveries.reduce((s, d) => s + (d.engagements || 0), 0),
        0,
      )

      // Calculate average uptime
      const uptime =
        devices.length > 0 ? (devices.filter((d) => d.status === DeviceStatus.ACTIVE).length / devices.length) * 100 : 0

      // Calculate error rate (random for demo)
      const errorRate = Math.random() * 5

      return {
        deviceType: type.deviceType,
        count: type._count.id,
        uptime: Number.parseFloat(uptime.toFixed(1)),
        impressions: totalImpressions,
        engagements: totalEngagements,
        errorRate: Number.parseFloat(errorRate.toFixed(2)),
      }
    }),
  )

  return devicePerformance
}

async function getSustainabilityData(startDate: string, endDate: string, deviceFilter: any): Promise<any[]> {
  // Get sustainability metrics
  const metrics = await prisma.sustainabilityMetrics.findMany({
    where: {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      device: deviceFilter.deviceType ? { deviceType: deviceFilter.deviceType } : undefined,
    },
    orderBy: {
      date: "asc",
    },
  })

  // Group by date
  const groupedMetrics: Record<string, { energyUsage: number; carbonFootprint: number }> = {}

  metrics.forEach((metric) => {
    const dateKey = metric.date.toISOString().split("T")[0]

    if (!groupedMetrics[dateKey]) {
      groupedMetrics[dateKey] = {
        energyUsage: 0,
        carbonFootprint: 0,
      }
    }

    groupedMetrics[dateKey].energyUsage += metric.energyUsage
    groupedMetrics[dateKey].carbonFootprint += metric.carbonFootprint
  })

  // Convert to array
  return Object.entries(groupedMetrics).map(([date, data]) => ({
    date,
    energyUsage: Number.parseFloat(data.energyUsage.toFixed(2)),
    carbonFootprint: Number.parseFloat(data.carbonFootprint.toFixed(2)),
  }))
}

async function getRecentAlerts(startDate: string, endDate: string): Promise<any[]> {
  // In a real implementation, this would query an alerts table
  // For now, we'll generate some realistic alerts

  const alertTypes = ["critical", "warning", "info"] as const
  const alertSources = ["System", "Device", "Network", "Security", "Database"]

  const criticalMessages = [
    "Database connection failed",
    "High memory usage detected",
    "API service unavailable",
    "Security breach detected",
    "Disk space critically low",
  ]

  const warningMessages = [
    "High CPU usage detected",
    "Network latency increasing",
    "Multiple failed login attempts",
    "Device offline for more than 24 hours",
    "Database query performance degrading",
  ]

  const infoMessages = [
    "System update completed",
    "New device registered",
    "Backup completed successfully",
    "User password changed",
    "Configuration updated",
  ]

  // Generate random alerts
  const alerts = []
  const numAlerts = Math.floor(Math.random() * 10) + 5

  for (let i = 0; i < numAlerts; i++) {
    const typeIndex = Math.floor(Math.random() * alertTypes.length)
    const type = alertTypes[typeIndex]

    let message = ""
    if (type === "critical") {
      message = criticalMessages[Math.floor(Math.random() * criticalMessages.length)]
    } else if (type === "warning") {
      message = warningMessages[Math.floor(Math.random() * warningMessages.length)]
    } else {
      message = infoMessages[Math.floor(Math.random() * infoMessages.length)]
    }

    const source = alertSources[Math.floor(Math.random() * alertSources.length)]

    // Random timestamp between start and end date
    const startTimestamp = new Date(startDate).getTime()
    const endTimestamp = new Date(endDate).getTime()
    const randomTimestamp = startTimestamp + Math.random() * (endTimestamp - startTimestamp)

    alerts.push({
      id: `alert-${i}`,
      type,
      message,
      source,
      timestamp: new Date(randomTimestamp).toISOString(),
    })
  }

  // Sort by timestamp (newest first)
  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function generateChartData(deviceAnalytics: any[], startDate: string, endDate: string): any[] {
  // Generate time series data for charts
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Limit to 30 data points for better visualization
  const interval = Math.max(1, Math.ceil(daysDiff / 30))

  const chartData = []
  let currentDate = new Date(start)

  while (currentDate <= end) {
    // Find analytics for this date
    const dateAnalytics = deviceAnalytics.filter((a) => {
      const analyticsDate = new Date(a.date)
      return (
        analyticsDate.getDate() === currentDate.getDate() &&
        analyticsDate.getMonth() === currentDate.getMonth() &&
        analyticsDate.getFullYear() === currentDate.getFullYear()
      )
    })

    // Calculate averages
    const cpu =
      dateAnalytics.length > 0
        ? dateAnalytics.reduce((sum, a) => sum + (a.performanceMetrics?.cpu || 0), 0) / dateAnalytics.length
        : Math.random() * 60 + 20 // Random value between 20-80% if no data

    const memory =
      dateAnalytics.length > 0
        ? dateAnalytics.reduce((sum, a) => sum + (a.performanceMetrics?.memory || 0), 0) / dateAnalytics.length
        : Math.random() * 50 + 30 // Random value between 30-80% if no data

    const network =
      dateAnalytics.length > 0
        ? dateAnalytics.reduce((sum, a) => sum + (a.performanceMetrics?.network || 0), 0) / dateAnalytics.length
        : Math.random() * 40 + 20 // Random value between 20-60% if no data

    const responseTime =
      dateAnalytics.length > 0
        ? dateAnalytics.reduce((sum, a) => sum + (a.performanceMetrics?.responseTime || 0), 0) / dateAnalytics.length
        : Math.random() * 200 + 50 // Random value between 50-250ms if no data

    // Random values for active users and API requests
    const activeUsers = Math.floor(Math.random() * 300) + 100
    const apiRequests = Math.floor(Math.random() * 5000) + 1000

    chartData.push({
      timestamp: currentDate.toISOString(),
      cpu: Number.parseFloat(cpu.toFixed(2)),
      memory: Number.parseFloat(memory.toFixed(2)),
      network: Number.parseFloat(network.toFixed(2)),
      responseTime: Number.parseFloat(responseTime.toFixed(2)),
      activeUsers,
      apiRequests,
    })

    // Move to next interval
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + interval))
  }

  return chartData
}
