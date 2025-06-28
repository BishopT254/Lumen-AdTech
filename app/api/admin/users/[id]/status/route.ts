import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const userId = params.id;
    const { status } = await request.json();
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        role: true,
        name: true,
        email: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Validate status
    if (!['active', 'inactive', 'pending', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    let result;
    
    if (status === 'suspended') {
      // If suspending user, invalidate all their sessions
      await prisma.session.deleteMany({
        where: { userId }
      });
      
      // Create user flag for suspended status
      result = await prisma.userFlag.upsert({
        where: {
          userId_type: {
            userId,
            type: 'SUSPENSION'
          }
        },
        update: {
          active: true,
          updatedAt: new Date()
        },
        create: {
          userId,
          type: 'SUSPENSION',
          active: true,
          reason: 'Administrative suspension',
          expiresAt: null // Indefinite suspension
        }
      });
      
      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          type: 'ACCOUNT_SUSPENDED',
          details: `Account suspended by administrator ${session.user.email}`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
          device: request.headers.get('user-agent') || 'Unknown',
          timestamp: new Date()
        }
      });
    } else if (status === 'active' && await prisma.userFlag.findUnique({
      where: {
        userId_type: {
          userId,
          type: 'SUSPENSION'
        }
      }
    })) {
      // If reactivating, remove suspension flag
      result = await prisma.userFlag.update({
        where: {
          userId_type: {
            userId,
            type: 'SUSPENSION'
          }
        },
        data: {
          active: false,
          updatedAt: new Date()
        }
      });
      
      // Log activity
      await prisma.userActivity.create({
        data: {
          userId,
          type: 'ACCOUNT_REACTIVATED',
          details: `Account reactivated by administrator ${session.user.email}`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
          device: request.headers.get('user-agent') || 'Unknown',
          timestamp: new Date()
        }
      });
    } else {
      // For other status changes, we'll just log it
      result = { status: status };
      
      await prisma.userActivity.create({
        data: {
          userId,
          type: 'STATUS_CHANGED',
          details: `Account status changed to ${status} by administrator ${session.user.email}`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
          device: request.headers.get('user-agent') || 'Unknown',
          timestamp: new Date()
        }
      });
    }
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
} 