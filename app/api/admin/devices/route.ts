import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for query parameters
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE']).optional(),
  type: z.enum(['ANDROID_TV', 'DIGITAL_SIGNAGE', 'INTERACTIVE_KIOSK', 'VEHICLE_MOUNTED', 'RETAIL_DISPLAY']).optional(),
  partnerId: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'status', 'lastActive', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Validation schema for device updates
const deviceUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE']).optional(),
  healthStatus: z.enum(['UNKNOWN', 'HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE']).optional(),
  location: z.record(z.any()).optional(),
  routeDetails: z.record(z.any()).optional(),
  partnerId: z.string().optional(),
});

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== 'ADMIN') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!await checkAdminAccess(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    
    const { page, limit, status, type, partnerId, search, sort, order } = parsed.data;
    
    // Build the where clause for filtering
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.deviceType = type;
    }
    
    if (partnerId) {
      where.partnerId = partnerId;
    }
    
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          deviceIdentifier: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    // Get devices with pagination
    const devices = await prisma.device.findMany({
      where,
      include: {
        partner: {
          select: {
            companyName: true,
            contactPerson: true,
            phoneNumber: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            adDeliveries: true,
            deviceAnalytics: true
          }
        }
      },
      orderBy: {
        [sort]: order
      },
      skip: (page - 1) * limit,
      take: limit
    });
    
    // Get total count for pagination
    const totalDevices = await prisma.device.count({
      where
    });
    
    // Get counts by status
    const statusCounts = await prisma.device.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });
    
    const statusStats = {
      ACTIVE: 0,
      PENDING: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
      MAINTENANCE: 0
    };
    
    statusCounts.forEach(count => {
      statusStats[count.status] = count._count._all;
    });
    
    // Get counts by device type
    const typeCounts = await prisma.device.groupBy({
      by: ['deviceType'],
      _count: {
        _all: true
      }
    });
    
    const typeStats = {
      ANDROID_TV: 0,
      DIGITAL_SIGNAGE: 0,
      INTERACTIVE_KIOSK: 0,
      VEHICLE_MOUNTED: 0,
      RETAIL_DISPLAY: 0
    };
    
    typeCounts.forEach(count => {
      typeStats[count.deviceType] = count._count._all;
    });
    
    return NextResponse.json({
      devices,
      total: totalDevices,
      pages: Math.ceil(totalDevices / limit),
      currentPage: page,
      statusStats,
      typeStats
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!await checkAdminAccess(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('id');
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = deviceUpdateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.format() 
      }, { status: 400 });
    }
    
    const {
      name,
      status,
      healthStatus,
      location,
      routeDetails,
      partnerId
    } = parsed.data;
    
    // Check if device exists
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });
    
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    
    // If changing partner, verify the partner exists
    if (partnerId && partnerId !== device.partnerId) {
      const partnerExists = await prisma.partner.findUnique({
        where: { id: partnerId }
      });
      
      if (!partnerExists) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (healthStatus) updateData.healthStatus = healthStatus;
    if (location) updateData.location = location;
    if (routeDetails) updateData.routeDetails = routeDetails;
    if (partnerId) updateData.partnerId = partnerId;
    
    // Update the device
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: updateData,
      include: {
        partner: {
          select: {
            companyName: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}

// Get detailed analytics for a specific device
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!await checkAdminAccess(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { deviceId, period = 'month' } = body;
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }
    
    // Check if device exists
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: {
          select: {
            companyName: true,
            contactPerson: true,
            phoneNumber: true
          }
        }
      }
    });
    
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    // Get analytics data
    const analyticsData = await prisma.deviceAnalytics.findMany({
      where: {
        deviceId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Get ad delivery data
    const adDeliveryData = await prisma.adDelivery.findMany({
      where: {
        deviceId,
        scheduledTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        campaign: {
          select: {
            name: true,
            advertiser: {
              select: {
                companyName: true
              }
            }
          }
        },
        adCreative: {
          select: {
            name: true,
            type: true,
            headline: true
          }
        }
      },
      orderBy: {
        scheduledTime: 'asc'
      }
    });
    
    // Calculate summary metrics
    const totalImpressions = adDeliveryData.reduce((sum, delivery) => sum + delivery.impressions, 0);
    const totalEngagements = adDeliveryData.reduce((sum, delivery) => sum + delivery.engagements, 0);
    const uptime = analyticsData.reduce((sum, analytics) => sum + analytics.uptime, 0);
    const avgUptime = analyticsData.length > 0 ? uptime / analyticsData.length : 0;
    
    // Get health metrics and history
    const healthHistory = await prisma.device.findMany({
      where: {
        id: deviceId
      },
      select: {
        healthStatus: true,
        lastActive: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 30 // Last 30 updates
    });
    
    return NextResponse.json({
      device,
      analyticsData,
      adDeliveryData,
      summary: {
        totalImpressions,
        totalEngagements,
        engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
        avgUptime,
        totalDeliveries: adDeliveryData.length
      },
      healthHistory
    });
  } catch (error) {
    console.error('Error fetching device analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch device analytics' }, { status: 500 });
  }
} 