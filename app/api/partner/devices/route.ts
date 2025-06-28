import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getCache, setCache, deleteCache } from "@/lib/redis"

// Cache TTL in seconds (2 minutes)
const CACHE_TTL = 120

// Validation schema for query parameters
const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val) : 10)),
  search: z.string().optional(),
  deviceType: z
    .enum([
      "ANDROID_TV",
      "DIGITAL_SIGNAGE",
      "INTERACTIVE_KIOSK",
      "VEHICLE_MOUNTED",
      "RETAIL_DISPLAY",
      "BUS",
      "TRAM",
      "TRAIN",
      "METRO",
      "OTHER",
    ])
    .optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "MAINTENANCE"]).optional(),
  healthStatus: z.enum(["UNKNOWN", "HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

// Validation schema for device creation
const createDeviceSchema = z.object({
  name: z.string().min(3, { message: "Device name must be at least 3 characters" }),
  deviceType: z.enum([
    "ANDROID_TV",
    "DIGITAL_SIGNAGE",
    "INTERACTIVE_KIOSK",
    "VEHICLE_MOUNTED",
    "RETAIL_DISPLAY",
    "BUS",
    "TRAM",
    "TRAIN",
    "METRO",
    "OTHER",
  ]),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().min(5, { message: "Address must be at least 5 characters" }),
    area: z.string().min(3, { message: "Area name must be at least 3 characters" }),
  }),
  routeDetails: z
    .object({
      routeName: z.string().optional(),
      startPoint: z.string().optional(),
      endPoint: z.string().optional(),
      averageDailyPassengers: z.number().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  autoActivate: z.boolean().optional().default(true),
})

// GET handler for retrieving partner devices
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

    // Parse and validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams)
    const validatedQuery = querySchema.parse(queryParams)

    const { page, limit, search, deviceType, status, healthStatus, sortBy, sortOrder } = validatedQuery

    // Check if this is a request from the dashboard (limit=4)
    const isDashboardRequest = limit === 4

    // Check if we should use cache
    const shouldUseCache = !search && page === 1 && limit <= 10
    const cacheKey = `partner:devices:${partner.id}:${limit}:${isDashboardRequest ? "dashboard" : "full"}`

    if (shouldUseCache) {
      const cachedData = await getCache(cacheKey)
      if (cachedData) {
        return NextResponse.json(cachedData)
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {
      partnerId: partner.id,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { deviceIdentifier: { contains: search, mode: "insensitive" } },
        { location: { path: ["address"], string_contains: search } },
      ]
    }

    if (deviceType) {
      where.deviceType = deviceType
    }

    if (status) {
      where.status = status
    }

    if (healthStatus) {
      where.healthStatus = healthStatus
    }

    // Determine sort field
    let orderBy: any = { createdAt: sortOrder }
    if (sortBy) {
      if (sortBy === "name") {
        orderBy = { name: sortOrder }
      } else if (sortBy === "status") {
        orderBy = { status: sortOrder }
      } else if (sortBy === "healthStatus") {
        orderBy = { healthStatus: sortOrder }
      } else if (sortBy === "lastActive") {
        orderBy = { lastActive: sortOrder }
      } else if (sortBy === "impressions") {
        orderBy = { impressions: sortOrder }
      } else if (sortBy === "revenue") {
        orderBy = { revenue: sortOrder }
      }
    }

    // Fetch devices with pagination
    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          deviceAnalytics: {
            orderBy: { date: "desc" },
            take: 1,
          },
          adDeliveries: {
            take: 10,
            orderBy: { scheduledTime: "desc" },
            select: {
              impressions: true,
              engagements: true,
              completions: true,
              viewerCount: true,
              status: true,
            },
          },
        },
      }),
      prisma.device.count({ where }),
    ])

    // Format device data for response
    const formattedDevices = devices.map((device) => {
      const latestAnalytics = device.deviceAnalytics[0] || null

      // Calculate total impressions from ad deliveries
      const totalImpressions = device.adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0)

      // Calculate estimated revenue based on impressions and partner commission rate
      // This is a simplified calculation - in a real app, you'd use actual revenue data
      const estimatedRevenue = calculateEstimatedRevenue(totalImpressions, partner.commissionRate)

      return {
        id: device.id,
        name: device.name,
        deviceIdentifier: device.deviceIdentifier,
        deviceType: device.deviceType,
        location: device.location as any,
        routeDetails: device.routeDetails as any,
        status: device.status,
        lastActive: device.lastActive?.toISOString() || null,
        healthStatus: device.healthStatus,
        firmwareVersion: device.firmwareVersion || "1.0",
        uptime: latestAnalytics?.uptime || 0,
        impressions: device.impressions || totalImpressions,
        revenue: device.revenue || estimatedRevenue,
        engagementsCount:
          latestAnalytics?.engagementsCount ||
          device.adDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0),
        averageViewerCount: latestAnalytics?.averageViewerCount || calculateAverageViewerCount(device.adDeliveries),
        performanceMetrics: latestAnalytics?.performanceMetrics || { cpu: 0, memory: 0, network: 0 },
        energyConsumption: latestAnalytics?.energyConsumption || 0,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString(),
        partnerId: device.partnerId,
      }
    })

    // Create response object with pagination info
    const response = {
      devices: formattedDevices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache the response
    if (shouldUseCache) {
      if (isDashboardRequest) {
        // For dashboard requests, cache the devices array directly
        await setCache(cacheKey, formattedDevices, CACHE_TTL)
      } else {
        // For other requests, cache the full response object
        await setCache(cacheKey, response, CACHE_TTL)
      }
    }

    // Return appropriate response format based on the request
    if (isDashboardRequest) {
      // For dashboard requests, return the devices array directly
      return NextResponse.json(formattedDevices)
    } else {
      // For other requests, return the full response object
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error("Error fetching partner devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
  }
}

// POST handler for creating a new device
export async function POST(req: NextRequest) {
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

    // Parse and validate request body
    const body = await req.json()
    const validatedData = createDeviceSchema.parse(body)

    // Generate a unique device identifier
    const deviceIdentifier = generateDeviceIdentifier()

    // Create the device
    const device = await prisma.device.create({
      data: {
        name: validatedData.name,
        deviceIdentifier,
        deviceType: validatedData.deviceType,
        location: validatedData.location,
        routeDetails: validatedData.routeDetails || null,
        status: validatedData.autoActivate ? "ACTIVE" : "PENDING",
        healthStatus: "UNKNOWN",
        partnerId: partner.id,
        impressions: 0,
        revenue: 0,
      },
    })

    // Create initial device analytics entry
    await prisma.deviceAnalytics.create({
      data: {
        deviceId: device.id,
        date: new Date(),
        uptime: 0,
        impressionsServed: 0,
        engagementsCount: 0,
        averageViewerCount: 0,
        performanceMetrics: { cpu: 0, memory: 0, network: 0 },
        energyConsumption: 0,
      },
    })

    // Clear cache for this partner's devices
    const cacheKey = `partner:devices:${partner.id}:*`
    await deleteCache(cacheKey)

    return NextResponse.json({
      id: device.id,
      name: device.name,
      deviceIdentifier: device.deviceIdentifier,
      deviceType: device.deviceType,
      location: device.location,
      routeDetails: device.routeDetails,
      status: device.status,
      healthStatus: device.healthStatus,
      impressions: 0,
      revenue: 0,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error creating device:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
  }
}

// Helper function to generate a unique device identifier
function generateDeviceIdentifier(): string {
  const prefix = "LUMEN"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Helper function to calculate estimated revenue based on impressions and commission rate
function calculateEstimatedRevenue(impressions: number, commissionRate: number): number {
  // Simplified calculation: assume $5 CPM (cost per thousand impressions)
  const cpm = 5
  const totalRevenue = (impressions / 1000) * cpm

  // Apply partner commission rate
  return totalRevenue * Number(commissionRate)
}

// Helper function to calculate average viewer count from ad deliveries
function calculateAverageViewerCount(adDeliveries: { viewerCount: number | null }[]): number {
  if (adDeliveries.length === 0) return 0

  const deliveriesWithViewers = adDeliveries.filter((delivery) => delivery.viewerCount !== null)
  if (deliveriesWithViewers.length === 0) return 0

  const totalViewers = deliveriesWithViewers.reduce((sum, delivery) => sum + (delivery.viewerCount || 0), 0)
  return totalViewers / deliveriesWithViewers.length
}
