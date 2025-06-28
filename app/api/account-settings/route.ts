import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch user account settings data
 * Returns the complete user account with all related data
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

    // Try to get from cache first
    const cacheKey = `account-settings:${userId}`
    const cachedData = await getCache(cacheKey)

    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get user from database with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        bio: true,
        advertiser: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phoneNumber: true,
            address: true,
            city: true,
            country: true,
          },
        },
        partner: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phoneNumber: true,
            address: true,
            city: true,
            country: true,
            commissionRate: true,
            paymentDetails: true,
          },
        },
        admin: {
          select: {
            id: true,
            permissions: true,
          },
        },
        userPreference: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            key: false, // Don't include the actual key for security
            permissions: true,
            lastUsed: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        sessions: {
          select: {
            id: true,
            expires: true,
            sessionToken: false, // Don't include the actual token for security
          },
          orderBy: {
            expires: "desc",
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get billing information for advertisers
    let billing = null
    if (user.role === "ADVERTISER" && user.advertiser) {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { advertiserId: user.advertiser.id },
        select: {
          id: true,
          type: true,
          last4: true,
          expMonth: true,
          expYear: true,
          isDefault: true,
        },
      })

      const invoices = await prisma.billing.findMany({
        where: { advertiserId: user.advertiser.id },
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          status: true,
          dueDate: true,
          payment: {
            select: {
              dateCompleted: true,
            },
          },
        },
        orderBy: {
          dueDate: "desc",
        },
        take: 10,
      })

      billing = {
        paymentMethods,
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.amount),
          status: invoice.status,
          dueDate: invoice.dueDate.toISOString(),
          paidDate: invoice.payment?.dateCompleted ? invoice.payment.dateCompleted.toISOString() : null,
        })),
      }
    }

    // Prepare response data
    const responseData = {
      user,
      billing,
    }

    // Cache the data
    await setCache(cacheKey, responseData, CACHE_TTL)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching account settings:", error)
    return NextResponse.json({ error: "Failed to fetch account settings" }, { status: 500 })
  }
}
