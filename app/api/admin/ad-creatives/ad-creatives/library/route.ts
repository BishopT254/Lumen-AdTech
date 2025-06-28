import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || undefined
    const status = searchParams.get("status") || undefined
    const category = searchParams.get("category") || undefined
    const tag = searchParams.get("tag") || undefined
    const featured = searchParams.get("featured") === "true" ? true : undefined
    const template = searchParams.get("template") === "true" ? true : undefined
    const collectionId = searchParams.get("collectionId") || undefined
    const search = searchParams.get("search") || undefined
    const sortBy = searchParams.get("sortBy") || "newest"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

    // Build filter
    const filter: any = {}

    if (type) {
      filter.type = type
    }

    if (status) {
      filter.status = status
    }

    if (category) {
      filter.category = category
    }

    if (featured !== undefined) {
      filter.isFeatured = featured
    }

    if (template !== undefined) {
      filter.isTemplate = template
    }

    if (search) {
      filter.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { headline: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Handle tag filtering
    if (tag) {
      filter.tags = {
        has: tag,
      }
    }

    // Handle collection filtering
    if (collectionId) {
      // This would require a join with a collections table
      // For now, we'll skip this filter in the example
    }

    // Determine sort order
    let orderBy: any = {}
    switch (sortBy) {
      case "newest":
        orderBy = { createdAt: "desc" }
        break
      case "oldest":
        orderBy = { createdAt: "asc" }
        break
      case "name_asc":
        orderBy = { name: "asc" }
        break
      case "name_desc":
        orderBy = { name: "desc" }
        break
      case "most_used":
        orderBy = { usageCount: "desc" }
        break
      case "recently_used":
        orderBy = { lastUsed: "desc" }
        break
      default:
        orderBy = { createdAt: "desc" }
    }

    // Fetch creatives with pagination
    const creatives = await prisma.adCreative.findMany({
      where: filter,
      include: {
        campaign: {
          include: {
            advertiser: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // Count total creatives for pagination
    const totalCreatives = await prisma.adCreative.count({
      where: filter,
    })

    // Return creatives with pagination metadata
    return NextResponse.json({
      creatives,
      pagination: {
        page,
        limit,
        totalItems: totalCreatives,
        totalPages: Math.ceil(totalCreatives / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching ad creatives library:", error)
    return NextResponse.json({ error: "Failed to fetch ad creatives library" }, { status: 500 })
  }
}
