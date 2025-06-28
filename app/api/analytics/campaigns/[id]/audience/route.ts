import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { getCampaignAudienceInsights } from '@/lib/audience-measurement';
import { authOptions } from '@/lib/auth-options';

// Validation schema for query parameters
const QuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  apiKey: z.string().optional(),
});

/**
 * GET handler for retrieving campaign audience insights
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    // Validate campaign ID
    if (!campaignId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Invalid campaign ID' },
        { status: 400 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      apiKey: searchParams.get('apiKey'),
    };
    
    // Validate parameters
    const validationResult = QuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Authenticate the request
    const isAuthenticated = await authenticateRequest(campaignId, queryParams.apiKey);
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You do not have access to this campaign' },
        { status: 401 }
      );
    }
    
    // Get campaign audience insights
    const result = await getCampaignAudienceInsights(
      campaignId,
      queryParams.startDate,
      queryParams.endDate
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting campaign audience insights:', error);
    
    return NextResponse.json(
      { error: 'Server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Authenticate the request
 * Supports both NextAuth session and API key authentication
 */
async function authenticateRequest(campaignId: string, apiKey: string | null): Promise<boolean> {
  const { prisma } = await import('@/lib/prisma');
  
  // Check for API key authentication
  if (apiKey) {
    try {
      // Verify API key against database
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
      });
      
      if (apiKeyRecord && (!apiKeyRecord.expiresAt || apiKeyRecord.expiresAt > new Date())) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsed: new Date() },
        });
        
        // For admin API keys, allow access to all campaigns
        if (apiKeyRecord.entityType === 'ADMIN') {
          return true;
        }
        
        // For advertiser API keys, check if the campaign belongs to the advertiser
        if (apiKeyRecord.entityType === 'ADVERTISER') {
          const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { advertiserId: true },
          });
          
          return campaign?.advertiserId === apiKeyRecord.entityId;
        }
      }
      
      return false;
    } catch (error) {
      console.error('API key authentication error:', error);
      return false;
    }
  }
  
  // Otherwise, check for session authentication
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return false;
  }
  
  // Check if the user has access to the specified campaign
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        advertiser: true,
        admin: true,
      },
    });
    
    if (!user) {
      return false;
    }
    
    // Admins have access to all campaigns
    if (user.role === 'ADMIN') {
      return true;
    }
    
    // Advertisers only have access to their own campaigns
    if (user.role === 'ADVERTISER' && user.advertiser) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { advertiserId: true },
      });
      
      return campaign?.advertiserId === user.advertiser.id;
    }
    
    // Partners can access campaigns that are running on their devices
    if (user.role === 'PARTNER' && user.partner) {
      const hasDelivery = await prisma.adDelivery.findFirst({
        where: {
          campaignId,
          device: {
            partnerId: user.partner.id,
          },
        },
      });
      
      return !!hasDelivery;
    }
    
    return false;
  } catch (error) {
    console.error('Session authentication error:', error);
    return false;
  }
} 