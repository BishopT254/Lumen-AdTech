import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all unique tags and count creatives with each tag
    // This is a bit more complex since tags are stored as an array
    // We'll need to use a raw query or aggregate in a real implementation

    // For this example, we'll return a simulated response
    // In a real implementation, you would query the database

    const tags = [
      { id: "branding", name: "branding", count: 15 },
      { id: "seasonal", name: "seasonal", count: 12 },
      { id: "promotion", name: "promotion", count: 10 },
      { id: "product", name: "product", count: 8 },
      { id: "holiday", name: "holiday", count: 7 },
      { id: "sale", name: "sale", count: 6 },
      { id: "summer", name: "summer", count: 5 },
      { id: "winter", name: "winter", count: 4 },
      { id: "interactive", name: "interactive", count: 3 },
      { id: "ar", name: "ar", count: 2 },
      { id: "voice", name: "voice", count: 1 },
    ]

    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error fetching ad creative tags:", error)
    return NextResponse.json({ error: "Failed to fetch ad creative tags" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 })
    }

    // In a real implementation, you might have a separate tags table
    // For this example, we'll just return success
    return NextResponse.json({
      id: name,
      name,
      count: 0,
    })
  } catch (error) {
    console.error("Error creating ad creative tag:", error)
    return NextResponse.json({ error: "Failed to create ad creative tag" }, { status: 500 })
  }
}
