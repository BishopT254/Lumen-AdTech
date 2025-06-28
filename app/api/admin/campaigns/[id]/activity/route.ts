import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET handler for fetching campaign activity logs
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Fetch activity logs related to this campaign
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        metadata: {
          path: ["campaignId"],
          equals: campaignId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transform the data to match the expected format
    const formattedLogs = activityLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      description: log.description,
      timestamp: log.createdAt.toISOString(),
      user: log.user,
    }))

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error("Error fetching campaign activity:", error)
    return NextResponse.json({ error: "Failed to fetch campaign activity" }, { status: 500 })
  }
}
