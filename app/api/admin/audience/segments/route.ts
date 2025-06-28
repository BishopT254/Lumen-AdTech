import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { SegmentType } from '@prisma/client';

// Validation schema for segment creation/update
const segmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(SegmentType).default(SegmentType.CUSTOM),
  rules: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greaterThan', 'lessThan', 'between']),
    value: z.union([z.string(), z.number(), z.array(z.number())]),
    type: z.enum(['demographic', 'behavioral', 'location', 'custom']).default('custom')
  })),
  isActive: z.boolean().default(true)
});

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SegmentType | null;
    const status = searchParams.get('status');

    // Build filter
    const where = {
      ...(type && { type }),
      ...(status && { isActive: status === 'active' })
    };

    // Fetch segments
    const segments = await prisma.audienceSegment.findMany({
      where,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            campaigns: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = segmentSchema.parse(body);

    // Create segment
    const segment = await prisma.audienceSegment.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        rules: validatedData.rules,
        isActive: validatedData.isActive,
        createdById: session.user.id
      }
    });

    return NextResponse.json(segment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Error creating segment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get segment ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Segment ID is required', { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = segmentSchema.parse(body);

    // Update segment
    const segment = await prisma.audienceSegment.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        rules: validatedData.rules,
        isActive: validatedData.isActive,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(segment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Error updating segment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get segment ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Segment ID is required', { status: 400 });
    }

    // Delete segment
    await prisma.audienceSegment.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting segment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 