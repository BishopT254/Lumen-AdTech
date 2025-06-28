import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper function to handle BigInt serialization
const serializeData = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => (typeof value === "bigint" ? Number(value) : value)))
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    const id = params.id

    // Fetch ad creative with related data
    const adCreative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            advertiser: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        adDeliveries: {
          take: 5,
          orderBy: {
            scheduledTime: "desc",
          },
          include: {
            device: {
              select: {
                name: true,
                deviceType: true,
                location: true,
              },
            },
          },
        },
        emotionData: {
          take: 10,
          orderBy: {
            timestamp: "desc",
          },
        },
        abTestVariants: {
          include: {
            abTest: {
              select: {
                name: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!adCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 })
    }

    // Get performance metrics
    const performanceMetrics = await prisma.adDelivery.aggregate({
      where: {
        adCreativeId: id,
      },
      _sum: {
        impressions: true,
        engagements: true,
        completions: true,
        viewerCount: true,
      },
    })

    // Calculate engagement rate
    const engagementRate =
      performanceMetrics._sum.impressions && performanceMetrics._sum.impressions > 0
        ? (performanceMetrics._sum.engagements || 0) / performanceMetrics._sum.impressions
        : 0

    // Get emotion data averages
    const emotionAverages = await prisma.emotionData.aggregate({
      where: {
        adCreativeId: id,
      },
      _avg: {
        joyScore: true,
        surpriseScore: true,
        neutralScore: true,
        dwellTime: true,
      },
    })

    return NextResponse.json(
      serializeData({
        adCreative,
        performanceMetrics: {
          ...performanceMetrics._sum,
          engagementRate,
        },
        emotionAverages: emotionAverages._avg,
      }),
    )
  } catch (error) {
    console.error("Error fetching ad creative:", error)
    return NextResponse.json({ error: "Failed to fetch ad creative" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

    const id = params.id
    const data = await request.json()

    // Check if ad creative exists
    const existingCreative = await prisma.adCreative.findUnique({
      where: { id },
    })

    if (!existingCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 })
    }

    // Update ad creative
    const updatedCreative = await prisma.adCreative.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        content: data.content,
        format: data.format,
        duration: data.duration,
        previewImage: data.previewImage,
        headline: data.headline,
        description: data.description,
        callToAction: data.callToAction,
        isApproved: data.isApproved,
        rejectionReason: data.rejectionReason,
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

    return NextResponse.json(serializeData(updatedCreative))
  } catch (error) {
    console.error("Error updating ad creative:", error)
    return NextResponse.json({ error: "Failed to update ad creative" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const id = params.id

    // Check if ad creative exists
    const existingCreative = await prisma.adCreative.findUnique({
      where: { id },
    })

    if (!existingCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 })
    }

    // Delete ad creative
    await prisma.adCreative.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting ad creative:", error)
    return NextResponse.json({ error: "Failed to delete ad creative" }, { status: 500 })
  }
}

