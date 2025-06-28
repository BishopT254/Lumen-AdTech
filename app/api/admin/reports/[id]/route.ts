import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportId = params.id

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // In a real implementation, you would fetch the report from the database
    // For this example, we'll simulate the data

    // Simulate database query
    const report = {
      id: reportId,
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
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error fetching report:", error)
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportId = params.id

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // In a real implementation, you would delete the report from the database
    // For this example, we'll just return a success response

    return NextResponse.json({ success: true, message: "Report deleted successfully" })
  } catch (error) {
    console.error("Error deleting report:", error)
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 })
  }
}
