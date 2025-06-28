import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parse } from "json2csv"

// GET handler for exporting campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get("format") || "csv"
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    // Build filter conditions
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    // Fetch campaigns with relations
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        advertiser: {
          select: {
            companyName: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        adCreatives: {
          select: {
            name: true,
            type: true,
            status: true,
          },
        },
        analytics: {
          select: {
            impressions: true,
            engagements: true,
            conversions: true,
            costData: true,
          },
        },
      },
    })

    // Prepare data for export
    const exportData = campaigns.map((campaign) => {
      const totalImpressions = campaign.analytics.reduce((sum, a) => sum + a.impressions, 0)
      const totalEngagements = campaign.analytics.reduce((sum, a) => sum + a.engagements, 0)
      const totalConversions = campaign.analytics.reduce((sum, a) => sum + a.conversions, 0)
      const totalSpend = campaign.analytics.reduce((sum, a) => {
        const spend = typeof a.costData === "string" ? JSON.parse(a.costData).spend : a.costData.spend
        return sum + Number(spend)
      }, 0)

      return {
        id: campaign.id,
        name: campaign.name,
        advertiser: campaign.advertiser.companyName,
        status: campaign.status,
        objective: campaign.objective,
        budget: campaign.budget,
        dailyBudget: campaign.dailyBudget,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        pricingModel: campaign.pricingModel,
        creatives: campaign.adCreatives.length,
        impressions: totalImpressions,
        engagements: totalEngagements,
        conversions: totalConversions,
        spend: totalSpend,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      }
    })

    // Generate export based on requested format
    if (format === "csv") {
      const csv = parse(exportData)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=campaigns-export-${new Date().toISOString().split("T")[0]}.csv`,
        },
      })
    } else if (format === "json") {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename=campaigns-export-${new Date().toISOString().split("T")[0]}.json`,
        },
      })
    } else {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error exporting campaigns:", error)
    return NextResponse.json({ error: "Failed to export campaigns" }, { status: 500 })
  }
}
