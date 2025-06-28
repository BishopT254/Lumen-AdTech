import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = params.id;

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Find campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get URL parameters for date range
    const url = new URL(req.url);
    let startDate = url.searchParams.get("startDate") 
      ? new Date(url.searchParams.get("startDate")!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    
    let endDate = url.searchParams.get("endDate") 
      ? new Date(url.searchParams.get("endDate")!) 
      : new Date();

    // Get campaign analytics within date range
    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get total metrics
    const totalMetrics = {
      impressions: analytics.reduce((sum, day) => sum + day.impressions, 0),
      engagements: analytics.reduce((sum, day) => sum + day.engagements, 0),
      conversions: analytics.reduce((sum, day) => sum + day.conversions, 0),
      ctr: analytics.length > 0 
        ? analytics.reduce((sum, day) => sum + day.ctr, 0) / analytics.length 
        : 0,
      conversionRate: analytics.length > 0 
        ? analytics.reduce((sum, day) => sum + day.conversionRate, 0) / analytics.length 
        : 0,
    };

    // Get ad deliveries for this campaign
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        campaignId,
        actualDeliveryTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            deviceType: true,
            location: true,
          },
        },
        adCreative: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Get device performance metrics
    const devicePerformance = adDeliveries.reduce((acc, delivery) => {
      const deviceId = delivery.deviceId;
      
      if (!acc[deviceId]) {
        acc[deviceId] = {
          deviceId,
          name: delivery.device.name,
          type: delivery.device.deviceType,
          location: delivery.device.location,
          metrics: {
            impressions: 0,
            engagements: 0,
            completions: 0,
          },
        };
      }
      
      acc[deviceId].metrics.impressions += delivery.impressions || 0;
      acc[deviceId].metrics.engagements += delivery.engagements || 0;
      acc[deviceId].metrics.completions += delivery.completions || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array
    const deviceMetrics = Object.values(devicePerformance).map(device => ({
      ...device,
      metrics: {
        ...device.metrics,
        engagementRate: device.metrics.impressions > 0 
          ? device.metrics.engagements / device.metrics.impressions 
          : 0,
        completionRate: device.metrics.impressions > 0 
          ? device.metrics.completions / device.metrics.impressions 
          : 0,
      },
    }));

    // Get creative performance metrics
    const creativePerformance = adDeliveries.reduce((acc, delivery) => {
      const creativeId = delivery.adCreativeId;
      
      if (!acc[creativeId]) {
        acc[creativeId] = {
          creativeId,
          name: delivery.adCreative.name,
          type: delivery.adCreative.type,
          metrics: {
            impressions: 0,
            engagements: 0,
            completions: 0,
          },
        };
      }
      
      acc[creativeId].metrics.impressions += delivery.impressions || 0;
      acc[creativeId].metrics.engagements += delivery.engagements || 0;
      acc[creativeId].metrics.completions += delivery.completions || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate rates
    const creativeMetrics = Object.values(creativePerformance).map(creative => ({
      ...creative,
      metrics: {
        ...creative.metrics,
        engagementRate: creative.metrics.impressions > 0 
          ? creative.metrics.engagements / creative.metrics.impressions 
          : 0,
        completionRate: creative.metrics.impressions > 0 
          ? creative.metrics.completions / creative.metrics.impressions 
          : 0,
      },
    }));

    // Get emotion data if available
    const emotionData = await prisma.emotionData.findMany({
      where: {
        adDelivery: {
          campaignId,
          actualDeliveryTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        adCreative: {
          select: {
            id: true,
            name: true,
          },
        },
        adDelivery: {
          select: {
            id: true,
          },
        },
      },
    });

    // Aggregate emotion data by creative
    const emotionByCreative = emotionData.reduce((acc, data) => {
      const creativeId = data.adCreative.id;
      
      if (!acc[creativeId]) {
        acc[creativeId] = {
          creativeId,
          creativeName: data.adCreative.name,
          joyScoreSum: 0,
          surpriseScoreSum: 0,
          neutralScoreSum: 0,
          dwellTimeSum: 0,
          count: 0,
        };
      }
      
      if (data.joyScore) acc[creativeId].joyScoreSum += data.joyScore;
      if (data.surpriseScore) acc[creativeId].surpriseScoreSum += data.surpriseScore;
      if (data.neutralScore) acc[creativeId].neutralScoreSum += data.neutralScore;
      if (data.dwellTime) acc[creativeId].dwellTimeSum += data.dwellTime;
      acc[creativeId].count++;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    const emotionMetrics = Object.values(emotionByCreative).map(creative => ({
      creativeId: creative.creativeId,
      creativeName: creative.creativeName,
      joyScore: creative.count > 0 ? creative.joyScoreSum / creative.count : 0,
      surpriseScore: creative.count > 0 ? creative.surpriseScoreSum / creative.count : 0,
      neutralScore: creative.count > 0 ? creative.neutralScoreSum / creative.count : 0,
      avgDwellTime: creative.count > 0 ? creative.dwellTimeSum / creative.count : 0,
    }));

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        budget: campaign.budget,
        dailyBudget: campaign.dailyBudget,
        status: campaign.status,
      },
      timeRange: {
        startDate,
        endDate,
      },
      analytics: {
        dailyMetrics: analytics,
        totalMetrics,
        deviceMetrics,
        creativeMetrics,
        emotionMetrics,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    return NextResponse.json({ error: "Failed to fetch campaign analytics" }, { status: 500 });
  }
} 