import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Get the creative with campaign info to verify ownership
    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            advertiserId: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Verify the creative belongs to a campaign owned by this advertiser
    if (creative.campaign.advertiserId !== advertiser.id) {
      return NextResponse.json(
        { error: 'You do not have access to this creative' }, 
        { status: 403 }
      );
    }

    // Fetch all ad deliveries for this creative
    const adDeliveries = await prisma.adDelivery.findMany({
      where: { adCreativeId: id },
      select: {
        impressions: true,
        engagements: true,
        completions: true,
        status: true,
      },
    });

    // Calculate totals
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalCompletions = 0;
    let deliveryCount = adDeliveries.length;

    adDeliveries.forEach(delivery => {
      totalImpressions += delivery.impressions;
      totalEngagements += delivery.engagements;
      totalCompletions += delivery.completions;
    });

    // Calculate CTR (Click-Through Rate)
    const ctr = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

    // Get emotion data if available
    const emotionData = await prisma.emotionData.findMany({
      where: { adCreativeId: id },
      select: {
        joyScore: true,
        surpriseScore: true,
        neutralScore: true,
        dwellTime: true,
        viewerCount: true,
      },
    });

    // Calculate average emotion scores
    let avgJoyScore = 0;
    let avgSurpriseScore = 0;
    let avgNeutralScore = 0;
    let avgDwellTime = 0;
    let totalViewers = 0;

    if (emotionData.length > 0) {
      let joyTotal = 0;
      let surpriseTotal = 0;
      let neutralTotal = 0;
      let dwellTimeTotal = 0;
      let viewerCountTotal = 0;
      let joyCount = 0;
      let surpriseCount = 0;
      let neutralCount = 0;
      let dwellTimeCount = 0;
      let viewerCount = 0;

      emotionData.forEach(data => {
        if (data.joyScore !== null) {
          joyTotal += data.joyScore;
          joyCount++;
        }
        if (data.surpriseScore !== null) {
          surpriseTotal += data.surpriseScore;
          surpriseCount++;
        }
        if (data.neutralScore !== null) {
          neutralTotal += data.neutralScore;
          neutralCount++;
        }
        if (data.dwellTime !== null) {
          dwellTimeTotal += data.dwellTime;
          dwellTimeCount++;
        }
        if (data.viewerCount !== null) {
          viewerCountTotal += data.viewerCount;
          viewerCount++;
        }
      });

      avgJoyScore = joyCount > 0 ? joyTotal / joyCount : 0;
      avgSurpriseScore = surpriseCount > 0 ? surpriseTotal / surpriseCount : 0;
      avgNeutralScore = neutralCount > 0 ? neutralTotal / neutralCount : 0;
      avgDwellTime = dwellTimeCount > 0 ? dwellTimeTotal / dwellTimeCount : 0;
      totalViewers = viewerCountTotal;
    }

    // Get data for timeline chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyData = await prisma.adDelivery.groupBy({
      by: ['actualDeliveryTime'],
      where: {
        adCreativeId: id,
        actualDeliveryTime: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        impressions: true,
        engagements: true,
      },
      orderBy: {
        actualDeliveryTime: 'asc',
      },
    });

    // Format daily data for chart
    const timelineData = dailyData.map(day => ({
      date: day.actualDeliveryTime ? day.actualDeliveryTime.toISOString().split('T')[0] : 'unknown',
      impressions: day._sum.impressions || 0,
      engagements: day._sum.engagements || 0,
    }));

    // Return analytics data
    return NextResponse.json({
      totalImpressions,
      totalEngagements,
      totalCompletions,
      ctr,
      deliveryCount,
      emotionMetrics: {
        avgJoyScore,
        avgSurpriseScore,
        avgNeutralScore,
        avgDwellTime,
        totalViewers,
      },
      timelineData,
    });
  } catch (error) {
    console.error('Error fetching creative analytics:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching analytics data' }, 
      { status: 500 }
    );
  }
} 