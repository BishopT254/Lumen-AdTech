import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch a specific payment method by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get payment method
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: params.id,
        walletId: partner.wallet.id,
      },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    // Mask sensitive data
    const details = paymentMethod.details as any
    let maskedDetails: any = {}

    // Mask sensitive information based on payment method type
    if (paymentMethod.type === "BANK_ACCOUNT" || paymentMethod.type === "BANK_TRANSFER") {
      maskedDetails = {
        ...details,
        accountNumber: details.accountNumber ? `****${details.accountNumber.slice(-4)}` : undefined,
        routingNumber: details.routingNumber ? `****${details.routingNumber.slice(-4)}` : undefined,
      }
    } else if (paymentMethod.type === "CREDIT_CARD") {
      maskedDetails = {
        ...details,
        cardNumber: details.cardNumber ? `****${details.cardNumber.slice(-4)}` : undefined,
        cvv: "***",
      }
    } else if (paymentMethod.type === "PAYPAL") {
      maskedDetails = {
        ...details,
        email: details.email ? `${details.email.substring(0, 3)}***@${details.email.split("@")[1]}` : undefined,
      }
    } else {
      maskedDetails = details
    }

    const responsePaymentMethod = {
      id: paymentMethod.id,
      type: paymentMethod.type,
      name: paymentMethod.name,
      isDefault: paymentMethod.isDefault,
      status: paymentMethod.status,
      details: maskedDetails,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    }

    return NextResponse.json(responsePaymentMethod)
  } catch (error) {
    console.error("Error fetching payment method:", error)
    return NextResponse.json({ error: "Failed to fetch payment method" }, { status: 500 })
  }
}

/**
 * PATCH: Update a specific payment method by ID
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
        id: params.id,
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
      // Merge existing details with new details to allow partial updates
      const existingDetails = paymentMethod.details as any
      updateData.details = { ...existingDetails, ...details }
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
              not: params.id,
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
        id: params.id,
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
 * DELETE: Remove a specific payment method by ID
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!partner || !partner.wallet) {
      return NextResponse.json({ error: "Partner or wallet not found" }, { status: 404 })
    }

    // Get payment method
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: params.id,
        walletId: partner.wallet.id,
      },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    // Check if this payment method is used in any pending transactions
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        paymentMethodId: params.id,
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
        id: params.id,
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
