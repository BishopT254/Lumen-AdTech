import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format, subDays } from "date-fns"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaignId = params.id
    const searchParams = request.nextUrl.searchParams
    const exportFormat = searchParams.get("format") || "csv"
    const timeRange = searchParams.get("timeRange") || "7d"

    // Validate campaign ID
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    // Validate export format
    if (exportFormat !== "csv" && exportFormat !== "pdf") {
      return NextResponse.json({ error: "Invalid export format. Supported formats: csv, pdf" }, { status: 400 })
    }

    // Fetch campaign to ensure it exists and get basic info
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Calculate date range based on timeRange parameter
    const endDate = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case "7d":
        startDate = subDays(endDate, 7)
        break
      case "30d":
        startDate = subDays(endDate, 30)
        break
      case "90d":
        startDate = subDays(endDate, 90)
        break
      case "all":
        // For "all", use the campaign start date
        startDate = new Date(campaign.startDate)
        break
      default:
        startDate = subDays(endDate, 7) // Default to 7 days
    }

    // Fetch analytics data for the campaign within the date range
    const analyticsData = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId: campaignId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Format the data based on the requested export format
    if (exportFormat === "csv") {
      return generateCSV(campaign, analyticsData)
    } else {
      return generatePDF(campaign, analyticsData, timeRange)
    }
  } catch (error) {
    console.error("Error exporting analytics:", error)
    return NextResponse.json({ error: "Failed to export analytics data" }, { status: 500 })
  }
}

/**
 * Generate a CSV file from campaign analytics data
 */
async function generateCSV(campaign: any, analyticsData: any[]) {
  // CSV header
  let csv = "Date,Impressions,Engagements,Conversions,CTR (%),Conversion Rate (%),Average Dwell Time (s),Spend\n"

  // Add data rows
  analyticsData.forEach((data) => {
    const formattedDate = format(new Date(data.date), "yyyy-MM-dd")
    const ctr = Number(data.ctr) * 100
    const conversionRate = Number(data.conversionRate) * 100
    const costData = typeof data.costData === "string" ? JSON.parse(data.costData) : data.costData
    const spend = costData.spend || 0

    csv += `${formattedDate},${data.impressions},${data.engagements},${data.conversions},${ctr.toFixed(2)},${conversionRate.toFixed(2)},${data.averageDwellTime || 0},${spend}\n`
  })

  // Calculate totals for summary row
  const totalImpressions = analyticsData.reduce((sum, data) => sum + data.impressions, 0)
  const totalEngagements = analyticsData.reduce((sum, data) => sum + data.engagements, 0)
  const totalConversions = analyticsData.reduce((sum, data) => sum + data.conversions, 0)
  const avgCTR = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
  const avgConversionRate = totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0
  const avgDwellTime =
    analyticsData.reduce((sum, data) => sum + (data.averageDwellTime || 0), 0) / (analyticsData.length || 1)
  const totalSpend = analyticsData.reduce((sum, data) => {
    const costData = typeof data.costData === "string" ? JSON.parse(data.costData) : data.costData
    return sum + (costData.spend || 0)
  }, 0)

  // Add summary row
  csv += `\nTOTAL,${totalImpressions},${totalEngagements},${totalConversions},${avgCTR.toFixed(2)},${avgConversionRate.toFixed(2)},${avgDwellTime.toFixed(2)},${totalSpend.toFixed(2)}\n`

  // Add campaign metadata
  csv += `\nCampaign: ${campaign.name}\n`
  csv += `Advertiser: ${campaign.advertiser.companyName}\n`
  csv += `Status: ${campaign.status}\n`
  csv += `Start Date: ${format(new Date(campaign.startDate), "yyyy-MM-dd")}\n`
  if (campaign.endDate) {
    csv += `End Date: ${format(new Date(campaign.endDate), "yyyy-MM-dd")}\n`
  }
  csv += `Budget: ${campaign.budget}\n`
  csv += `Objective: ${campaign.objective}\n`
  csv += `Pricing Model: ${campaign.pricingModel}\n`
  csv += `Export Date: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}\n`

  // Return the CSV as a downloadable file
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="campaign-analytics-${campaign.id}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  })
}

/**
 * Generate a PDF file from campaign analytics data using pdf-lib
 */
async function generatePDF(campaign: any, analyticsData: any[], timeRange: string) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  // Add a page
  const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
  const { width, height } = page.getSize()

  // Set font sizes
  const titleFontSize = 18
  const headingFontSize = 14
  const normalFontSize = 10
  const smallFontSize = 8

  // Margins
  const margin = 50
  let y = height - margin

  // Add title
  page.drawText("Campaign Analytics Report", {
    x: width / 2 - timesRomanBoldFont.widthOfTextAtSize("Campaign Analytics Report", titleFontSize) / 2,
    y,
    font: timesRomanBoldFont,
    size: titleFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 30

  // Campaign metadata
  page.drawText(`Campaign: ${campaign.name}`, {
    x: margin,
    y,
    font: timesRomanBoldFont,
    size: headingFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 20

  const metadataItems = [
    `Advertiser: ${campaign.advertiser.companyName}`,
    `Status: ${campaign.status}`,
    `Start Date: ${format(new Date(campaign.startDate), "yyyy-MM-dd")}`,
    campaign.endDate ? `End Date: ${format(new Date(campaign.endDate), "yyyy-MM-dd")}` : "End Date: Ongoing",
    `Budget: ${campaign.budget}`,
    `Objective: ${campaign.objective}`,
    `Pricing Model: ${campaign.pricingModel}`,
  ]

  metadataItems.forEach((item) => {
    page.drawText(item, {
      x: margin,
      y,
      font: timesRomanFont,
      size: normalFontSize,
      color: rgb(0, 0, 0),
    })
    y -= 15
  })

  y -= 10

  // Time range info
  page.drawText(`Report Period: ${getTimeRangeText(timeRange)}`, {
    x: margin,
    y,
    font: timesRomanFont,
    size: normalFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 15

  page.drawText(`Export Date: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, {
    x: margin,
    y,
    font: timesRomanFont,
    size: normalFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 30

  // Calculate summary metrics
  const totalImpressions = analyticsData.reduce((sum, data) => sum + data.impressions, 0)
  const totalEngagements = analyticsData.reduce((sum, data) => sum + data.engagements, 0)
  const totalConversions = analyticsData.reduce((sum, data) => sum + data.conversions, 0)
  const avgCTR = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
  const avgConversionRate = totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0
  const totalSpend = analyticsData.reduce((sum, data) => {
    const costData = typeof data.costData === "string" ? JSON.parse(data.costData) : data.costData
    return sum + (costData.spend || 0)
  }, 0)

  // Summary section
  page.drawText("Summary", {
    x: margin,
    y,
    font: timesRomanBoldFont,
    size: headingFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 20

  const summaryItems = [
    `Total Impressions: ${totalImpressions.toLocaleString()}`,
    `Total Engagements: ${totalEngagements.toLocaleString()}`,
    `Total Conversions: ${totalConversions.toLocaleString()}`,
    `Average CTR: ${avgCTR.toFixed(2)}%`,
    `Average Conversion Rate: ${avgConversionRate.toFixed(2)}%`,
    `Total Spend: ${totalSpend.toFixed(2)}`,
  ]

  summaryItems.forEach((item) => {
    page.drawText(item, {
      x: margin,
      y,
      font: timesRomanFont,
      size: normalFontSize,
      color: rgb(0, 0, 0),
    })
    y -= 15
  })
  y -= 20

  // Daily data table
  page.drawText("Daily Performance", {
    x: margin,
    y,
    font: timesRomanBoldFont,
    size: headingFontSize,
    color: rgb(0, 0, 0),
  })
  y -= 20

  // Table headers
  const tableHeaders = ["Date", "Impressions", "Engagements", "Conversions", "CTR (%)", "Conv. Rate (%)", "Spend"]
  const columnWidth = 70

  // Draw table headers
  tableHeaders.forEach((header, i) => {
    page.drawText(header, {
      x: margin + i * columnWidth,
      y,
      font: timesRomanBoldFont,
      size: smallFontSize,
      color: rgb(0, 0, 0),
    })
  })
  y -= 15

  // Draw table rows
  for (const data of analyticsData) {
    // Check if we need a new page
    if (y < margin + 50) {
      // Add a new page
      const newPage = pdfDoc.addPage([595.28, 841.89])
      y = height - margin

      // Redraw headers on new page
      tableHeaders.forEach((header, i) => {
        newPage.drawText(header, {
          x: margin + i * columnWidth,
          y,
          font: timesRomanBoldFont,
          size: smallFontSize,
          color: rgb(0, 0, 0),
        })
      })
      y -= 15
      const page = newPage
    }

    const formattedDate = format(new Date(data.date), "yyyy-MM-dd")
    const ctr = Number(data.ctr) * 100
    const conversionRate = Number(data.conversionRate) * 100
    const costData = typeof data.costData === "string" ? JSON.parse(data.costData) : data.costData
    const spend = costData.spend || 0

    const rowData = [
      formattedDate,
      data.impressions.toString(),
      data.engagements.toString(),
      data.conversions.toString(),
      ctr.toFixed(2),
      conversionRate.toFixed(2),
      spend.toString(),
    ]

    rowData.forEach((text, i) => {
      page.drawText(text, {
        x: margin + i * columnWidth,
        y,
        font: timesRomanFont,
        size: smallFontSize,
        color: rgb(0, 0, 0),
      })
    })

    y -= 15
  }

  // Add footer
  page.drawText(`Generated by ${campaign.advertiser.companyName} on ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, {
    x:
      width / 2 -
      timesRomanFont.widthOfTextAtSize(
        `Generated by ${campaign.advertiser.companyName} on ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
        smallFontSize,
      ) /
        2,
    y: margin / 2,
    font: timesRomanFont,
    size: smallFontSize,
    color: rgb(0, 0, 0),
  })

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save()

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="campaign-analytics-${campaign.id}-${format(new Date(), "yyyy-MM-dd")}.pdf"`,
    },
  })
}

/**
 * Helper function to get human-readable time range text
 */
function getTimeRangeText(timeRange: string): string {
  switch (timeRange) {
    case "7d":
      return "Last 7 days"
    case "30d":
      return "Last 30 days"
    case "90d":
      return "Last 90 days"
    case "all":
      return "All time"
    default:
      return "Custom period"
  }
}
