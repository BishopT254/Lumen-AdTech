import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { deleteCache } from "@/lib/redis"

// Validation schema for device updates
const updateDeviceSchema = z.object({
  name: z.string().min(3, { message: "Device name must be at least 3 characters" }).optional(),
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
  location: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      address: z.string().min(5, { message: "Address must be at least 5 characters" }),
      area: z.string().min(3, { message: "Area name must be at least 3 characters" }),
    })
    .optional(),
  routeDetails: z
    .object({
      routeName: z.string().optional(),
      startPoint: z.string().optional(),
      endPoint: z.string().optional(),
      averageDailyPassengers: z.number().optional(),
    })
    .optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "MAINTENANCE"]).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

// GET handler for retrieving a specific device
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Get the device ID from the URL
    const deviceId = params.id

    // Fetch the device
    const device = await prisma.device.findUnique({
      where: {
        id: deviceId,
        partnerId: partner.id,
      },
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
            scheduledTime: true,
            actualDeliveryTime: true,
          },
        },
        availability: {
          take: 5,
          orderBy: { startTime: "desc" },
        },
        sustainabilityMetrics: {
          take: 1,
          orderBy: { date: "desc" },
        },
      },
    })

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Calculate total impressions from ad deliveries
    const totalImpressions = device.adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0)

    // Calculate estimated revenue based on impressions and partner commission rate
    const estimatedRevenue = calculateEstimatedRevenue(totalImpressions, partner.commissionRate)

    // Format the device data
    const formattedDevice = {
      id: device.id,
      name: device.name,
      deviceIdentifier: device.deviceIdentifier,
      deviceType: device.deviceType,
      location: device.location,
      routeDetails: device.routeDetails,
      status: device.status,
      lastActive: device.lastActive?.toISOString() || null,
      healthStatus: device.healthStatus,
      firmwareVersion: device.firmwareVersion || "1.0",
      capabilities: device.capabilities || {},
      configSettings: device.configSettings || {},
      maintenanceHistory: device.maintenanceHistory || [],
      impressions: device.impressions || totalImpressions,
      revenue: device.revenue || estimatedRevenue,
      analytics: {
        uptime: device.deviceAnalytics[0]?.uptime || 0,
        impressionsServed: device.deviceAnalytics[0]?.impressionsServed || 0,
        engagementsCount: device.deviceAnalytics[0]?.engagementsCount || 0,
        averageViewerCount: device.deviceAnalytics[0]?.averageViewerCount || 0,
        performanceMetrics: device.deviceAnalytics[0]?.performanceMetrics || { cpu: 0, memory: 0, network: 0 },
        energyConsumption: device.deviceAnalytics[0]?.energyConsumption || 0,
      },
      adDeliveries: device.adDeliveries.map((delivery) => ({
        impressions: delivery.impressions,
        engagements: delivery.engagements,
        completions: delivery.completions,
        viewerCount: delivery.viewerCount,
        status: delivery.status,
        scheduledTime: delivery.scheduledTime.toISOString(),
        actualDeliveryTime: delivery.actualDeliveryTime?.toISOString() || null,
      })),
      availability: device.availability.map((slot) => ({
        id: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        isBooked: slot.isBooked,
        pricing: slot.pricing,
      })),
      sustainability: device.sustainabilityMetrics[0]
        ? {
            energyUsage: device.sustainabilityMetrics[0].energyUsage,
            carbonFootprint: device.sustainabilityMetrics[0].carbonFootprint,
            date: device.sustainabilityMetrics[0].date.toISOString(),
          }
        : null,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    }

    return NextResponse.json(formattedDevice)
  } catch (error) {
    console.error("Error fetching device:", error)
    return NextResponse.json({ error: "Failed to fetch device" }, { status: 500 })
  }
}

// PUT handler for updating a device
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Get the device ID from the URL
    const deviceId = params.id

    // Check if the device exists and belongs to the partner
    const existingDevice = await prisma.device.findUnique({
      where: {
        id: deviceId,
        partnerId: partner.id,
      },
    })

    if (!existingDevice) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = updateDeviceSchema.parse(body)

    // Update the device
    const updatedDevice = await prisma.device.update({
      where: {
        id: deviceId,
      },
      data: {
        name: validatedData.name,
        deviceType: validatedData.deviceType,
        location: validatedData.location,
        routeDetails: validatedData.routeDetails,
        status: validatedData.status,
      },
    })

    // Clear cache for this partner's devices
    const cacheKey = `partner:devices:${partner.id}:*`
    await deleteCache(cacheKey)

    return NextResponse.json({
      id: updatedDevice.id,
      name: updatedDevice.name,
      deviceType: updatedDevice.deviceType,
      location: updatedDevice.location,
      routeDetails: updatedDevice.routeDetails,
      status: updatedDevice.status,
      healthStatus: updatedDevice.healthStatus,
      impressions: updatedDevice.impressions,
      revenue: updatedDevice.revenue,
      lastActive: updatedDevice.lastActive?.toISOString() || null,
      createdAt: updatedDevice.createdAt.toISOString(),
      updatedAt: updatedDevice.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error updating device:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
  }
}

// DELETE handler for removing a device
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Get the device ID from the URL
    const deviceId = params.id

    // Check if the device exists and belongs to the partner
    const existingDevice = await prisma.device.findUnique({
      where: {
        id: deviceId,
        partnerId: partner.id,
      },
    })

    if (!existingDevice) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Delete the device
    await prisma.device.delete({
      where: {
        id: deviceId,
      },
    })

    // Clear cache for this partner's devices
    const cacheKey = `partner:devices:${partner.id}:*`
    await deleteCache(cacheKey)

    return NextResponse.json({ success: true, message: "Device deleted successfully" })
  } catch (error) {
    console.error("Error deleting device:", error)
    return NextResponse.json({ error: "Failed to delete device" }, { status: 500 })
  }
}

// Helper function to calculate estimated revenue based on impressions and commission rate
function calculateEstimatedRevenue(impressions: number, commissionRate: number): number {
  // Simplified calculation: assume $5 CPM (cost per thousand impressions)
  const cpm = 5
  const totalRevenue = (impressions / 1000) * cpm

  // Apply partner commission rate
  return totalRevenue * Number(commissionRate)
}
