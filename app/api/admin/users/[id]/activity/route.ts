import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== "ADMIN") {
    return false
  }
  return true
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userId = params.userId

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch user activity logs
    const activityLogs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to the most recent 50 activities
    })

    // Fetch login history
    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 20, // Limit to the most recent 20 logins
    })

    // Combine activity logs and login history into a single timeline
    const combinedActivity = [
      ...activityLogs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        description: log.description,
        timestamp: log.createdAt,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        type: "activity",
      })),
      ...loginHistory.map((login) => ({
        id: login.id,
        userId: login.userId,
        action: login.status === "success" ? "USER_LOGIN" : "LOGIN_FAILED",
        description: login.status === "success" ? "User logged in successfully" : "Login attempt failed",
        timestamp: login.timestamp,
        ipAddress: login.ipAddress,
        userAgent: login.browser,
        metadata: {
          device: login.device,
          location: login.location,
          status: login.status,
        },
        type: "login",
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return NextResponse.json(combinedActivity)
  } catch (error) {
    console.error("Error fetching user activity:", error)
    return NextResponse.json(
      { error: "Failed to fetch user activity", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
