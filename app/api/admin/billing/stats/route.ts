import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

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

    // Get date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = subDays(today, 1)
    const thisMonth = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    }
    const lastMonth = {
      start: startOfMonth(subDays(thisMonth.start, 1)),
      end: endOfMonth(subDays(thisMonth.start, 1)),
    }
    const thisYear = {
      start: startOfYear(now),
      end: endOfYear(now),
    }

    // Get billing statistics
    const allBillings = await prisma.billing.findMany({
      select: {
        id: true,
        amount: true,
        tax: true,
        total: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
    })

    // Calculate statistics
    const totalBillings = allBillings.length
    const totalAmount = allBillings.reduce((sum, b) => sum + Number(b.total), 0)

    const paidBillings = allBillings.filter((b) => b.status === "PAID")
    const paidAmount = paidBillings.reduce((sum, b) => sum + Number(b.total), 0)

    const unpaidBillings = allBillings.filter((b) => b.status === "UNPAID")
    const unpaidAmount = unpaidBillings.reduce((sum, b) => sum + Number(b.total), 0)

    const overdueBillings = allBillings.filter(
      (b) => b.status === "OVERDUE" || (b.status === "UNPAID" && new Date(b.dueDate) < now),
    )
    const overdueAmount = overdueBillings.reduce((sum, b) => sum + Number(b.total), 0)

    // Calculate monthly trends
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = (now.getMonth() - i + 12) % 12
      const year = now.getFullYear() - Math.floor((i - now.getMonth()) / 12)
      const monthStart = new Date(year, month, 1)
      const monthEnd = endOfMonth(monthStart)

      const monthBillings = allBillings.filter((b) => {
        const date = new Date(b.createdAt)
        return date >= monthStart && date <= monthEnd
      })

      const monthTotal = monthBillings.reduce((sum, b) => sum + Number(b.total), 0)
      const monthPaid = monthBillings.filter((b) => b.status === "PAID").reduce((sum, b) => sum + Number(b.total), 0)

      return {
        month: format(monthStart, "MMM yyyy"),
        total: monthTotal,
        paid: monthPaid,
        unpaid: monthTotal - monthPaid,
      }
    }).reverse()

    // Get top advertisers by billing amount
    const advertiserBillings = await prisma.billing.groupBy({
      by: ["advertiserId"],
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    })

    const topAdvertisers = await Promise.all(
      advertiserBillings.map(async (item) => {
        const advertiser = await prisma.advertiser.findUnique({
          where: { id: item.advertiserId },
          select: {
            id: true,
            companyName: true,
          },
        })

        return {
          id: advertiser?.id,
          name: advertiser?.companyName,
          total: Number(item._sum.total),
        }
      }),
    )

    return NextResponse.json({
      summary: {
        totalBillings,
        totalAmount,
        paidBillings: paidBillings.length,
        paidAmount,
        unpaidBillings: unpaidBillings.length,
        unpaidAmount,
        overdueBillings: overdueBillings.length,
        overdueAmount,
        collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      },
      trends: {
        monthly: monthlyData,
      },
      topAdvertisers,
    })
  } catch (error) {
    console.error("Error fetching billing stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
