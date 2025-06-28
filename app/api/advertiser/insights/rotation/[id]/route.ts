import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

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
      include: {
        adCreatives: {
          select: {
            id: true,
            name: true,
            type: true,
            content: true,
            previewImage: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Get ad delivery performance data
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        campaignId: campaignId,
      },
      select: {
        id: true,
        adCreativeId: true,
        impressions: true,
        engagements: true,
        completions: true,
        viewerCount: true,
      },
    });

    // Aggregate performance by creative
    const creativePerformance = campaign.adCreatives.map(creative => {
      const deliveries = adDeliveries.filter(d => d.adCreativeId === creative.id);
      const impressions = deliveries.reduce((sum, d) => sum + (d.impressions || 0), 0);
      const engagements = deliveries.reduce((sum, d) => sum + (d.engagements || 0), 0);
      const completions = deliveries.reduce((sum, d) => sum + (d.completions || 0), 0);
      const viewerCount = deliveries.reduce((sum, d) => sum + (d.viewerCount || 0), 0);
      
      // Calculate engagement rate and normalized score
      const engagementRate = impressions > 0 ? engagements / impressions : 0;
      const completionRate = engagements > 0 ? completions / engagements : 0;
      
      // Create a performance score (0-10 scale)
      const score = (engagementRate * 5) + (completionRate * 5);
      
      return {
        id: creative.id,
        name: creative.name,
        type: creative.type,
        impressions,
        engagements,
        completions,
        viewerCount,
        engagementRate,
        completionRate,
        score,
        previewImage: creative.previewImage,
      };
    });

    // Sort by score (highest first)
    creativePerformance.sort((a, b) => b.score - a.score);

    // Generate optimization recommendations
    const recommendations = [];
    
    // Check if we have enough performance data
    if (adDeliveries.length > 0) {
      // Check for underperforming creatives
      const underperforming = creativePerformance.filter(
        c => c.score < 3 && c.impressions > 100
      );
      
      if (underperforming.length > 0) {
        for (const creative of underperforming) {
          recommendations.push({
            type: 'decrease',
            title: `Reduce distribution for "${creative.name}"`,
            description: 'This creative is underperforming compared to others in your campaign.',
            impact: -0.1,
            creativeId: creative.id
          });
        }
      }
      
      // Check for top performers
      const topPerformers = creativePerformance.filter(
        c => c.score > 7 && c.impressions > 100
      );
      
      if (topPerformers.length > 0) {
        for (const creative of topPerformers) {
          recommendations.push({
            type: 'increase',
            title: `Increase distribution for "${creative.name}"`,
            description: 'This creative is performing exceptionally well.',
            impact: 0.15,
            creativeId: creative.id
          });
        }
      }
      
      // Check for creatives with insufficient data
      const insufficientData = creativePerformance.filter(
        c => c.impressions < 100
      );
      
      if (insufficientData.length > 0) {
        recommendations.push({
          type: 'info',
          title: 'Insufficient data for some creatives',
          description: `${insufficientData.length} creative(s) need more impressions for accurate analysis.`,
          impact: null
        });
      }
      
      // General recommendation for testing
      if (campaign.adCreatives.length < 3) {
        recommendations.push({
          type: 'info',
          title: 'Add more ad variations',
          description: 'Create more ad variations to improve optimization potential.',
          impact: 0.2
        });
      }
    } else {
      // No data yet
      recommendations.push({
        type: 'info',
        title: 'Waiting for performance data',
        description: 'The campaign needs to gather delivery data before optimization.',
        impact: null
      });
    }

    return NextResponse.json({
      success: true,
      creativePerformance,
      recommendations
    });
  } catch (error) {
    console.error('Error in ad rotation insights API:', error);
    return NextResponse.json(
      { error: 'Failed to get ad rotation insights' },
      { status: 500 }
    );
  }
} 