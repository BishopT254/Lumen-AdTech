import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TransactionStatus, TransactionType } from "@prisma/client"

// Cache TTL in seconds (1 minute)
const CACHE_TTL = 60

/**
 * GET: Fetch partner wallet transactions with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get partner's wallet
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true },
    })

    if (!partner?.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Build where clause for filtering
    const where: any = {
      walletId: partner.wallet.id,
    }

    // Add type filter if provided (with proper type validation)
    if (type && Object.values(TransactionType).includes(type as TransactionType)) {
      where.type = type as TransactionType
    }

    // Add status filter if provided (with proper type validation)
    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus
    }

    // Get total count for pagination
    const total = await prisma.transaction.count({ where })

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        paymentMethod: {
          select: {
            id: true,
            type: true,
            status: true,
            isDefault: true,
            lastUsed: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: limit,
    })

    // Transform transactions to match the expected format in the frontend
    const transformedTransactions = transactions.map((transaction) => {
      // Extract payment method type as a string for the frontend
      const paymentMethod = transaction.paymentMethod ? String(transaction.paymentMethod.type) : undefined

      return {
        ...transaction,
        // Ensure these are strings for the frontend
        type: String(transaction.type),
        status: String(transaction.status),
        // Add the payment method as a string property
        paymentMethod,
      }
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return NextResponse.json({
      data: transformedTransactions,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasMore,
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

/**
 * POST: Export transactions to CSV
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body for filtering options
    const body = await request.json()
    const { startDate, endDate, type, status } = body

    // Get partner's wallet
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true },
    })

    if (!partner?.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Build where clause for filtering
    const where: any = {
      walletId: partner.wallet.id,
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Add type filter if provided
    if (type && Object.values(TransactionType).includes(type as TransactionType)) {
      where.type = type as TransactionType
    }

    // Add status filter if provided
    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        paymentMethod: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      count: transactions.length,
    })
  } catch (error) {
    console.error("Error exporting transactions:", error)
    return NextResponse.json({ error: "Failed to export transactions" }, { status: 500 })
  }
}
