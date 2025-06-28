import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

/**
 * GET: Export partner wallet transactions as CSV
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(req.url)
    const startDate = url.searchParams.get("startDate") || undefined
    const endDate = url.searchParams.get("endDate") || undefined
    const type = url.searchParams.get("type") || undefined

    // Get the partner
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      select: { id: true, wallet: { select: { id: true } } },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    if (!partner.wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Build the where clause for filtering
    const where: any = {
      walletId: partner.wallet.id,
    }

    // Add type filter if provided
    if (type) {
      where.type = type
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        date: "desc",
      },
      include: {
        paymentMethod: {
          select: {
            type: true,
          },
        },
      },
    })

    // Generate CSV header
    const csvHeader = [
      "Transaction ID",
      "Date",
      "Type",
      "Description",
      "Amount",
      "Currency",
      "Status",
      "Reference",
      "Payment Method",
      "Processed At",
    ].join(",")

    // Generate CSV rows
    const csvRows = transactions.map((transaction) => {
      return [
        transaction.id,
        format(transaction.date, "yyyy-MM-dd HH:mm:ss"),
        transaction.type,
        `"${(transaction.description || "").replace(/"/g, '""')}"`,
        transaction.amount,
        transaction.currency,
        transaction.status,
        transaction.reference || "",
        transaction.paymentMethod?.type || "",
        transaction.processedAt ? format(transaction.processedAt, "yyyy-MM-dd HH:mm:ss") : "",
      ].join(",")
    })

    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join("\n")

    // Create response with CSV content
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="wallet-transactions-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting wallet transactions:", error)
    return NextResponse.json({ error: "Failed to export wallet transactions" }, { status: 500 })
  }
}
