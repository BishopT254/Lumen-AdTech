import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET handler for fetching aggregated campaign analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch top campaigns by performance
    const topCampaigns = await prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        analytics: true,
      },
      take: 5,
    })

    // Calculate performance metrics for each campaign
    const performanceData = topCampaigns.map((campaign) => {
      const totalImpressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0)
      const totalEngagements = campaign.analytics.reduce((sum, a) => sum + a.engagements, 0)
      const totalConversions = campaign.analytics.reduce((sum, a) => sum + a.conversions, 0)

      return {
        name: campaign.name,
        impressions: totalImpressions,
        engagements: totalEngagements,
        conversions: totalConversions,
      }
    })

    // Get campaign status distribution
    const campaignCounts = await prisma.campaign.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    })

    const statusDistribution = campaignCounts.map((item) => ({
      name: item.status,
      value: item._count.status,
    }))

    return NextResponse.json({
      performanceData,
      statusDistribution,
    })
  } catch (error) {
    console.error("Error fetching campaign analytics:", error)
    return NextResponse.json({ error: "Failed to fetch campaign analytics" }, { status: 500 })
  }
}
