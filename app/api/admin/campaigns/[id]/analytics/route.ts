import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"

// GET handler for fetching campaign analytics
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get("timeRange") || "7d" // Default to 7 days

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Calculate date range based on timeRange parameter
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "30d":
        startDate = subDays(now, 30)
        break
      case "90d":
        startDate = subDays(now, 90)
        break
      case "7d":
      default:
        startDate = subDays(now, 7)
        break
    }

    // Fetch analytics data for the specified time range
    const analyticsData = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error("Error fetching campaign analytics:", error)
    return NextResponse.json({ error: "Failed to fetch campaign analytics" }, { status: 500 })
  }
}
