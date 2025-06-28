import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

/**
 * GET: Export partner earnings as CSV
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Check if user is a partner
    if (userRole !== "PARTNER") {
      return NextResponse.json({ error: "Access denied. Only partners can access this resource." }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(req.url)
    const status = url.searchParams.get("status") || undefined
    const startDate = url.searchParams.get("startDate")
      ? new Date(url.searchParams.get("startDate")!)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Default to 1 year ago

    const endDate = url.searchParams.get("endDate") ? new Date(url.searchParams.get("endDate")!) : new Date() // Default to today

    // Get partner from database
    const partner = await prisma.partner.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Build filter conditions
    const whereConditions: any = {
      partnerId: partner.id,
      periodStart: {
        gte: startDate,
      },
      periodEnd: {
        lte: endDate,
      },
    }

    if (status) {
      whereConditions.status = status
    }

    // Get all earnings within date range
    const earnings = await prisma.partnerEarning.findMany({
      where: whereConditions,
      orderBy: {
        periodEnd: "desc",
      },
    })

    // Generate CSV content
    const headers = [
      "Earning ID",
      "Period Start",
      "Period End",
      "Amount",
      "Currency",
      "Status",
      "Total Impressions",
      "Total Engagements",
      "Paid Date",
      "Transaction ID",
      "Created At",
    ]

    const rows = earnings.map((earning) => [
      earning.id,
      format(earning.periodStart, "yyyy-MM-dd"),
      format(earning.periodEnd, "yyyy-MM-dd"),
      earning.amount.toString(),
      earning.currency,
      earning.status,
      earning.totalImpressions.toString(),
      earning.totalEngagements.toString(),
      earning.paidDate ? format(earning.paidDate, "yyyy-MM-dd") : "",
      earning.transactionId || "",
      format(earning.createdAt, "yyyy-MM-dd HH:mm:ss"),
    ])

    // Create CSV content
    let csvContent = headers.join(",") + "\n"

    rows.forEach((row) => {
      // Properly escape fields that might contain commas
      const escapedRow = row.map((field) => {
        // If field contains commas, quotes, or newlines, wrap in quotes and escape any quotes
        if (field.includes(",") || field.includes('"') || field.includes("\n")) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      })
      csvContent += escapedRow.join(",") + "\n"
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "earnings.export",
        description: `Exported earnings from ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="earnings-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting earnings:", error)
    return NextResponse.json({ error: "Failed to export earnings" }, { status: 500 })
  }
}
