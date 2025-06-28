import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper function to handle BigInt serialization
const serializeData = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => (typeof value === "bigint" ? Number(value) : value)))
}

export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") || "10")

    // Get recent activities from system config
    const recentActivities = await prisma.systemConfig.findUnique({
      where: { configKey: "RECENT_ACTIVITIES" },
    })

    let activities = []

    if (recentActivities && recentActivities.configValue) {
      // Parse activities and sort by timestamp (newest first)
      activities = Array.isArray(recentActivities.configValue) ? recentActivities.configValue : []

      activities.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Limit the number of activities returned
      activities = activities.slice(0, limit)
    }

    // If we don't have enough activities from the config, supplement with recent changes from the database
    if (activities.length < limit) {
      const recentCreatives = await prisma.adCreative.findMany({
        take: limit - activities.length,
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          campaign: {
            select: {
              advertiser: {
                select: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      // Convert to activity format
      const creativeActivities = recentCreatives.map((creative) => ({
        id: `creative-update-${creative.id}`,
        type:
          creative.status === "APPROVED"
            ? "CREATIVE_APPROVED"
            : creative.status === "REJECTED"
              ? "CREATIVE_REJECTED"
              : "CREATIVE_UPDATED",
        user: creative.campaign.advertiser.user.name || "Advertiser",
        targetId: creative.id,
        targetName: creative.name,
        details: `Creative "${creative.name}" was ${creative.status.toLowerCase().replace("_", " ")}`,
        timestamp: creative.updatedAt.toISOString(),
      }))

      // Merge and sort activities
      activities = [...activities, ...creativeActivities]
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    }

    return NextResponse.json(serializeData(activities))
  } catch (error) {
    console.error("Error fetching creative activity:", error)
    return NextResponse.json({ error: "Failed to fetch creative activity" }, { status: 500 })
  }
}

