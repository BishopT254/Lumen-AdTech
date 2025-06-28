import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { randomBytes } from "crypto"
import { z } from "zod"

// Validation schema for API key creation
const apiKeySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  permissions: z.record(z.boolean()).optional(),
  expiresAt: z.string().optional(),
})

/**
 * POST: Create a new API key
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate the request body
    const body = await req.json()
    const validationResult = apiKeySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
    }

    const { name, permissions, expiresAt } = validationResult.data

    // Generate a random API key
    const key = `lumen_${randomBytes(32).toString("hex")}`

    // Create the API key
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        key,
        permissions: permissions || { read: true, write: false, delete: false },
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    // Invalidate cache
    await deleteCache(`account-settings:${userId}`)

    // Return the API key (only once, for security)
    return NextResponse.json({
      success: true,
      key,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        lastUsed: apiKey.lastUsed,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
  }
}
