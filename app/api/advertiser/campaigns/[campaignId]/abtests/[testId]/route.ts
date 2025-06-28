import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string; testId: string } }
) {
  try {
    // Validate session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this campaign
    const campaign = await prisma.campaign.findUnique({
      where: { 
        id: params.campaignId,
        user: {
          email: session.user.email || '',
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Fetch the AB test with its variants and related data
    const abTest = await prisma.aBTest.findUnique({
      where: {
        id: params.id,
        campaignId: params.campaignId,
      },
      include: {
        variants: {
          include: {
            adCreative: {
              select: {
                id: true,
                name: true,
                fileUrl: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!abTest) {
      return NextResponse.json({ error: 'AB test not found' }, { status: 404 });
    }

    return NextResponse.json({ abTest });
  } catch (error) {
    console.error('Error fetching AB test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AB test' },
      { status: 500 }
    );
  }
} 