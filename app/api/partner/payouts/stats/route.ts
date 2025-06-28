// Add a new route for payout statistics

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfYear, startOfMonth, endOfMonth, subMonths, format } from "date-fns"

/**
 * GET: Fetch payout statistics for the partner
 * @route /api/partner/payouts/stats
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
        wallet: true,
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    if (!partner.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Define date ranges
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    const startOfPreviousMonth = startOfMonth(subMonths(now, 1))
    const endOfPreviousMonth = endOfMonth(subMonths(now, 1))
    const startOfCurrentYear = startOfYear(now)

    // Get all transactions for the wallet
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId: partner.wallet.id,
        type: "WITHDRAWAL",
      },
    })

    // Calculate statistics
    const totalPayouts = transactions.length
    const totalAmount = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    const completedTransactions = transactions.filter((txn) => txn.status === "COMPLETED")
    const totalCompletedPayouts = completedTransactions.length
    const totalCompletedAmount = completedTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    const pendingTransactions = transactions.filter((txn) => txn.status === "PENDING" || txn.status === "PROCESSING")
    const totalPendingPayouts = pendingTransactions.length
    const totalPendingAmount = pendingTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    // Calculate monthly statistics
    const currentMonthTransactions = transactions.filter(
      (txn) => new Date(txn.date) >= startOfCurrentMonth && new Date(txn.date) <= endOfCurrentMonth,
    )
    const currentMonthPayouts = currentMonthTransactions.length
    const currentMonthAmount = currentMonthTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    const previousMonthTransactions = transactions.filter(
      (txn) => new Date(txn.date) >= startOfPreviousMonth && new Date(txn.date) <= endOfPreviousMonth,
    )
    const previousMonthPayouts = previousMonthTransactions.length
    const previousMonthAmount = previousMonthTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    const yearToDateTransactions = transactions.filter((txn) => new Date(txn.date) >= startOfCurrentYear)
    const yearToDatePayouts = yearToDateTransactions.length
    const yearToDateAmount = yearToDateTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0)

    // Calculate average processing time
    const processedTransactions = transactions.filter((txn) => txn.status === "COMPLETED" && txn.processedAt)

    let averageProcessingTime = 0
    if (processedTransactions.length > 0) {
      const totalProcessingTime = processedTransactions.reduce((sum, txn) => {
        const requestDate = new Date(txn.date)
        const processedDate = new Date(txn.processedAt!)
        const diffTime = Math.abs(processedDate.getTime() - requestDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return sum + diffDays
      }, 0)

      averageProcessingTime = totalProcessingTime / processedTransactions.length
    }

    // Calculate monthly breakdown
    const monthlyBreakdown = []
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))

      const monthTransactions = transactions.filter(
        (txn) => new Date(txn.date) >= monthStart && new Date(txn.date) <= monthEnd,
      )

      monthlyBreakdown.push({
        month: format(monthStart, "MMM yyyy"),
        count: monthTransactions.length,
        amount: monthTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0),
        completed: monthTransactions.filter((txn) => txn.status === "COMPLETED").length,
        pending: monthTransactions.filter((txn) => txn.status === "PENDING" || txn.status === "PROCESSING").length,
        cancelled: monthTransactions.filter((txn) => txn.status === "CANCELLED" || txn.status === "FAILED").length,
      })
    }

    // Prepare response
    const stats = {
      overview: {
        totalPayouts,
        totalAmount,
        totalCompletedPayouts,
        totalCompletedAmount,
        totalPendingPayouts,
        totalPendingAmount,
        averageProcessingTime,
      },
      current: {
        month: format(startOfCurrentMonth, "MMM yyyy"),
        payouts: currentMonthPayouts,
        amount: currentMonthAmount,
      },
      previous: {
        month: format(startOfPreviousMonth, "MMM yyyy"),
        payouts: previousMonthPayouts,
        amount: previousMonthAmount,
      },
      yearToDate: {
        payouts: yearToDatePayouts,
        amount: yearToDateAmount,
      },
      monthlyBreakdown,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching payout statistics:", error)
    return NextResponse.json({ error: "Failed to fetch payout statistics" }, { status: 500 })
  }
}
