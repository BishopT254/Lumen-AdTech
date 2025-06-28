import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true
          }
        },
        devices: {
          select: {
            id: true,
            deviceId: true,
            status: true,
            lastSeen: true
          }
        }
      }
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Calculate total earnings
    const earnings = await prisma.partnerEarning.aggregate({
      where: { partnerId: params.id },
      _sum: { amount: true }
    });

    return NextResponse.json({
      ...partner,
      totalEarnings: earnings._sum.amount || new Decimal(0)
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      contactPerson,
      phoneNumber,
      address,
      city,
      country,
      commissionRate,
      paymentDetails,
      status
    } = body;

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: {
        companyName,
        contactPerson,
        phoneNumber,
        address,
        city,
        country,
        commissionRate: new Decimal(commissionRate),
        paymentDetails,
        status
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error('Error updating partner:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the partner to get the userId
    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Delete the partner and associated user
    await prisma.$transaction([
      prisma.partner.delete({
        where: { id: params.id }
      }),
      prisma.user.delete({
        where: { id: partner.userId }
      })
    ]);

    return NextResponse.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 