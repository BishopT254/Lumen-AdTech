import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

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

    // Get URL parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Parse dates or use defaults (last 30 days)
    const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    // Get total revenue (sum of all completed payments)
    const totalRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "COMPLETED",
        dateCompleted: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
      },
    });

    // Get total partner payouts (sum of all paid partner earnings)
    const totalPartnerPayouts = await prisma.partnerEarning.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        paidDate: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
      },
    });

    // Get outstanding invoices (sum of all unpaid or overdue billings)
    const outstandingInvoices = await prisma.billing.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["UNPAID", "OVERDUE", "PARTIALLY_PAID"] },
        dueDate: {
          gte: parsedStartDate,
        },
      },
    });

    // Get average transaction amount
    const avgTransactionResult = await prisma.$queryRaw<{ avg: number }[]>`
      SELECT AVG(amount) as avg FROM "Payment"
      WHERE status = 'COMPLETED'
      AND "dateCompleted" >= ${parsedStartDate}
      AND "dateCompleted" <= ${parsedEndDate}
    `;
    const avgTransaction = avgTransactionResult[0]?.avg || 0;

    // Get payment method distribution
    const paymentMethodDistribution = await prisma.payment.groupBy({
      by: ["paymentMethod"],
      _count: { _all: true },
      where: {
        dateInitiated: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
      },
    });

    // Calculate total count for percentage calculation
    const totalPayments = paymentMethodDistribution.reduce(
      (sum, item) => sum + item._count._all,
      0
    );

    // Format payment method distribution for chart
    const formattedPaymentMethodDistribution = paymentMethodDistribution.map((item) => ({
      name: item.paymentMethod,
      value: Math.round((item._count._all / totalPayments) * 100),
    }));

    // Get monthly revenue data for chart
    const monthlyRevenueData = await prisma.$queryRaw<{ month: string; revenue: number; expenses: number }[]>`
      SELECT 
        TO_CHAR(date_trunc('month', "dateCompleted"), 'Mon') as month,
        SUM(amount) as revenue,
        0 as expenses
      FROM "Payment"
      WHERE status = 'COMPLETED'
      AND "dateCompleted" >= ${parsedStartDate}
      AND "dateCompleted" <= ${parsedEndDate}
      GROUP BY date_trunc('month', "dateCompleted")
      ORDER BY date_trunc('month', "dateCompleted")
    `;

    // Get monthly partner payout data for expenses
    const monthlyPayoutData = await prisma.$queryRaw<{ month: string; amount: number }[]>`
      SELECT 
        TO_CHAR(date_trunc('month', "paidDate"), 'Mon') as month,
        SUM(amount) as amount
      FROM "PartnerEarning"
      WHERE status = 'PAID'
      AND "paidDate" >= ${parsedStartDate}
      AND "paidDate" <= ${parsedEndDate}
      GROUP BY date_trunc('month', "paidDate")
      ORDER BY date_trunc('month', "paidDate")
    `;

    // Merge revenue and expense data
    const revenueData = monthlyRevenueData.map(item => {
      const matchingPayout = monthlyPayoutData.find(payout => payout.month === item.month);
      return {
        month: item.month,
        revenue: Number(item.revenue),
        expenses: matchingPayout ? Number(matchingPayout.amount) : 0
      };
    });

    // Calculate percentage changes from previous period
    const previousPeriodStart = new Date(parsedStartDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
    
    const previousPeriodEnd = new Date(parsedStartDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

    // Previous period revenue
    const previousRevenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "COMPLETED",
        dateCompleted: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    // Previous period partner payouts
    const previousPartnerPayouts = await prisma.partnerEarning.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        paidDate: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    // Previous period outstanding invoices
    const previousOutstandingInvoices = await prisma.billing.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["UNPAID", "OVERDUE", "PARTIALLY_PAID"] },
        dueDate: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
    });

    // Previous period average transaction
    const prevAvgTransactionResult = await prisma.$queryRaw<{ avg: number }[]>`
      SELECT AVG(amount) as avg FROM "Payment"
      WHERE status = 'COMPLETED'
      AND "dateCompleted" >= ${previousPeriodStart}
      AND "dateCompleted" <= ${previousPeriodEnd}
    `;
    const prevAvgTransaction = prevAvgTransactionResult[0]?.avg || 0;

    // Calculate percentage changes
    const revenueChange = calculatePercentageChange(
      totalRevenue._sum.amount || 0,
      previousRevenue._sum.amount || 0
    );
    
    const payoutsChange = calculatePercentageChange(
      totalPartnerPayouts._sum.amount || 0,
      previousPartnerPayouts._sum.amount || 0
    );
    
    const outstandingChange = calculatePercentageChange(
      outstandingInvoices._sum.total || 0,
      previousOutstandingInvoices._sum.total || 0
    );
    
    const avgTransactionChange = calculatePercentageChange(
      avgTransaction,
      prevAvgTransaction
    );

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPartnerPayouts: totalPartnerPayouts._sum.amount || 0,
      outstandingInvoices: outstandingInvoices._sum.total || 0,
      avgTransaction,
      paymentMethodDistribution: formattedPaymentMethodDistribution,
      revenueData,
      changes: {
        revenueChange,
        payoutsChange,
        outstandingChange,
        avgTransactionChange
      }
    });
  } catch (error) {
    console.error("Error fetching payment overview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number(((current - previous) / previous * 100).toFixed(1));
}
