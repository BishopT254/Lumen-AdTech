import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { admin: true },
    })

    if (!user?.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get platform metrics
    const totalUsers = await prisma.user.count()
    const totalAdvertisers = await prisma.advertiser.count()
    const totalPartners = await prisma.partner.count()
    const totalDevices = await prisma.device.count()

    // Get device status distribution
    const devicesByStatus = await prisma.device.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    })

    // Get campaign metrics
    const activeCampaigns = await prisma.campaign.count({
      where: { status: "ACTIVE" },
    })

    // Get pending approvals
    const pendingApprovals = await prisma.campaign.count({
      where: { status: "PENDING_APPROVAL" },
    })

    // Calculate total impressions and revenue
    const campaignAnalytics = await prisma.campaignAnalytics.aggregate({
      _sum: {
        impressions: true,
      },
    })

    const billings = await prisma.billing.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        total: true,
      },
    })

    // Get recent activities
    const recentActivities = await getRecentActivities()

    // Get system health
    const systemHealth = await getSystemHealth()

    return NextResponse.json({
      platformMetrics: {
        totalUsers,
        totalAdvertisers,
        totalPartners,
        totalDevices,
        devicesByStatus,
        activeCampaigns,
        pendingApprovals,
        totalImpressions: campaignAnalytics._sum.impressions || 0,
        totalRevenue: billings._sum.total || 0,
      },
      recentActivities,
      systemHealth,
    })
  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}

async function getRecentActivities() {
  // Get recent user creations
  const recentUsers = await prisma.user.findMany({
    take: 2,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      role: true,
    },
  })

  // Get recent campaigns
  const recentCampaigns = await prisma.campaign.findMany({
    take: 2,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      advertiser: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  // Get recent payments
  const recentPayments = await prisma.payment.findMany({
    take: 1,
    orderBy: { dateCompleted: "desc" },
    where: { status: "COMPLETED" },
    select: {
      id: true,
      amount: true,
      dateCompleted: true,
      Advertiser: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  // Format activities
  const activities = [
    ...recentUsers.map((user) => ({
      id: user.id,
      type: "USER_CREATED",
      user: user.name || "New User",
      email: user.email,
      timestamp: user.createdAt.toISOString(),
      details: `New ${user.role.toLowerCase()} account created`,
    })),
    ...recentCampaigns.map((campaign) => ({
      id: campaign.id,
      type: "CAMPAIGN_CREATED",
      user: campaign.advertiser.user.name || "Advertiser",
      email: campaign.advertiser.user.email,
      timestamp: campaign.createdAt.toISOString(),
      details: `New campaign "${campaign.name}" created`,
    })),
    ...recentPayments.map((payment) => ({
      id: payment.id,
      type: "PAYMENT_RECEIVED",
      user: payment.Advertiser.user.name || "Advertiser",
      email: payment.Advertiser.user.email,
      timestamp: payment.dateCompleted?.toISOString() || new Date().toISOString(),
      details: `Payment of $${payment.amount.toFixed(2)} received`,
    })),
  ]

  // Sort by timestamp
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
}

async function getSystemHealth() {
  // In a real implementation, these would come from monitoring services
  // like Prometheus, CloudWatch, or custom health checks

  // For now, we'll generate realistic values
  const serverLoad = Math.floor(Math.random() * 30) + 20 // 20-50%
  const memoryUsage = Math.floor(Math.random() * 25) + 30 // 30-55%
  const diskUsage = Math.floor(Math.random() * 20) + 40 // 40-60%

  // Get active sessions count from the database
  const activeSessions = await prisma.session.count({
    where: {
      expires: {
        gt: new Date(),
      },
    },
  })

  // Calculate API requests (this would normally come from logs/metrics)
  // For demo, we'll use a random number
  const apiRequests = Math.floor(Math.random() * 5000) + 10000

  // Error rate (would come from error logs/monitoring)
  const errorRate = Math.random() * 0.02 // 0-2%

  // Determine status based on metrics
  const status = errorRate > 0.015 || serverLoad > 80 || memoryUsage > 90 ? "DEGRADED" : "HEALTHY"

  return {
    serverLoad,
    memoryUsage,
    diskUsage,
    activeSessions,
    apiRequests,
    errorRate,
    status,
  }
}

