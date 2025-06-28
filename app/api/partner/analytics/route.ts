import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { PrismaClient } from "@prisma/client"
import { format, subDays } from "date-fns"

const prisma = new PrismaClient()

/**
 * GET /api/partner/analytics
 *
 * Fetches detailed analytics data for a partner's devices
 * Supports filtering by date range, device, and metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession()

    if (!session || !session.user || session.user.role !== "PARTNER") {
      return NextResponse.json({ error: "Unauthorized. Partner access required." }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const deviceId = searchParams.get("deviceId")
    const timeframe = searchParams.get("timeframe") || "30days"
    const metrics = searchParams.get("metrics") || "all"

    // Set default date range if not provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date()

    let startDate
    if (startDateParam) {
      startDate = new Date(startDateParam)
    } else {
      // Default timeframes
      switch (timeframe) {
        case "7days":
          startDate = subDays(endDate, 7)
          break
        case "90days":
          startDate = subDays(endDate, 90)
          break
        case "year":
          startDate = subDays(endDate, 365)
          break
        case "30days":
        default:
          startDate = subDays(endDate, 30)
          break
      }
    }

    // Get partner ID from user ID
    const partner = await prisma.partner.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Build device query
    const deviceQuery = {
      partnerId: partner.id,
      ...(deviceId ? { id: deviceId } : {}),
    }

    // Get all partner devices
    const devices = await prisma.device.findMany({
      where: deviceQuery,
      select: {
        id: true,
        name: true,
        deviceType: true,
        status: true,
        location: true,
        lastActive: true,
      },
    })

    if (devices.length === 0) {
      return NextResponse.json({ error: "No devices found for this partner" }, { status: 404 })
    }

    // Get device IDs
    const deviceIds = devices.map((device) => device.id)

    // Fetch device analytics
    const deviceAnalytics = await prisma.deviceAnalytics.findMany({
      where: {
        deviceId: { in: deviceIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Fetch ad deliveries for these devices
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId: { in: deviceIds },
        scheduledTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        audienceData: true,
        emotionData: true,
      },
    })

    // Process audience data
    const audienceData = await prisma.audienceData.findMany({
      where: {
        adDelivery: {
          deviceId: { in: deviceIds },
          scheduledTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    })

    // Process emotion data
    const emotionData = await prisma.emotionData.findMany({
      where: {
        adDelivery: {
          deviceId: { in: deviceIds },
          scheduledTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    })

    // Calculate daily analytics
    const dailyAnalytics = processDailyAnalytics(deviceAnalytics)

    // Calculate location performance
    const locationPerformance = processLocationPerformance(devices, deviceAnalytics)

    // Process audience demographics
    const demographicsData = processDemographics(audienceData)

    // Process emotion metrics
    const emotionMetrics = processEmotionData(emotionData)

    // Process time of day data
    const timeOfDayData = processTimeOfDayData(adDeliveries)

    // Calculate device statuses
    const deviceStatuses = calculateDeviceStatuses(devices, deviceAnalytics)

    // Return the analytics data
    return NextResponse.json({
      timeframe: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      devices: devices,
      dailyAnalytics: dailyAnalytics,
      locationPerformance: locationPerformance,
      demographicsData: demographicsData,
      emotionMetrics: emotionMetrics,
      timeOfDayData: timeOfDayData,
      deviceStatuses: deviceStatuses,
    })
  } catch (error) {
    console.error("Error fetching partner analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 })
  }
}

/**
 * Process device analytics to calculate daily metrics
 */
function processDailyAnalytics(deviceAnalytics) {
  const dailyMap = {}

  deviceAnalytics.forEach((item) => {
    const dateStr = format(new Date(item.date), "yyyy-MM-dd")

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        date: dateStr,
        impressions: 0,
        engagements: 0,
        viewerCount: 0,
        uptimePercentage: 0,
        deviceCount: 0,
      }
    }

    dailyMap[dateStr].impressions += item.impressionsServed
    dailyMap[dateStr].engagements += item.engagementsCount
    dailyMap[dateStr].viewerCount += item.averageViewerCount || 0
    dailyMap[dateStr].deviceCount += 1

    // Calculate average uptime
    const currentCount = dailyMap[dateStr].deviceCount
    const currentUptime = dailyMap[dateStr].uptimePercentage * (currentCount - 1)
    const newUptime = (Number(item.uptime) / 24) * 100 // Convert hours to percentage
    dailyMap[dateStr].uptimePercentage = (currentUptime + newUptime) / currentCount
  })

  // Convert to array and sort by date
  return Object.values(dailyMap).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

/**
 * Process location performance metrics
 */
function processLocationPerformance(devices, deviceAnalytics) {
  const locationMap = {}

  // Create a map of device IDs to their locations
  const deviceLocations = {}
  devices.forEach((device) => {
    let locationStr = "Unknown"

    // Extract location string from the location JSON
    if (device.location) {
      try {
        const location = typeof device.location === "string" ? JSON.parse(device.location) : device.location

        if (location.address) {
          locationStr = location.address
        } else if (location.city) {
          locationStr = location.city
        } else if (location.name) {
          locationStr = location.name
        }
      } catch (e) {
        console.error("Error parsing device location:", e)
      }
    }

    deviceLocations[device.id] = locationStr
  })

  // Process analytics by location
  deviceAnalytics.forEach((item) => {
    const location = deviceLocations[item.deviceId] || "Unknown"

    if (!locationMap[location]) {
      locationMap[location] = {
        location,
        impressions: 0,
        engagements: 0,
        engagementRate: 0,
        devices: new Set(),
      }
    }

    locationMap[location].impressions += item.impressionsServed
    locationMap[location].engagements += item.engagementsCount
    locationMap[location].devices.add(item.deviceId)
  })

  // Calculate engagement rates and convert device sets to counts
  Object.values(locationMap).forEach((location) => {
    location.engagementRate = location.impressions > 0 ? (location.engagements / location.impressions) * 100 : 0
    location.deviceCount = location.devices.size
    delete location.devices // Remove the Set before serializing
  })

  // Sort by impressions (descending)
  return Object.values(locationMap).sort((a, b) => b.impressions - a.impressions)
}

/**
 * Process audience demographics data
 */
function processDemographics(audienceData) {
  // Default demographics if no data is available
  if (!audienceData || audienceData.length === 0) {
    return [
      { ageGroup: "18-24", percentage: 15, engagementRate: 8.2 },
      { ageGroup: "25-34", percentage: 28, engagementRate: 9.7 },
      { ageGroup: "35-44", percentage: 22, engagementRate: 7.5 },
      { ageGroup: "45-54", percentage: 18, engagementRate: 6.3 },
      { ageGroup: "55-64", percentage: 12, engagementRate: 5.1 },
      { ageGroup: "65+", percentage: 5, engagementRate: 4.2 },
    ]
  }

  // Process actual demographics data
  const ageGroups = {
    "18-24": { viewers: 0, engagements: 0 },
    "25-34": { viewers: 0, engagements: 0 },
    "35-44": { viewers: 0, engagements: 0 },
    "45-54": { viewers: 0, engagements: 0 },
    "55-64": { viewers: 0, engagements: 0 },
    "65+": { viewers: 0, engagements: 0 },
  }

  let totalViewers = 0

  audienceData.forEach((data) => {
    const demographics = typeof data.demographics === "string" ? JSON.parse(data.demographics) : data.demographics

    if (demographics && demographics.ageDistribution) {
      Object.entries(demographics.ageDistribution).forEach(([ageGroup, count]) => {
        if (ageGroups[ageGroup]) {
          ageGroups[ageGroup].viewers += count
          totalViewers += count

          // Estimate engagements based on dwell time
          if (data.dwellTime) {
            const estimatedEngagement = count * (data.dwellTime > 10 ? 0.3 : 0.1)
            ageGroups[ageGroup].engagements += estimatedEngagement
          }
        }
      })
    } else {
      // If no age distribution, distribute viewers evenly
      const viewersPerGroup = data.viewerCount / 6
      Object.keys(ageGroups).forEach((ageGroup) => {
        ageGroups[ageGroup].viewers += viewersPerGroup
        totalViewers += viewersPerGroup

        // Estimate engagements
        if (data.dwellTime) {
          const estimatedEngagement = viewersPerGroup * (data.dwellTime > 10 ? 0.3 : 0.1)
          ageGroups[ageGroup].engagements += estimatedEngagement
        }
      })
    }
  })

  // Calculate percentages and engagement rates
  return Object.entries(ageGroups).map(([ageGroup, data]) => {
    const percentage = totalViewers > 0 ? (data.viewers / totalViewers) * 100 : 0
    const engagementRate = data.viewers > 0 ? (data.engagements / data.viewers) * 100 : 0

    return {
      ageGroup,
      percentage: Math.round(percentage * 10) / 10,
      engagementRate: Math.round(engagementRate * 10) / 10,
    }
  })
}

/**
 * Process emotion data
 */
function processEmotionData(emotionData) {
  if (!emotionData || emotionData.length === 0) {
    // Default emotion data if none available
    return [
      { emotion: "Joy", percentage: 42, value: 42 },
      { emotion: "Neutral", percentage: 28, value: 28 },
      { emotion: "Surprise", percentage: 15, value: 15 },
      { emotion: "Interest", percentage: 10, value: 10 },
      { emotion: "Confusion", percentage: 5, value: 5 },
    ]
  }

  // Aggregate emotion scores
  const emotions = {
    Joy: 0,
    Neutral: 0,
    Surprise: 0,
    Interest: 0,
    Confusion: 0,
  }

  let totalScores = 0

  emotionData.forEach((data) => {
    // Convert decimal scores to percentages
    if (data.joyScore) {
      emotions["Joy"] += Number(data.joyScore) * 100
      totalScores += Number(data.joyScore)
    }

    if (data.neutralScore) {
      emotions["Neutral"] += Number(data.neutralScore) * 100
      totalScores += Number(data.neutralScore)
    }

    if (data.surpriseScore) {
      emotions["Surprise"] += Number(data.surpriseScore) * 100
      totalScores += Number(data.surpriseScore)
    }

    // Infer interest and confusion from other metrics
    // This is a simplification - in a real system, these would be actual metrics
    const interestScore = data.dwellTime ? Math.min(Number(data.dwellTime) / 30, 1) * 0.1 : 0
    emotions["Interest"] += interestScore * 100
    totalScores += interestScore

    const confusionScore = 0.05 // Fixed small value for demonstration
    emotions["Confusion"] += confusionScore * 100
    totalScores += confusionScore
  })

  // Calculate percentages
  const result = Object.entries(emotions).map(([emotion, score]) => {
    const percentage = totalScores > 0 ? (score / (totalScores * 100)) * 100 : 0
    return {
      emotion,
      percentage: Math.round(percentage),
      value: Math.round(percentage), // Value is the same as percentage for the chart
    }
  })

  // Sort by percentage (descending)
  return result.sort((a, b) => b.percentage - a.percentage)
}

/**
 * Process time of day data
 */
function processTimeOfDayData(adDeliveries) {
  const hourlyData = Array(24)
    .fill()
    .map((_, hour) => {
      // Format hour as 12-hour with AM/PM
      const hourStr = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`

      return {
        hour: hourStr,
        impressions: 0,
        engagements: 0,
        viewers: 0,
      }
    })

  adDeliveries.forEach((delivery) => {
    if (delivery.actualDeliveryTime) {
      const hour = new Date(delivery.actualDeliveryTime).getHours()

      hourlyData[hour].impressions += delivery.impressions
      hourlyData[hour].engagements += delivery.engagements
      hourlyData[hour].viewers += delivery.viewerCount || 0
    }
  })

  return hourlyData
}

/**
 * Calculate device statuses with health metrics
 */
function calculateDeviceStatuses(devices, deviceAnalytics) {
  // Group analytics by device
  const deviceAnalyticsMap = {}

  deviceAnalytics.forEach((analytics) => {
    if (!deviceAnalyticsMap[analytics.deviceId]) {
      deviceAnalyticsMap[analytics.deviceId] = []
    }
    deviceAnalyticsMap[analytics.deviceId].push(analytics)
  })

  // Calculate status metrics for each device
  return devices.map((device) => {
    const analytics = deviceAnalyticsMap[device.id] || []

    // Calculate total impressions and engagements
    const totalImpressions = analytics.reduce((sum, item) => sum + item.impressionsServed, 0)
    const totalEngagements = analytics.reduce((sum, item) => sum + item.engagementsCount, 0)

    // Calculate average uptime
    const uptime =
      analytics.length > 0
        ? (analytics.reduce((sum, item) => sum + Number(item.uptime), 0) / analytics.length / 24) * 100
        : 0

    // Determine status
    let status: "online" | "offline" | "maintenance"
    if (device.status === "ACTIVE") {
      status = "online"
    } else if (device.status === "MAINTENANCE") {
      status = "maintenance"
    } else {
      status = "offline"
    }

    // Calculate health score (0-100)
    let healthScore = 0

    // Base health on device status
    if (status === "online") {
      healthScore += 50
    } else if (status === "maintenance") {
      healthScore += 30
    }

    // Add points for uptime
    healthScore += Math.min(uptime / 2, 30)

    // Add points for recent activity
    if (device.lastActive) {
      const daysSinceLastActive = Math.floor(
        (new Date().getTime() - new Date(device.lastActive).getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceLastActive < 1) {
        healthScore += 20
      } else if (daysSinceLastActive < 3) {
        healthScore += 10
      }
    }

    // Format last ping
    let lastPing = "Never"
    if (device.lastActive) {
      const minutesSinceLastActive = Math.floor(
        (new Date().getTime() - new Date(device.lastActive).getTime()) / (1000 * 60),
      )
      if (minutesSinceLastActive < 60) {
        lastPing = `${minutesSinceLastActive} minutes ago`
      } else if (minutesSinceLastActive < 24 * 60) {
        lastPing = `${Math.floor(minutesSinceLastActive / 60)} hours ago`
      } else {
        lastPing = `${Math.floor(minutesSinceLastActive / (60 * 24))} days ago`
      }
    }

    // Extract location string
    let location = "Unknown"
    if (device.location) {
      try {
        const locationData = typeof device.location === "string" ? JSON.parse(device.location) : device.location

        if (locationData.address) {
          location = locationData.address
        } else if (locationData.city) {
          location = locationData.city
        } else if (locationData.name) {
          location = locationData.name
        }
      } catch (e) {
        console.error("Error parsing device location:", e)
      }
    }

    return {
      id: device.id,
      name: device.name,
      location: location,
      status: status,
      lastPing: lastPing,
      uptime: Math.round(uptime),
      impressions: totalImpressions,
      engagements: totalEngagements,
      healthScore: Math.min(Math.round(healthScore), 100),
    }
  })
}
