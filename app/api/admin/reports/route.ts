import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for report creation
const createReportSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["campaign", "financial", "device", "audience", "sustainability", "emotion"]),
  format: z.enum(["pdf", "csv", "excel", "json"]),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  includeCharts: z.boolean().default(true),
  schedule: z.enum(["once", "daily", "weekly", "monthly"]).default("once"),
  filters: z
    .object({
      campaigns: z.array(z.string()).optional(),
      devices: z.array(z.string()).optional(),
      partners: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(),
    })
    .optional(),
  recipients: z.array(z.string()).optional(),
  description: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Build query filters
    const filters: any = {}

    if (type && type !== "all") {
      filters.type = type
    }

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (from && to) {
      filters.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      }
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only admins can see all reports, others see only their own
    if (user.role !== "ADMIN") {
      filters.createdById = user.id
    }

    // Query reports from database
    // Note: In a real implementation, you would have a Report model
    // For this example, we'll simulate the data

    // Simulate database query
    const reports = [
      {
        id: "1",
        name: "Q2 Campaign Performance",
        type: "campaign",
        format: "pdf",
        dateRange: JSON.stringify({
          from: new Date("2023-04-01"),
          to: new Date("2023-06-30"),
        }),
        status: "ready",
        createdAt: new Date("2023-07-01").toISOString(),
        createdBy: "Admin User",
        schedule: "once",
        lastRun: new Date("2023-07-01").toISOString(),
        downloadUrl: "/reports/campaign-q2.pdf",
        size: "2.4 MB",
        description: "Quarterly performance report for all active campaigns",
      },
      {
        id: "2",
        name: "Monthly Financial Summary",
        type: "financial",
        format: "excel",
        dateRange: JSON.stringify({
          from: new Date("2023-06-01"),
          to: new Date("2023-06-30"),
        }),
        status: "ready",
        createdAt: new Date("2023-07-02").toISOString(),
        createdBy: "Admin User",
        schedule: "monthly",
        lastRun: new Date("2023-07-02").toISOString(),
        nextRun: new Date("2023-08-01").toISOString(),
        downloadUrl: "/reports/financial-june.xlsx",
        size: "1.8 MB",
      },
      {
        id: "3",
        name: "Device Health Analysis",
        type: "device",
        format: "pdf",
        dateRange: JSON.stringify({
          from: new Date("2023-06-15"),
          to: new Date("2023-07-15"),
        }),
        status: "processing",
        createdAt: new Date("2023-07-15").toISOString(),
        createdBy: "Admin User",
      },
      {
        id: "4",
        name: "Audience Engagement Insights",
        type: "audience",
        format: "csv",
        dateRange: JSON.stringify({
          from: new Date("2023-07-01"),
          to: new Date("2023-07-15"),
        }),
        status: "pending",
        createdAt: new Date("2023-07-16").toISOString(),
        createdBy: "Admin User",
        schedule: "weekly",
        nextRun: new Date("2023-07-23").toISOString(),
      },
      {
        id: "5",
        name: "Sustainability Impact Report",
        type: "sustainability",
        format: "pdf",
        dateRange: JSON.stringify({
          from: new Date("2023-01-01"),
          to: new Date("2023-06-30"),
        }),
        status: "ready",
        createdAt: new Date("2023-07-10").toISOString(),
        createdBy: "Admin User",
        downloadUrl: "/reports/sustainability-h1.pdf",
        size: "3.2 MB",
        description: "Semi-annual sustainability metrics and carbon footprint analysis",
      },
      {
        id: "6",
        name: "Emotion Analysis Dashboard",
        type: "emotion",
        format: "json",
        dateRange: JSON.stringify({
          from: new Date("2023-07-01"),
          to: new Date("2023-07-14"),
        }),
        status: "failed",
        createdAt: new Date("2023-07-14").toISOString(),
        createdBy: "Admin User",
        description: "Analysis of emotional responses to ad creatives",
      },
    ]

    // Apply filters to simulated data
    let filteredReports = reports

    if (type && type !== "all") {
      filteredReports = filteredReports.filter((report) => report.type === type)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredReports = filteredReports.filter(
        (report) =>
          report.name.toLowerCase().includes(searchLower) ||
          (report.description && report.description.toLowerCase().includes(searchLower)),
      )
    }

    if (from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)
      filteredReports = filteredReports.filter((report) => {
        const createdAt = new Date(report.createdAt)
        return createdAt >= fromDate && createdAt <= toDate
      })
    }

    return NextResponse.json(filteredReports)
  } catch (error) {
    console.error("Error fetching reports:", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    const validatedData = createReportSchema.parse(body)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // In a real implementation, you would create a report in the database
    // and trigger a background job to generate the report

    // Simulate report creation
    const newReport = {
      id: Math.random().toString(36).substring(2, 11),
      name: validatedData.name,
      type: validatedData.type,
      format: validatedData.format,
      dateRange: JSON.stringify(validatedData.dateRange),
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: session.user.name || session.user.email,
      schedule: validatedData.schedule,
      description: validatedData.description,
      filters: validatedData.filters ? JSON.stringify(validatedData.filters) : undefined,
    }

    // In a real implementation, you would start a background job to generate the report
    // For this example, we'll just return the created report

    return NextResponse.json(newReport, { status: 201 })
  } catch (error) {
    console.error("Error creating report:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
  }
}
