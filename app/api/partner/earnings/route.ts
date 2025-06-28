import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"

// Cache TTL in seconds (2 minutes)
const CACHE_TTL = 120

/**
 * GET: Fetch partner earnings with pagination and filters
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
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
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const status = url.searchParams.get("status") || undefined
    const startDate = url.searchParams.get("startDate") || undefined
    const endDate = url.searchParams.get("endDate") || undefined
    const search = url.searchParams.get("search") || undefined

    // Validate pagination parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 })
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 })
    }

    // Calculate offset
    const skip = (page - 1) * limit

    // Try to get from cache first
    const cacheKey = `partner:earnings:${userId}:${page}:${limit}:${status || "all"}:${startDate || "none"}:${endDate || "none"}:${search || "none"}`
    const cachedEarnings = await getCache(cacheKey)

    if (cachedEarnings) {
      return NextResponse.json(cachedEarnings)
    }

    // Get partner from database
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Build filter conditions
    const whereConditions: any = {
      partnerId: partner.id,
    }

    if (status) {
      whereConditions.status = status
    }

    if (startDate) {
      whereConditions.periodStart = {
        ...(whereConditions.periodStart || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      whereConditions.periodEnd = {
        ...(whereConditions.periodEnd || {}),
        lte: new Date(endDate),
      }
    }

    if (search) {
      whereConditions.OR = [
        { transactionId: { contains: search, mode: "insensitive" } },
        { details: { path: ["deviceBreakdown"], string_contains: search } },
        { details: { path: ["campaignBreakdown"], string_contains: search } },
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.partnerEarning.count({
      where: whereConditions,
    })

    // Get earnings with pagination
    const earnings = await prisma.partnerEarning.findMany({
      where: whereConditions,
      orderBy: {
        periodEnd: "desc",
      },
      skip,
      take: limit,
    })

    // Format earnings for response
    const formattedEarnings = earnings.map((earning) => ({
      id: earning.id,
      periodStart: earning.periodStart.toISOString(),
      periodEnd: earning.periodEnd.toISOString(),
      totalImpressions: earning.totalImpressions,
      totalEngagements: earning.totalEngagements,
      amount: earning.amount,
      status: earning.status,
      paidDate: earning.paidDate ? earning.paidDate.toISOString() : undefined,
      transactionId: earning.transactionId,
      currency: earning.currency,
      details: earning.details,
      createdAt: earning.createdAt.toISOString(),
      updatedAt: earning.updatedAt.toISOString(),
    }))

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)

    const response = {
      data: formattedEarnings,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: totalPages,
      },
    }

    // Cache the response
    await setCache(cacheKey, response, CACHE_TTL)

    // Return the earnings
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching earnings:", error)
    return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 500 })
  }
}
