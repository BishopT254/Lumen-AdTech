import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns"

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

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousStartDate = new Date(startDate.getTime() - periodLength)
    const previousEndDate = new Date(endDate.getTime() - periodLength)

    // Fetch transactions for current period
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

    // Fetch transactions for previous period (for comparison)
    const previousTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
    })

    // Fetch payments
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

    // Calculate revenue metrics
    const totalRevenue = transactions
      .filter((t) => t.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const previousTotalRevenue = previousTransactions
      .filter((t) => t.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const revenueGrowth =
      previousTotalRevenue > 0 ? Math.round(((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100) : 0

    const pendingRevenue = transactions
      .filter((t) => t.status === "PENDING" && ["DEPOSIT", "PAYMENT"].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const completedTransactions = transactions.filter((t) => t.status === "COMPLETED")
    const totalTransactions = completedTransactions.length

    const previousTotalTransactions = previousTransactions.filter((t) => t.status === "COMPLETED").length

    const transactionGrowth =
      previousTotalTransactions > 0
        ? Math.round(((totalTransactions - previousTotalTransactions) / previousTotalTransactions) * 100)
        : 0

    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    const pendingPayouts = transactions.filter((t) => t.status === "PENDING" && t.type === "WITHDRAWAL").length

    const failedTransactions = transactions.filter((t) => t.status === "FAILED").length

    const refundedAmount = transactions
      .filter((t) => t.type === "REFUND" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Calculate payment method distribution
    const paymentMethodCounts: Record<string, number> = {}
    const paymentMethodAmounts: Record<string, number> = {}

    transactions.forEach((transaction) => {
      if (transaction.paymentMethod) {
        const method = transaction.paymentMethod.type
        paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1
        paymentMethodAmounts[method] = (paymentMethodAmounts[method] || 0) + Number(transaction.amount)
      }
    })

    let topPaymentMethod = "OTHER"
    let topPaymentMethodAmount = 0

    Object.entries(paymentMethodAmounts).forEach(([method, amount]) => {
      if (amount > topPaymentMethodAmount) {
        topPaymentMethod = method
        topPaymentMethodAmount = amount
      }
    })

    const topPaymentMethodPercentage = totalRevenue > 0 ? Math.round((topPaymentMethodAmount / totalRevenue) * 100) : 0

    // Generate daily revenue trends
    const dailyTrends: Record<string, { revenue: number; transactions: number; refunds: number }> = {}

    // Initialize all days in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, "yyyy-MM-dd")
      dailyTrends[dateKey] = { revenue: 0, transactions: 0, refunds: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in actual data
    transactions.forEach((transaction) => {
      const dateKey = format(new Date(transaction.date), "yyyy-MM-dd")

      if (dailyTrends[dateKey]) {
        if (transaction.status === "COMPLETED") {
          if (["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
            dailyTrends[dateKey].revenue += Number(transaction.amount)
          } else if (transaction.type === "REFUND") {
            dailyTrends[dateKey].refunds += Number(transaction.amount)
          }

          dailyTrends[dateKey].transactions += 1
        }
      }
    })

    // Convert to array format for charts
    const trends = Object.entries(dailyTrends).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      transactions: data.transactions,
      refunds: data.refunds,
    }))

    // Calculate revenue by source
    const sourceRevenue: Record<string, { amount: number; previousAmount: number }> = {
      "Advertiser Payments": { amount: 0, previousAmount: 0 },
      "Partner Commissions": { amount: 0, previousAmount: 0 },
      "Platform Fees": { amount: 0, previousAmount: 0 },
      "Campaign Deposits": { amount: 0, previousAmount: 0 },
      Other: { amount: 0, previousAmount: 0 },
    }

    // Current period
    transactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        // This is a simplified mapping - in a real app, you'd have more specific categorization
        if (transaction.reference?.includes("adv")) {
          sourceRevenue["Advertiser Payments"].amount += Number(transaction.amount)
        } else if (transaction.reference?.includes("partner")) {
          sourceRevenue["Partner Commissions"].amount += Number(transaction.amount)
        } else if (transaction.reference?.includes("fee")) {
          sourceRevenue["Platform Fees"].amount += Number(transaction.amount)
        } else if (transaction.reference?.includes("campaign")) {
          sourceRevenue["Campaign Deposits"].amount += Number(transaction.amount)
        } else {
          sourceRevenue["Other"].amount += Number(transaction.amount)
        }
      }
    })

    // Previous period
    previousTransactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        if (transaction.reference?.includes("adv")) {
          sourceRevenue["Advertiser Payments"].previousAmount += Number(transaction.amount)
        } else if (transaction.reference?.includes("partner")) {
          sourceRevenue["Partner Commissions"].previousAmount += Number(transaction.amount)
        } else if (transaction.reference?.includes("fee")) {
          sourceRevenue["Platform Fees"].previousAmount += Number(transaction.amount)
        } else if (transaction.reference?.includes("campaign")) {
          sourceRevenue["Campaign Deposits"].previousAmount += Number(transaction.amount)
        } else {
          sourceRevenue["Other"].previousAmount += Number(transaction.amount)
        }
      }
    })

    const bySource = Object.entries(sourceRevenue)
      .map(([source, data]) => {
        const growth =
          data.previousAmount > 0 ? Math.round(((data.amount - data.previousAmount) / data.previousAmount) * 100) : 0

        const percentage = totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0

        return {
          source,
          amount: data.amount,
          percentage,
          growth,
        }
      })
      .sort((a, b) => b.amount - a.amount)

    // Calculate revenue by payment method
    const byPaymentMethod = Object.entries(paymentMethodAmounts)
      .map(([method, amount]) => {
        const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0

        return {
          method,
          amount,
          percentage,
          transactions: paymentMethodCounts[method] || 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)

    // Generate monthly revenue data
    const monthlyRevenue: Record<string, { revenue: number; previousRevenue: number }> = {}

    // Current period
    transactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        const month = format(new Date(transaction.date), "MMM yyyy")

        if (!monthlyRevenue[month]) {
          monthlyRevenue[month] = { revenue: 0, previousRevenue: 0 }
        }

        monthlyRevenue[month].revenue += Number(transaction.amount)
      }
    })

    // Previous period
    previousTransactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        const month = format(new Date(transaction.date), "MMM yyyy")
        const currentMonth = format(new Date(transaction.date.getTime() + periodLength), "MMM yyyy")

        if (!monthlyRevenue[currentMonth]) {
          monthlyRevenue[currentMonth] = { revenue: 0, previousRevenue: 0 }
        }

        monthlyRevenue[currentMonth].previousRevenue += Number(transaction.amount)
      }
    })

    const byPeriod = Object.entries(monthlyRevenue)
      .map(([period, data]) => {
        const growth =
          data.previousRevenue > 0
            ? Math.round(((data.revenue - data.previousRevenue) / data.previousRevenue) * 100)
            : 0

        return {
          period,
          revenue: data.revenue,
          growth,
        }
      })
      .sort((a, b) => {
        // Sort by date (assuming format is "MMM yyyy")
        const dateA = new Date(a.period)
        const dateB = new Date(b.period)
        return dateA.getTime() - dateB.getTime()
      })

    // Generate partner revenue data
    const partnerRevenue: Record<
      string,
      {
        partnerId: string
        partnerName: string
        revenue: number
        previousRevenue: number
      }
    > = {}

    // Fetch partner data
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        companyName: true,
      },
    })

    // Initialize partner revenue
    partners.forEach((partner) => {
      partnerRevenue[partner.id] = {
        partnerId: partner.id,
        partnerName: partner.companyName,
        revenue: 0,
        previousRevenue: 0,
      }
    })

    // Calculate partner revenue from transactions
    // This is a simplified approach - in a real app, you'd have more specific relationships
    transactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && transaction.reference?.includes("partner:")) {
        const partnerId = transaction.reference.split("partner:")[1].split(":")[0]

        if (partnerRevenue[partnerId]) {
          partnerRevenue[partnerId].revenue += Number(transaction.amount)
        }
      }
    })

    // Previous period
    previousTransactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && transaction.reference?.includes("partner:")) {
        const partnerId = transaction.reference.split("partner:")[1].split(":")[0]

        if (partnerRevenue[partnerId]) {
          partnerRevenue[partnerId].previousRevenue += Number(transaction.amount)
        }
      }
    })

    const totalPartnerRevenue = Object.values(partnerRevenue).reduce((sum, p) => sum + p.revenue, 0)

    const byPartner = Object.values(partnerRevenue)
      .filter((p) => p.revenue > 0)
      .map((partner) => {
        const growth =
          partner.previousRevenue > 0
            ? Math.round(((partner.revenue - partner.previousRevenue) / partner.previousRevenue) * 100)
            : 0

        const percentage = totalPartnerRevenue > 0 ? (partner.revenue / totalPartnerRevenue) * 100 : 0

        return {
          partnerId: partner.partnerId,
          partnerName: partner.partnerName,
          revenue: partner.revenue,
          percentage,
          growth,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    // Generate advertiser revenue data
    const advertiserRevenue: Record<
      string,
      {
        advertiserId: string
        advertiserName: string
        revenue: number
        previousRevenue: number
      }
    > = {}

    // Fetch advertiser data
    const advertisers = await prisma.advertiser.findMany({
      select: {
        id: true,
        companyName: true,
      },
    })

    // Initialize advertiser revenue
    advertisers.forEach((advertiser) => {
      advertiserRevenue[advertiser.id] = {
        advertiserId: advertiser.id,
        advertiserName: advertiser.companyName,
        revenue: 0,
        previousRevenue: 0,
      }
    })

    // Calculate advertiser revenue from transactions
    transactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && transaction.reference?.includes("adv:")) {
        const advertiserId = transaction.reference.split("adv:")[1].split(":")[0]

        if (advertiserRevenue[advertiserId]) {
          advertiserRevenue[advertiserId].revenue += Number(transaction.amount)
        }
      }
    })

    // Previous period
    previousTransactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && transaction.reference?.includes("adv:")) {
        const advertiserId = transaction.reference.split("adv:")[1].split(":")[0]

        if (advertiserRevenue[advertiserId]) {
          advertiserRevenue[advertiserId].previousRevenue += Number(transaction.amount)
        }
      }
    })

    const totalAdvertiserRevenue = Object.values(advertiserRevenue).reduce((sum, a) => sum + a.revenue, 0)

    const byAdvertiser = Object.values(advertiserRevenue)
      .filter((a) => a.revenue > 0)
      .map((advertiser) => {
        const growth =
          advertiser.previousRevenue > 0
            ? Math.round(((advertiser.revenue - advertiser.previousRevenue) / advertiser.previousRevenue) * 100)
            : 0

        const percentage = totalAdvertiserRevenue > 0 ? (advertiser.revenue / totalAdvertiserRevenue) * 100 : 0

        return {
          advertiserId: advertiser.advertiserId,
          advertiserName: advertiser.advertiserName,
          revenue: advertiser.revenue,
          percentage,
          growth,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    // Generate geographic revenue data
    const geographicRevenue: Record<string, { revenue: number; previousRevenue: number }> = {
      "North America": { revenue: 0, previousRevenue: 0 },
      Europe: { revenue: 0, previousRevenue: 0 },
      Asia: { revenue: 0, previousRevenue: 0 },
      Africa: { revenue: 0, previousRevenue: 0 },
      "South America": { revenue: 0, previousRevenue: 0 },
      Oceania: { revenue: 0, previousRevenue: 0 },
    }

    // Simplified geographic mapping based on transaction metadata
    transactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        // In a real app, you'd extract this from actual geographic data
        // This is just a placeholder implementation
        const metadata = transaction.metadata as any
        let region = "North America" // Default

        if (metadata?.location?.continent) {
          region = metadata.location.continent
        } else if (transaction.reference?.includes("region:")) {
          region = transaction.reference.split("region:")[1].split(":")[0]
        }

        if (geographicRevenue[region]) {
          geographicRevenue[region].revenue += Number(transaction.amount)
        }
      }
    })

    // Previous period
    previousTransactions.forEach((transaction) => {
      if (transaction.status === "COMPLETED" && ["DEPOSIT", "PAYMENT"].includes(transaction.type)) {
        const metadata = transaction.metadata as any
        let region = "North America" // Default

        if (metadata?.location?.continent) {
          region = metadata.location.continent
        } else if (transaction.reference?.includes("region:")) {
          region = transaction.reference.split("region:")[1].split(":")[0]
        }

        if (geographicRevenue[region]) {
          geographicRevenue[region].previousRevenue += Number(transaction.amount)
        }
      }
    })

    const totalGeographicRevenue = Object.values(geographicRevenue).reduce((sum, g) => sum + g.revenue, 0)

    const byGeography = Object.entries(geographicRevenue)
      .map(([region, data]) => {
        const growth =
          data.previousRevenue > 0
            ? Math.round(((data.revenue - data.previousRevenue) / data.previousRevenue) * 100)
            : 0

        const percentage = totalGeographicRevenue > 0 ? (data.revenue / totalGeographicRevenue) * 100 : 0

        return {
          region,
          revenue: data.revenue,
          percentage,
          growth,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    // Generate revenue projections
    const projections = []
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Use historical data to project future months
    for (let i = 0; i < 6; i++) {
      const month = (currentMonth + i) % 12
      const year = currentYear + Math.floor((currentMonth + i) / 12)
      const monthName = format(new Date(year, month, 1), "MMM yyyy")

      // For past months, use actual data
      const isCurrentOrFutureMonth = year > currentYear || (year === currentYear && month >= currentMonth)

      // Simple projection based on growth rate
      const baseAmount = totalRevenue / 3 // Average monthly revenue
      const growthMultiplier = 1 + revenueGrowth / 100
      const projectedAmount = baseAmount * Math.pow(growthMultiplier, i)

      projections.push({
        month: monthName,
        projected: Math.round(projectedAmount),
        actual: isCurrentOrFutureMonth ? null : Math.round(baseAmount * (0.8 + Math.random() * 0.4)),
      })
    }

    // Compile the response
    const response = {
      overview: {
        totalRevenue,
        pendingRevenue,
        totalTransactions,
        averageTransactionValue,
        revenueGrowth,
        transactionGrowth,
        pendingPayouts,
        failedTransactions,
        refundedAmount,
        topPaymentMethod,
        topPaymentMethodPercentage,
      },
      trends,
      bySource,
      byPaymentMethod,
      transactions,
      payments,
      byPeriod,
      byPartner,
      byAdvertiser,
      byGeography,
      projections,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in revenue API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
