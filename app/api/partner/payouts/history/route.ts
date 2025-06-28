// Add a new route for payout history with advanced filtering

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch partner payout history with advanced filtering
 * @route /api/partner/payouts/history
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const minAmount = searchParams.get("minAmount")
    const maxAmount = searchParams.get("maxAmount")
    const paymentMethod = searchParams.get("paymentMethod")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const sortBy = searchParams.get("sortBy") || "date"
    const sortOrder = searchParams.get("sortOrder") || "desc"

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

    // Build where clause for filtering
    const where: any = {
      walletId: partner.wallet.id,
      type: "WITHDRAWAL",
    }

    // Add status filter if provided
    if (status) {
      where.status = status
    }

    // Add date range filter if provided
    if (startDate) {
      where.date = {
        ...where.date,
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      }
    }

    // Add amount range filter if provided
    if (minAmount) {
      where.amount = {
        ...where.amount,
        gte: Number.parseFloat(minAmount),
      }
    }

    if (maxAmount) {
      where.amount = {
        ...where.amount,
        lte: Number.parseFloat(maxAmount),
      }
    }

    // Add payment method filter if provided
    if (paymentMethod) {
      where.paymentMethodId = paymentMethod
    }

    // Determine sort field
    const orderBy: any = {}
    switch (sortBy) {
      case "amount":
        orderBy.amount = sortOrder
        break
      case "status":
        orderBy.status = sortOrder
        break
      case "processedAt":
        orderBy.processedAt = sortOrder
        break
      case "date":
      default:
        orderBy.date = sortOrder
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({
      where,
    })

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        paymentMethod: true,
      },
    })

    // Transform transactions to payout requests
    const payoutRequests = await Promise.all(
      transactions.map(async (transaction) => {
        // Get related earning if exists
        const relatedEarning = await prisma.partnerEarning.findFirst({
          where: {
            transactionId: transaction.id,
          },
        })

        return {
          id: transaction.id,
          amount: Number(transaction.amount),
          status: mapTransactionStatusToPayoutStatus(transaction.status),
          requestDate: transaction.date.toISOString(),
          processedDate: transaction.processedAt?.toISOString(),
          paymentMethodId: transaction.paymentMethodId || undefined,
          paymentMethodType: transaction.paymentMethod?.type || "BANK_TRANSFER",
          reference: transaction.reference,
          description: transaction.description,
          earningId: relatedEarning?.id,
          fees: transaction.fee ? Number(transaction.fee) : 0,
          netAmount: transaction.fee
            ? Number(transaction.amount) - Number(transaction.fee)
            : Number(transaction.amount),
        }
      }),
    )

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      data: payoutRequests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error("Error fetching payout history:", error)
    return NextResponse.json({ error: "Failed to fetch payout history" }, { status: 500 })
  }
}

// Helper function to map transaction status to payout status
function mapTransactionStatusToPayoutStatus(status: string) {
  switch (status) {
    case "PENDING":
      return "PENDING"
    case "PROCESSING":
      return "APPROVED"
    case "COMPLETED":
      return "COMPLETED"
    case "FAILED":
      return "REJECTED"
    case "CANCELLED":
      return "CANCELLED"
    default:
      return "PENDING"
  }
}
