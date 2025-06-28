import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get URL parameters
    const url = new URL(req.url)
    const reportType = url.searchParams.get("type") || "revenue"
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const groupBy = url.searchParams.get("groupBy") || "month"

    // Parse dates or use defaults (last 12 months)
    const parsedEndDate = endDate ? new Date(endDate) : new Date()
    let parsedStartDate

    if (startDate) {
      parsedStartDate = new Date(startDate)
    } else {
      parsedStartDate = new Date(parsedEndDate)
      parsedStartDate.setMonth(parsedStartDate.getMonth() - 12)
    }

    let reportData

    switch (reportType) {
      case "revenue":
        reportData = await generateRevenueReport(parsedStartDate, parsedEndDate, groupBy)
        break
      case "payouts":
        reportData = await generatePayoutsReport(parsedStartDate, parsedEndDate, groupBy)
        break
      case "invoices":
        reportData = await generateInvoicesReport(parsedStartDate, parsedEndDate, groupBy)
        break
      case "payment-methods":
        reportData = await generatePaymentMethodsReport(parsedStartDate, parsedEndDate)
        break
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    return NextResponse.json({
      reportType,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      groupBy,
      data: reportData,
    })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateRevenueReport(startDate: Date, endDate: Date, groupBy: string) {
  let groupFormat
  const dateField = "dateCompleted"

  switch (groupBy) {
    case "day":
      groupFormat = "YYYY-MM-DD"
      break
    case "week":
      groupFormat = "YYYY-WW"
      break
    case "month":
      groupFormat = "YYYY-MM"
      break
    case "quarter":
      groupFormat = "YYYY-Q"
      break
    case "year":
      groupFormat = "YYYY"
      break
    default:
      groupFormat = "YYYY-MM"
  }

  // Get revenue data grouped by the specified period
  const revenueData = await prisma.$queryRaw<any[]>`
    SELECT 
      TO_CHAR(DATE_TRUNC(${groupBy}, ${dateField}), ${groupFormat}) as period,
      SUM(amount) as revenue,
      COUNT(*) as transactions
    FROM "Payment"
    WHERE status = 'COMPLETED'
    AND ${dateField} >= ${startDate}
    AND ${dateField} <= ${endDate}
    GROUP BY DATE_TRUNC(${groupBy}, ${dateField})
    ORDER BY DATE_TRUNC(${groupBy}, ${dateField})
  `

  return revenueData
}

async function generatePayoutsReport(startDate: Date, endDate: Date, groupBy: string) {
  let groupFormat
  const dateField = "paidDate"

  switch (groupBy) {
    case "day":
      groupFormat = "YYYY-MM-DD"
      break
    case "week":
      groupFormat = "YYYY-WW"
      break
    case "month":
      groupFormat = "YYYY-MM"
      break
    case "quarter":
      groupFormat = "YYYY-Q"
      break
    case "year":
      groupFormat = "YYYY"
      break
    default:
      groupFormat = "YYYY-MM"
  }

  // Get payout data grouped by the specified period
  const payoutData = await prisma.$queryRaw<any[]>`
    SELECT 
      TO_CHAR(DATE_TRUNC(${groupBy}, ${dateField}), ${groupFormat}) as period,
      SUM(amount) as amount,
      COUNT(*) as count
    FROM "PartnerEarning"
    WHERE status = 'PAID'
    AND ${dateField} >= ${startDate}
    AND ${dateField} <= ${endDate}
    GROUP BY DATE_TRUNC(${groupBy}, ${dateField})
    ORDER BY DATE_TRUNC(${groupBy}, ${dateField})
  `

  return payoutData
}

async function generateInvoicesReport(startDate: Date, endDate: Date, groupBy: string) {
  let groupFormat
  const dateField = "createdAt"

  switch (groupBy) {
    case "day":
      groupFormat = "YYYY-MM-DD"
      break
    case "week":
      groupFormat = "YYYY-WW"
      break
    case "month":
      groupFormat = "YYYY-MM"
      break
    case "quarter":
      groupFormat = "YYYY-Q"
      break
    case "year":
      groupFormat = "YYYY"
      break
    default:
      groupFormat = "YYYY-MM"
  }

  // Get invoice data grouped by the specified period and status
  const invoiceData = await prisma.$queryRaw<any[]>`
    SELECT 
      TO_CHAR(DATE_TRUNC(${groupBy}, ${dateField}), ${groupFormat}) as period,
      status,
      SUM(total) as amount,
      COUNT(*) as count
    FROM "Billing"
    WHERE ${dateField} >= ${startDate}
    AND ${dateField} <= ${endDate}
    GROUP BY DATE_TRUNC(${groupBy}, ${dateField}), status
    ORDER BY DATE_TRUNC(${groupBy}, ${dateField}), status
  `

  return invoiceData
}

async function generatePaymentMethodsReport(startDate: Date, endDate: Date) {
  // Get payment method distribution
  const paymentMethodData = await prisma.payment.groupBy({
    by: ["paymentMethod"],
    _sum: { amount: true },
    _count: { _all: true },
    where: {
      dateInitiated: {
        gte: startDate,
        lte: endDate,
      },
      status: "COMPLETED",
    },
  })

  // Calculate total for percentage calculation
  const totalAmount = paymentMethodData.reduce((sum, item) => sum + (item._sum.amount || 0), 0)

  // Format payment method distribution for chart
  const formattedData = paymentMethodData.map((item) => ({
    method: item.paymentMethod,
    amount: item._sum.amount || 0,
    count: item._count._all,
    percentage: totalAmount > 0 ? ((item._sum.amount || 0) / totalAmount) * 100 : 0,
  }))

  return formattedData
}

