"use server"

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma, CampaignStatus } from '@prisma/client';

// Validation schema for updating an advertiser
const updateAdvertiserSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100),
  contactPerson: z.string().min(1, "Contact person is required").max(100),
  phoneNumber: z.string().min(1, "Phone number is required").max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch advertiser with related data
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            image: true,
          },
        },
        campaigns: {
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            budget: true,
            startDate: true,
            endDate: true,
          },
        },
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { dateInitiated: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            status: true,
            dateInitiated: true,
            dateCompleted: true,
          },
        },
        _count: {
          select: {
            campaigns: true,
            payments: true,
          },
        },
      },
    });

    if (!advertiser) {
      return new NextResponse("Advertiser not found", { status: 404 });
    }

    // Calculate total spend
    const totalSpend = await prisma.payment.aggregate({
      where: {
        advertiserId: params.id,
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    // Format response
    const response = {
      ...advertiser,
      totalSpend: totalSpend._sum.amount || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[ADVERTISER_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = updateAdvertiserSchema.parse(body);

    // Update advertiser
    const updatedAdvertiser = await prisma.advertiser.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAdvertiser);
  } catch (error) {
    console.error("[ADVERTISER_UPDATE]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin session
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete advertiser and related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Get user ID for the advertiser
      const advertiser = await tx.advertiser.findUnique({
        where: { id: params.id },
        select: { userId: true },
      });

      if (!advertiser) {
        throw new Error("Advertiser not found");
      }

      // Delete all related data
      await tx.campaign.deleteMany({
        where: { advertiserId: params.id },
      });
      await tx.payment.deleteMany({
        where: { advertiserId: params.id },
      });
      await tx.billing.deleteMany({
        where: { advertiserId: params.id },
      });
      await tx.advertiser.delete({
        where: { id: params.id },
      });
      await tx.user.delete({
        where: { id: advertiser.userId },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ADVERTISER_DELETE]", error);
    if (error instanceof Error && error.message === "Advertiser not found") {
      return new NextResponse("Advertiser not found", { status: 404 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 