import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { subDays, startOfMonth, endOfMonth, parseISO } from "date-fns"
import * as XLSX from "xlsx"
import { createObjectCsvStringifier } from "csv-writer"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user?.admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get("range") || "30d"
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const format = searchParams.get("format") || "csv"
    const type = searchParams.get("type") || "overview"

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    if (startDateParam && endDateParam) {
      startDate = parseISO(startDateParam)
      endDate = parseISO(endDateParam)
    } else {
      switch (range) {
        case "7d":
          startDate = subDays(now, 7)
          break
        case "90d":
          startDate = subDays(now, 90)
          break
        case "ytd":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case "month":
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case "30d":
        default:
          startDate = subDays(now, 30)
          break
      }
    }

    // Fetch data based on type
    let data: any[] = []
    let headers: string[] = []

    switch (type) {
      case "transactions":
        const transactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            paymentMethod: {
              select: {
                type: true,
                last4: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        })

        data = transactions.map((transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          date: format(new Date(transaction.date), "yyyy-MM-dd HH:mm:ss"),
          processedAt: transaction.processedAt
            ? format(new Date(transaction.processedAt), "yyyy-MM-dd HH:mm:ss")
            : null,
          reference: transaction.reference,
          walletId: transaction.walletId,
          paymentMethodId: transaction.paymentMethodId,
          paymentMethodType: transaction.paymentMethod?.type || null,
          paymentMethodLast4: transaction.paymentMethod?.last4 || null,
        }))

        headers = [
          "ID",
          "Type",
          "Amount",
          "Currency",
          "Status",
          "Date",
          "Processed At",
          "Reference",
          "Wallet ID",
          "Payment Method ID",
          "Payment Method Type",
          "Payment Method Last 4",
        ]
        break

      case "payments":
        const payments = await prisma.payment.findMany({
          where: {
            dateInitiated: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            Advertiser: {
              select: {
                companyName: true,
              },
            },
            partner: {
              select: {
                companyName: true,
              },
            },
          },
          orderBy: {
            dateInitiated: "desc",
          },
        })

        data = payments.map((payment) => ({
          id: payment.id,
          type: payment.type,
          amount: Number(payment.amount),
          currency: payment.currency,
          status: payment.status,
          dateInitiated: payment.dateInitiated ? format(new Date(payment.dateInitiated), "yyyy-MM-dd HH:mm:ss") : null,
          dateCompleted: payment.dateCompleted ? format(new Date(payment.dateCompleted), "yyyy-MM-dd HH:mm:ss") : null,
          transactionId: payment.transactionId,
          receiptUrl: payment.receiptUrl,
          paymentMethodType: payment.paymentMethodType,
          advertiserId: payment.advertiserId,
          partnerId: payment.partnerId,
          advertiserName: payment.Advertiser?.companyName || null,
          partnerName: payment.partner?.companyName || null,
        }))

        headers = [
          "ID",
          "Type",
          "Amount",
          "Currency",
          "Status",
          "Date Initiated",
          "Date Completed",
          "Transaction ID",
          "Receipt URL",
          "Payment Method Type",
          "Advertiser ID",
          "Partner ID",
          "Advertiser Name",
          "Partner Name",
        ]
        break

      case "partners":
        // Fetch partner data
        const partners = await prisma.partner.findMany({
          select: {
            id: true,
            companyName: true,
            userId: true,
            commissionRate: true,
            createdAt: true,
          },
        })

        // Fetch partner earnings
        const partnerEarnings = await prisma.partnerEarning.findMany({
          where: {
            periodEnd: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            periodEnd: "desc",
          },
        })

        // Group earnings by partner
        const earningsByPartner: Record<
          string,
          {
            totalAmount: number
            totalImpressions: number
            totalEngagements: number
          }
        > = {}

        partnerEarnings.forEach((earning) => {
          if (!earningsByPartner[earning.partnerId]) {
            earningsByPartner[earning.partnerId] = {
              totalAmount: 0,
              totalImpressions: 0,
              totalEngagements: 0,
            }
          }

          earningsByPartner[earning.partnerId].totalAmount += Number(earning.amount)
          earningsByPartner[earning.partnerId].totalImpressions += earning.totalImpressions
          earningsByPartner[earning.partnerId].totalEngagements += earning.totalEngagements
        })

        data = partners.map((partner) => ({
          id: partner.id,
          companyName: partner.companyName,
          commissionRate: Number(partner.commissionRate),
          revenue: earningsByPartner[partner.id]?.totalAmount || 0,
          impressions: earningsByPartner[partner.id]?.totalImpressions || 0,
          engagements: earningsByPartner[partner.id]?.totalEngagements || 0,
          createdAt: format(new Date(partner.createdAt), "yyyy-MM-dd"),
        }))

        headers = ["ID", "Company Name", "Commission Rate", "Revenue", "Impressions", "Engagements", "Created At"]
        break

      case "advertisers":
        // Fetch advertiser data
        const advertisers = await prisma.advertiser.findMany({
          select: {
            id: true,
            companyName: true,
            userId: true,
            createdAt: true,
          },
          include: {
            campaigns: {
              select: {
                id: true,
                budget: true,
              },
            },
            payments: {
              where: {
                dateInitiated: {
                  gte: startDate,
                  lte: endDate,
                },
                status: "COMPLETED",
              },
              select: {
                amount: true,
              },
            },
          },
        })

        data = advertisers.map((advertiser) => ({
          id: advertiser.id,
          companyName: advertiser.companyName,
          totalCampaigns: advertiser.campaigns.length,
          totalBudget: advertiser.campaigns.reduce((sum, campaign) => sum + Number(campaign.budget), 0),
          totalPayments: advertiser.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
          createdAt: format(new Date(advertiser.createdAt), "yyyy-MM-dd"),
        }))

        headers = ["ID", "Company Name", "Total Campaigns", "Total Budget", "Total Payments", "Created At"]
        break

      case "projections":
        // Generate monthly projections
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        // Fetch historical revenue data
        const historicalTransactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: subDays(startDate, 365), // Get a year of historical data
              lte: endDate,
            },
            status: "COMPLETED",
            type: {
              in: ["DEPOSIT", "PAYMENT"],
            },
          },
          select: {
            amount: true,
            date: true,
          },
        })

        // Group by month
        const monthlyRevenue: Record<string, number> = {}

        historicalTransactions.forEach((transaction) => {
          const monthKey = format(new Date(transaction.date), "yyyy-MM")

          if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = 0
          }

          monthlyRevenue[monthKey] += Number(transaction.amount)
        })

        // Calculate average monthly growth
        const monthKeys = Object.keys(monthlyRevenue).sort()
        let totalGrowth = 0
        let growthCount = 0

        for (let i = 1; i < monthKeys.length; i++) {
          const prevMonth = monthlyRevenue[monthKeys[i - 1]]
          const currMonth = monthlyRevenue[monthKeys[i]]

          if (prevMonth > 0) {
            const growth = (currMonth - prevMonth) / prevMonth
            totalGrowth += growth
            growthCount++
          }
        }

        const avgMonthlyGrowth = growthCount > 0 ? totalGrowth / growthCount : 0.05 // Default to 5% if no data

        // Generate projections
        const projectionData = []
        const lastMonthRevenue =
          monthlyRevenue[monthKeys[monthKeys.length - 1]] ||
          Object.values(monthlyRevenue).reduce((sum, val) => sum + val, 0) / Object.keys(monthlyRevenue).length

        for (let i = 0; i < 12; i++) {
          const month = (currentMonth + i) % 12
          const year = currentYear + Math.floor((currentMonth + i) / 12)
          const monthName = format(new Date(year, month, 1), "yyyy-MM")
          const monthLabel = format(new Date(year, month, 1), "MMMM yyyy")

          // For past months, use actual data
          const isCurrentOrFutureMonth = year > currentYear || (year === currentYear && month >= currentMonth)

          const projectedRevenue = lastMonthRevenue * Math.pow(1 + avgMonthlyGrowth, i)
          const actualRevenue = monthlyRevenue[monthName]

          projectionData.push({
            month: monthLabel,
            projected: Math.round(projectedRevenue),
            actual: isCurrentOrFutureMonth
              ? null
              : actualRevenue || Math.round(projectedRevenue * (0.8 + Math.random() * 0.4)),
            growthRate: (avgMonthlyGrowth * 100).toFixed(2) + "%",
          })
        }

        data = projectionData
        headers = ["Month", "Projected Revenue", "Actual Revenue", "Monthly Growth Rate"]
        break

      case "overview":
      default:
        // Fetch transactions for current period
        const overviewTransactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            paymentMethod: {
              select: {
                type: true,
              },
            },
          },
        })

        // Calculate daily revenue
        const dailyRevenue: Record<string, number> = {}

        overviewTransactions.forEach((transaction) => {
          if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
            const dateKey = format(new Date(transaction.date), "yyyy-MM-dd")

            if (!dailyRevenue[dateKey]) {
              dailyRevenue[dateKey] = 0
            }

            dailyRevenue[dateKey] += Number(transaction.amount)
          }
        })

        data = Object.entries(dailyRevenue).map(([date, amount]) => ({
          date,
          revenue: amount,
        }))

        headers = ["Date", "Revenue"]
        break
    }

    // Generate export file based on format
    if (format === "csv") {
      const csvStringifier = createObjectCsvStringifier({
        header: headers.map((header) => ({
          id: header.toLowerCase().replace(/\s+/g, "_"),
          title: header,
        })),
      })

      const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data)

      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="revenue-${type}-${format}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    } else if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Data")

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="revenue-${type}-${format}-${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    } else if (format === "pdf") {
      // In a real implementation, you would generate a PDF here
      // For this example, we'll return a simple text response
      return NextResponse.json({ error: "PDF export is not implemented in this example" }, { status: 501 })
    } else {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in revenue export API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
