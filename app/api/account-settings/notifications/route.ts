import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { z } from "zod"

// Validation schema for notification preferences
const notificationSchema = z.object({
  emailFrequency: z.enum(["daily", "weekly", "important", "never"]),
  preferences: z
    .object({
      securityAlerts: z.boolean().optional(),
      accountActivity: z.boolean().optional(),
      productUpdates: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
    })
    .optional(),
})

/**
 * PUT: Update notification preferences
 */
export async function PUT(req: NextRequest) {
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
    const validationResult = notificationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
    }

    const { emailFrequency, preferences } = validationResult.data

    // Get the current user preferences
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    })

    // Update or create user preferences
    const updatedPreferences = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailFrequency,
        dashboardLayout: preferences ? { notifications: preferences } : {},
        theme: userPreference?.theme || "system",
      },
      update: {
        emailFrequency,
        dashboardLayout: preferences
          ? {
              ...userPreference?.dashboardLayout,
              notifications: preferences,
            }
          : userPreference?.dashboardLayout,
      },
    })

    // Invalidate cache
    await deleteCache(`account-settings:${userId}`)
    await deleteCache(`profile:${userId}`)

    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
  }
}
