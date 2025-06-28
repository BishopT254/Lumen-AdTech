import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch payment methods for the authenticated partner
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

    // Get payment methods for this wallet
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        walletId: partner.wallet.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Transform payment methods to include masked sensitive data
    const transformedPaymentMethods = paymentMethods.map((method) => {
      const details = method.details as any
      let maskedDetails: any = {}

      // Mask sensitive information based on payment method type
      if (method.type === "BANK_ACCOUNT" || method.type === "BANK_TRANSFER") {
        maskedDetails = {
          ...details,
          accountNumber: details.accountNumber ? `****${details.accountNumber.slice(-4)}` : undefined,
          routingNumber: details.routingNumber ? `****${details.routingNumber.slice(-4)}` : undefined,
        }
      } else if (method.type === "CREDIT_CARD") {
        maskedDetails = {
          ...details,
          cardNumber: details.cardNumber ? `****${details.cardNumber.slice(-4)}` : undefined,
          cvv: "***",
        }
      } else if (method.type === "PAYPAL") {
        // PayPal email is not considered highly sensitive, but we'll still mask it partially
        maskedDetails = {
          ...details,
          email: details.email ? `${details.email.substring(0, 3)}***@${details.email.split("@")[1]}` : undefined,
        }
      } else {
        // For other payment method types, just pass through the details
        maskedDetails = details
      }

      return {
        id: method.id,
        type: method.type,
        name: method.name,
        isDefault: method.isDefault,
        status: method.status,
        details: maskedDetails,
        createdAt: method.createdAt,
        updatedAt: method.updatedAt,
      }
    })

    return NextResponse.json(transformedPaymentMethods)
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 })
  }
}

/**
 * POST: Add a new payment method
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
    const { type, name, details, isDefault } = body

    if (!type) {
      return NextResponse.json({ error: "Payment method type is required" }, { status: 400 })
    }

    // Validate payment method type
    const validTypes = ["BANK_ACCOUNT", "BANK_TRANSFER", "CREDIT_CARD", "PAYPAL", "CRYPTO", "OTHER"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid payment method type" }, { status: 400 })
    }

    // Validate details based on type
    if (!details) {
      return NextResponse.json({ error: "Payment method details are required" }, { status: 400 })
    }

    // Type-specific validation
    if (type === "BANK_ACCOUNT" || type === "BANK_TRANSFER") {
      if (!details.accountNumber || !details.bankName) {
        return NextResponse.json({ error: "Bank account requires account number and bank name" }, { status: 400 })
      }
    } else if (type === "CREDIT_CARD") {
      if (!details.cardNumber || !details.expiryDate || !details.cvv) {
        return NextResponse.json({ error: "Credit card requires card number, expiry date, and CVV" }, { status: 400 })
      }
    } else if (type === "PAYPAL") {
      if (!details.email) {
        return NextResponse.json({ error: "PayPal requires an email address" }, { status: 400 })
      }
    } else if (type === "CRYPTO") {
      if (!details.walletAddress || !details.currency) {
        return NextResponse.json({ error: "Crypto requires wallet address and currency" }, { status: 400 })
      }
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

    // If this is set as default, unset any existing default payment methods
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          walletId: wallet.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Create new payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        walletId: wallet.id,
        type,
        name: name || `${type} (${new Date().toLocaleDateString()})`,
        details,
        isDefault: isDefault || false,
        status: "ACTIVE",
      },
    })

    // Mask sensitive data in the response
    const responsePaymentMethod = {
      ...paymentMethod,
      details: maskSensitiveData(paymentMethod.type, paymentMethod.details as any),
    }

    return NextResponse.json(responsePaymentMethod)
  } catch (error) {
    console.error("Error adding payment method:", error)
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 })
  }
}

/**
 * PUT: Update an existing payment method
 * @route /api/partner/wallet/payment-methods?id={paymentMethodId}
 */
export async function PUT(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get payment method ID from query params
    const searchParams = request.nextUrl.searchParams
    const paymentMethodId = searchParams.get("id")

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 })
    }

    // Get request body
    const body = await request.json()
    const { name, details, isDefault, status } = body

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

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (details !== undefined) {
      updateData.details = details
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ["ACTIVE", "INACTIVE", "PENDING_VERIFICATION", "VERIFIED", "REJECTED"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      updateData.status = status
    }

    if (isDefault !== undefined) {
      updateData.isDefault = isDefault

      // If setting as default, unset any existing default payment methods
      if (isDefault) {
        await prisma.paymentMethod.updateMany({
          where: {
            walletId: partner.wallet.id,
            isDefault: true,
            id: {
              not: paymentMethodId,
            },
          },
          data: {
            isDefault: false,
          },
        })
      }
    }

    // Update payment method
    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: {
        id: paymentMethodId,
      },
      data: updateData,
    })

    // Mask sensitive data in the response
    const responsePaymentMethod = {
      ...updatedPaymentMethod,
      details: maskSensitiveData(updatedPaymentMethod.type, updatedPaymentMethod.details as any),
    }

    return NextResponse.json(responsePaymentMethod)
  } catch (error) {
    console.error("Error updating payment method:", error)
    return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 })
  }
}

/**
 * DELETE: Remove a payment method
 * @route /api/partner/wallet/payment-methods?id={paymentMethodId}
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get payment method ID from query params
    const searchParams = request.nextUrl.searchParams
    const paymentMethodId = searchParams.get("id")

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

    // Check if this payment method is used in any pending transactions
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        paymentMethodId: paymentMethodId,
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
    })

    if (pendingTransactions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete payment method with pending transactions. Please wait until all transactions are completed.",
        },
        { status: 400 },
      )
    }

    // Delete payment method
    await prisma.paymentMethod.delete({
      where: {
        id: paymentMethodId,
      },
    })

    // If this was the default payment method, set another one as default if available
    if (paymentMethod.isDefault) {
      const otherPaymentMethods = await prisma.paymentMethod.findMany({
        where: {
          walletId: partner.wallet.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      })

      if (otherPaymentMethods.length > 0) {
        await prisma.paymentMethod.update({
          where: {
            id: otherPaymentMethods[0].id,
          },
          data: {
            isDefault: true,
          },
        })
      }
    }

    return NextResponse.json({ success: true, message: "Payment method deleted successfully" })
  } catch (error) {
    console.error("Error deleting payment method:", error)
    return NextResponse.json({ error: "Failed to delete payment method" }, { status: 500 })
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
