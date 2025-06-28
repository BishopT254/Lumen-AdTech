import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for audience segment creation/update
const audienceSegmentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional().nullable(),
  type: z.enum(["DEMOGRAPHIC", "BEHAVIORAL", "LOCATION", "CUSTOM"]).default("CUSTOM"),
  rules: z.any(), // Will be stored as JSON
  isActive: z.boolean().default(true),
})

// GET handler for fetching audience segments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const activeOnly = searchParams.get("activeOnly") === "true"

    // Build filter conditions
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (activeOnly) {
      where.isActive = true
    }

    // Fetch audience segments
    const segments = await prisma.audienceSegment.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(segments)
  } catch (error) {
    console.error("Error fetching audience segments:", error)
    return NextResponse.json({ error: "Failed to fetch audience segments" }, { status: 500 })
  }
}

// POST handler for creating a new audience segment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validatedData = audienceSegmentSchema.parse(body)

    // Process JSON fields
    const processedData = {
      ...validatedData,
      rules: typeof validatedData.rules === "string" ? validatedData.rules : JSON.stringify(validatedData.rules),
      createdById: session.user.id,
    }

    // Create audience segment
    const segment = await prisma.audienceSegment.create({
      data: processedData,
    })

    return NextResponse.json(segment, { status: 201 })
  } catch (error) {
    console.error("Error creating audience segment:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create audience segment" }, { status: 500 })
  }
}
