import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Campaign, AdDelivery, EmotionData } from '@prisma/client';

type ProcessedCampaign = {
  id: string;
  name: string;
  status: string;
  advertiser: {
    id: string;
    name: string;
  };
  totalImpressions: number;
  totalEngagements: number;
  totalCompletions: number;
  totalViewers: number;
  engagementRate: number;
  completionRate: number;
  emotionScores: {
    joyScore: number;
    surpriseScore: number;
    neutralScore: number;
    dwellTime: number;
    count: number;
  };
  deviceDistribution: {
    [key: string]: number;
  };
};

type CampaignWithRelations = Campaign & {
  advertiser: {
    id: string;
    companyName: string;
  };
  adCreatives: {
    id: string;
    emotionData: EmotionData[];
  }[];
  adDeliveries: (AdDelivery & {
    device: {
      name: string;
    } | null;
    emotionData: EmotionData[];
  })[];
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        advertiser: {
          select: {
            id: true,
            companyName: true
          }
        },
        adCreatives: {
          select: {
            id: true,
            emotionData: {
              select: {
                joyScore: true,
                surpriseScore: true,
                neutralScore: true,
                dwellTime: true
              }
            }
          }
        },
        adDeliveries: {
          select: {
            impressions: true,
            engagements: true,
            completions: true,
            viewerCount: true,
            device: {
              select: {
                name: true
              }
            },
            emotionData: {
              select: {
                joyScore: true,
                surpriseScore: true,
                neutralScore: true,
                dwellTime: true
              }
            }
          }
        }
      }
    });

    const processedCampaigns: ProcessedCampaign[] = (campaigns as CampaignWithRelations[]).map((campaign) => {
      const totalImpressions = campaign.adDeliveries.reduce((sum: number, delivery) => sum + Number(delivery.impressions || 0), 0);
      const totalEngagements = campaign.adDeliveries.reduce((sum: number, delivery) => sum + Number(delivery.engagements || 0), 0);
      const totalCompletions = campaign.adDeliveries.reduce((sum: number, delivery) => sum + Number(delivery.completions || 0), 0);
      const totalViewers = campaign.adDeliveries.reduce((sum: number, delivery) => sum + Number(delivery.viewerCount || 0), 0);

      // Combine emotion data from both adCreatives and adDeliveries
      const allEmotionData = [
        ...campaign.adCreatives.flatMap(creative => creative.emotionData),
        ...campaign.adDeliveries.flatMap(delivery => delivery.emotionData)
      ];

      const emotionScores = allEmotionData.reduce(
        (acc, data) => {
          acc.joyScore += Number(data.joyScore || 0);
          acc.surpriseScore += Number(data.surpriseScore || 0);
          acc.neutralScore += Number(data.neutralScore || 0);
          acc.dwellTime += Number(data.dwellTime || 0);
          acc.count++;
          return acc;
        },
        { joyScore: 0, surpriseScore: 0, neutralScore: 0, dwellTime: 0, count: 0 }
      );

      const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
      const completionRate = totalImpressions > 0 ? (totalCompletions / totalImpressions) * 100 : 0;

      const deviceDistribution = campaign.adDeliveries.reduce((acc: { [key: string]: number }, delivery) => {
        const deviceName = delivery.device?.name || 'unknown';
        acc[deviceName] = (acc[deviceName] || 0) + Number(delivery.impressions || 0);
        return acc;
      }, {});

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        advertiser: {
          id: campaign.advertiser.id,
          name: campaign.advertiser.companyName
        },
        totalImpressions,
        totalEngagements,
        totalCompletions,
        totalViewers,
        engagementRate,
        completionRate,
        emotionScores,
        deviceDistribution
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: processedCampaigns
    });

  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign metrics' }, { status: 500 });
  }
}

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '12m':
      return new Date(now.setMonth(now.getMonth() - 12));
    case '30d':
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
} 