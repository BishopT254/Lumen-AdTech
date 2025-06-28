import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status !== 'all') {
      where.devices = {
        some: {
          status: status.toUpperCase()
        }
      };
    }

    // Get total count for pagination
    const total = await prisma.partner.count({ where });

    // Get partners with their devices and user info
    const partners = await prisma.partner.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true
          }
        },
        devices: {
          select: {
            id: true,
            status: true
          }
        },
        _count: {
          select: {
            devices: true,
            earnings: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // Calculate total earnings for each partner
    const partnersWithEarnings = await Promise.all(
      partners.map(async (partner) => {
        const earnings = await prisma.partnerEarning.aggregate({
          where: { partnerId: partner.id },
          _sum: { amount: true }
        });

        return {
          ...partner,
          totalEarnings: earnings._sum.amount || new Decimal(0)
        };
      })
    );

    return NextResponse.json({
      partners: partnersWithEarnings,
      pagination: {
        total,
        pages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize
      }
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      companyName,
      contactPerson,
      phoneNumber,
      address,
      city,
      country,
      commissionRate
    } = body;

    // Create user and partner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password,
          role: 'PARTNER'
        }
      });

      // Create partner
      const partner = await tx.partner.create({
        data: {
          userId: user.id,
          companyName,
          contactPerson,
          phoneNumber,
          address,
          city,
          country,
          commissionRate: new Decimal(commissionRate)
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true
            }
          },
          devices: {
            select: {
              id: true,
              status: true
            }
          },
          _count: {
            select: {
              devices: true,
              earnings: true
            }
          }
        }
      });

      return partner;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 