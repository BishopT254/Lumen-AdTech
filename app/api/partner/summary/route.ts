import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

// Define the response type based on what the dashboard expects
type AnalyticsSummaryResponse = {
  totalDevices: number
  activeDevices: number
  totalImpressions: number
  totalRevenue: number
  averageCTR: number
  totalConversions: number
  // Additional metrics that might be useful
  pendingDevices?: number
  maintenanceDevices?: number
  inactiveDevices?: number
  revenueByPeriod?: {
    daily: number
    weekly: number
    monthly: number
  }
  impressionsByPeriod?: {
    daily: number
    weekly: number
    monthly: number
  }
  topPerformingDevices?: Array<{
    id: string
    name: string
    impressions: number
    revenue: number
  }>
  deviceHealthSummary?: {
    healthy: number
    warning: number
    critical: number
    offline: number
    unknown: number
  }
}

// Query parameters schema
const querySchema = z.object({
  period: z.enum(["day", "week", "month", "year", "all"]).optional().default("all"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeInactive: z.boolean().optional().default(true),
})

export async function GET(request: Request) {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access this resource." },
        { status: 401 }
      )
    }

    // Check if user is a partner
    if (session.user.role !== "PARTNER") {
      return NextResponse.json(
        { error: "Access denied. Only partners can access this resource." },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams.entries())
    
    // Convert string boolean to actual boolean
    if (rawParams.includeInactive !== undefined) {
      rawParams.includeInactive = rawParams.includeInactive === "true"
    }
    
    const params = querySchema.parse(rawParams)

    // Get the partner ID for the authenticated user
    const partner = await db.partner.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    if (!partner) {
      return NextResponse.json(
        { error: "Partner profile not found. Please complete your profile setup." },
        { status: 404 }
      )
    }

    // Calculate date ranges based on period
    const now = new Date()
    let startDate = new Date(0) // Default to beginning of time
    
    if (params.startDate) {
      startDate = new Date(params.startDate)
    } else {
      switch (params.period) {
        case "day":
          startDate = new Date(now)
          startDate.setHours(0, 0, 0, 0)
          break
        case "week":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
        // "all" uses the default startDate
      }
    }
    
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Get all devices for this partner
    const devices = await db.device.findMany({
      where: {
        partnerId: partner.id,
        ...(params.includeInactive ? {} : { status: "ACTIVE" }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        healthStatus: true,
        lastActive: true,
      },
    })

    // Count devices by status
    const totalDevices = devices.length
    const activeDevices = devices.filter(d => d.status === "ACTIVE").length
    const pendingDevices = devices.filter(d => d.status === "PENDING").length
    const maintenanceDevices = devices.filter(d => d.status === "MAINTENANCE").length
    const inactiveDevices = devices.filter(d => d.status === "INACTIVE" || d.status === "SUSPENDED").length

    // Count devices by health status
    const deviceHealthSummary = {
      healthy: devices.filter(d => d.healthStatus === "HEALTHY").length,
      warning: devices.filter(d => d.healthStatus === "WARNING").length,
      critical: devices.filter(d => d.healthStatus === "CRITICAL").length,
      offline: devices.filter(d => d.healthStatus === "OFFLINE").length,
      unknown: devices.filter(d => d.healthStatus === "UNKNOWN").length,
    }

    // Get device IDs for querying related data
    const deviceIds = devices.map(d => d.id)

    // Get ad deliveries for these devices within the date range
    const adDeliveries = await db.adDelivery.findMany({
      where: {
        deviceId: { in: deviceIds },
        actualDeliveryTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        deviceId: true,
        impressions: true,
        engagements: true,
        completions: true,
        viewerCount: true,
      },
    })

    // Get device analytics for these devices within the date range
    const deviceAnalytics = await db.deviceAnalytics.findMany({
      where: {
        deviceId: { in: deviceIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        deviceId: true,
        impressionsServed: true,
        engagementsCount: true,
        averageViewerCount: true,
      },
    })

    // Get partner earnings within the date range
    const earnings = await db.partnerEarning.findMany({
      where: {
        partnerId: partner.id,
        periodEnd: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        totalImpressions: true,
        totalEngagements: true,
      },
    })

    // Calculate total impressions from both ad deliveries and device analytics
    // Ad deliveries are more accurate but device analytics provide a fallback
    const adDeliveryImpressions = adDeliveries.reduce((sum, ad) => sum + (ad.impressions || 0), 0)
    const analyticsImpressions = deviceAnalytics.reduce((sum, analytics) => sum + (analytics.impressionsServed || 0), 0)
    
    // Use the higher value between the two sources or earnings data as another source
    const earningsImpressions = earnings.reduce((sum, earning) => sum + (earning.totalImpressions || 0), 0)
    const totalImpressions = Math.max(adDeliveryImpressions, analyticsImpressions, earningsImpressions)

    // Calculate total engagements
    const adDeliveryEngagements = adDeliveries.reduce((sum, ad) => sum + (ad.engagements || 0), 0)
    const analyticsEngagements = deviceAnalytics.reduce((sum, analytics) => sum + (analytics.engagementsCount || 0), 0)
    const earningsEngagements = earnings.reduce((sum, earning) => sum + (earning.totalEngagements || 0), 0)
    const totalEngagements = Math.max(adDeliveryEngagements, analyticsEngagements, earningsEngagements)

    // Calculate total completions (conversions)
    const totalConversions = adDeliveries.reduce((sum, ad) => sum + (ad.completions || 0), 0)

    // Calculate CTR (Click-Through Rate)
    const averageCTR = totalImpressions > 0 
      ? parseFloat(((totalEngagements / totalImpressions) * 100).toFixed(2)) 
      : 0

    // Calculate total revenue from earnings
    const totalRevenue = earnings.reduce((sum, earning) => sum + Number(earning.amount), 0)

    // Calculate revenue by period
    const now24HoursAgo = new Date(now)
    now24HoursAgo.setDate(now.getDate() - 1)
    
    const now7DaysAgo = new Date(now)
    now7DaysAgo.setDate(now.getDate() - 7)
    
    const now30DaysAgo = new Date(now)
    now30DaysAgo.setDate(now.getDate() - 30)
    
    const dailyEarnings = earnings.filter(e => new Date(e.periodEnd) >= now24HoursAgo)
    const weeklyEarnings = earnings.filter(e => new Date(e.periodEnd) >= now7DaysAgo)
    const monthlyEarnings = earnings.filter(e => new Date(e.periodEnd) >= now30DaysAgo)
    
    const revenueByPeriod = {
      daily: dailyEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0),
      weekly: weeklyEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0),
      monthly: monthlyEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0),
    }

    // Calculate impressions by period
    const dailyImpressions = dailyEarnings.reduce((sum, earning) => sum + earning.totalImpressions, 0)
    const weeklyImpressions = weeklyEarnings.reduce((sum, earning) => sum + earning.totalImpressions, 0)
    const monthlyImpressions = monthlyEarnings.reduce((sum, earning) => sum + earning.totalImpressions, 0)
    
    const impressionsByPeriod = {
      daily: dailyImpressions,
      weekly: weeklyImpressions,
      monthly: monthlyImpressions,
    }

    // Calculate top performing devices
    // First, aggregate impressions and revenue by device
    const devicePerformance = new Map()
    
    // Add impressions from ad deliveries
    adDeliveries.forEach(delivery => {
      if (!devicePerformance.has(delivery.deviceId)) {
        devicePerformance.set(delivery.deviceId, { impressions: 0, revenue: 0 })
      }
      const current = devicePerformance.get(delivery.deviceId)
      current.impressions += delivery.impressions || 0
      devicePerformance.set(delivery.deviceId, current)
    })
    
    // Add impressions from device analytics
    deviceAnalytics.forEach(analytics => {
      if (!devicePerformance.has(analytics.deviceId)) {
        devicePerformance.set(analytics.deviceId, { impressions: 0, revenue: 0 })
      }
      const current = devicePerformance.get(analytics.deviceId)
      current.impressions = Math.max(current.impressions, analytics.impressionsServed || 0)
      devicePerformance.set(analytics.deviceId, current)
    })
    
    // Estimate revenue based on impressions and total revenue
    // This is an approximation since we don't have direct revenue per device
    if (totalImpressions > 0 && totalRevenue > 0) {
      const revenuePerImpression = totalRevenue / totalImpressions
      devicePerformance.forEach((performance, deviceId) => {
        performance.revenue = parseFloat((performance.impressions * revenuePerImpression).toFixed(2))
        devicePerformance.set(deviceId, performance)
      })
    }
    
    // Convert to array and sort by revenue
    const devicePerformanceArray = Array.from(devicePerformance.entries())
      .map(([deviceId, performance]) => ({
        id: deviceId,
        name: devices.find(d => d.id === deviceId)?.name || "Unknown Device",
        impressions: performance.impressions,
        revenue: performance.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
    
    // Get top 5 devices
    const topPerformingDevices = devicePerformanceArray.slice(0, 5)

    // Construct the response
    const response: AnalyticsSummaryResponse = {
      totalDevices,
      activeDevices,
      totalImpressions,
      totalRevenue,
      averageCTR,
      totalConversions,
      pendingDevices,
      maintenanceDevices,
      inactiveDevices,
      revenueByPeriod,
      impressionsByPeriod,
      topPerformingDevices,
      deviceHealthSummary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in analytics summary API:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to fetch analytics summary" },
      { status: 500 }
    )
  }
}