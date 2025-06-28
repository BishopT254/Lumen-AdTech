import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CampaignStatus } from '@prisma/client';

export async function GET() {
  try {
    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch all required metrics in parallel
    const [
      totalAdvertisers,
      activeAdvertisers,
      totalSpendResult,
      campaignStats,
      topSpenders,
      recentlyJoined,
    ] = await Promise.all([
      // Total advertisers count
      prisma.advertiser.count(),

      // Active advertisers (with active campaigns)
      prisma.advertiser.count({
        where: {
          campaigns: {
            some: {
              status: CampaignStatus.ACTIVE,
            },
          },
        },
      }),

      // Total spend across all advertisers
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),

      // Campaign statistics
      prisma.campaign.groupBy({
        by: ['advertiserId'],
        _count: true,
      }),

      // Top spenders
      prisma.advertiser.findMany({
        take: 5,
        include: {
          payments: {
            where: {
              status: 'COMPLETED',
            },
            select: {
              amount: true,
            },
          },
        },
        orderBy: {
          payments: {
            _count: 'desc',
          },
        },
      }),

      // Recently joined advertisers
      prisma.advertiser.findMany({
        take: 5,
        select: {
          id: true,
          companyName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    // Calculate average campaigns per advertiser
    const totalCampaigns = campaignStats.reduce((sum, stat) => sum + stat._count, 0);
    const averageCampaignsPerAdvertiser = totalAdvertisers
      ? Math.round((totalCampaigns / totalAdvertisers) * 100) / 100
      : 0;

    // Process top spenders data
    const processedTopSpenders = topSpenders.map((spender) => ({
      id: spender.id,
      companyName: spender.companyName,
      totalSpend: spender.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    }));

    return NextResponse.json({
      totalAdvertisers,
      activeAdvertisers,
      totalSpend: totalSpendResult._sum.amount || 0,
      averageCampaignsPerAdvertiser,
      topSpenders: processedTopSpenders,
      recentlyJoined,
    });
  } catch (error) {
    console.error('[ADVERTISER_METRICS]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 