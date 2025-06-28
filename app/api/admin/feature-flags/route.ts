import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route.ts"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Schema for validating feature flag creation/update
const featureFlagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  percentage: z.number().nullable().optional(),
  conditions: z.any().nullable().optional(),
})

/**
 * GET handler for fetching all feature flags
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { admin: true },
    })

    if (!user || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all feature flags with user information
    const flags = await prisma.featureFlag.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({ flags })
  } catch (error) {
    console.error("Error fetching feature flags:", error)
    return NextResponse.json({ error: "Failed to fetch feature flags" }, { status: 500 })
  }
}

/**
 * POST handler for creating or updating a feature flag
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { admin: true },
    })

    if (!user || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = featureFlagSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 },
      )
    }

    const { name, description, enabled, percentage, conditions } = validationResult.data

    // Check if feature flag already exists
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { name },
    })

    let featureFlag

    if (existingFlag) {
      // Update existing feature flag
      featureFlag = await prisma.featureFlag.update({
        where: { name },
        data: {
          description: description !== undefined ? description : existingFlag.description,
          enabled: enabled !== undefined ? enabled : existingFlag.enabled,
          percentage: percentage !== undefined ? percentage : existingFlag.percentage,
          conditions: conditions !== undefined ? conditions : existingFlag.conditions,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new feature flag
      featureFlag = await prisma.featureFlag.create({
        data: {
          name,
          description: description || "",
          enabled: enabled || false,
          percentage,
          conditions,
          createdBy: user.id,
        },
      })
    }

    return NextResponse.json({ featureFlag })
  } catch (error) {
    console.error("Error saving feature flag:", error)
    return NextResponse.json({ error: "Failed to save feature flag" }, { status: 500 })
  }
}

/**
 * DELETE handler for removing a feature flag
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { admin: true },
    })

    if (!user || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get feature flag name from query parameters
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "Feature flag name is required" }, { status: 400 })
    }

    // Check if feature flag exists
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { name },
    })

    if (!existingFlag) {
      return NextResponse.json({ error: "Feature flag not found" }, { status: 404 })
    }

    // Delete the feature flag
    await prisma.featureFlag.delete({
      where: { name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting feature flag:", error)
    return NextResponse.json({ error: "Failed to delete feature flag" }, { status: 500 })
  }
}
