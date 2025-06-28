import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Cache TTL in seconds (2 minutes)
const CACHE_TTL = 120

/**
 * GET: Fetch partner wallet data
 * Returns the complete wallet with payment methods and additional data needed for the dashboard
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to get from cache first
    const cacheKey = `partner:wallet:${session.user.id}`
    const cachedWallet = await getCache(cacheKey)

    if (cachedWallet) {
      return NextResponse.json(cachedWallet)
    }

    // Get the partner's wallet data
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: {
          include: {
            paymentMethods: {
              select: {
                id: true,
                type: true,
                isDefault: true,
                status: true,
                lastUsed: true,
                details: true,
                createdAt: true,
                updatedAt: true,
                // Include these fields for backward compatibility
                expiryDate: true,
                expMonth: true,
                expYear: true,
                last4: true,
              },
            },
            transactions: {
              take: 5,
              orderBy: {
                date: "desc",
              },
              select: {
                id: true,
                type: true,
                amount: true,
                currency: true,
                status: true,
                description: true,
                reference: true,
                date: true,
                processedAt: true,
                createdAt: true,
                updatedAt: true,
                paymentMethodId: true,
                paymentMethod: {
                  select: {
                    type: true,
                  },
                },
              },
            },
          },
        },
        earnings: {
          take: 1,
          orderBy: {
            periodEnd: "desc",
          },
          where: {
            status: "PENDING",
          },
          select: {
            amount: true,
            periodEnd: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    if (!partner.wallet) {
      // Create a new wallet if one doesn't exist
      const wallet = await prisma.wallet.create({
        data: {
          partnerId: partner.id,
          balance: 0,
          pendingBalance: 0,
          currency: "USD",
          walletStatus: "ACTIVE",
          autoPayoutEnabled: false,
          payoutThreshold: 100,
          // lastUpdated and createdAt are handled automatically
        },
        include: {
          paymentMethods: {
            select: {
              id: true,
              type: true,
              isDefault: true,
              status: true,
              lastUsed: true,
              details: true,
              createdAt: true,
              updatedAt: true,
              // Include these fields for backward compatibility
              expiryDate: true,
              expMonth: true,
              expYear: true,
              last4: true,
            },
          },
        },
      })

      // Calculate next payout date (first day of next month)
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

      // Add nextPayoutDate to the response
      const walletWithNextPayout = {
        ...wallet,
        nextPayoutDate: nextMonth.toISOString(),
        recentTransactions: [],
      }

      // Cache the wallet data
      await setCache(cacheKey, walletWithNextPayout, CACHE_TTL)

      return NextResponse.json(walletWithNextPayout)
    }

    // Calculate next payout date if not already set
    let nextPayoutDate = partner.wallet.nextPayoutDate

    if (!nextPayoutDate && partner.wallet.autoPayoutEnabled) {
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      nextPayoutDate = nextMonth
    }

    // Format the wallet response with additional data
    const walletResponse = {
      ...partner.wallet,
      nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
      recentTransactions: partner.wallet.transactions,
      pendingEarnings:
        partner.earnings.length > 0 ? partner.earnings.reduce((sum, earning) => sum + Number(earning.amount), 0) : 0,
    }

    // Cache the wallet data
    await setCache(cacheKey, walletResponse, CACHE_TTL)

    return NextResponse.json(walletResponse)
  } catch (error) {
    console.error("Error fetching wallet data:", error)
    return NextResponse.json({ error: "Failed to fetch wallet data" }, { status: 500 })
  }
}

/**
 * PUT: Update wallet settings
 * Updates wallet settings like auto-payout, payout threshold, etc.
 */
export async function PUT(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Parse the request body
    const data = await req.json()

    // Validate the data
    if (data.autoPayoutEnabled !== undefined && typeof data.autoPayoutEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid autoPayoutEnabled value" }, { status: 400 })
    }

    if (data.payoutThreshold !== undefined) {
      const threshold = Number(data.payoutThreshold)
      if (isNaN(threshold) || threshold <= 0) {
        return NextResponse.json({ error: "Invalid payoutThreshold value" }, { status: 400 })
      }
    }

    // Update the wallet
    const updatedWallet = await prisma.wallet.update({
      where: { id: partner.wallet.id },
      data: {
        autoPayoutEnabled: data.autoPayoutEnabled !== undefined ? data.autoPayoutEnabled : undefined,
        payoutThreshold: data.payoutThreshold !== undefined ? Number(data.payoutThreshold) : undefined,
        currency: data.currency || undefined,
        // If auto-payout is enabled and no next payout date is set, set it to the first day of next month
        nextPayoutDate:
          data.autoPayoutEnabled && !partner.wallet.nextPayoutDate
            ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            : undefined,
      },
      include: {
        paymentMethods: {
          select: {
            id: true,
            type: true,
            isDefault: true,
            status: true,
            lastUsed: true,
            details: true,
            createdAt: true,
            updatedAt: true,
            // Include these fields for backward compatibility
            expiryDate: true,
            expMonth: true,
            expYear: true,
            last4: true,
          },
        },
      },
    })

    // Clear cache
    const cacheKey = `partner:wallet:${session.user.id}`
    await deleteCache(cacheKey)

    // Revalidate paths
    revalidatePath("/partner/wallet")
    revalidatePath("/partner")

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error("Error updating wallet settings:", error)
    return NextResponse.json({ error: "Failed to update wallet settings" }, { status: 500 })
  }
}
