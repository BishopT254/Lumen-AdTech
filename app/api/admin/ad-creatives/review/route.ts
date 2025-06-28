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
    const { id, action, rejectionReason } = data

    if (!id || !action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    if (action === "reject" && !rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    // Check if ad creative exists
    const existingCreative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            advertiser: {
              select: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!existingCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 })
    }

    // Update ad creative status based on action
    const updatedCreative = await prisma.adCreative.update({
      where: { id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        isApproved: action === "approve",
        rejectionReason: action === "reject" ? rejectionReason : null,
      },
    })

    // Log the review action
    const activityData = {
      id: `creative-review-${Date.now()}`,
      type: action === "approve" ? "CREATIVE_APPROVED" : "CREATIVE_REJECTED",
      user: session.user.name || session.user.email,
      userId: user.id,
      targetId: id,
      targetName: existingCreative.name,
      details:
        action === "approve"
          ? `Creative "${existingCreative.name}" was approved`
          : `Creative "${existingCreative.name}" was rejected: ${rejectionReason}`,
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

    // TODO: Send notification to advertiser about the review result
    // This would typically be handled by a notification service

    return NextResponse.json(
      serializeData({
        success: true,
        action,
        creative: updatedCreative,
      }),
    )
  } catch (error) {
    console.error("Error reviewing ad creative:", error)
    return NextResponse.json({ error: "Failed to review ad creative" }, { status: 500 })
  }
}

