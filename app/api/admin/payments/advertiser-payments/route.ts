import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    });

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get URL parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const method = url.searchParams.get("method");
    const search = url.searchParams.get("search");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const minAmount = url.searchParams.get("minAmount") ? parseFloat(url.searchParams.get("minAmount")!) : undefined;
    const maxAmount = url.searchParams.get("maxAmount") ? parseFloat(url.searchParams.get("maxAmount")!) : undefined;

    // Build filter conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (method) {
      where.paymentMethod = method;
    }

    if (startDate) {
      where.dateInitiated = {
        ...(where.dateInitiated || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.dateInitiated = {
        ...(where.dateInitiated || {}),
        lte: new Date(endDate),
      };
    }

    if (minAmount !== undefined) {
      where.amount = {
        ...(where.amount || {}),
        gte: minAmount,
      };
    }

    if (maxAmount !== undefined) {
      where.amount = {
        ...(where.amount || {}),
        lte: maxAmount,
      };
    }

    if (search) {
      where.OR = [
        {
          advertiser: {
            companyName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          transactionId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.payment.count({ where });

    // Get paginated payments with advertiser details
    const payments = await prisma.payment.findMany({
      where,
      include: {
        advertiser: true,
        billings: {
          select: {
            invoiceNumber: true,
          },
        },
      },
      orderBy: {
        dateInitiated: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format the response
    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      advertiser: payment.advertiser.companyName,
      advertiserId: payment.advertiserId,
      amount: payment.amount,
      method: payment.paymentMethod,
      status: payment.status,
      date: payment.dateInitiated,
      completedDate: payment.dateCompleted,
      transactionId: payment.transactionId,
      invoiceNumber: payment.billings[0]?.invoiceNumber || null,
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching advertiser payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    });

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const { action, paymentId, status, notes } = data;

    if (!paymentId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    let updatedPayment;

    // Process different actions
    switch (action) {
      case "updateStatus":
        if (!status) {
          return NextResponse.json({ error: "Status is required" }, { status: 400 });
        }

        updatedPayment = await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: status,
            dateCompleted: status === "COMPLETED" ? new Date() : payment.dateCompleted,
            notes: notes || payment.notes,
          },
        });

        // If payment is completed, update related billings
        if (status === "COMPLETED") {
          await prisma.billing.updateMany({
            where: { paymentId: paymentId },
            data: { status: "PAID" },
          });
        }
        break;

      case "refund":
        updatedPayment = await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "REFUNDED",
            notes: notes || "Refunded by admin",
          },
        });

        // Update related billings to UNPAID
        await prisma.billing.updateMany({
          where: { paymentId: paymentId },
          data: { 
            status: "UNPAID",
            paymentId: null 
          },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error("Error processing payment action:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
