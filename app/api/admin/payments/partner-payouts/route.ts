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
      where.periodStart = {
        ...(where.periodStart || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.periodEnd = {
        ...(where.periodEnd || {}),
        lte: new Date(endDate),
      }
    }

    if (minAmount !== undefined) {
      where.amount = {
        ...(where.amount || {}),
        gte: minAmount,
      }
    }

    if (maxAmount !== undefined) {
      where.amount = {
        ...(where.amount || {}),
        lte: maxAmount,
      }
    }

    if (search) {
      where.partner = {
        OR: [
          {
            companyName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            contactPerson: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.partnerEarning.count({ where })

    // Get paginated partner payouts with partner details
    const payouts = await prisma.partnerEarning.findMany({
      where,
      include: {
        partner: true,
      },
      orderBy: [{ status: "asc" }, { periodEnd: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Format the response
    const formattedPayouts = payouts.map((payout) => ({
      id: payout.id,
      partner: payout.partner.companyName,
      partnerId: payout.partnerId,
      amount: payout.amount,
      status: payout.status,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      paidDate: payout.paidDate,
      transactionId: payout.transactionId,
      impressions: payout.totalImpressions,
      engagements: payout.totalEngagements,
    }))

    return NextResponse.json({
      payouts: formattedPayouts,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching partner payouts:", error)
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
    const { action, payoutId, status, transactionId, paymentMethod } = data

    if (!payoutId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if payout exists
    const payout = await prisma.partnerEarning.findUnique({
      where: { id: payoutId },
    })

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }

    let updatedPayout

    // Process different actions
    switch (action) {
      case "updateStatus":
        if (!status) {
          return NextResponse.json({ error: "Status is required" }, { status: 400 })
        }

        updatedPayout = await prisma.partnerEarning.update({
          where: { id: payoutId },
          data: {
            status: status,
            paidDate: status === "PAID" ? new Date() : payout.paidDate,
            transactionId: transactionId || payout.transactionId,
          },
        })
        break

      case "processPayout":
        if (!transactionId || !paymentMethod) {
          return NextResponse.json({ error: "Transaction ID and payment method are required" }, { status: 400 })
        }

        updatedPayout = await prisma.partnerEarning.update({
          where: { id: payoutId },
          data: {
            status: "PAID",
            paidDate: new Date(),
            transactionId: transactionId,
          },
        })
        break

      case "cancelPayout":
        updatedPayout = await prisma.partnerEarning.update({
          where: { id: payoutId },
          data: {
            status: "CANCELLED",
          },
        })
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true, payout: updatedPayout })
  } catch (error) {
    console.error("Error processing payout action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Generate partner earnings for a specific period
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
    const { startDate, endDate } = data

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 })
    }

    const parsedStartDate = new Date(startDate)
    const parsedEndDate = new Date(endDate)

    // Get all partners
    const partners = await prisma.partner.findMany()
    const generatedEarnings = []

    // For each partner, calculate earnings based on ad deliveries
    for (const partner of partners) {
      // Get all devices for this partner
      const devices = await prisma.device.findMany({
        where: { partnerId: partner.id },
        select: { id: true },
      })

      const deviceIds = devices.map((device) => device.id)

      if (deviceIds.length === 0) {
        continue // Skip partners with no devices
      }

      // Get ad deliveries for these devices in the specified period
      const adDeliveries = await prisma.adDelivery.findMany({
        where: {
          deviceId: { in: deviceIds },
          actualDeliveryTime: {
            gte: parsedStartDate,
            lte: parsedEndDate,
          },
          status: "DELIVERED",
        },
        select: {
          impressions: true,
          engagements: true,
        },
      })

      // Calculate total impressions and engagements
      const totalImpressions = adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0)
      const totalEngagements = adDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0)

      // Skip if no impressions
      if (totalImpressions === 0) {
        continue
      }

      // Calculate earnings based on commission rate
      // Assuming $0.001 per impression as base rate
      const baseRate = 0.001
      const amount = totalImpressions * baseRate * partner.commissionRate

      // Check if an earning record already exists for this period and partner
      const existingEarning = await prisma.partnerEarning.findFirst({
        where: {
          partnerId: partner.id,
          periodStart: parsedStartDate,
          periodEnd: parsedEndDate,
        },
      })

      let earning

      if (existingEarning) {
        // Update existing record
        earning = await prisma.partnerEarning.update({
          where: { id: existingEarning.id },
          data: {
            totalImpressions,
            totalEngagements,
            amount,
          },
        })
      } else {
        // Create new earning record
        earning = await prisma.partnerEarning.create({
          data: {
            partnerId: partner.id,
            periodStart: parsedStartDate,
            periodEnd: parsedEndDate,
            totalImpressions,
            totalEngagements,
            amount,
            status: "PENDING",
          },
        })
      }

      generatedEarnings.push(earning)
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedEarnings.length} partner earnings records`,
      earnings: generatedEarnings,
    })
  } catch (error) {
    console.error("Error generating partner earnings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

