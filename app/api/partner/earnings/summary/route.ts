import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns"

/**
 * GET: Fetch partner earnings summary
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get partner
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: {
        earnings: {
          orderBy: {
            periodStart: "desc",
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Calculate summary statistics
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    const startOfPreviousMonth = startOfMonth(subMonths(now, 1))
    const endOfPreviousMonth = endOfMonth(subMonths(now, 1))
    const startOfCurrentYear = startOfYear(now)

    // Get earnings for different periods
    const currentMonthEarnings = partner.earnings.filter(
      (earning) =>
        new Date(earning.periodStart) >= startOfCurrentMonth && new Date(earning.periodEnd) <= endOfCurrentMonth,
    )

    const previousMonthEarnings = partner.earnings.filter(
      (earning) =>
        new Date(earning.periodStart) >= startOfPreviousMonth && new Date(earning.periodEnd) <= endOfPreviousMonth,
    )

    const yearToDateEarnings = partner.earnings.filter((earning) => new Date(earning.periodStart) >= startOfCurrentYear)

    // Calculate totals
    const currentMonthTotal = currentMonthEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0)

    const previousMonthTotal = previousMonthEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0)

    const yearToDateTotal = yearToDateEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0)

    // Calculate percentage change
    const percentageChange =
      previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0

    // Calculate pending payments
    const pendingPayments = partner.earnings
      .filter((earning) => earning.status === "PENDING")
      .reduce((sum, earning) => sum + Number(earning.amount), 0)

    // Get last payment
    const lastPaidEarning = partner.earnings.find((earning) => earning.status === "PAID")

    // Calculate total impressions and engagements
    const totalImpressions = partner.earnings.reduce((sum, earning) => sum + earning.totalImpressions, 0)

    const totalEngagements = partner.earnings.reduce((sum, earning) => sum + earning.totalEngagements, 0)

    // Calculate average engagement rate
    const averageEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    // Calculate projected earnings for the year
    const monthsPassed = now.getMonth() + 1
    const projectedEarnings = monthsPassed > 0 ? (yearToDateTotal / monthsPassed) * 12 : 0

    // Prepare summary response
    const summary = {
      totalEarnings: yearToDateTotal,
      pendingPayments,
      lastPaymentAmount: lastPaidEarning ? Number(lastPaidEarning.amount) : 0,
      lastPaymentDate: lastPaidEarning ? lastPaidEarning.paidDate : null,
      currentMonthEarnings: currentMonthTotal,
      previousMonthEarnings: previousMonthTotal,
      percentageChange,
      yearToDateEarnings: yearToDateTotal,
      projectedEarnings,
      totalImpressions,
      totalEngagements,
      averageEngagementRate,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Error fetching earnings summary:", error)
    return NextResponse.json({ error: "Failed to fetch earnings summary" }, { status: 500 })
  }
}
