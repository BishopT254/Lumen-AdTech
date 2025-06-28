import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper function to handle BigInt serialization
const serializeData = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => (typeof value === "bigint" ? Number(value) : value)))
}

export async function POST(request: Request) {
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

    const data = await request.json()
    const { ids, action, rejectionReason } = data

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !action) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required for bulk rejection" }, { status: 400 })
    }

    let updateData: any = {}

    // Set update data based on action
    switch (action) {
      case "approve":
        updateData = {
          status: "APPROVED",
          isApproved: true,
        }
        break
      case "reject":
        updateData = {
          status: "REJECTED",
          isApproved: false,
          rejectionReason,
        }
        break
      case "archive":
        updateData = {
          status: "ARCHIVED",
        }
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Update all selected ad creatives
    const updateResult = await prisma.adCreative.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: updateData,
    })

    // Log the bulk action
    const activityData = {
      id: `bulk-creative-${action}-${Date.now()}`,
      type: `BULK_CREATIVE_${action.toUpperCase()}`,
      user: session.user.name || session.user.email,
      userId: user.id,
      targetCount: ids.length,
      details: `Bulk ${action} performed on ${ids.length} creatives`,
      timestamp: new Date().toISOString(),
    }

    // Get existing activities or create new array
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "RECENT_ACTIVITIES" },
    })

    let activities = []
    if (existingConfig && existingConfig.configValue) {
      activities = Array.isArray(existingConfig.configValue) ? existingConfig.configValue : []
    }

    // Add new activity and limit to 100 most recent
    activities = [activityData, ...activities].slice(0, 100)

    // Update system config with new activities
    await prisma.systemConfig.upsert({
      where: { configKey: "RECENT_ACTIVITIES" },
      update: {
        configValue: activities,
      },
      create: {
        configKey: "RECENT_ACTIVITIES",
        configValue: activities,
        description: "Recent system activities",
      },
    })

    return NextResponse.json(
      serializeData({
        success: true,
        action,
        count: updateResult.count,
      }),
    )
  } catch (error) {
    console.error("Error performing bulk action on ad creatives:", error)
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 })
  }
}

