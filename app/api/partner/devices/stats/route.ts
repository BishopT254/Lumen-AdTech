import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch device statistics for the partner dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's partner profile
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Try to get from cache first
    const cacheKey = `partner:devices:stats:${partner.id}`
    const cachedStats = await getCache(cacheKey)

    if (cachedStats) {
      return NextResponse.json(cachedStats)
    }

    // Get device statistics
    const [totalDevices, devicesByStatus, devicesByType, devicesByHealth, totalImpressions, totalRevenue] =
      await Promise.all([
        // Total devices count
        prisma.device.count({
          where: { partnerId: partner.id },
        }),

        // Devices grouped by status
        prisma.device.groupBy({
          by: ["status"],
          where: { partnerId: partner.id },
          _count: true,
        }),

        // Devices grouped by type
        prisma.device.groupBy({
          by: ["deviceType"],
          where: { partnerId: partner.id },
          _count: true,
        }),

        // Devices grouped by health status
        prisma.device.groupBy({
          by: ["healthStatus"],
          where: { partnerId: partner.id },
          _count: true,
        }),

        // Total impressions
        prisma.device.aggregate({
          where: { partnerId: partner.id },
          _sum: { impressions: true },
        }),

        // Total revenue
        prisma.device.aggregate({
          where: { partnerId: partner.id },
          _sum: { revenue: true },
        }),
      ])

    // Format the status counts
    const statusCounts = {
      ACTIVE: 0,
      PENDING: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
      MAINTENANCE: 0,
    }

    devicesByStatus.forEach((item) => {
      statusCounts[item.status as keyof typeof statusCounts] = item._count
    })

    // Format the type counts
    const typeCounts: Record<string, number> = {}
    devicesByType.forEach((item) => {
      typeCounts[item.deviceType] = item._count
    })

    // Format the health status counts
    const healthCounts = {
      HEALTHY: 0,
      WARNING: 0,
      CRITICAL: 0,
      OFFLINE: 0,
      UNKNOWN: 0,
    }

    devicesByHealth.forEach((item) => {
      healthCounts[item.healthStatus as keyof typeof healthCounts] = item._count
    })

    // Calculate active devices
    const activeDevices = statusCounts.ACTIVE || 0

    // Calculate average CTR (click-through rate) - simplified calculation
    // In a real app, this would be calculated from actual engagement data
    const averageCTR =
      totalImpressions._sum.impressions && totalImpressions._sum.impressions > 0
        ? 3.2 // Default CTR of 3.2%
        : 0

    // Calculate total conversions - simplified estimation
    // In a real app, this would be calculated from actual conversion data
    const totalConversions = totalImpressions._sum.impressions
      ? Math.round((totalImpressions._sum.impressions * averageCTR) / 100)
      : 0

    // Prepare the response
    const stats = {
      totalDevices,
      activeDevices,
      totalImpressions: totalImpressions._sum.impressions || 0,
      totalRevenue: totalRevenue._sum.revenue || 0,
      averageCTR,
      totalConversions,
      statusCounts,
      typeCounts,
      healthCounts,
    }

    // Cache the stats
    await setCache(cacheKey, stats, CACHE_TTL)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching device statistics:", error)
    return NextResponse.json({ error: "Failed to fetch device statistics" }, { status: 500 })
  }
}
