"use server"

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, CampaignStatus, BillingStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schema for creating a new advertiser
const createAdvertiserSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100),
  contactPerson: z.string().min(1, "Contact person is required").max(100),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required").max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// Map frontend status to Prisma CampaignStatus
const statusMap: Record<string, CampaignStatus> = {
  active: CampaignStatus.ACTIVE,
  pending: CampaignStatus.PENDING_APPROVAL,
  draft: CampaignStatus.DRAFT,
  completed: CampaignStatus.COMPLETED,
  rejected: CampaignStatus.REJECTED,
  paused: CampaignStatus.PAUSED,
};

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'companyName';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Build where clause
    let where: Prisma.AdvertiserWhereInput = {};
    
    // Add search filter
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Add status filter using correct enum value
    if (status !== 'all' && status in statusMap) {
      where.campaigns = {
        some: {
          status: statusMap[status],
        }
      };
    }

    // Build sort object
    let orderBy: Prisma.AdvertiserOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'companyName':
      case 'createdAt':
        orderBy[sortBy] = sortOrder;
        break;
      case 'status':
        orderBy.campaigns = {
          _count: sortOrder,
        };
        break;
      case 'totalSpend':
        orderBy.payments = {
          _count: sortOrder,
        };
        break;
      default:
        orderBy.companyName = 'asc';
    }

    // Fetch advertisers with pagination
    const [advertisers, total] = await Promise.all([
      prisma.advertiser.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true
            }
          },
          _count: {
            select: {
              campaigns: true,
              payments: true
            }
          },
          campaigns: {
            select: {
              status: true
            }
          },
          payments: {
            where: {
              status: 'COMPLETED'
            },
            select: {
              amount: true
            }
          }
        },
        orderBy,
        skip,
        take: pageSize
      }),
      prisma.advertiser.count({ where })
    ]);

    // Process advertisers data
    const processedAdvertisers = advertisers.map(advertiser => ({
      ...advertiser,
      status: determineAdvertiserStatus(advertiser.campaigns),
      totalSpend: advertiser.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      campaigns: undefined, // Remove raw campaigns data
      payments: undefined // Remove raw payments data
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      advertisers: processedAdvertisers,
      pagination: {
        total,
        pages: totalPages,
        currentPage: page,
        pageSize,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error) {
    console.error('Error fetching advertisers:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper function to determine advertiser status using correct enum values
function determineAdvertiserStatus(campaigns: { status: CampaignStatus }[]): string {
  if (!campaigns.length) return 'inactive';
  if (campaigns.some(c => c.status === CampaignStatus.ACTIVE)) return 'active';
  if (campaigns.some(c => c.status === CampaignStatus.PENDING_APPROVAL)) return 'pending';
  return 'inactive';
}

export async function POST(req: Request) {
  try {
    // Check admin session
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = createAdvertiserSchema.parse(body)

    // Create user and advertiser in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          role: "ADVERTISER",
        },
      })

      // Create advertiser
      const advertiser = await tx.advertiser.create({
        data: {
          userId: user.id,
          companyName: validatedData.companyName,
          contactPerson: validatedData.contactPerson,
          phoneNumber: validatedData.phoneNumber,
          address: validatedData.address,
          city: validatedData.city,
          country: validatedData.country,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
            },
          },
        },
      })

      return advertiser
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating advertiser:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 