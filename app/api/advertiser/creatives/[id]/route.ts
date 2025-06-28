import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/advertiser/creatives/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Get the creative with campaign info
    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            advertiserId: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Verify the creative belongs to a campaign owned by this advertiser
    if (creative.campaign.advertiserId !== advertiser.id) {
      return NextResponse.json(
        { error: 'You do not have access to this creative' }, 
        { status: 403 }
      );
    }

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error fetching creative:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the creative' }, 
      { status: 500 }
    );
  }
}

// Validation schema for creative updates
const updateCreativeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  campaignId: z.string().min(1, 'Campaign ID is required').optional(),
  content: z.string().min(1, 'Content URL is required').optional(),
  format: z.string().min(1, 'Format is required').optional(),
  previewImage: z.string().optional(),
  duration: z.number().optional(),
  ar_markers: z.any().optional(),
  voiceCommands: z.any().optional(),
});

// PATCH /api/advertiser/creatives/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    
    // Validate the request body
    const validationResult = updateCreativeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message }, 
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Get the creative to verify ownership
    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            advertiserId: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Verify the creative belongs to a campaign owned by this advertiser
    if (creative.campaign.advertiserId !== advertiser.id) {
      return NextResponse.json(
        { error: 'You do not have access to this creative' }, 
        { status: 403 }
      );
    }

    // If campaign ID is being changed, verify the new campaign belongs to the advertiser
    if (updateData.campaignId && updateData.campaignId !== creative.campaignId) {
      const newCampaign = await prisma.campaign.findUnique({
        where: { id: updateData.campaignId },
        select: { advertiserId: true }
      });

      if (!newCampaign) {
        return NextResponse.json({ error: 'New campaign not found' }, { status: 404 });
      }

      if (newCampaign.advertiserId !== advertiser.id) {
        return NextResponse.json(
          { error: 'New campaign does not belong to this advertiser' }, 
          { status: 403 }
        );
      }
    }

    // When updating a creative, reset approval status if content is changing
    const resetApproval = updateData.content !== undefined;

    // Update the creative
    const updatedCreative = await prisma.adCreative.update({
      where: { id },
      data: {
        ...updateData,
        // Reset approval status if content is changing
        ...(resetApproval && { isApproved: false }),
      },
    });

    return NextResponse.json(updatedCreative);
  } catch (error) {
    console.error('Error updating creative:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the creative' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/advertiser/creatives/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Get the advertiser ID for the current user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!advertiser) {
      return NextResponse.json({ error: 'Advertiser profile not found' }, { status: 404 });
    }

    // Get the creative to verify ownership
    const creative = await prisma.adCreative.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            advertiserId: true,
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Verify the creative belongs to a campaign owned by this advertiser
    if (creative.campaign.advertiserId !== advertiser.id) {
      return NextResponse.json(
        { error: 'You do not have access to this creative' }, 
        { status: 403 }
      );
    }

    // Check if this creative is in use in any ad deliveries
    const adDeliveries = await prisma.adDelivery.findMany({
      where: { adCreativeId: id },
      take: 1, // We only need to know if there are any
    });

    if (adDeliveries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a creative that is being used in active ad deliveries' }, 
        { status: 400 }
      );
    }

    // Delete the creative
    await prisma.adCreative.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Creative deleted successfully' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting creative:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the creative' }, 
      { status: 500 }
    );
  }
} 