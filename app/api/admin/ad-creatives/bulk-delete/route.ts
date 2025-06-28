import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Creative IDs are required" }, { status: 400 })
    }

    // In a real implementation, you would delete the creatives from the database
    // For this example, we'll just return success

    return NextResponse.json({
      success: true,
      message: `Deleted ${ids.length} creatives`,
      deletedIds: ids,
    })
  } catch (error) {
    console.error("Error deleting ad creatives:", error)
    return NextResponse.json({ error: "Failed to delete ad creatives" }, { status: 500 })
  }
}
