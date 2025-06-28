import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
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

    // Get counts by status
    const statusCounts = await prisma.$queryRaw`
      SELECT "status", COUNT(*) as "count"
      FROM "AdCreative"
      GROUP BY "status"
    `

    // Get counts by type
    const typeCounts = await prisma.$queryRaw`
      SELECT "type", COUNT(*) as "count"
      FROM "AdCreative"
      GROUP BY "type"
    `

    // Get total creatives
    const totalCreatives = await prisma.adCreative.count()

    // Get recent approvals/rejections
    const recentReviews = await prisma.adCreative.findMany({
      where: {
        OR: [{ status: "APPROVED" }, { status: "REJECTED" }],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        rejectionReason: true,
      },
    })

    // Get performance metrics
    const performanceMetrics = await prisma.adDelivery.groupBy({
      by: ["adCreativeId"],
      _sum: {
        impressions: true,
        engagements: true,
      },
      orderBy: {
        _sum: {
          engagements: "desc",
        },
      },
      take: 5,
    })

    // Get creative details for top performers
    const topPerformerIds = performanceMetrics.map((metric) => metric.adCreativeId)
    const topPerformers = await prisma.adCreative.findMany({
      where: {
        id: {
          in: topPerformerIds,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        headline: true,
      },
    })

    // Combine performance metrics with creative details
    const topPerformingCreatives = performanceMetrics.map((metric) => {
      const creative = topPerformers.find((c) => c.id === metric.adCreativeId)
      return {
        ...creative,
        impressions: metric._sum.impressions,
        engagements: metric._sum.engagements,
        engagementRate: metric._sum.impressions ? metric._sum.engagements / metric._sum.impressions : 0,
      }
    })

    // Get emotion data averages
    const emotionAverages = await prisma.emotionData.aggregate({
      _avg: {
        joyScore: true,import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper function to handle BigInt serialization
const serializeData = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => (typeof value === "bigint" ? Number(value) : value)))
}

export async function GET(request: Request) {
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

    // Get counts by status
    const statusCounts = await prisma.adCreative.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Get counts by type
    const typeCounts = await prisma.adCreative.groupBy({
      by: ["type"],
      _count: {
        id: true,
      },
    })

    // Format status counts to match the expected format in the frontend
    const formattedStatusCounts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    // Format type counts to match the expected format in the frontend
    const formattedTypeCounts = typeCounts.reduce(
      (acc, item) => {
        acc[item.type] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    // Get total creatives
    const totalCreatives = await prisma.adCreative.count()

    // Get recent approvals/rejections
    const recentReviews = await prisma.adCreative.findMany({
      where: {
        OR: [{ status: "APPROVED" }, { status: "REJECTED" }],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        rejectionReason: true,
      },
    })

    // Get performance metrics
    const performanceMetrics = await prisma.adDelivery.groupBy({
      by: ["adCreativeId"],
      _sum: {
        impressions: true,
        engagements: true,
      },
      orderBy: {
        _sum: {
          engagements: "desc",
        },
      },
      take: 5,
    })

    // Get creative details for top performers
    const topPerformerIds = performanceMetrics.map((metric) => metric.adCreativeId)
    const topPerformers = await prisma.adCreative.findMany({
      where: {
        id: {
          in: topPerformerIds,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        headline: true,
      },
    })

    // Combine performance metrics with creative details
    const topPerformingCreatives = performanceMetrics.map((metric) => {
      const creative = topPerformers.find((c) => c.id === metric.adCreativeId)
      return {
        ...creative,
        impressions: metric._sum.impressions,
        engagements: metric._sum.engagements,
        engagementRate: metric._sum.impressions ? metric._sum.engagements / metric._sum.impressions : 0,
      }
    })

    // Get emotion data averages
    const emotionAverages = await prisma.emotionData.aggregate({
      _avg: {
        joyScore: true,
        surpriseScore: true,
        neutralScore: true,
        dwellTime: true,
      },
    })

    return NextResponse.json(
      serializeData({
        totalCreatives,
        statusCounts: formattedStatusCounts,
        typeCounts: formattedTypeCounts,
        recentReviews,
        topPerformingCreatives,
        emotionAverages: emotionAverages._avg,
      }),
    )
  } catch (error) {
    console.error("Error fetching ad creative statistics:", error)
    return NextResponse.json({ error: "Failed to fetch ad creative statistics" }, { status: 500 })
  }
}


        surpriseScore: true,
        neutralScore: true,
        dwellTime: true,
      },
    })

    return NextResponse.json({
      totalCreatives,
      statusCounts,
      typeCounts,
      recentReviews,
      topPerformingCreatives,
      emotionAverages: emotionAverages._avg,
    })
  } catch (error) {
    console.error("Error fetching ad creative statistics:", error)
    return NextResponse.json({ error: "Failed to fetch ad creative statistics" }, { status: 500 })
  }
}

