import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

// Get a specific user
export async function GET(request: Request, { params }: RouteParams) {
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
    
    // Fetch the user with necessary details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        advertiser: {
          select: {
            companyName: true,
          }
        },
        partner: {
          select: {
            companyName: true,
          }
        },
        sessions: {
          orderBy: {
            expires: 'desc',
          },
          take: 1,
          select: {
            expires: true,
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Determine status based on various factors
    let status: 'active' | 'inactive' | 'pending' | 'suspended' = 'inactive';
    
    // If has recent session, mark as active
    if (user.sessions && user.sessions.length > 0) {
      const latestSession = user.sessions[0];
      if (new Date(latestSession.expires) > new Date()) {
        status = 'active';
      }
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      status = 'pending';
    }
    
    // Get company name from appropriate relation
    let companyName = null;
    if (user.role === 'ADVERTISER' && user.advertiser) {
      companyName = user.advertiser.companyName;
    } else if (user.role === 'PARTNER' && user.partner) {
      companyName = user.partner.companyName;
    }
    
    // Get last login time (using expiry of most recent session as proxy)
    const lastLogin = user.sessions && user.sessions.length > 0 
      ? user.sessions[0].expires 
      : null;
    
    const processedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      companyName,
      status,
      lastLogin,
    };
    
    return NextResponse.json(processedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// Update a user
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
    const data = await request.json();
    
    // Validate if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        // Handle specific role data updates
        ...(data.role === 'ADVERTISER' && data.companyName && {
          advertiser: {
            upsert: {
              create: { companyName: data.companyName },
              update: { companyName: data.companyName }
            }
          }
        }),
        ...(data.role === 'PARTNER' && data.companyName && {
          partner: {
            upsert: {
              create: { companyName: data.companyName },
              update: { companyName: data.companyName }
            }
          }
        })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Delete a user
export async function DELETE(request: Request, { params }: RouteParams) {
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
    
    // Validate if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // First delete related records for this user
    await prisma.$transaction([
      // Delete sessions
      prisma.session.deleteMany({
        where: { userId }
      }),
      // Delete advertiser profile if exists
      prisma.advertiser.deleteMany({
        where: { userId }
      }),
      // Delete partner profile if exists
      prisma.partner.deleteMany({
        where: { userId }
      }),
      // Delete admin profile if exists
      prisma.admin.deleteMany({
        where: { userId }
      }),
      // Finally delete the user
      prisma.user.delete({
        where: { id: userId }
      })
    ]);
    
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 