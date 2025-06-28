import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface DailyTrendData {
  viewers: number;
}

interface EmotionDistribution {
  joy: number;
  surprise: number;
  neutral: number;
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const location = searchParams.get('location') || 'all';

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();
    switch (timeframe) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Build location filter
    const locationFilter = location !== 'all' ? {
      device: {
        location: {
          path: ['city'],
          equals: location
        }
      }
    } : {};

    // Fetch audience data from various models
    const [
      emotionData,
      deviceAnalytics
    ] = await Promise.all([
      // Get emotion data
      prisma.emotionData.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: now
          },
          adDelivery: locationFilter
        },
        select: {
          joyScore: true,
          surpriseScore: true,
          neutralScore: true,
          dwellTime: true,
          viewerCount: true
        }
      }),

      // Get device analytics
      prisma.deviceAnalytics.findMany({
        where: {
          date: {
            gte: startDate,
            lte: now
          },
          device: location !== 'all' ? {
            location: {
              path: ['city'],
              equals: location
            }
          } : undefined
        },
        select: {
          impressionsServed: true,
          engagementsCount: true,
          averageViewerCount: true,
          date: true
        }
      })
    ]);

    // Calculate engagement rate
    const totalImpressions = deviceAnalytics.reduce((sum: number, record) => sum + record.impressionsServed, 0);
    const totalEngagements = deviceAnalytics.reduce((sum: number, record) => sum + record.engagementsCount, 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    // Process emotion data
    const emotionDistribution = emotionData.reduce((acc: EmotionDistribution, record) => {
      return {
        joy: acc.joy + (record.joyScore?.toNumber() || 0),
        surprise: acc.surprise + (record.surpriseScore?.toNumber() || 0),
        neutral: acc.neutral + (record.neutralScore?.toNumber() || 0)
      };
    }, { joy: 0, surprise: 0, neutral: 0 });

    // Aggregate daily trends
    const dailyTrends = deviceAnalytics.reduce((acc: Record<string, DailyTrendData>, record) => {
      const date = record.date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { viewers: 0 };
      }
      acc[date].viewers += record.averageViewerCount?.toNumber() || 0;
      return acc;
    }, {});

    // Calculate total audience from device analytics
    const totalAudience = deviceAnalytics.reduce((sum: number, record) => 
      sum + (record.averageViewerCount?.toNumber() || 0), 0);

    // Calculate average dwell time from emotion data
    const totalDwellTime = emotionData.reduce((sum: number, record) => 
      sum + (record.dwellTime?.toNumber() || 0), 0);
    const averageDwellTime = emotionData.length > 0 ? totalDwellTime / emotionData.length : 0;

    // Format response
    const response = {
      totalAudience,
      averageEngagement: engagementRate,
      averageDwellTime,
      uniqueViewers: deviceAnalytics.length,
      demographics: {
        // Demographics would be calculated from actual user data
        ageGroups: {},
        genderDistribution: {},
        locations: {}
      },
      behavior: {
        emotionDistribution: [
          { emotion: 'Joy', percentage: emotionDistribution.joy },
          { emotion: 'Surprise', percentage: emotionDistribution.surprise },
          { emotion: 'Neutral', percentage: emotionDistribution.neutral }
        ]
      },
      trends: {
        daily: Object.entries(dailyTrends).map(([date, data]) => ({
          date,
          viewers: data.viewers
        }))
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching audience stats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 