import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CampaignStatus } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get advertiser ID from session user
    const advertiser = await prisma.advertiser.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser account not found' }, { status: 404 });
    }

    // Ensure the campaignId is provided and valid
    const { campaignId } = params;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Fetch campaign with related data
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id, // Ensure campaign belongs to advertiser
      },
      include: {
        adCreatives: {
          select: {
            id: true,
            name: true,
            type: true,
            content: true,
            format: true,
            duration: true,
            previewImage: true,
            isApproved: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        analytics: {
          orderBy: {
            date: 'desc'
          },
          take: 30, // Last 30 days of analytics
          select: {
            date: true,
            impressions: true,
            engagements: true,
            conversions: true,
            ctr: true,
            conversionRate: true,
            averageDwellTime: true,
            audienceMetrics: true,
            emotionMetrics: true,
            costData: true,
          }
        },
        _count: {
          select: {
            adCreatives: true,
            adDeliveries: true,
            analytics: true,
          }
        }
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    // Fetch A/B tests separately to avoid Prisma validation errors
    const abTests = await prisma.ABTest.findMany({
      where: {
        campaignId,
      },
      include: {
        variants: {
          include: {
            adCreative: {
              select: {
                id: true,
                name: true,
                type: true,
                content: true,
              }
            }
          }
        }
      }
    });

    // Calculate performance metrics for easier consumption by frontend
    const analytics = campaign.analytics || [];
    const performance = analytics.length > 0 
      ? {
          totalImpressions: analytics.reduce((sum, a) => sum + a.impressions, 0),
          totalEngagements: analytics.reduce((sum, a) => sum + a.engagements, 0),
          totalConversions: analytics.reduce((sum, a) => sum + a.conversions, 0),
          engagementRate: analytics.reduce((sum, a) => sum + a.impressions, 0) > 0
            ? (analytics.reduce((sum, a) => sum + a.engagements, 0) / 
               analytics.reduce((sum, a) => sum + a.impressions, 0) * 100).toFixed(2) + '%'
            : '0.00%',
          conversionRate: analytics.reduce((sum, a) => sum + a.impressions, 0) > 0
            ? (analytics.reduce((sum, a) => sum + a.conversions, 0) / 
               analytics.reduce((sum, a) => sum + a.impressions, 0) * 100).toFixed(2) + '%'
            : '0.00%'
        }
      : null;

    return NextResponse.json({ 
      campaign: {
        ...campaign,
        abTests,
        performance
      }
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign details', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get advertiser ID from session user
    const advertiser = await prisma.advertiser.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser account not found' }, { status: 404 });
    }

    const { campaignId } = params;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Check if campaign exists and belongs to advertiser
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.startDate || !data.budget) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['name', 'startDate', 'budget'] },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : undefined;

    if (endDate && endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        name: data.name,
        description: data.description,
        startDate,
        endDate,
        budget: parseFloat(data.budget),
        status: (data.status as CampaignStatus) || undefined,
        targetDemographics: data.targetDemographics || undefined,
        targetSchedule: data.targetSchedule || undefined,
        targetLocations: data.targetLocations || undefined,
      },
      include: {
        adCreatives: true,
        _count: {
          select: {
            adCreatives: true,
            adDeliveries: true,
            analytics: true,
          }
        }
      },
    });
    
    // Fetch A/B tests separately
    const abTests = await prisma.ABTest.findMany({
      where: {
        campaignId,
      },
      include: {
        variants: true
      }
    });

    return NextResponse.json({ 
      campaign: {
        ...campaign,
        abTests
      }
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { campaignId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get advertiser ID from session user
    const advertiser = await prisma.advertiser.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser account not found' }, { status: 404 });
    }

    const { campaignId } = params;
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Check if campaign exists and belongs to advertiser
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 });
    }

    // Check if campaign can be deleted
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot delete an active campaign. Please pause or complete it first.' },
        { status: 400 }
      );
    }

    // Delete campaign and all related data (cascading delete is handled by Prisma schema)
    await prisma.campaign.delete({
      where: {
        id: campaignId,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Campaign deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 