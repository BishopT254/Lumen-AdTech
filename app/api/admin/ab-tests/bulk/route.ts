import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ids, action } = await request.json()

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid or missing test IDs" }, { status: 400 })
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Invalid or missing action" }, { status: 400 })
    }

    // Process based on action
    switch (action) {
      case "activate":
        await prisma.aBTest.updateMany({
          where: { id: { in: ids } },
          data: {
            status: "ACTIVE",
            startDate: new Date(),
          },
        })
        break

      case "pause":
        await prisma.aBTest.updateMany({
          where: { id: { in: ids } },
          data: { status: "PAUSED" },
        })
        break

      case "complete":
        await prisma.aBTest.updateMany({
          where: { id: { in: ids } },
          data: {
            status: "COMPLETED",
            endDate: new Date(),
          },
        })
        break

      case "delete":
        await prisma.aBTest.deleteMany({
          where: { id: { in: ids } },
        })
        break

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: ids.length })
  } catch (error) {
    console.error("Error performing bulk action on AB tests:", error)
    return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 })
  }
}

