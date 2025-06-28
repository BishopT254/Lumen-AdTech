import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch partner payout requests
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
        wallet: {
          include: {
            transactions: {
              where: {
                type: "WITHDRAWAL",
              },
              orderBy: {
                date: "desc",
              },
              include: {
                paymentMethod: true,
              },
            },
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    if (!partner.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Transform transactions to payout requests
    const payoutRequests = partner.wallet.transactions.map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      status: mapTransactionStatusToPayoutStatus(transaction.status),
      requestDate: transaction.date.toISOString(),
      processedDate: transaction.processedAt?.toISOString(),
      paymentMethodId: transaction.paymentMethodId || undefined,
      paymentMethodType: transaction.paymentMethod?.type || "BANK_TRANSFER",
    }))

    return NextResponse.json(payoutRequests)
  } catch (error) {
    console.error("Error fetching payout requests:", error)
    return NextResponse.json({ error: "Failed to fetch payout requests" }, { status: 500 })
  }
}

// Fix the POST method to handle the 400 error issue
// The issue is likely related to wallet validation or payment method handling

/**
 * POST: Create a new payout request
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { amount, paymentMethodId, earningId } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 })
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

    // Create wallet if it doesn't exist
    let wallet = partner.wallet
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          partnerId: partner.id,
          balance: 0,
          currency: "USD",
        },
      })
    }

    // Verify payment method belongs to partner
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: paymentMethodId,
        walletId: wallet.id,
      },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    // Get available balance from pending earnings if no wallet balance
    let availableBalance = Number(wallet.balance || 0)

    // If wallet balance is insufficient, check pending earnings
    if (availableBalance < amount) {
      const pendingEarnings = await prisma.partnerEarning.findMany({
        where: {
          partnerId: partner.id,
          status: "PENDING",
        },
      })

      const pendingAmount = pendingEarnings.reduce((sum, earning) => sum + Number(earning.amount), 0)
      availableBalance = Math.max(availableBalance, pendingAmount)
    }

    // Check if partner has enough balance
    if (availableBalance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // If earningId is provided, verify it belongs to partner and is pending
    let earning = null
    if (earningId) {
      earning = await prisma.partnerEarning.findUnique({
        where: {
          id: earningId,
          partnerId: partner.id,
          status: "PENDING",
        },
      })

      if (!earning) {
        return NextResponse.json({ error: "Invalid earning or earning is not pending" }, { status: 400 })
      }

      // Verify amount matches earning amount
      if (Number(earning.amount) !== amount) {
        return NextResponse.json({ error: "Amount must match earning amount" }, { status: 400 })
      }
    }

    // Get minimum payout amount from settings
    const configResponse = await prisma.systemConfig.findUnique({
      where: { configKey: "commission_rates" },
    })

    const commissionRates = (configResponse?.configValue as any) || {}
    const minimumPayout = commissionRates.minimumPayout || commissionRates.minimum_payout || 50

    // Check minimum payout amount
    if (amount < minimumPayout) {
      return NextResponse.json(
        {
          error: `Payout amount must be at least ${minimumPayout}`,
        },
        { status: 400 },
      )
    }

    // Create transaction in a transaction to ensure atomicity
    const transaction = await prisma.$transaction(async (prismaClient) => {
      // Create transaction record
      const txn = await prismaClient.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: amount,
          status: "PENDING",
          description: earningId ? `Payout request for earning ${earningId}` : "Payout request",
          paymentMethodId: paymentMethodId,
          date: new Date(),
          reference: `PAYOUT-${Date.now().toString().slice(-8)}`,
        },
      })

      // Update wallet balance if using wallet balance
      if (Number(wallet.balance) >= amount) {
        await prismaClient.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        })
      }

      // If earningId is provided, update earning status
      if (earningId && earning) {
        await prismaClient.partnerEarning.update({
          where: {
            id: earningId,
          },
          data: {
            status: "PROCESSED",
            transactionId: txn.id,
          },
        })
      }

      return txn
    })

    // Format response
    const payoutResponse = {
      id: transaction.id,
      amount: Number(transaction.amount),
      status: mapTransactionStatusToPayoutStatus(transaction.status),
      requestDate: transaction.date.toISOString(),
      paymentMethodId: transaction.paymentMethodId || undefined,
      paymentMethodType: paymentMethod.type,
      reference: transaction.reference,
      estimatedProcessingTime: 3, // 3 business days by default
    }

    return NextResponse.json(payoutResponse)
  } catch (error) {
    console.error("Error creating payout request:", error)
    return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 })
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
    case "CANCELLED":
      return "REJECTED"
    default:
      return "PENDING"
  }
}
