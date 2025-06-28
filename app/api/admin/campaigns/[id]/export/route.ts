import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format, subDays } from "date-fns"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { parse } from "json2csv"

// Fetch system settings for currency formatting
async function getSystemSettings() {
  try {
    const generalSettingsConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "general_settings" },
    })

    if (!generalSettingsConfig) {
      return { defaultCurrency: "USD" }
    }

    const generalSettings =
      typeof generalSettingsConfig.configValue === "string"
        ? JSON.parse(generalSettingsConfig.configValue)
        : generalSettingsConfig.configValue

    return {
      defaultCurrency: generalSettings?.defaultCurrency || "USD",
      dateFormat: generalSettings?.dateFormat || "MMM d, yyyy",
      companyName: generalSettings?.companyName || "Your Company",
      logoUrl: generalSettings?.logoUrl || null,
    }
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return { defaultCurrency: "USD" }
  }
}

// Format currency based on system settings
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper function to convert campaign data to CSV
async function convertToCSV(campaign: any, analytics: any[], timeRange: string) {
  const settings = await getSystemSettings()

  // Calculate summary metrics
  const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0)
  const totalEngagements = analytics.reduce((sum, item) => sum + item.engagements, 0)
  const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0)
  const totalSpend = analytics.reduce((sum, item) => {
    const spend = typeof item.costData === "string" ? JSON.parse(item.costData).spend : item.costData.spend
    return sum + Number(spend)
  }, 0)
  const avgCTR = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
  const avgConvRate = totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0
  const avgDwellTime = analytics.reduce((sum, item) => sum + (item.averageDwellTime || 0), 0) / (analytics.length || 1)

  // Format campaign details
  const campaignDetails = {
    "Campaign ID": campaign.id,
    "Campaign Name": campaign.name,
    Status: campaign.status,
    Objective: campaign.objective,
    Budget: formatCurrency(campaign.budget, settings.defaultCurrency),
    "Daily Budget": campaign.dailyBudget ? formatCurrency(campaign.dailyBudget, settings.defaultCurrency) : "N/A",
    "Start Date": format(new Date(campaign.startDate), "yyyy-MM-dd"),
    "End Date": campaign.endDate ? format(new Date(campaign.endDate), "yyyy-MM-dd") : "Ongoing",
    "Pricing Model": campaign.pricingModel,
    Advertiser: campaign.advertiser.companyName,
    "Advertiser Contact": campaign.advertiser.user?.email || "N/A",
    "Target Locations": campaign.targetLocations
      ? typeof campaign.targetLocations === "string"
        ? campaign.targetLocations
        : JSON.stringify(campaign.targetLocations)
      : "Nationwide",
    "Created At": format(new Date(campaign.createdAt), "yyyy-MM-dd HH:mm:ss"),
    "Updated At": format(new Date(campaign.updatedAt), "yyyy-MM-dd HH:mm:ss"),
    "Time Range": getTimeRangeLabel(timeRange),
  }

  // Format summary metrics
  const summaryMetrics = {
    "Total Impressions": totalImpressions,
    "Total Engagements": totalEngagements,
    "Total Conversions": totalConversions,
    "Total Spend": formatCurrency(totalSpend, settings.defaultCurrency),
    "Average CTR": `${avgCTR.toFixed(2)}%`,
    "Average Conversion Rate": `${avgConvRate.toFixed(2)}%`,
    "Average Dwell Time": `${avgDwellTime.toFixed(2)} seconds`,
    "Budget Utilization": `${((totalSpend / campaign.budget) * 100).toFixed(2)}%`,
  }

  // Format analytics data for CSV
  const analyticsData = analytics.map((item) => ({
    Date: format(new Date(item.date), "yyyy-MM-dd"),
    Impressions: item.impressions,
    Engagements: item.engagements,
    Conversions: item.conversions,
    "CTR (%)": (item.ctr * 100).toFixed(2),
    "Conversion Rate (%)": (item.conversionRate * 100).toFixed(2),
    Spend: formatCurrency(
      typeof item.costData === "string" ? JSON.parse(item.costData).spend : item.costData.spend,
      settings.defaultCurrency,
    ),
    "Dwell Time (s)": item.averageDwellTime?.toFixed(2) || "N/A",
  }))

  // Format creatives data for CSV
  const creativesData = campaign.adCreatives.map((creative: any) => ({
    "Creative ID": creative.id,
    Name: creative.name,
    Type: creative.type,
    Status: creative.status,
    Headline: creative.headline,
    Description: creative.description,
    "Call to Action": creative.callToAction,
    Format: creative.format || "N/A",
    Duration: creative.duration ? `${creative.duration}s` : "N/A",
    Approved: creative.isApproved ? "Yes" : "No",
    "Created At": format(new Date(creative.createdAt), "yyyy-MM-dd"),
  }))

  // Create CSV data for each section
  const campaignCSV = parse([campaignDetails], { header: true })
  const summaryCSV = parse([summaryMetrics], { header: true })
  const analyticsCSV = parse(analyticsData, { header: true })
  const creativesCSV = parse(creativesData, { header: true })

  // Combine all sections with headers
  return `CAMPAIGN DETAILS\n${campaignCSV}\n\nPERFORMANCE SUMMARY\n${summaryCSV}\n\nANALYTICS DATA\n${analyticsCSV}\n\nCREATIVES\n${creativesCSV}`
}

// Helper function to create a PDF document
async function createPDF(campaign: any, analytics: any[], timeRange: string) {
  const settings = await getSystemSettings()

  // Calculate summary metrics
  const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0)
  const totalEngagements = analytics.reduce((sum, item) => sum + item.engagements, 0)
  const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0)
  const totalSpend = analytics.reduce((sum, item) => {
    const spend = typeof item.costData === "string" ? JSON.parse(item.costData).spend : item.costData.spend
    return sum + Number(spend)
  }, 0)
  const avgCTR = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
  const avgConvRate = totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0
  const avgDwellTime = analytics.reduce((sum, item) => sum + (item.averageDwellTime || 0), 0) / (analytics.length || 1)

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595.28, 841.89]) // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // Set some styles
  const textSize = 10
  const headerSize = 16
  const subHeaderSize = 12
  const margin = 50
  let y = page.getHeight() - margin
  const lineHeight = 15
  const columnWidth = (page.getWidth() - margin * 2) / 2

  // Add title and company info
  page.drawText(`Campaign Performance Report`, {
    x: margin,
    y,
    size: headerSize,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.6),
  })
  y -= lineHeight * 1.5

  page.drawText(`${settings.companyName}`, {
    x: margin,
    y,
    size: subHeaderSize,
    font: boldFont,
  })
  y -= lineHeight

  page.drawText(`Generated on ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, {
    x: margin,
    y,
    size: textSize,
    font: italicFont,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight * 2

  // Add campaign name and time range
  page.drawText(`Campaign: ${campaign.name}`, {
    x: margin,
    y,
    size: subHeaderSize + 2,
    font: boldFont,
  })
  y -= lineHeight

  page.drawText(`Time Range: ${getTimeRangeLabel(timeRange)}`, {
    x: margin,
    y,
    size: textSize,
    font: font,
  })
  y -= lineHeight * 2

  // Add campaign details section
  page.drawText("Campaign Details", {
    x: margin,
    y,
    size: subHeaderSize,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.6),
  })
  y -= lineHeight * 1.2

  // Draw a horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= lineHeight

  // Campaign details in two columns
  const leftDetails = [
    ["Status", campaign.status],
    ["Objective", campaign.objective],
    ["Budget", formatCurrency(campaign.budget, settings.defaultCurrency)],
    ["Daily Budget", campaign.dailyBudget ? formatCurrency(campaign.dailyBudget, settings.defaultCurrency) : "N/A"],
    ["Pricing Model", campaign.pricingModel],
  ]

  const rightDetails = [
    ["Start Date", format(new Date(campaign.startDate), "yyyy-MM-dd")],
    ["End Date", campaign.endDate ? format(new Date(campaign.endDate), "yyyy-MM-dd") : "Ongoing"],
    ["Advertiser", campaign.advertiser.companyName],
    ["Contact", campaign.advertiser.user?.email || "N/A"],
    ["ID", campaign.id],
  ]

  const initialY = y
  // Left column
  for (const [key, value] of leftDetails) {
    page.drawText(`${key}:`, {
      x: margin,
      y,
      size: textSize,
      font: boldFont,
    })
    page.drawText(`${value}`, {
      x: margin + 100,
      y,
      size: textSize,
      font: font,
    })
    y -= lineHeight
  }

  // Reset y for right column
  y = initialY
  // Right column
  for (const [key, value] of rightDetails) {
    page.drawText(`${key}:`, {
      x: margin + columnWidth,
      y,
      size: textSize,
      font: boldFont,
    })
    page.drawText(`${value}`, {
      x: margin + columnWidth + 100,
      y,
      size: textSize,
      font: font,
    })
    y -= lineHeight
  }

  // Move to the lower of the two column endpoints
  y = Math.min(y, initialY - leftDetails.length * lineHeight)
  y -= lineHeight * 1.5

  // Add performance summary section
  page.drawText("Performance Summary", {
    x: margin,
    y,
    size: subHeaderSize,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.6),
  })
  y -= lineHeight * 1.2

  // Draw a horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= lineHeight

  if (analytics.length > 0) {
    const leftMetrics = [
      ["Total Impressions", totalImpressions.toLocaleString()],
      ["Total Engagements", totalEngagements.toLocaleString()],
      ["Total Conversions", totalConversions.toLocaleString()],
    ]

    const rightMetrics = [
      ["Average CTR", `${avgCTR.toFixed(2)}%`],
      ["Conversion Rate", `${avgConvRate.toFixed(2)}%`],
      ["Total Spend", formatCurrency(totalSpend, settings.defaultCurrency)],
    ]

    const metricsY = y
    // Left column
    for (const [key, value] of leftMetrics) {
      page.drawText(`${key}:`, {
        x: margin,
        y,
        size: textSize,
        font: boldFont,
      })
      page.drawText(`${value}`, {
        x: margin + 120,
        y,
        size: textSize,
        font: font,
      })
      y -= lineHeight
    }

    // Reset y for right column
    y = metricsY
    // Right column
    for (const [key, value] of rightMetrics) {
      page.drawText(`${key}:`, {
        x: margin + columnWidth,
        y,
        size: textSize,
        font: boldFont,
      })
      page.drawText(`${value}`, {
        x: margin + columnWidth + 120,
        y,
        size: textSize,
        font: font,
      })
      y -= lineHeight
    }

    // Move to the lower of the two column endpoints
    y = Math.min(y, metricsY - leftMetrics.length * lineHeight)

    // Add budget utilization
    y -= lineHeight
    page.drawText(`Budget Utilization: ${campaign.budget ? ((totalSpend / campaign.budget) * 100).toFixed(2) : "0.00"}%`, {
	  x: margin,
	  y,
	  size: textSize,
	  font: boldFont,
	})

    // Draw budget progress bar
    const barWidth = 200
    const barHeight = 10
    const fillWidth = campaign.budget ? Math.min(barWidth * (totalSpend / campaign.budget), barWidth) : 0;

    y -= lineHeight
    // Draw background bar
    page.drawRectangle({
      x: margin,
      y,
      width: barWidth,
      height: barHeight,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    })

    // Draw fill bar
    page.drawRectangle({
      x: margin,
      y,
      width: fillWidth,
      height: barHeight,
      color: rgb(0.2, 0.5, 0.8),
    })
  } else {
    page.drawText("No analytics data available for the selected time period", {
      x: margin,
      y,
      size: textSize,
      font: italicFont,
    })
  }

  y -= lineHeight * 2.5

  // Add analytics data section
  page.drawText("Analytics Data", {
    x: margin,
    y,
    size: subHeaderSize,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.6),
  })
  y -= lineHeight * 1.2

  // Draw a horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= lineHeight

  if (analytics.length > 0) {
    // Table headers
    const headers = ["Date", "Impressions", "Engagements", "CTR", "Conversions", "Spend"]
    const colWidths = [80, 80, 80, 60, 80, 100]
    let xPos = margin

    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], {
        x: xPos,
        y,
        size: textSize,
        font: boldFont,
      })
      xPos += colWidths[i]
    }
    y -= lineHeight

    // Draw header separator
    page.drawLine({
      start: { x: margin, y: y + 5 },
      end: { x: page.getWidth() - margin, y: y + 5 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })
    y -= 5

    // Table rows (limit to 10 most recent entries to fit on page)
    const recentAnalytics = analytics.slice(-10).reverse()
    for (const item of recentAnalytics) {
      if (y < margin + 50) {
        // Add a new page if we're running out of space
        const newPage = pdfDoc.addPage([595.28, 841.89])
        const page = newPage
        y = page.getHeight() - margin

        // Add continuation header
        page.drawText("Analytics Data (continued)", {
          x: margin,
          y,
          size: subHeaderSize,
          font: boldFont,
        })
        y -= lineHeight * 2

        // Redraw table headers
        xPos = margin
        for (let i = 0; i < headers.length; i++) {
          page.drawText(headers[i], {
            x: xPos,
            y,
            size: textSize,
            font: boldFont,
          })
          xPos += colWidths[i]
        }
        y -= lineHeight

        // Draw header separator
        page.drawLine({
          start: { x: margin, y: y + 5 },
          end: { x: page.getWidth() - margin, y: y + 5 },
          thickness: 0.5,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 5
      }

      const spend = typeof item.costData === "string" ? JSON.parse(item.costData).spend : item.costData.spend
      const rowData = [
        format(new Date(item.date), "yyyy-MM-dd"),
        item.impressions.toLocaleString(),
        item.engagements.toLocaleString(),
        `${(item.ctr * 100).toFixed(2)}%`,
        item.conversions.toLocaleString(),
        formatCurrency(spend, settings.defaultCurrency),
      ]

      xPos = margin
      for (let i = 0; i < rowData.length; i++) {
        page.drawText(rowData[i], {
          x: xPos,
          y,
          size: textSize,
          font: font,
        })
        xPos += colWidths[i]
      }
      y -= lineHeight
    }

    if (analytics.length > 10) {
      y -= lineHeight / 2
      page.drawText(`Note: Showing 10 most recent entries out of ${analytics.length} total records.`, {
        x: margin,
        y,
        size: textSize - 1,
        font: italicFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }
  } else {
    page.drawText("No analytics data available for the selected time period", {
      x: margin,
      y,
      size: textSize,
      font: italicFont,
    })
  }

  y -= lineHeight * 2.5

  // Check if we need a new page for creatives
  if (y < margin + 150) {
    const newPage = pdfDoc.addPage([595.28, 841.89])
    page = newPage
    y = page.getHeight() - margin
  }

  // Add creatives section
  page.drawText("Campaign Creatives", {
    x: margin,
    y,
    size: subHeaderSize,
    font: boldFont,
    color: rgb(0.2, 0.4, 0.6),
  })
  y -= lineHeight * 1.2

  // Draw a horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= lineHeight

  if (campaign.adCreatives.length > 0) {
    for (const creative of campaign.adCreatives) {
      // Check if we need a new page
      if (y < margin + 100) {
        const newPage = pdfDoc.addPage([595.28, 841.89])
        const page = newPage
        y = page.getHeight() - margin

        // Add continuation header
        page.drawText("Campaign Creatives (continued)", {
          x: margin,
          y,
          size: subHeaderSize,
          font: boldFont,
        })
        y -= lineHeight * 2
      }

      // Creative name and type
      page.drawText(`${creative.name} (${creative.type})`, {
        x: margin,
        y,
        size: textSize + 1,
        font: boldFont,
      })
      y -= lineHeight

      // Status badge
      const statusText = `${creative.status}${creative.isApproved ? " (APPROVED)" : ""}`
      const statusColor = creative.isApproved ? rgb(0.2, 0.7, 0.3) : rgb(0.7, 0.5, 0.2)

      page.drawRectangle({
        x: margin,
        y: y - 2,
        width: font.widthOfTextAtSize(statusText, textSize) + 10,
        height: lineHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: statusColor,
        borderWidth: 1,
        borderRadius: 4,
      })

      page.drawText(statusText, {
        x: margin + 5,
        y,
        size: textSize - 1,
        font: boldFont,
        color: statusColor,
      })
      y -= lineHeight * 1.5

      // Creative details
      const details = [
        ["Headline", creative.headline],
        [
          "Description",
          creative.description.length > 50 ? creative.description.substring(0, 50) + "..." : creative.description,
        ],
        ["Call to Action", creative.callToAction],
        ["Format", creative.format || "N/A"],
        ["Duration", creative.duration ? `${creative.duration}s` : "N/A"],
      ]

      for (const [key, value] of details) {
        page.drawText(`${key}:`, {
          x: margin + 10,
          y,
          size: textSize,
          font: boldFont,
        })
        page.drawText(`${value}`, {
          x: margin + 100,
          y,
          size: textSize,
          font: font,
        })
        y -= lineHeight
      }

      y -= lineHeight
    }
  } else {
    page.drawText("No creatives available for this campaign", {
      x: margin,
      y,
      size: textSize,
      font: italicFont,
    })
  }

  // Add footer with page numbers to all pages
  const pageCount = pdfDoc.getPageCount()
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i)
    const footerText = `Page ${i + 1} of ${pageCount} | Generated by ${settings.companyName} | ${format(new Date(), "yyyy-MM-dd")}`

    page.drawLine({
      start: { x: margin, y: margin - 15 },
      end: { x: page.getWidth() - margin, y: margin - 15 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })

    page.drawText(footerText, {
      x: page.getWidth() / 2 - font.widthOfTextAtSize(footerText, textSize - 2) / 2,
      y: margin - 30,
      size: textSize - 2,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Serialize the PDF to bytes
  return await pdfDoc.save()
}

// Helper function to get time range label
function getTimeRangeLabel(timeRange: string): string {
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
      return timeRange
  }
}

// Helper function to determine date range based on timeRange parameter
function getDateRangeFromTimeRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  let startDate: Date

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
    default:
      startDate = new Date(0) // Beginning of time
      break
  }

  return { startDate, endDate }
}

// GET handler for exporting campaign data
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const campaignId = params.id
    const searchParams = request.nextUrl.searchParams
    const exportFormat = searchParams.get("format") || "csv"
    const timeRange = searchParams.get("timeRange") || "all"

    // Validate campaign ID
    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 })
    }

    // Validate format
    if (!["csv", "pdf", "json"].includes(exportFormat)) {
      return NextResponse.json(
        { error: "Unsupported export format. Supported formats: csv, pdf, json" },
        { status: 400 },
      )
    }

    // Validate time range
    if (!["7d", "30d", "90d", "all"].includes(timeRange)) {
      return NextResponse.json({ error: "Invalid time range. Supported values: 7d, 30d, 90d, all" }, { status: 400 })
    }

    // Fetch campaign with relations
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        adCreatives: true,
        AudienceSegment: true,
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Get date range based on timeRange parameter
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange)

    // Fetch analytics data based on time range
    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    })

    // Generate the export based on the requested format
    if (exportFormat === "csv") {
      const csvData = await convertToCSV(campaign, analytics, timeRange)
      const filename = `campaign-${campaign.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.csv`

      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } else if (exportFormat === "pdf") {
      const pdfBytes = await createPDF(campaign, analytics, timeRange)
      const filename = `campaign-${campaign.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    } else if (exportFormat === "json") {
      // Return JSON data with more comprehensive information
      const settings = await getSystemSettings()

      // Calculate summary metrics
      const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0)
      const totalEngagements = analytics.reduce((sum, item) => sum + item.engagements, 0)
      const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0)
      const totalSpend = analytics.reduce((sum, item) => {
        const spend = typeof item.costData === "string" ? JSON.parse(item.costData).spend : item.costData.spend
        return sum + Number(spend)
      }, 0)

      return NextResponse.json({
        campaign: {
          ...campaign,
          targetLocations:
            typeof campaign.targetLocations === "string"
              ? JSON.parse(campaign.targetLocations)
              : campaign.targetLocations,
          targetDemographics:
            typeof campaign.targetDemographics === "string"
              ? JSON.parse(campaign.targetDemographics)
              : campaign.targetDemographics,
          targetSchedule:
            typeof campaign.targetSchedule === "string" ? JSON.parse(campaign.targetSchedule) : campaign.targetSchedule,
        },
        analytics: analytics.map((item) => ({
          ...item,
          costData: typeof item.costData === "string" ? JSON.parse(item.costData) : item.costData,
          audienceMetrics:
            typeof item.audienceMetrics === "string" ? JSON.parse(item.audienceMetrics) : item.audienceMetrics,
          emotionMetrics:
            typeof item.emotionMetrics === "string" ? JSON.parse(item.emotionMetrics) : item.emotionMetrics,
        })),
        summary: {
          timeRange: getTimeRangeLabel(timeRange),
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          metrics: {
            impressions: totalImpressions,
            engagements: totalEngagements,
            conversions: totalConversions,
            spend: totalSpend,
            ctr: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
            conversionRate: totalEngagements > 0 ? (totalConversions / totalEngagements) * 100 : 0,
            budgetUtilization: campaign.budget ? (totalSpend / campaign.budget) * 100 : 0,
          },
          currency: settings.defaultCurrency,
        },
        exportDate: new Date().toISOString(),
      })
    } else {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error exporting campaign:", error)
    return NextResponse.json(
      {
        error: "Failed to export campaign data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
