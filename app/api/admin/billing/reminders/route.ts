import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { format, addDays } from "date-fns"

export async function GET(request: NextRequest) {
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

    const now = new Date()

    // Find upcoming and overdue invoices
    const upcomingInvoices = await prisma.billing.findMany({
      where: {
        status: "UNPAID",
        dueDate: {
          gte: now,
          lte: addDays(now, 7), // Due within the next 7 days
        },
      },
      include: {
        advertiser: {
          select: {
            companyName: true,
            contactPerson: true,
            email: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    })

    const overdueInvoices = await prisma.billing.findMany({
      where: {
        status: "UNPAID",
        dueDate: {
          lt: now, // Past due date
        },
      },
      include: {
        advertiser: {
          select: {
            companyName: true,
            contactPerson: true,
            email: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    })

    // Format data for response
    const formattedUpcoming = upcomingInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      advertiser: invoice.advertiser.companyName,
      contactPerson: invoice.advertiser.contactPerson,
      email: invoice.advertiser.email,
      amount: Number(invoice.total),
      dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
      daysUntilDue: Math.ceil((new Date(invoice.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    const formattedOverdue = overdueInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      advertiser: invoice.advertiser.companyName,
      contactPerson: invoice.advertiser.contactPerson,
      email: invoice.advertiser.email,
      amount: Number(invoice.total),
      dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
      daysOverdue: Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }))

    return NextResponse.json({
      upcoming: formattedUpcoming,
      overdue: formattedOverdue,
    })
  } catch (error) {
    console.error("Error fetching reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const { billingIds, reminderType } = body

    if (!billingIds || !Array.isArray(billingIds) || billingIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid billingIds" }, { status: 400 })
    }

    // Get billing records with advertiser info
    const billings = await prisma.billing.findMany({
      where: {
        id: { in: billingIds },
      },
      include: {
        advertiser: {
          select: {
            companyName: true,
            contactPerson: true,
            email: true,
          },
        },
      },
    })

    // In a real implementation, this would send emails to advertisers
    // For now, we'll just log the reminders and create notifications

    // Create notifications for each billing
    const notifications = await Promise.all(
      billings.map(async (billing) => {
        // Get user ID for the advertiser
        const advertiserUser = await prisma.user.findFirst({
          where: {
            advertiser: {
              id: billing.advertiserId,
            },
          },
          select: {
            id: true,
          },
        })

        if (!advertiserUser) {
          return null
        }

        // Create notification
        return prisma.notification.create({
          data: {
            userId: advertiserUser.id,
            title:
              reminderType === "overdue"
                ? `Overdue Invoice: ${billing.invoiceNumber}`
                : `Payment Reminder: ${billing.invoiceNumber}`,
            message:
              reminderType === "overdue"
                ? `Your invoice ${billing.invoiceNumber} for $${Number(billing.total).toFixed(2)} is overdue. Please make payment as soon as possible.`
                : `Your invoice ${billing.invoiceNumber} for $${Number(billing.total).toFixed(2)} is due on ${format(new Date(billing.dueDate), "MMMM d, yyyy")}. Please make payment before the due date.`,
            type: reminderType === "overdue" ? "WARNING" : "INFO",
            category: "billing",
            actionUrl: `/advertiser/billing/${billing.id}`,
            sender: "system",
          },
        })
      }),
    )

    // Filter out null values
    const validNotifications = notifications.filter(Boolean)

    return NextResponse.json({
      success: true,
      remindersSent: validNotifications.length,
      billingCount: billings.length,
    })
  } catch (error) {
    console.error("Error sending reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
