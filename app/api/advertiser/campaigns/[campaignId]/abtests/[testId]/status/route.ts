import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating AB test status
const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string; testId: string } }
) {
  try {
    // Validate session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateStatusSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.format() },
        { status: 400 }
      );
    }

    const { status } = validatedData.data;

    // Check if user has access to this campaign
    const campaign = await prisma.campaign.findUnique({
      where: { 
        id: params.campaignId,
        user: {
          email: session.user.email || '',
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if AB test exists and belongs to this campaign
    const abTest = await prisma.aBTest.findUnique({
      where: {
        id: params.id,
        campaignId: params.campaignId,
      },
      include: {
        variants: true,
      },
    });

    if (!abTest) {
      return NextResponse.json({ error: 'AB test not found' }, { status: 404 });
    }

    // Update AB test status
    const updatedTest = await prisma.aBTest.update({
      where: {
        id: params.id,
      },
      data: {
        status,
        // If completing the test, set the end date to now and determine the winning variant
        ...(status === 'COMPLETED' && {
          endDate: new Date(),
          // Calculate the winning variant based on engagement rate
          winningVariantId: determineWinningVariant(abTest.variants),
        }),
      },
      include: {
        variants: {
          include: {
            adCreative: true,
          },
        },
      },
    });

    return NextResponse.json({ abTest: updatedTest });
  } catch (error) {
    console.error('Error updating AB test status:', error);
    return NextResponse.json(
      { error: 'Failed to update AB test status' },
      { status: 500 }
    );
  }
}

// Helper function to determine the winning variant based on engagement rates
function determineWinningVariant(variants: any[]) {
  if (!variants || variants.length === 0) return null;

  // Calculate engagement rate for each variant
  const variantsWithRate = variants.map(variant => {
    const impressions = variant.impressions || 0;
    const engagements = variant.engagements || 0;
    const engagementRate = impressions > 0 ? (engagements / impressions) : 0;
    
    return {
      ...variant,
      engagementRate,
    };
  });

  // Sort by engagement rate (highest first)
  variantsWithRate.sort((a, b) => b.engagementRate - a.engagementRate);

  // Return the ID of the variant with the highest engagement rate
  return variantsWithRate[0]?.id || null;
} 