import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import type { CreativeType } from "@prisma/client"

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
    const type = searchParams.get("type") as CreativeType | null
    const searchTerm = searchParams.get("search") || ""
    const page = Number(searchParams.get("page") || "1")
    const pageSize = Number(searchParams.get("pageSize") || "20")

    // Build filter conditions
    const whereClause: any = {
      status: "APPROVED", // Only include approved creatives in the library
    }

    // Filter by type
    if (type) {
      whereClause.type = type
    }

    // Search term filter
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { headline: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ]
    }

    // Fetch library creatives with pagination
    const libraryCreatives = await prisma.adCreative.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        content: true,
        format: true,
        previewImage: true,
        headline: true,
        description: true,
        callToAction: true,
        createdAt: true,
        campaign: {
          select: {
            name: true,
            advertiser: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get total count for pagination
    const totalCreatives = await prisma.adCreative.count({
      where: whereClause,
    })

    // Get counts by type for filtering
    const typeCounts = await prisma.adCreative.groupBy({
      by: ["type"],
      where: {
        status: "APPROVED",
      },
      _count: {
        id: true,
      },
    })

    // Format type counts to match the expected format in the frontend
    const formattedTypeCounts = typeCounts.reduce(
      (acc, item) => {
        acc[item.type] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    return NextResponse.json(
      serializeData({
        libraryCreatives,
        pagination: {
          total: totalCreatives,
          page,
          pageSize,
          pages: Math.ceil(totalCreatives / pageSize),
        },
        typeCounts: formattedTypeCounts,
      }),
    )
  } catch (error) {
    console.error("Error fetching creative library:", error)
    return NextResponse.json({ error: "Failed to fetch creative library" }, { status: 500 })
  }
}

