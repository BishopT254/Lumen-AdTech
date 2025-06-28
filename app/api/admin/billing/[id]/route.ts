import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns"

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const sortBy = searchParams.get("sortBy") || "dueDate"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const advertiserId = searchParams.get("advertiserId")
    const campaignId = searchParams.get("campaignId")

    // Build where clause
    const where: any = {}

    // Filter by status
    if (status !== "all") {
      where.status = status.toUpperCase()
    }

    // Filter by date range
    if (startDate && endDate) {
      where.dueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Filter by advertiser
    if (advertiserId) {
      where.advertiserId = advertiserId
    }

    // Filter by campaign
    if (campaignId) {
      where.campaignId = campaignId
    }

    // Search by invoice number or advertiser name
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { advertiser: { companyName: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Count total records for pagination
    const totalCount = await prisma.billing.count({ where })

    // Fetch billing records
    const billings = await prisma.billing.findMany({
      where,
      include: {
        advertiser: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            email: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            dateCompleted: true,
            paymentMethodType: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Calculate summary metrics
    const allBillings = await prisma.billing.findMany({
      select: {
        amount: true,
        tax: true,
        total: true,
        status: true,
        dueDate: true,
      },
    })

    const now = new Date()
    const totalOutstanding = allBillings
      .filter((b) => b.status !== "PAID" && b.status !== "CANCELLED")
      .reduce((sum, b) => sum + Number(b.total), 0)

    const totalPaid = allBillings
      .filter((b) => b.status === "PAID")
      .reduce((sum, b) => sum + Number(b.total), 0)

    const totalOverdue = allBillings
      .filter((b) => b.status === "OVERDUE" || (b.status === "UNPAID" && isAfter(now, new Date(b.dueDate))))
      .reduce((sum, b) => sum + Number(b.total), 0)

    const dueThisWeek = allBillings
      .filter((b) => {
        const dueDate = new Date(b.dueDate)
        return (
          b.status === "UNPAID" &&
          isAfter(dueDate, now) &&
          isBefore(dueDate, addDays(now, 7))
        )
      })
      .reduce((sum, b) => sum + Number(b.total), 0)

    // Get payment methods for filtering
    const paymentMethods = await prisma.paymentMethod.findMany({
      select: {
        id: true,
        type: true,
      },
      distinct: ["type"],
    })

    // Get advertisers for filtering
    const advertisers = await prisma.advertiser.findMany({
      select: {
        id: true,
        companyName: true,
      },
      orderBy: {
        companyName: "asc",
      },
    })

    // Format billing data for response
    const formattedBillings = billings.map((billing) => ({
      id: billing.id,
      invoiceNumber: billing.invoiceNumber,
      advertiser: {
        id: billing.advertiser.id,
        name: billing.advertiser.companyName,
        contactPerson: billing.advertiser.contactPerson,
      },
      campaign: {
        id: billing.campaign.id,
        name: billing.campaign.name,
      },
      amount: Number(billing.amount),
      tax: Number(billing.tax),
      total: Number(billing.total),
      status: billing.status,
      dueDate: format(new Date(billing.dueDate), "yyyy-MM-dd"),
      createdAt: format(new Date(billing.createdAt), "yyyy-MM-dd"),
      payment: billing.payment
        ? {
            id: billing.payment.id,
            status: billing.payment.status,
            dateCompleted: billing.payment.dateCompleted
              ? format(new Date(billing.payment.dateCompleted), "yyyy-MM-dd")
              : null,
            method: billing.payment.paymentMethodType,
          }
        : null,
      items: billing.items,
      isOverdue: isAfter(now, new Date(billing.dueDate)) && billing.status === "UNPAID",
    }))

    // Compile the response
    const response = {
      billings: formattedBillings,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalOutstanding,
        totalPaid,
        totalOverdue,
        dueThisWeek,
      },
      filters: {
        paymentMethods: paymentMethods.map((pm) => pm.type),
        advertisers,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in billing API:", error)
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
    const { advertiserId, campaignId, amount, tax, dueDate, items } = body

    // Validate required fields
    if (!advertiserId || !campaignId || !amount || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields: advertiserId, campaignId, amount, dueDate" },
        { status: 400 }
      )
    }

    // Generate invoice number
    const invoiceCount = await prisma.billing.count()
    const invoicePrefix = "INV"
    const invoiceNumber = `${invoicePrefix}-${String(invoiceCount + 1).padStart(6, "0")}`

    // Calculate total
    const totalAmount = Number(amount) + Number(tax || 0)

    // Create new billing record
    const billing = await prisma.billing.create({
      data: {
        advertiserId,
        campaignId,
        invoiceNumber,
        amount: amount,
        tax: tax || 0,
        total: totalAmount,
        status: "UNPAID",
        dueDate: new Date(dueDate),
        items: items || {},
      },
    })

    return NextResponse.json(billing)
  } catch (error) {
    console.error("Error creating billing:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
