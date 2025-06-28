import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

/**
 * POST: Create a withdrawal request
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the request body
    const data = await req.json()

    // Validate the data
    if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!data.method) {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 })
    }

    // Get the partner
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

    // Check if wallet is active
    if (partner.wallet.walletStatus !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Wallet is not active. Please contact support for assistance.",
        },
        { status: 403 },
      )
    }

    // Check if the partner has sufficient balance
    const amount = Number(data.amount)
    if (amount > Number(partner.wallet.balance)) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Find the payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        walletId: partner.wallet.id,
        type: data.method,
      },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 })
    }

    // Create a transaction for the withdrawal
    const transaction = await prisma.transaction.create({
      data: {
        walletId: partner.wallet.id,
        type: "WITHDRAWAL",
        amount,
        currency: partner.wallet.currency,
        status: "PENDING",
        description: `Withdrawal via ${data.method}`,
        reference: `WD-${Date.now()}`,
        paymentMethodId: paymentMethod.id,
        date: new Date(),
        metadata: data.accountDetails || {},
      },
    })

    // Update the wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { id: partner.wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    })

    // Clear cache
    const cacheKey = `partner:wallet:${session.user.id}`
    await deleteCache(cacheKey)

    // Revalidate paths
    revalidatePath("/partner/wallet")
    revalidatePath("/partner")

    // Return the transaction
    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        reference: transaction.reference,
        date: transaction.date.toISOString(),
        paymentMethod: data.method,
      },
      wallet: {
        balance: Number(updatedWallet.balance),
        currency: updatedWallet.currency,
      },
    })
  } catch (error) {
    console.error("Error creating withdrawal request:", error)
    return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 })
  }
}
