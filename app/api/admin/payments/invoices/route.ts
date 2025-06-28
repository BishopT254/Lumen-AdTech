import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get URL parameters
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const status = url.searchParams.get("status")
    const search = url.searchParams.get("search")
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const minAmount = url.searchParams.get("minAmount")
      ? Number.parseFloat(url.searchParams.get("minAmount")!)
      : undefined
    const maxAmount = url.searchParams.get("maxAmount")
      ? Number.parseFloat(url.searchParams.get("maxAmount")!)
      : undefined

    // Build filter conditions
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: new Date(endDate),
      }
    }

    if (minAmount !== undefined) {
      where.total = {
        ...(where.total || {}),
        gte: minAmount,
      }
    }

    if (maxAmount !== undefined) {
      where.total = {
        ...(where.total || {}),
        lte: maxAmount,
      }
    }

    if (search) {
      where.OR = [
        {
          advertiser: {
            companyName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          invoiceNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          campaign: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.billing.count({ where })

    // Get paginated invoices with related details
    const invoices = await prisma.billing.findMany({
      where,
      include: {
        advertiser: true,
        campaign: true,
        payment: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Format the response
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      advertiser: invoice.advertiser.companyName,
      advertiserId: invoice.advertiserId,
      campaignName: invoice.campaign.name,
      campaignId: invoice.campaignId,
      amount: invoice.amount,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate,
      issueDate: invoice.createdAt,
      paymentId: invoice.paymentId,
      paymentStatus: invoice.payment?.status || null,
      items: invoice.items,
    }))

    return NextResponse.json({
      invoices: formattedInvoices,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await req.json()
    const { action, invoiceId, status, paymentId } = data

    if (!invoiceId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if invoice exists
    const invoice = await prisma.billing.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    let updatedInvoice

    // Process different actions
    switch (action) {
      case "updateStatus":
        if (!status) {
          return NextResponse.json({ error: "Status is required" }, { status: 400 })
        }

        updatedInvoice = await prisma.billing.update({
          where: { id: invoiceId },
          data: {
            status: status,
          },
        })
        break

      case "linkPayment":
        if (!paymentId) {
          return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
        }

        // Check if payment exists
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
        })

        if (!payment) {
          return NextResponse.json({ error: "Payment not found" }, { status: 404 })
        }

        updatedInvoice = await prisma.billing.update({
          where: { id: invoiceId },
          data: {
            paymentId: paymentId,
            status: payment.status === "COMPLETED" ? "PAID" : invoice.status,
          },
        })
        break

      case "generatePayment":
        // Create a new payment for this invoice
        const newPayment = await prisma.payment.create({
          data: {
            advertiserId: invoice.advertiserId,
            amount: invoice.total,
            paymentMethod: "BANK_TRANSFER", // Default method
            status: "PENDING",
            dateInitiated: new Date(),
            notes: `Auto-generated for invoice ${invoice.invoiceNumber}`,
          },
        })

        // Link the payment to the invoice
        updatedInvoice = await prisma.billing.update({
          where: { id: invoiceId },
          data: {
            paymentId: newPayment.id,
          },
        })
        break

      case "cancelInvoice":
        updatedInvoice = await prisma.billing.update({
          where: { id: invoiceId },
          data: {
            status: "CANCELLED",
          },
        })
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true, invoice: updatedInvoice })
  } catch (error) {
    console.error("Error processing invoice action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Generate invoices for campaigns
export async function PUT(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await req.json()
    const { campaignIds, dueDate, taxRate = 0.16 } = data

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json({ error: "Campaign IDs are required" }, { status: 400 })
    }

    if (!dueDate) {
      return NextResponse.json({ error: "Due date is required" }, { status: 400 })
    }

    const parsedDueDate = new Date(dueDate)
    const generatedInvoices = []

    // Process each campaign
    for (const campaignId of campaignIds) {
      // Get campaign details
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          advertiser: true,
          analytics: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      })

      if (!campaign) {
        continue // Skip invalid campaigns
      }

      // Check if an invoice already exists for this campaign
      const existingInvoice = await prisma.billing.findFirst({
        where: {
          campaignId: campaignId,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
      })

      if (existingInvoice) {
        continue // Skip campaigns with existing unpaid invoices
      }

      // Calculate amount based on campaign budget or analytics
      let amount = campaign.budget

      // If analytics exist, use actual spend
      if (campaign.analytics.length > 0 && campaign.analytics[0].costData) {
        const costData = campaign.analytics[0].costData as any
        if (costData.spend) {
          amount = costData.spend
        }
      }

      // Calculate tax
      const tax = amount * taxRate
      const total = amount + tax

      // Generate invoice number
      const invoiceNumber = `INV-${campaign.advertiserId.substring(0, 4)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      // Create invoice items
      const items = [
        {
          description: `Ad campaign: ${campaign.name}`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
        {
          description: `Tax (${(taxRate * 100).toFixed(0)}%)`,
          quantity: 1,
          unitPrice: tax,
          total: tax,
        },
      ]

      // Create the invoice
      const invoice = await prisma.billing.create({
        data: {
          advertiserId: campaign.advertiserId,
          campaignId: campaignId,
          invoiceNumber: invoiceNumber,
          amount: amount,
          tax: tax,
          total: total,
          status: "UNPAID",
          dueDate: parsedDueDate,
          items: items,
        },
      })

      generatedInvoices.push(invoice)
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedInvoices.length} invoices`,
      invoices: generatedInvoices,
    })
  } catch (error) {
    console.error("Error generating invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

