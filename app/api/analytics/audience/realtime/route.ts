import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { getRealTimeAudienceData } from '@/lib/audience-measurement';
import { authOptions } from '@/lib/auth-options';

// Validation schema for query parameters
const QuerySchema = z.object({
  deviceId: z.string().uuid(),
  apiKey: z.string().optional(), // For device authentication
});

/**
 * GET handler for retrieving real-time audience data
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const apiKey = searchParams.get('apiKey');
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Device ID is required' },
        { status: 400 }
      );
    }
    
    // Validate parameters
    const validationResult = QuerySchema.safeParse({ deviceId, apiKey });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Authenticate the request
    const isAuthenticated = await authenticateRequest(deviceId, apiKey, request);
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    // Get real-time audience data
    const result = await getRealTimeAudienceData(deviceId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting real-time audience data:', error);
    
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
async function authenticateRequest(deviceId: string, apiKey: string | null, request: Request): Promise<boolean> {
  // Check for API key authentication (for devices)
  if (apiKey) {
    try {
      // Verify API key against database
      const { prisma } = await import('@/lib/prisma');
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
      });
      
      if (apiKeyRecord && (!apiKeyRecord.expiresAt || apiKeyRecord.expiresAt > new Date())) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsed: new Date() },
        });
        
        // Check if this API key is allowed to access the specified device
        const device = await prisma.device.findUnique({
          where: { id: deviceId },
          select: { id: true, partnerId: true },
        });
        
        if (!device) {
          return false;
        }
        
        // For partner API keys, check if the device belongs to the partner
        if (apiKeyRecord.entityType === 'PARTNER' && apiKeyRecord.entityId !== device.partnerId) {
          return false;
        }
        
        // For admin API keys, allow access to all devices
        if (apiKeyRecord.entityType === 'ADMIN') {
          return true;
        }
        
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('API key authentication error:', error);
      return false;
    }
  }
  
  // Otherwise, check for session authentication (for web clients)
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return false;
  }
  
  // Check if the user has access to the specified device
  try {
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        partner: true,
        admin: true,
      },
    });
    
    if (!user) {
      return false;
    }
    
    // Admins have access to all devices
    if (user.role === 'ADMIN') {
      return true;
    }
    
    // Partners only have access to their own devices
    if (user.role === 'PARTNER' && user.partner) {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        select: { partnerId: true },
      });
      
      return device?.partnerId === user.partner.id;
    }
    
    // Advertisers can access devices if they have an active campaign running on them
    if (user.role === 'ADVERTISER' && user.advertiser) {
      const hasActiveCampaign = await prisma.adDelivery.findFirst({
        where: {
          deviceId,
          status: {
            in: ['SCHEDULED', 'DELIVERING'],
          },
          campaign: {
            advertiserId: user.advertiser.id,
          },
        },
      });
      
      return !!hasActiveCampaign;
    }
    
    return false;
  } catch (error) {
    console.error('Session authentication error:', error);
    return false;
  }
} 