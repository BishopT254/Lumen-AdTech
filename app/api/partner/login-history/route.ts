import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch partner login history
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Check if user is a partner
    if (userRole !== "PARTNER") {
      return NextResponse.json({ error: "Access denied. Only partners can access this resource." }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(req.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "10", 10)
    const page = Number.parseInt(url.searchParams.get("page") || "1", 10)
    const skip = (page - 1) * limit

    // Try to get from cache first
    const cacheKey = `partner:login-history:${userId}:${limit}:${page}`
    const cachedHistory = await getCache(cacheKey)

    if (cachedHistory) {
      return NextResponse.json(cachedHistory)
    }

    // Get login history from database
    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    })

    // Get total count for pagination
    const totalCount = await prisma.loginHistory.count({
      where: { userId },
    })

    // Format the response
    const formattedHistory = loginHistory.map((login) => ({
      id: login.id,
      ipAddress: login.ipAddress,
      device: login.device,
      browser: login.browser,
      location: login.location,
      timestamp: login.timestamp.toISOString(),
      status: login.status,
    }))

    const response = {
      data: formattedHistory,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    }

    // Cache the response
    await setCache(cacheKey, response, CACHE_TTL)

    // Return the login history
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching login history:", error)
    return NextResponse.json({ error: "Failed to fetch login history" }, { status: 500 })
  }
}
