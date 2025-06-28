import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        date: "desc",
      },
      take: 100, // Limit to 100 records for performance
    })

    return NextResponse.json(deviceAnalytics)
  } catch (error) {
    console.error("Error fetching device analytics:", error)
    return NextResponse.json({ error: "Failed to fetch device analytics" }, { status: 500 })
  }
}
