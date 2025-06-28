// Fix the import for PrismaClient to use the singleton pattern
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"
import { getCache, setCache } from "@/lib/redis"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET /api/partner/analytics/summary
 *
 * Fetches a summary of analytics data for a partner's dashboard
 * Includes total devices, active devices, impressions, revenue, etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "PARTNER") {
      return NextResponse.json({ error: "Unauthorized. Partner access required." }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30days"

    // Try to get from cache first
    const cacheKey = `partner:analytics:summary:${session.user.id}:${period}`
    const cachedData = await getCache(cacheKey)

    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Calculate date range based on period
    const endDate = new Date()
    let startDate

    switch (period) {
      case "7days":
        startDate = subDays(endDate, 7)
        break
      case "90days":
        startDate = subDays(endDate, 90)
        break
      case "year":
        startDate = subDays(endDate, 365)
        break
      case "all":
        startDate = new Date(0) // Beginning of time
        break
      case "30days":
      default:
        startDate = subDays(endDate, 30)
        break
    }

    // Get partner ID from user ID
    const partner = await prisma.partner.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        commissionRate: true,
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Get all partner devices
    const devices = await prisma.device.findMany({
      where: {
        partnerId: partner.id,
      },
      select: {
        id: true,
        status: true,
        lastActive: true,
        impressions: true,
        revenue: true,
      },
    })

    // Count total and active devices
    const totalDevices = devices.length
    const activeDevices = devices.filter(
      (d) => d.status === "ACTIVE" && d.lastActive && new Date(d.lastActive) > subDays(new Date(), 7),
    ).length

    // Calculate total impressions and revenue
    const totalImpressions = devices.reduce((sum, device) => sum + (device.impressions || 0), 0)
    const totalRevenue = devices.reduce((sum, device) => sum + (device.revenue || 0), 0)

    // Get device analytics for the period
    const deviceAnalytics = await prisma.deviceAnalytics.findMany({
      where: {
        deviceId: { in: devices.map((d) => d.id) },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get ad deliveries for the period
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId: { in: devices.map((d) => d.id) },
        scheduledTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        impressions: true,
        engagements: true,
        viewerCount: true,
        completions: true,
      },
    })

    // Calculate period-specific metrics
    const periodImpressions = adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0)
    const periodEngagements = adDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0)
    const periodViewers = adDeliveries.reduce((sum, delivery) => sum + (delivery.viewerCount || 0), 0)
    const periodCompletions = adDeliveries.reduce((sum, delivery) => sum + delivery.completions, 0)

    // Calculate CTR (Click-Through Rate)
    const averageCTR = periodImpressions > 0 ? (periodEngagements / periodImpressions) * 100 : 0

    // Calculate conversions (estimated from completions)
    const totalConversions = periodCompletions

    // Calculate estimated earnings based on impressions and commission rate
    // This is a simplified calculation - in a real system, this would be based on actual campaign payments
    const commissionRate = Number(partner.commissionRate) || 0.3 // Default to 30% if not set
    const estimatedEarnings = periodImpressions * 0.002 * commissionRate // Assuming $2 CPM

    // Get wallet balance if available
    const wallet = await prisma.wallet.findUnique({
      where: {
        partnerId: partner.id,
      },
      select: {
        balance: true,
        pendingBalance: true,
        currency: true,
      },
    })

    // Get recent earnings
    const recentEarnings = await prisma.partnerEarning.findMany({
      where: {
        partnerId: partner.id,
        periodEnd: {
          gte: startDate,
        },
      },
      orderBy: {
        periodEnd: "desc",
      },
      take: 5,
    })

    // Calculate performance trends (comparing to previous period)
    // Original code with the issue:
    // const previousPeriodStart = subDays(startDate, endDate.getTime() - startDate.getTime())

    // Fixed implementation that ensures valid date calculation:
    let previousPeriodStart = new Date()
    try {
      // Calculate the duration of the current period in days
      const periodDurationMs = endDate.getTime() - startDate.getTime()
      if (isNaN(periodDurationMs)) {
        // If we can't calculate a valid duration, use a reasonable default (same as current period)
        previousPeriodStart = new Date(startDate)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30) // Default to 30 days before
      } else {
        // Calculate the previous period start date properly
        const periodDurationDays = Math.floor(periodDurationMs / (1000 * 60 * 60 * 24))
        previousPeriodStart = new Date(startDate)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDurationDays)
      }
    } catch (err) {
      console.error("Error calculating previous period:", err)
      // Fallback to a safe default if calculation fails
      previousPeriodStart = new Date(startDate)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 30)
    }

    // Then use previousPeriodStart in the query for previous period deliveries
    const previousPeriodDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId: { in: devices.map((d) => d.id) },
        scheduledTime: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
      select: {
        impressions: true,
        engagements: true,
      },
    })

    const previousPeriodImpressions = previousPeriodDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0)
    const previousPeriodEngagements = previousPeriodDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0)

    const impressionsTrend =
      previousPeriodImpressions > 0
        ? ((periodImpressions - previousPeriodImpressions) / previousPeriodImpressions) * 100
        : 100

    const engagementsTrend =
      previousPeriodEngagements > 0
        ? ((periodEngagements - previousPeriodEngagements) / previousPeriodEngagements) * 100
        : 100

    // Create the summary data
    const summaryData = {
      period: {
        name: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalDevices,
      activeDevices,
      totalImpressions: periodImpressions,
      totalRevenue: estimatedEarnings,
      averageCTR: Number.parseFloat(averageCTR.toFixed(1)),
      totalConversions,
      totalViewers: periodViewers,
      engagementRate: periodImpressions > 0 ? (periodEngagements / periodImpressions) * 100 : 0,
      averageDwellTime: 15.3, // Placeholder - would be calculated from actual dwell time data
      wallet: wallet
        ? {
            balance: Number(wallet.balance),
            pendingBalance: Number(wallet.pendingBalance),
            currency: wallet.currency,
          }
        : null,
      recentEarnings: recentEarnings.map((earning) => ({
        id: earning.id,
        periodStart: earning.periodStart,
        periodEnd: earning.periodEnd,
        amount: Number(earning.amount),
        status: earning.status,
      })),
      trends: {
        impressions: Number.parseFloat(impressionsTrend.toFixed(1)),
        engagements: Number.parseFloat(engagementsTrend.toFixed(1)),
      },
      // Include device performance summary
      devicePerformance: devices.map((device) => ({
        id: device.id,
        impressions: device.impressions || 0,
        revenue: device.revenue || 0,
        isActive:
          device.status === "ACTIVE" && device.lastActive && new Date(device.lastActive) > subDays(new Date(), 7),
      })),
    }

    // Cache the summary data
    await setCache(cacheKey, summaryData, CACHE_TTL)

    // Return the summary data
    return NextResponse.json(summaryData)
  } catch (error) {
    console.error("Error fetching partner analytics summary:", error)
    return NextResponse.json({ error: "Failed to fetch analytics summary" }, { status: 500 })
  }
}
