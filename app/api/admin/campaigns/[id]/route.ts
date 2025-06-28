import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for campaign update
const campaignUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional().nullable(),
  objective: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSION", "TRAFFIC", "ENGAGEMENT"]).optional(),
  budget: z.number().positive().optional(),
  dailyBudget: z.number().positive().optional().nullable(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional().nullable(),
  pricingModel: z.enum(["CPM", "CPE", "CPA", "HYBRID"]).optional(),
  targetLocations: z.any().optional(), // Will be stored as JSON
  targetDemographics: z.any().optional(), // Will be stored as JSON
  targetSchedule: z.any().optional(), // Will be stored as JSON
  audienceSegmentId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"]).optional(),
  advertiserId: z.string().optional(),
  creatives: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(3),
        type: z.enum(["IMAGE", "VIDEO", "TEXT", "HTML", "INTERACTIVE", "AR_EXPERIENCE", "VOICE_INTERACTIVE"]),
        headline: z.string().min(3).max(100),
        description: z.string().min(10),
        callToAction: z.string().min(2).max(50),
        content: z.string().optional().nullable(),
        previewImage: z.string().optional().nullable(),
        format: z.string().optional(),
        duration: z.number().optional().nullable(),
        status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional(),
      }),
    )
    .optional(),
})

// GET handler for fetching a single campaign
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id

    // Fetch campaign with relations
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        adCreatives: true,
        analytics: true,
        AudienceSegment: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 })
  }
}

// PUT handler for updating a campaign
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const campaignId = params.id
    const body = await request.json()

    // Validate request body
    const validatedData = campaignUpdateSchema.parse(body)

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { adCreatives: true },
    })

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Extract creatives to update them separately
    const { creatives, ...campaignData } = validatedData

    // Process JSON fields
    const processedData: any = { ...campaignData }

    if (campaignData.startDate) {
      processedData.startDate = new Date(campaignData.startDate)
    }

    if (campaignData.endDate) {
      processedData.endDate = new Date(campaignData.endDate)
    } else if (campaignData.endDate === null) {
      processedData.endDate = null
    }

    if (campaignData.targetLocations !== undefined) {
      processedData.targetLocations =
        typeof campaignData.targetLocations === "string"
          ? campaignData.targetLocations
          : JSON.stringify(campaignData.targetLocations)
    }

    if (campaignData.targetDemographics !== undefined) {
      processedData.targetDemographics =
        typeof campaignData.targetDemographics === "string"
          ? campaignData.targetDemographics
          : campaignData.targetDemographics
            ? JSON.stringify(campaignData.targetDemographics)
            : null
    }

    if (campaignData.targetSchedule !== undefined) {
      processedData.targetSchedule =
        typeof campaignData.targetSchedule === "string"
          ? campaignData.targetSchedule
          : campaignData.targetSchedule
            ? JSON.stringify(campaignData.targetSchedule)
            : null
    }

    // Update campaign and creatives in a transaction
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // Update the campaign
      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: processedData,
      })

      // Handle creatives if provided
      if (creatives && creatives.length > 0) {
        // Get existing creative IDs
        const existingCreativeIds = existingCampaign.adCreatives.map((c) => c.id)

        // Identify creatives to update and create
        const creativesToUpdate = creatives.filter((c) => c.id && existingCreativeIds.includes(c.id))
        const creativesToCreate = creatives.filter((c) => !c.id)

        // Update existing creatives
        await Promise.all(
          creativesToUpdate.map((creative) => {
            const { id, ...data } = creative
            return tx.adCreative.update({
              where: { id },
              data,
            })
          }),
        )

        // Create new creatives
        await Promise.all(
          creativesToCreate.map((creative) =>
            tx.adCreative.create({
              data: {
                ...creative,
                campaignId,
              },
            }),
          ),
        )

        // Delete creatives that are no longer in the list
        const updatedCreativeIds = creativesToUpdate.map((c) => c.id as string)
        const creativesToDelete = existingCreativeIds.filter((id) => !updatedCreativeIds.includes(id))

        if (creativesToDelete.length > 0) {
          await tx.adCreative.deleteMany({
            where: {
              id: { in: creativesToDelete },
            },
          })
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_CAMPAIGN",
          description: `Campaign "${updated.name}" updated`,
          metadata: { campaignId },
        },
      })

      // Return the updated campaign with relations
      return tx.campaign.findUnique({
        where: { id: campaignId },
        include: {
          advertiser: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          adCreatives: true,
          analytics: true,
          audienceSegment: true,
        },
      })
    })

    return NextResponse.json(updatedCampaign)
  } catch (error) {
    console.error("Error updating campaign:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

// DELETE handler for deleting a campaign
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const campaignId = params.id

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Delete campaign and related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete related analytics
      await tx.campaignAnalytics.deleteMany({
        where: { campaignId },
      })

      // Delete related ad deliveries
      await tx.adDelivery.deleteMany({
        where: { campaignId },
      })

      // Delete related ad creatives
      await tx.adCreative.deleteMany({
        where: { campaignId },
      })

      // Delete the campaign
      await tx.campaign.delete({
        where: { id: campaignId },
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_CAMPAIGN",
          description: `Campaign "${campaign.name}" deleted`,
          metadata: { campaignId },
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}
