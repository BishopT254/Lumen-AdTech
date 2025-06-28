import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total partners and active partners (partners with active devices)
    const [totalPartners, activePartners] = await Promise.all([
      prisma.partner.count(),
      prisma.partner.count({
        where: { 
          devices: {
            some: {
              status: 'ACTIVE'
            }
          }
        }
      })
    ]);

    // Get total devices
    const totalDevices = await prisma.device.count();

    // Get total earnings and average commission rate
    const earnings = await prisma.partnerEarning.aggregate({
      _sum: { amount: true }
    });

    const commissionRates = await prisma.partner.aggregate({
      _avg: { commissionRate: true }
    });

    // Get top earners
    const topEarners = await prisma.partnerEarning.groupBy({
      by: ['partnerId'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    });

    const topEarnersWithDetails = await Promise.all(
      topEarners.map(async (earner) => {
        const partner = await prisma.partner.findUnique({
          where: { id: earner.partnerId },
          select: { companyName: true }
        });
        return {
          id: earner.partnerId,
          companyName: partner?.companyName || 'Unknown',
          totalEarnings: earner._sum.amount || new Decimal(0)
        };
      })
    );

    // Get recently joined partners
    const recentlyJoined = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        companyName: true,
        createdAt: true
      }
    });

    // Get device distribution by partner
    const devicesByPartner = await prisma.partner.findMany({
      select: {
        id: true,
        companyName: true,
        _count: {
          select: { devices: true }
        }
      }
    });

    return NextResponse.json({
      totalPartners,
      activePartners,
      totalDevices,
      totalEarnings: earnings._sum.amount || new Decimal(0),
      averageCommissionRate: commissionRates._avg.commissionRate || new Decimal(0),
      topEarners: topEarnersWithDetails,
      recentlyJoined,
      devicesByPartner: devicesByPartner.map(p => ({
        partnerId: p.id,
        partnerName: p.companyName,
        deviceCount: p._count.devices
      }))
    });
  } catch (error) {
    console.error('Error fetching partner metrics:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 