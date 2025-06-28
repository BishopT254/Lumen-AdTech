import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

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
        date: "asc",
      },
    })

    // Get sustainability metrics
    const sustainabilityMetrics = await prisma.sustainabilityMetrics.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        device: deviceFilter,
      },
      orderBy: {
        date: "asc",
      },
    })

    // Generate CSV
    let csv =
      "Date,Device ID,Device Name,Device Type,Uptime (%),Impressions,Engagements,CPU (%),Memory (%),Network (%),Response Time (ms),Energy Usage (kWh),Carbon Footprint (kg CO2)\n"

    // Create a map of sustainability metrics by date and device
    const sustainabilityMap = new Map()
    sustainabilityMetrics.forEach((metric) => {
      const key = `${metric.date.toISOString()}_${metric.deviceId || "unknown"}`
      sustainabilityMap.set(key, {
        energyUsage: metric.energyUsage,
        carbonFootprint: metric.carbonFootprint,
      })
    })

    // Add data rows
    deviceAnalytics.forEach((analytics) => {
      const date = format(new Date(analytics.date), "yyyy-MM-dd")
      const deviceId = analytics.device.id
      const deviceName = analytics.device.name
      const deviceType = analytics.device.deviceType
      const uptime = analytics.uptime.toFixed(2)
      const impressions = analytics.impressionsServed
      const engagements = analytics.engagementsCount
      const cpu = analytics.performanceMetrics?.cpu?.toFixed(2) || "N/A"
      const memory = analytics.performanceMetrics?.memory?.toFixed(2) || "N/A"
      const network = analytics.performanceMetrics?.network?.toFixed(2) || "N/A"
      const responseTime = analytics.performanceMetrics?.responseTime?.toFixed(2) || "N/A"

      // Get sustainability data if available
      const sustainabilityKey = `${analytics.date.toISOString()}_${deviceId}`
      const sustainabilityData = sustainabilityMap.get(sustainabilityKey) || { energyUsage: 0, carbonFootprint: 0 }

      csv += `${date},${deviceId},${deviceName},${deviceType},${uptime},${impressions},${engagements},${cpu},${memory},${network},${responseTime},${sustainabilityData.energyUsage.toFixed(2)},${sustainabilityData.carbonFootprint.toFixed(2)}\n`
    })

    // Return the CSV as a downloadable file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="performance-data-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting performance data:", error)
    return NextResponse.json({ error: "Failed to export performance data" }, { status: 500 })
  }
}
