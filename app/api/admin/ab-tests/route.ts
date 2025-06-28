import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import type { ABTestStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") as ABTestStatus | null

    // Build the where clause for filtering
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { campaign: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Fetch AB tests with related data
    const abTests = await prisma.aBTest.findMany({
      where,
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
        variants: {
          include: {
            adCreative: {
              select: {
                name: true,
                type: true,
                previewImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            variants: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ abTests })
  } catch (error) {
    console.error("Error fetching AB tests:", error)
    return NextResponse.json({ error: "Failed to fetch AB tests" }, { status: 500 })
  }
}

