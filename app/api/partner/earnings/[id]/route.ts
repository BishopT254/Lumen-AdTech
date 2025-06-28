import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Fetch partner earning details by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get partner
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Get earning by ID
    const earning = await prisma.partnerEarning.findUnique({
      where: {
        id: params.id,
        partnerId: partner.id,
      },
    })

    if (!earning) {
      return NextResponse.json({ error: "Earning not found" }, { status: 404 })
    }

    // Get additional details for the earning
    // This would typically come from your analytics or data warehouse
    // For this example, we'll generate some mock data

    // Get devices for this partner
    const devices = await prisma.device.findMany({
      where: {
        partnerId: partner.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    // Generate mock impression and engagement data by device
    const impressionsByDevice: Record<string, number> = {}
    const engagementsByDevice: Record<string, number> = {}

    let remainingImpressions = earning.totalImpressions
    let remainingEngagements = earning.totalEngagements

    devices.forEach((device, index) => {
      // Distribute impressions and engagements across devices
      const deviceShare = index === devices.length - 1 ? 1 : Math.random() * 0.5 + 0.1 // Between 10% and 60%

      const deviceImpressions =
        index === devices.length - 1 ? remainingImpressions : Math.floor(earning.totalImpressions * deviceShare)

      const deviceEngagements =
        index === devices.length - 1 ? remainingEngagements : Math.floor(earning.totalEngagements * deviceShare)

      impressionsByDevice[device.name] = deviceImpressions
      engagementsByDevice[device.name] = deviceEngagements

      remainingImpressions -= deviceImpressions
      remainingEngagements -= deviceEngagements
    })

    // Calculate additional metrics
    const adRevenue = Number(earning.amount) / (partner.commissionRate ? Number(partner.commissionRate) : 0.3)
    const performanceBonus = adRevenue * 0.05 // Assuming 5% performance bonus

    // Combine all data
    const earningDetails = {
      ...earning,
      impressionsByDevice,
      engagementsByDevice,
      adRevenue,
      commissionRate: partner.commissionRate ? Number(partner.commissionRate) * 100 : 30,
      performanceBonus,
    }

    return NextResponse.json(earningDetails)
  } catch (error) {
    console.error("Error fetching earning details:", error)
    return NextResponse.json({ error: "Failed to fetch earning details" }, { status: 500 })
  }
}
