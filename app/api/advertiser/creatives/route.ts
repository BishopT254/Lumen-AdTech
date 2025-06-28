import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/advertiser/creatives
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Get all campaigns for this advertiser
    const campaigns = await prisma.campaign.findMany({
      where: { advertiserId: advertiser.id },
      select: { id: true }
    });

    const campaignIds = campaigns.map(campaign => campaign.id);

    // Parse query parameters
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');
    const type = url.searchParams.get('type');
    const isApproved = url.searchParams.get('isApproved') === 'true' ? true : 
                        url.searchParams.get('isApproved') === 'false' ? false : undefined;

    // Build the query
    const where = {
      campaignId: campaignId ? campaignId : { in: campaignIds },
      ...(type && { type }),
      ...(isApproved !== undefined && { isApproved }),
    };

    // Get creatives for all campaigns owned by this advertiser
    const creatives = await prisma.adCreative.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(creatives);
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching creatives' }, 
      { status: 500 }
    );
  }
}

// Validation schema for creative creation
const createCreativeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
  type: z.enum(['IMAGE', 'VIDEO', 'INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE']),
  content: z.string().min(1, 'Content URL is required'),
  format: z.string().min(1, 'Format is required'),
  previewImage: z.string().optional(),
  duration: z.number().optional(),
  ar_markers: z.any().optional(),
  voiceCommands: z.any().optional(),
});

// POST /api/advertiser/creatives
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validationResult = createCreativeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message }, 
        { status: 400 }
      );
    }

    const { 
      name, campaignId, type, content, format, previewImage, 
      duration, ar_markers, voiceCommands 
    } = validationResult.data;

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Verify campaign belongs to advertiser
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, advertiserId: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== advertiser.id) {
      return NextResponse.json({ error: 'Campaign does not belong to this advertiser' }, { status: 403 });
    }

    // Create the creative
    const creative = await prisma.adCreative.create({
      data: {
        name,
        type,
        content,
        format,
        campaignId,
        previewImage,
        duration,
        ar_markers: ar_markers ? ar_markers : undefined,
        voiceCommands: voiceCommands ? voiceCommands : undefined,
        isApproved: false, // All creatives start as not approved
      },
    });

    return NextResponse.json(creative, { status: 201 });
  } catch (error) {
    console.error('Error creating creative:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the creative' }, 
      { status: 500 }
    );
  }
} 