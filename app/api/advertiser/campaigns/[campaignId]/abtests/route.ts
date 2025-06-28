import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ABTestStatus } from '@prisma/client';

// Schema for creating a new AB test
const createAbTestSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  startDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid start date format"
  }),
  endDate: z.string().refine(date => !isNaN(Date.parse(date)), {
    message: "Invalid end date format"
  }).optional(),
  status: z.nativeEnum(ABTestStatus).default('DRAFT'),
  emotionAware: z.boolean().default(false),
  targetEmotions: z.object({
    joy: z.boolean().default(false),
    surprise: z.boolean().default(false),
    neutral: z.boolean().default(false),
  }).optional(),
  winningVariantId: z.string().optional(),
  variants: z.array(
    z.object({
      adCreativeId: z.string().min(1, { message: "Ad creative is required" }),
      name: z.string().min(1, { message: "Variant name is required" }),
      trafficAllocation: z.number().min(0).max(100),
    })
  ).min(2, { message: "At least two variants are required" }),
});

type CreateAbTestInput = z.infer<typeof createAbTestSchema>;

/**
 * GET handler - retrieve all AB tests for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.campaignId,
        advertiser: {
          user: {
            email: session.user.email
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 10;
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1;
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      campaignId: params.campaignId
    };

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.startDate = {
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      where.endDate = {
        lte: new Date(endDate)
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.aBTest.count({ where });

    // Get AB tests with pagination
    const abTests = await prisma.aBTest.findMany({
      where,
      include: {
        variants: {
          include: {
            adCreative: {
              select: {
                id: true,
                name: true,
                type: true,
                previewImage: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      abTests,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching AB tests:", error);
    return NextResponse.json(
      { error: "Failed to fetch AB tests" },
      { status: 500 }
    );
  }
}

/**
 * POST handler - create a new AB test
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.campaignId,
        advertiser: {
          user: {
            email: session.user.email
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createAbTestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid data provided", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Verify total traffic allocation is 100%
    const totalAllocation = validatedData.variants.reduce(
      (sum, variant) => sum + variant.trafficAllocation, 
      0
    );

    if (Math.abs(totalAllocation - 100) > 0.01) {
      return NextResponse.json(
        { error: "Total traffic allocation must equal 100%" },
        { status: 400 }
      );
    }

    // Verify all ad creatives belong to this campaign
    const adCreativeIds = validatedData.variants.map(v => v.adCreativeId);
    const adCreativesCount = await prisma.adCreative.count({
      where: {
        id: { in: adCreativeIds },
        campaignId: params.campaignId
      }
    });

    if (adCreativesCount !== adCreativeIds.length) {
      return NextResponse.json(
        { error: "Some ad creatives do not belong to this campaign" },
        { status: 400 }
      );
    }

    // Create the AB test with its variants
    const abTest = await prisma.aBTest.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status,
        emotionAware: validatedData.emotionAware,
        targetEmotions: validatedData.emotionAware && validatedData.targetEmotions ? validatedData.targetEmotions : null,
        winningVariantId: validatedData.winningVariantId,
        campaign: {
          connect: { id: params.campaignId }
        },
        variants: {
          create: validatedData.variants.map(variant => ({
            name: variant.name,
            adCreative: {
              connect: { id: variant.adCreativeId }
            },
            trafficAllocation: variant.trafficAllocation,
            impressions: 0,
            engagements: 0,
            conversions: 0
          }))
        }
      },
      include: {
        variants: {
          include: {
            adCreative: true
          }
        }
      }
    });

    return NextResponse.json({ abTest }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating AB test:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      if (errorMessage.includes('Unique constraint')) {
        return NextResponse.json(
          { error: "An AB test with this name already exists" },
          { status: 409 }
        );
      }
      
      if (errorMessage.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Invalid reference to a related resource" },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create AB test" },
      { status: 500 }
    );
  }
} 