import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET handler for fetching all campaign activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10)

    // Fetch campaign-related activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        action: {
          startsWith: "CAMPAIGN_",
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
      take: limit,
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

     
