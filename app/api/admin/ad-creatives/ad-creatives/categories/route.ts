import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all unique categories and count creatives in each
    const categories = await prisma.adCreative.groupBy({
      by: ["category"],
      _count: {
        id: true,
      },
      where: {
        category: {
          not: null,
        },
      },
    })

    // Format the response
    const formattedCategories = categories.map((category) => ({
      id: category.category,
      name: category.category,
      count: category._count.id,
    }))

    return NextResponse.json(formattedCategories)
  } catch (error) {
    console.error("Error fetching ad creative categories:", error)
    return NextResponse.json({ error: "Failed to fetch ad creative categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // In a real implementation, you might have a separate categories table
    // For this example, we'll just return success
    return NextResponse.json({
      id: name,
      name,
      count: 0,
    })
  } catch (error) {
    console.error("Error creating ad creative category:", error)
    return NextResponse.json({ error: "Failed to create ad creative category" }, { status: 500 })
  }
}
