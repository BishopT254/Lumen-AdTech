import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addBusinessDays } from "date-fns"

/**
 * GET: Fetch partner payout request by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: params.id,
        walletId: partner.wallet.id,
        type: "WITHDRAWAL",
      },
      include: {
        paymentMethod: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }

    // Get related earning if exists
    const relatedEarning = await prisma.partnerEarning.findFirst({
      where: {
        transactionId: transaction.id,
      },
    })

    // Get payment method details with sensitive data masked
    const paymentMethodDetails = transaction.paymentMethod?.details
      ? maskSensitiveData(transaction.paymentMethod.type, transaction.paymentMethod.details as any)
      : {}

    // Calculate estimated arrival date (3 business days from now for pending, 3 business days from processed date for approved)
    let estimatedArrivalDate = null
    if (transaction.status === "PENDING") {
      estimatedArrivalDate = addBusinessDays(new Date(), 3).toISOString()
    } else if (transaction.status === "PROCESSING" && transaction.processedAt) {
      estimatedArrivalDate = addBusinessDays(transaction.processedAt, 3).toISOString()
    }

    // Get system settings for processing time
    const configResponse = await prisma.systemConfig.findUnique({
      where: { configKey: "commission_rates" },
    })

    const commissionRates = (configResponse?.configValue as any) || {}
    const processingTime = commissionRates.payoutSchedule?.processingTime || 3

    // Transform transaction to payout request
    const payoutRequest = {
      id: transaction.id,
      amount: Number(transaction.amount),
      status: mapTransactionStatusToPayoutStatus(transaction.status),
      requestDate: transaction.date.toISOString(),
      processedDate: transaction.processedAt?.toISOString(),
      paymentMethodId: transaction.paymentMethodId || undefined,
      paymentMethodType: transaction.paymentMethod?.type || "BANK_TRANSFER",
      paymentMethodDetails,
      reference: transaction.reference,
      notes: transaction.description,
      processingTime,
      estimatedArrivalDate,
      rejectionReason:
        transaction.status === "FAILED"
          ? transaction.description || "Transaction failed. Please contact support for assistance."
          : undefined,
      earningId: relatedEarning?.id,
      earningPeriod: relatedEarning
        ? {
            start: relatedEarning.periodStart.toISOString(),
            end: relatedEarning.periodEnd.toISOString(),
          }
        : undefined,
      fees: transaction.fee ? Number(transaction.fee) : 0,
      netAmount: transaction.fee ? Number(transaction.amount) - Number(transaction.fee) : Number(transaction.amount),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    }

    return NextResponse.json(payoutRequest)
  } catch (error) {
    console.error("Error fetching payout request:", error)
    return NextResponse.json({ error: "Failed to fetch payout request" }, { status: 500 })
  }
}

/**
 * POST: Cancel a pending payout request
 * @route /api/partner/payouts/:id/cancel
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get URL path to check if it's a cancel request
    const path = request.nextUrl.pathname
    const isCancelRequest = path.endsWith("/cancel")

    if (!isCancelRequest) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 })
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

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: params.id,
        walletId: partner.wallet.id,
        type: "WITHDRAWAL",
        status: "PENDING", // Only pending transactions can be cancelled
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Payout request not found or cannot be cancelled" }, { status: 404 })
    }

    // Execute cancellation in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prismaClient) => {
      // Update transaction status
      const updatedTransaction = await prismaClient.transaction.update({
        where: {
          id: params.id,
        },
        data: {
          status: "CANCELLED",
          description: `${transaction.description} (Cancelled by user)`,
        },
      })

      // Refund the amount to wallet
      await prismaClient.wallet.update({
        where: {
          id: partner.wallet.id,
        },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      })

      // Check if this transaction is linked to an earning
      const earning = await prismaClient.partnerEarning.findFirst({
        where: {
          transactionId: transaction.id,
        },
      })

      // If linked to an earning, update earning status back to PENDING
      if (earning) {
        await prismaClient.partnerEarning.update({
          where: {
            id: earning.id,
          },
          data: {
            status: "PENDING",
            transactionId: null,
          },
        })
      }

      return updatedTransaction
    })

    return NextResponse.json({
      id: result.id,
      status: "CANCELLED",
      message: "Payout request cancelled successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error cancelling payout request:", error)
    return NextResponse.json({ error: "Failed to cancel payout request" }, { status: 500 })
  }
}

/**
 * Helper function to mask sensitive data in payment method details
 */
function maskSensitiveData(type: string, details: any) {
  if (!details) return {}

  const maskedDetails: any = { ...details }

  switch (type) {
    case "BANK_ACCOUNT":
    case "BANK_TRANSFER":
      if (details.accountNumber) {
        maskedDetails.accountNumber = `****${details.accountNumber.slice(-4)}`
      }
      if (details.routingNumber) {
        maskedDetails.routingNumber = `****${details.routingNumber.slice(-4)}`
      }
      break

    case "CREDIT_CARD":
      if (details.cardNumber) {
        maskedDetails.cardNumber = `****${details.cardNumber.slice(-4)}`
      }
      if (details.cvv) {
        maskedDetails.cvv = "***"
      }
      break

    case "PAYPAL":
      if (details.email) {
        const [username, domain] = details.email.split("@")
        if (username && domain) {
          maskedDetails.email = `${username.substring(0, 3)}***@${domain}`
        }
      }
      break

    case "CRYPTO":
      if (details.walletAddress) {
        const addressLength = details.walletAddress.length
        maskedDetails.walletAddress = `${details.walletAddress.substring(
          0,
          4,
        )}...${details.walletAddress.substring(addressLength - 4)}`
      }
      if (details.privateKey) {
        maskedDetails.privateKey = "********"
      }
      break
  }

  return maskedDetails
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
