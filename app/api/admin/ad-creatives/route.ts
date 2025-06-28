import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import type { CreativeStatus, CreativeType } from "@prisma/client"

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
    const searchTerm = searchParams.get("search") || ""
    const status = searchParams.get("status") as CreativeStatus | null
    const type = searchParams.get("type") as CreativeType | null
    const campaignId = searchParams.get("campaignId") || undefined
    const page = Number(searchParams.get("page") || "1")
    const pageSize = Number(searchParams.get("pageSize") || "20")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build filter conditions
    const whereClause: any = {}

    // Search term filter
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { headline: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { campaign: { name: { contains: searchTerm, mode: "insensitive" } } },
      ]
    }

    // Status filter
    if (status) {
      whereClause.status = status
    }

    // Type filter
    if (type) {
      whereClause.type = type
    }

    // Campaign filter
    if (campaignId) {
      whereClause.campaignId = campaignId
    }

    // Fetch ad creatives with pagination and sorting
    const adCreatives = await prisma.adCreative.findMany({
      where: whereClause,
      include: {
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
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get total count for pagination
    const totalCreatives = await prisma.adCreative.count({
      where: whereClause,
    })

    // Get counts by status for tabs
    const statusCounts = await prisma.adCreative.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    })

    // Get counts by type for statistics
    const typeCounts = await prisma.adCreative.groupBy({
      by: ["type"],
      _count: {
        id: true,
      },
    })

    // Format status counts to match the expected format in the frontend
    const formattedStatusCounts = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    // Format type counts to match the expected format in the frontend
    const formattedTypeCounts = typeCounts.reduce(
      (acc, item) => {
        acc[item.type] = item._count.id
        return acc
      },
      {} as Record<string, number>,
    )

    // Serialize the data to handle BigInt values
    return NextResponse.json({
      adCreatives: serializeData(adCreatives),
      pagination: {
        total: totalCreatives,
        page,
        pageSize,
        pages: Math.ceil(totalCreatives / pageSize),
      },
      statusCounts: formattedStatusCounts,
      typeCounts: formattedTypeCounts,
    })
  } catch (error) {
    console.error("Error fetching ad creatives:", error)
    return NextResponse.json({ error: "Failed to fetch ad creatives" }, { status: 500 })
  }
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

    // Parse request body
    const data = await request.json()

    // Validate required fields
    const requiredFields = [
      "campaignId",
      "name",
      "type",
      "content",
      "format",
      "headline",
      "description",
      "callToAction",
    ]
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Create new ad creative
    const adCreative = await prisma.adCreative.create({
      data: {
        campaignId: data.campaignId,
        name: data.name,
        type: data.type,
        status: data.status || "DRAFT",
        content: data.content,
        format: data.format,
        duration: data.duration,
        previewImage: data.previewImage,
        headline: data.headline,
        description: data.description,
        callToAction: data.callToAction,
        isApproved: false,
        ar_markers: data.ar_markers,
        voiceCommands: data.voiceCommands,
      },
      include: {
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
    })

    return NextResponse.json(serializeData(adCreative), { status: 201 })
  } catch (error) {
    console.error("Error creating ad creative:", error)
    return NextResponse.json({ error: "Failed to create ad creative" }, { status: 500 })
  }
}

