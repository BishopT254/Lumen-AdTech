import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Parse URL query params
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const groupBy = url.searchParams.get("groupBy") || "daily"; // daily, weekly, monthly

    // Build filter criteria for campaigns
    const campaignWhereClause: any = {
      advertiserId: advertiser.id,
    };

    if (campaignId) {
      campaignWhereClause.id = campaignId;
    }

    // Fetch campaigns
    const campaigns = await prisma.campaign.findMany({
      where: campaignWhereClause,
      select: {
        id: true,
        name: true,
        status: true,
        budget: true,
        adCreatives: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({
        campaigns: [],
        stats: {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          clickThroughRate: "0.00%",
          conversionRate: "0.00%",
          averageCostPerClick: "$0.00",
          averageCostPerConversion: "$0.00",
        },
        timeSeries: [],
      });
    }

    // Get all creative IDs for the campaigns
    const creativeIds = campaigns.flatMap(campaign => 
      campaign.adCreatives.map(creative => creative.id)
    );

    // Build filter criteria for ad deliveries
    const deliveryWhereClause: any = {
      adCreativeId: {
        in: creativeIds,
      },
    };

    // Add date filters if provided
    if (startDate) {
      deliveryWhereClause.date = {
        ...(deliveryWhereClause.date || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      deliveryWhereClause.date = {
        ...(deliveryWhereClause.date || {}),
        lte: new Date(endDate),
      };
    }

    // Fetch ad delivery data
    const adDeliveries = await prisma.adDelivery.findMany({
      where: deliveryWhereClause,
      select: {
        id: true,
        adCreativeId: true,
        impressions: true,
        clicks: true,
        conversions: true,
        cost: true,
        date: true,
        adCreative: {
          select: {
            campaignId: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Process deliveries to get overall stats
    const totalImpressions = adDeliveries.reduce((sum, delivery) => sum + (delivery.impressions || 0), 0);
    const totalClicks = adDeliveries.reduce((sum, delivery) => sum + (delivery.clicks || 0), 0);
    const totalConversions = adDeliveries.reduce((sum, delivery) => sum + (delivery.conversions || 0), 0);
    const totalCost = adDeliveries.reduce((sum, delivery) => sum + (delivery.cost || 0), 0);
    
    const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const costPerClick = totalClicks > 0 ? totalCost / totalClicks : 0;
    const costPerConversion = totalConversions > 0 ? totalCost / totalConversions : 0;

    // Process time series data based on groupBy parameter
    const timeSeriesMap = new Map();
    
    adDeliveries.forEach(delivery => {
      let key: string;
      const date = new Date(delivery.date);
      
      if (groupBy === 'weekly') {
        // Format as "YYYY-WW" (year and week number)
        const weekNumber = getWeekNumber(date);
        key = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      } else if (groupBy === 'monthly') {
        // Format as "YYYY-MM" (year and month)
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        // Default: daily
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          period: key,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          campaigns: new Map(),
        });
      }
      
      const entry = timeSeriesMap.get(key);
      entry.impressions += delivery.impressions || 0;
      entry.clicks += delivery.clicks || 0;
      entry.conversions += delivery.conversions || 0;
      entry.cost += delivery.cost || 0;
      
      // Track by campaign
      const campaignId = delivery.adCreative.campaignId;
      if (!entry.campaigns.has(campaignId)) {
        entry.campaigns.set(campaignId, {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
        });
      }
      
      const campaignEntry = entry.campaigns.get(campaignId);
      campaignEntry.impressions += delivery.impressions || 0;
      campaignEntry.clicks += delivery.clicks || 0;
      campaignEntry.conversions += delivery.conversions || 0;
      campaignEntry.cost += delivery.cost || 0;
    });
    
    // Convert Maps to arrays and calculate rates
    const timeSeries = Array.from(timeSeriesMap.values()).map(entry => {
      // Convert campaign Map to array of objects
      const campaignStats = Array.from(entry.campaigns.entries()).map(([id, stats]) => {
        const campaign = campaigns.find(c => c.id === id);
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
        const cvr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
        
        return {
          id,
          name: campaign ? campaign.name : 'Unknown Campaign',
          impressions: stats.impressions,
          clicks: stats.clicks,
          conversions: stats.conversions,
          cost: stats.cost,
          ctr: ctr.toFixed(2) + '%',
          cvr: cvr.toFixed(2) + '%',
        };
      });
      
      // Calculate overall rates for this time period
      const periodCTR = entry.impressions > 0 ? (entry.clicks / entry.impressions) * 100 : 0;
      const periodCVR = entry.clicks > 0 ? (entry.conversions / entry.clicks) * 100 : 0;
      
      return {
        period: entry.period,
        impressions: entry.impressions,
        clicks: entry.clicks,
        conversions: entry.conversions,
        cost: entry.cost,
        ctr: periodCTR.toFixed(2) + '%',
        cvr: periodCVR.toFixed(2) + '%',
        campaignBreakdown: campaignStats,
      };
    });
    
    // Sort time series data chronologically
    timeSeries.sort((a, b) => a.period.localeCompare(b.period));

    // Per-campaign overall stats
    const campaignPerformance = campaigns.map(campaign => {
      const campaignDeliveries = adDeliveries.filter(
        delivery => delivery.adCreative.campaignId === campaign.id
      );
      
      const campaignImpressions = campaignDeliveries.reduce((sum, delivery) => sum + (delivery.impressions || 0), 0);
      const campaignClicks = campaignDeliveries.reduce((sum, delivery) => sum + (delivery.clicks || 0), 0);
      const campaignConversions = campaignDeliveries.reduce((sum, delivery) => sum + (delivery.conversions || 0), 0);
      const campaignCost = campaignDeliveries.reduce((sum, delivery) => sum + (delivery.cost || 0), 0);
      
      const campaignCTR = campaignImpressions > 0 ? (campaignClicks / campaignImpressions) * 100 : 0;
      const campaignCVR = campaignClicks > 0 ? (campaignConversions / campaignClicks) * 100 : 0;
      const campaignCPC = campaignClicks > 0 ? campaignCost / campaignClicks : 0;
      const campaignCPA = campaignConversions > 0 ? campaignCost / campaignConversions : 0;
      
      // Calculate budget utilization
      const budgetUtilization = campaign.budget > 0 ? (campaignCost / campaign.budget) * 100 : 0;
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        impressions: campaignImpressions,
        clicks: campaignClicks,
        conversions: campaignConversions,
        cost: campaignCost,
        ctr: campaignCTR.toFixed(2) + '%',
        cvr: campaignCVR.toFixed(2) + '%',
        cpc: '$' + campaignCPC.toFixed(2),
        cpa: '$' + campaignCPA.toFixed(2),
        budget: campaign.budget,
        budgetUtilization: budgetUtilization.toFixed(2) + '%',
      };
    });

    return NextResponse.json({
      campaigns: campaignPerformance,
      stats: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalCost,
        clickThroughRate: clickThroughRate.toFixed(2) + '%',
        conversionRate: conversionRate.toFixed(2) + '%',
        costPerClick: '$' + costPerClick.toFixed(2),
        costPerConversion: '$' + costPerConversion.toFixed(2),
      },
      timeSeries,
    });
  } catch (error) {
    console.error("Error fetching campaign performance:", error);
    return NextResponse.json({ error: "Failed to fetch campaign performance" }, { status: 500 });
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
} 