import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schema for query parameters
const querySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  dataType: z.enum(['revenue', 'impressions', 'engagements', 'conversions', 'emotions']).default('revenue'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filter: z.enum(['campaign', 'device', 'partner', 'advertiser']).optional(),
  filterId: z.string().optional(),
});

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== 'ADMIN') {
    return false;
  }
  return true;
}

// Helper to get start date based on period
function getStartDate(period: string, customStartDate?: string): Date {
  if (customStartDate) {
    return new Date(customStartDate);
  }
  
  const today = new Date();
  
  switch (period) {
    case 'day':
      return new Date(today.setHours(0, 0, 0, 0));
    case 'week':
      today.setDate(today.getDate() - 7);
      return today;
    case 'year':
      today.setFullYear(today.getFullYear() - 1);
      return today;
    case 'month':
    default:
      today.setMonth(today.getMonth() - 1);
      return today;
  }
}

// Helper to format date for grouping
function formatDateForGrouping(date: Date, period: string): string {
  switch (period) {
    case 'day':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    case 'week':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    case 'year':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'month':
    default:
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!await checkAdminAccess(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 24h, 7d, 30d, 12m
    const startDate = getStartDate(period);

    // Get campaign performance metrics
    const campaignMetrics = await prisma.campaign.aggregate({
          where: {
        startDate: { gte: startDate }
      },
      _count: {
        _all: true
      },
      _sum: {
        budget: true
      }
    });

    // Get ad delivery metrics
    const adDeliveryMetrics = await prisma.adDelivery.aggregate({
      where: {
        scheduledTime: { gte: startDate }
      },
      _sum: {
        impressions: true,
        engagements: true,
        completions: true,
        viewerCount: true
      }
    });

    // Get device analytics
    const deviceAnalytics = await prisma.deviceAnalytics.aggregate({
          where: {
        date: { gte: startDate }
      },
      _avg: {
        uptime: true,
        averageViewerCount: true,
        energyConsumption: true
      },
      _sum: {
        impressionsServed: true,
        engagementsCount: true
      }
    });

    // Get emotion data aggregates
    const emotionData = await prisma.emotionData.aggregate({
          where: {
        timestamp: { gte: startDate }
          },
      _avg: {
            joyScore: true,
            surpriseScore: true,
            neutralScore: true,
        dwellTime: true
      },
      _sum: {
        viewerCount: true
      }
    });

    // Get revenue metrics
    const revenueMetrics = await prisma.billing.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: 'PAID'
      },
      _sum: {
        amount: true,
        tax: true,
        total: true
      }
    });

    // Get partner earnings
    const partnerEarnings = await prisma.partnerEarning.aggregate({
      where: {
        periodStart: { gte: startDate }
      },
      _sum: {
        amount: true,
        totalImpressions: true,
        totalEngagements: true
      }
    });

    // Get top performing campaigns
    const topCampaigns = await prisma.campaign.findMany({
      where: {
        startDate: { gte: startDate },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        objective: true,
        budget: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            adDeliveries: true
          }
        },
        advertiser: {
          select: {
            companyName: true
          }
        }
      },
      orderBy: {
        adDeliveries: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Get device status distribution
    const deviceStatusDistribution = await prisma.device.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    // Get hourly impression data for the last 24 hours
    const hourlyImpressions = await prisma.adDelivery.groupBy({
      by: ['actualDeliveryTime'],
      where: {
        actualDeliveryTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _sum: {
        impressions: true
      },
      orderBy: {
        actualDeliveryTime: 'asc'
      }
    });
        
        return NextResponse.json({
      overview: {
        totalCampaigns: campaignMetrics._count._all,
        totalBudget: campaignMetrics._sum.budget || new Decimal(0),
        totalImpressions: adDeliveryMetrics._sum.impressions || 0,
        totalEngagements: adDeliveryMetrics._sum.engagements || 0,
        totalCompletions: adDeliveryMetrics._sum.completions || 0,
        totalViewers: adDeliveryMetrics._sum.viewerCount || 0
      },
      performance: {
        averageUptime: deviceAnalytics._avg.uptime || new Decimal(0),
        averageViewerCount: deviceAnalytics._avg.averageViewerCount || new Decimal(0),
        totalImpressions: deviceAnalytics._sum.impressionsServed || 0,
        totalEngagements: deviceAnalytics._sum.engagementsCount || 0,
        energyConsumption: deviceAnalytics._avg.energyConsumption || new Decimal(0)
      },
      audience: {
        averageJoyScore: emotionData._avg.joyScore || new Decimal(0),
        averageSurpriseScore: emotionData._avg.surpriseScore || new Decimal(0),
        averageNeutralScore: emotionData._avg.neutralScore || new Decimal(0),
        averageDwellTime: emotionData._avg.dwellTime || new Decimal(0),
        totalViewers: emotionData._sum.viewerCount || 0
      },
      revenue: {
        totalRevenue: revenueMetrics._sum.total || new Decimal(0),
        totalTax: revenueMetrics._sum.tax || new Decimal(0),
        partnerEarnings: partnerEarnings._sum.amount || new Decimal(0)
      },
      topCampaigns,
      deviceStatus: deviceStatusDistribution,
      hourlyImpressions,
      period
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 