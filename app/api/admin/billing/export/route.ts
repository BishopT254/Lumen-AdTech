import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import { createObjectCsvStringifier } from "csv-writer"

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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const advertiserId = searchParams.get("advertiserId")
    const campaignId = searchParams.get("campaignId")
    const exportFormat = searchParams.get("format") || "csv"

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

    // Fetch billing records
    const billings = await prisma.billing.findMany({
      where,
      include: {
        advertiser: {
          select: {
            companyName: true,
            contactPerson: true,
            phoneNumber: true,
            email: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
        payment: {
          select: {
            status: true,
            dateCompleted: true,
            paymentMethodType: true,
          },
        },
      },
      orderBy: {
        dueDate: "desc",
      },
    })

    // Format data for export
    const exportData = billings.map((billing) => ({
      Invoice_Number: billing.invoiceNumber,
      Advertiser: billing.advertiser.companyName,
      Contact_Person: billing.advertiser.contactPerson,
      Campaign: billing.campaign.name,
      Amount: Number(billing.amount),
      Tax: Number(billing.tax),
      Total: Number(billing.total),
      Status: billing.status,
      Due_Date: format(new Date(billing.dueDate), "yyyy-MM-dd"),
      Created_Date: format(new Date(billing.createdAt), "yyyy-MM-dd"),
      Payment_Status: billing.payment?.status || "N/A",
      Payment_Date: billing.payment?.dateCompleted
        ? format(new Date(billing.payment.dateCompleted), "yyyy-MM-dd")
        : "N/A",
      Payment_Method: billing.payment?.paymentMethodType || "N/A",
    }))

    // Generate export file based on format
    if (exportFormat === "csv") {
      const csvStringifier = createObjectCsvStringifier({
        header: [
          { id: "Invoice_Number", title: "Invoice Number" },
          { id: "Advertiser", title: "Advertiser" },
          { id: "Contact_Person", title: "Contact Person" },
          { id: "Campaign", title: "Campaign" },
          { id: "Amount", title: "Amount" },
          { id: "Tax", title: "Tax" },
          { id: "Total", title: "Total" },
          { id: "Status", title: "Status" },
          { id: "Due_Date", title: "Due Date" },
          { id: "Created_Date", title: "Created Date" },
          { id: "Payment_Status", title: "Payment Status" },
          { id: "Payment_Date", title: "Payment Date" },
          { id: "Payment_Method", title: "Payment Method" },
        ],
      })

      const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(exportData)

      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="billing-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
        },
      })
    } else if (exportFormat === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Billing Data")

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="billing-export-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
        },
      })
    } else {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in billing export API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
