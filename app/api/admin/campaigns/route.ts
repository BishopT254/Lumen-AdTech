import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for campaign creation/update
const campaignSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional().nullable(),
  objective: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSION", "TRAFFIC", "ENGAGEMENT"]),
  budget: z.number().positive(),
  dailyBudget: z.number().positive().optional().nullable(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  pricingModel: z.enum(["CPM", "CPE", "CPA", "HYBRID"]),
  targetLocations: z.any(), // Will be stored as JSON
  targetDemographics: z.any().optional(), // Will be stored as JSON
  targetSchedule: z.any().optional(), // Will be stored as JSON
  audienceSegmentId: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"])
    .default("DRAFT"),
  advertiserId: z.string(),
  creatives: z.array(
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
      status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional().default("DRAFT"),
    }),
  ),
})

// Valid campaign status values to match Prisma schema
const VALID_CAMPAIGN_STATUSES = [
  "DRAFT", 
  "PENDING_APPROVAL", 
  "ACTIVE", 
  "PAUSED", 
  "COMPLETED", 
  "REJECTED", 
  "CANCELLED"
]

// GET handler for fetching campaigns with filtering, sorting, and pagination
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
    const search = searchParams.get("search") || ""
    const statusParam = searchParams.get("status")
    const sort = searchParams.get("sort") || "createdAt"
    const order = searchParams.get("order") || "desc"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Only add status filter if it's a valid status value
    if (statusParam && statusParam !== "all" && VALID_CAMPAIGN_STATUSES.includes(statusParam)) {
      where.status = statusParam
    }

    // Count total campaigns matching the filter
    const total = await prisma.campaign.count({ where })

    // Fetch campaigns with pagination, sorting, and relations
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: limit,
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

    // Calculate pagination metadata
    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

// POST handler for creating a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validatedData = campaignSchema.parse(body)

    // Extract creatives to create them separately
    const { creatives, ...campaignData } = validatedData

    // Process JSON fields
    const processedData = {
      ...campaignData,
      startDate: new Date(campaignData.startDate),
      endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
      targetLocations:
        typeof campaignData.targetLocations === "string"
          ? campaignData.targetLocations
          : JSON.stringify(campaignData.targetLocations),
      targetDemographics:
        typeof campaignData.targetDemographics === "string"
          ? campaignData.targetDemographics
          : campaignData.targetDemographics
            ? JSON.stringify(campaignData.targetDemographics)
            : null,
      targetSchedule:
        typeof campaignData.targetSchedule === "string"
          ? campaignData.targetSchedule
          : campaignData.targetSchedule
            ? JSON.stringify(campaignData.targetSchedule)
            : null,
    }

    // Create campaign with creatives in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create the campaign
      const newCampaign = await tx.campaign.create({
        data: {
          ...processedData,
        },
      })

      // Create the creatives
      if (creatives && creatives.length > 0) {
        await Promise.all(
          creatives.map((creative) =>
            tx.adCreative.create({
              data: {
                ...creative,
                campaignId: newCampaign.id,
              },
            }),
          ),
        )
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_CAMPAIGN",
          description: `Campaign "${newCampaign.name}" created`,
          metadata: { campaignId: newCampaign.id },
        },
      })

      // Return the created campaign with relations
      return tx.campaign.findUnique({
        where: { id: newCampaign.id },
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
        },
      })
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error("Error creating campaign:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}