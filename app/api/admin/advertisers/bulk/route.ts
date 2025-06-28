import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CampaignStatus } from '@prisma/client';

// Validation schema for bulk actions
const bulkActionSchema = z.object({
  ids: z.array(z.string()),
  action: z.enum(['activate', 'deactivate', 'verify', 'delete'])
});

export async function POST(req: Request) {
  try {
    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { ids, action } = bulkActionSchema.parse(body);

    // Perform bulk action in a transaction
    await prisma.$transaction(async (tx) => {
      switch (action) {
        case 'activate':
          // Activate all campaigns for selected advertisers
          await tx.campaign.updateMany({
            where: {
              advertiserId: {
                in: ids,
              },
              status: {
                in: [CampaignStatus.PAUSED, CampaignStatus.PENDING_APPROVAL],
              },
            },
            data: {
              status: CampaignStatus.ACTIVE,
            },
          });
          break;

        case 'deactivate':
          // Pause all active campaigns for selected advertisers
          await tx.campaign.updateMany({
            where: {
              advertiserId: {
                in: ids,
              },
              status: CampaignStatus.ACTIVE,
            },
            data: {
              status: CampaignStatus.PAUSED,
            },
          });
          break;

        case 'verify':
          // Verify advertisers and their email addresses
          await tx.user.updateMany({
            where: {
              advertiser: {
                id: {
                  in: ids,
                },
              },
            },
            data: {
              emailVerified: new Date(),
            },
          });

          // Activate any pending campaigns
          await tx.campaign.updateMany({
            where: {
              advertiserId: {
                in: ids,
              },
              status: CampaignStatus.PENDING_APPROVAL,
            },
            data: {
              status: CampaignStatus.ACTIVE,
            },
          });
          break;

        case 'delete':
          // Delete advertisers and related data
          for (const id of ids) {
            // Get user ID for the advertiser
            const advertiser = await tx.advertiser.findUnique({
              where: { id },
              select: { userId: true },
            });

            if (advertiser) {
              // Delete all related data
              await tx.campaign.deleteMany({
                where: { advertiserId: id },
              });
              await tx.payment.deleteMany({
                where: { advertiserId: id },
              });
              await tx.billing.deleteMany({
                where: { advertiserId: id },
              });
              await tx.advertiser.delete({
                where: { id },
              });
              await tx.user.delete({
                where: { id: advertiser.userId },
              });
            }
          }
          break;
      }
    });

    return NextResponse.json({
      message: `Successfully ${action}d ${ids.length} advertisers`,
    });
  } catch (error) {
    console.error('[ADVERTISER_BULK_ACTION]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data', { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 