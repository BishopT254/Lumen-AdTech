import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST: Set a payment method as default
 * @route /api/partner/wallet/payment-methods/default
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
    const { paymentMethodId } = body

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 })
    }

    // Get partner with wallet
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true,
      },
    })

    if (!partner || !partner.wallet) {
      return NextResponse.json({ error: "Partner or wallet not found" }, { status: 404 })
    }

    // Get payment method
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: paymentMethodId,
        walletId: partner.wallet.id,
      },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    // Unset any existing default payment methods
    await prisma.paymentMethod.updateMany({
      where: {
        walletId: partner.wallet.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    })

    // Set the specified payment method as default
    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: {
        id: paymentMethodId,
      },
      data: {
        isDefault: true,
      },
    })

    // Mask sensitive data in the response
    const responsePaymentMethod = {
      ...updatedPaymentMethod,
      details: maskSensitiveData(updatedPaymentMethod.type, updatedPaymentMethod.details as any),
    }

    return NextResponse.json({
      success: true,
      message: "Payment method set as default successfully",
      paymentMethod: responsePaymentMethod,
    })
  } catch (error) {
    console.error("Error setting default payment method:", error)
    return NextResponse.json({ error: "Failed to set default payment method" }, { status: 500 })
  }
}

/**
 * GET: Get the default payment method
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get partner with wallet
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

    // Get default payment method
    const defaultPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        walletId: partner.wallet.id,
        isDefault: true,
      },
    })

    if (!defaultPaymentMethod) {
      return NextResponse.json({ error: "No default payment method found" }, { status: 404 })
    }

    // Mask sensitive data in the response
    const responsePaymentMethod = {
      ...defaultPaymentMethod,
      details: maskSensitiveData(defaultPaymentMethod.type, defaultPaymentMethod.details as any),
    }

    return NextResponse.json(responsePaymentMethod)
  } catch (error) {
    console.error("Error fetching default payment method:", error)
    return NextResponse.json({ error: "Failed to fetch default payment method" }, { status: 500 })
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
        maskedDetails.email = `${username.substring(0, 3)}***@${domain}`
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
