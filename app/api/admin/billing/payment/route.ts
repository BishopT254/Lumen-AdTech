import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user?.admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { billingId, paymentMethodId, amount, description } = body

    if (!billingId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: billingId, amount" },
        { status: 400 }
      )
    }

    // Get billing record
    const billing = await prisma.billing.findUnique({
      where: { id: billingId },
      include: { advertiser: true },
    })

    if (!billing) {
      return NextResponse.json({ error: "Billing record not found" }, { status: 404 })
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        advertiserId: billing.advertiserId,
        amount: amount,
        currency: "USD", // Default currency, could be made dynamic
        status: "COMPLETED",
        type: "DEPOSIT",
        description: description || `Payment for invoice ${billing.invoiceNumber}`,
        dateInitiated: new Date(),
        dateCompleted: new Date(),
        paymentMethodId: paymentMethodId || undefined,
        billings: {
          connect: { id: billingId },
        },
      },
    })

    // Update billing status
    const updatedBilling = await prisma.billing.update({
      where: { id: billingId },
      data: {
        status: Number(amount) >= Number(billing.total) ? "PAID" : "PARTIALLY_PAID",
        paymentId: payment.id,
      },
    })

    return NextResponse.json({
      payment,
      billing: updatedBilling,
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
