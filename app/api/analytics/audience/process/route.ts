import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { processAudienceData } from '@/lib/audience-measurement';
import { authOptions } from '@/lib/auth-options';

// Validation schema for audience data
const AudienceDataSchema = z.object({
  deviceId: z.string().uuid(),
  timestamp: z.coerce.date().default(() => new Date()),
  imageData: z.string().optional(), // Base64 encoded image data
  videoData: z.string().optional(), // Base64 encoded video data or URL
  estimatedCount: z.number().optional(),
  demographics: z.object({
    ageRanges: z.record(z.string(), z.number()).optional(),
    genderDistribution: z.record(z.string(), z.number()).optional(),
  }).optional(),
  emotions: z.record(z.string(), z.number()).optional(),
  attentionLevel: z.number().min(0).max(1).optional(),
  deliveryId: z.string().uuid().optional(),
  apiKey: z.string().optional(), // For device authentication
});

/**
 * POST handler for processing audience data from devices
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Authenticate the request
    const isAuthenticated = await authenticateRequest(body, request);
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    // Validate request data
    const validationResult = AudienceDataSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Process the audience data
    const audienceData = validationResult.data;
    const result = await processAudienceData(audienceData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing audience data:', error);
    
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
async function authenticateRequest(body: any, request: Request): Promise<boolean> {
  // Check for API key authentication (for devices)
  if (body.apiKey) {
    try {
      // Verify API key against database
      const { prisma } = await import('@/lib/prisma');
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: body.apiKey },
      });
      
      if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsed: new Date() },
        });
        
        // Check if this API key is allowed to access the specified device
        if (body.deviceId) {
          const device = await prisma.device.findUnique({
            where: { id: body.deviceId },
            select: { id: true, partnerId: true },
          });
          
          if (!device) {
            return false;
          }
          
          // For partner API keys, check if the device belongs to the partner
          if (apiKey.entityType === 'PARTNER' && apiKey.entityId !== device.partnerId) {
            return false;
          }
          
          // For admin API keys, allow access to all devices
          if (apiKey.entityType === 'ADMIN') {
            return true;
          }
        }
        
        return true;
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
  
  // Allow access if the user is authenticated
  // For device-specific operations, we should check if the user has access to the device
  if (body.deviceId) {
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
          where: { id: body.deviceId },
          select: { partnerId: true },
        });
        
        return device?.partnerId === user.partner.id;
      }
      
      return false;
    } catch (error) {
      console.error('Session authentication error:', error);
      return false;
    }
  }
  
  return true;
}

/**
 * Not using GET for this endpoint as we need to send data
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to process audience data' },
    { status: 405 }
  );
} 