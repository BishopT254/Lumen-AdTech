import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { processAudienceData, getCampaignAudienceInsights } from '@/lib/audience-measurement';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate session and ensure the user is an advertiser
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the campaign ID from the route params
    const campaignId = params.id;

    // Check if campaign exists and belongs to the current advertiser
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: 'You do not have advertiser permissions' },
        { status: 403 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get the audience insights for the campaign
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days data
    
    const audienceInsights = await getCampaignAudienceInsights(
      campaignId, 
      startDate
    );

    return NextResponse.json({
      success: true,
      data: audienceInsights
    });
  } catch (error) {
    console.error('Error in audience insights API:', error);
    return NextResponse.json(
      { error: 'Failed to get audience insights' },
      { status: 500 }
    );
  }
} 