import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total tests count
    const totalTests = await prisma.aBTest.count()

    // Get tests by status
    const testsByStatus = await prisma.aBTest.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Convert to a more usable format
    const statusCounts: Record<string, number> = {}
    testsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id
    })

    // Get active tests count
    const activeTests = statusCounts["ACTIVE"] || 0

    // Get completed tests count
    const completedTests = statusCounts["COMPLETED"] || 0

    // Get total impressions, engagements, and calculate conversion rate
    const variants = await prisma.aBTestVariant.findMany({
      select: {
        impressions: true,
        engagements: true,
        conversions: true,
      },
    })

    const totalImpressions = variants.reduce((sum, variant) => sum + variant.impressions, 0)

    const totalEngagements = variants.reduce((sum, variant) => sum + variant.engagements, 0)

    const totalConversions = variants.reduce((sum, variant) => sum + variant.conversions, 0)

    // Calculate average conversion rate
    const averageConversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0

    return NextResponse.json({
      totalTests,
      activeTests,
      completedTests,
      totalImpressions,
      totalEngagements,
      averageConversionRate,
      testsByStatus: statusCounts,
    })
  } catch (error) {
    console.error("Error fetching AB test metrics:", error)
    return NextResponse.json({ error: "Failed to fetch AB test metrics" }, { status: 500 })
  }
}

