// Add a new route for generating payout receipts

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

/**
 * GET: Generate a receipt for a completed payout
 * @route /api/partner/payouts/receipt?id={payoutId}
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get payout ID from query params
    const searchParams = request.nextUrl.searchParams
    const payoutId = searchParams.get("id")

    if (!payoutId) {
      return NextResponse.json({ error: "Payout ID is required" }, { status: 400 })
    }

    // Get partner
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true,
        user: {
          select: {
            name: true,
            email: true,
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

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: payoutId,
        walletId: partner.wallet.id,
        type: "WITHDRAWAL",
      },
      include: {
        paymentMethod: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }

    // Check if payout is completed
    if (transaction.status !== "COMPLETED") {
      return NextResponse.json({ error: "Receipt is only available for completed payouts" }, { status: 400 })
    }

    // Get related earning if exists
    const relatedEarning = await prisma.partnerEarning.findFirst({
      where: {
        transactionId: transaction.id,
      },
    })

    // Get system settings
    const configResponse = await prisma.systemConfig.findUnique({
      where: { configKey: "general_settings" },
    })

    const generalSettings = (configResponse?.configValue as any) || {
      platformName: "Lumen Ads",
      supportEmail: "support@lumenads.com",
    }

    // Generate receipt data
    const receiptData = {
      receiptNumber: `REC-${transaction.id.slice(-8)}`,
      date: format(new Date(), "yyyy-MM-dd"),
      payoutId: transaction.id,
      payoutReference: transaction.reference || transaction.id,
      payoutDate: format(transaction.processedAt || transaction.date, "yyyy-MM-dd"),
      amount: Number(transaction.amount),
      fees: Number(transaction.fee || 0),
      netAmount: Number(transaction.amount) - Number(transaction.fee || 0),
      currency: partner.wallet.currency || "USD",
      paymentMethod: {
        type: transaction.paymentMethod?.type || "Bank Transfer",
        details: maskSensitiveData(
          transaction.paymentMethod?.type || "BANK_TRANSFER",
          (transaction.paymentMethod?.details as any) || {},
        ),
      },
      partner: {
        id: partner.id,
        name: partner.name || partner.user?.name || "Partner",
        email: partner.email || partner.user?.email || "",
        address: partner.address || "",
        taxId: partner.taxId || "",
      },
      platform: {
        name: generalSettings.platformName || "Lumen Ads",
        email: generalSettings.supportEmail || "support@lumenads.com",
        address: generalSettings.address || "123 Ad Street, Digital City",
        website: generalSettings.website || "https://lumenads.com",
      },
      earningPeriod: relatedEarning
        ? {
            start: format(relatedEarning.periodStart, "yyyy-MM-dd"),
            end: format(relatedEarning.periodEnd, "yyyy-MM-dd"),
          }
        : undefined,
    }

    // For a real implementation, you would generate a PDF here
    // For this example, we'll return a JSON response with the receipt data
    // In production, you would use a library like PDFKit to generate a PDF

    return NextResponse.json(receiptData)
  } catch (error) {
    console.error("Error generating payout receipt:", error)
    return NextResponse.json({ error: "Failed to generate payout receipt" }, { status: 500 })
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
