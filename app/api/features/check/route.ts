import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route.ts"

const prisma = new PrismaClient()

/**
 * GET handler for checking if a feature flag is enabled
 * This endpoint can be used by both authenticated and unauthenticated users
 * It applies percentage rollouts and conditions if configured
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "Feature flag name is required" }, { status: 400 })
    }

    // Get the feature flag
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { name },
    })

    // If the flag doesn't exist or is disabled, return false
    if (!featureFlag || !featureFlag.enabled) {
      return NextResponse.json({ enabled: false })
    }

    // If there's no percentage rollout or conditions, the feature is enabled for everyone
    if (featureFlag.percentage === null && !featureFlag.conditions) {
      return NextResponse.json({ enabled: true })
    }

    // Get the current user if authenticated
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Apply percentage rollout if configured
    if (featureFlag.percentage !== null) {
      // Use a deterministic approach based on feature flag name and user ID if available
      // This ensures the same user always gets the same result for a given feature
      let hash = 0
      const stringToHash = userId
        ? `${name}-${userId}`
        : `${name}-${request.headers.get("user-agent") || ""}-${request.ip || ""}`

      for (let i = 0; i < stringToHash.length; i++) {
        hash = (hash << 5) - hash + stringToHash.charCodeAt(i)
        hash = hash & hash // Convert to 32bit integer
      }

      // Get a number between 0-100 from the hash
      const userPercentile = Math.abs(hash % 100)

      // If user's percentile is greater than the feature flag percentage, disable the feature
      if (userPercentile >= featureFlag.percentage) {
        return NextResponse.json({ enabled: false })
      }
    }

    // Apply conditions if configured
    if (featureFlag.conditions) {
      // This is a simplified implementation
      // In a real-world scenario, you would evaluate complex conditions here
      // based on user properties, context, etc.

      // For now, we'll just check if there's a user role condition
      if (featureFlag.conditions.userRole && session?.user?.role) {
        if (featureFlag.conditions.userRole !== session.user.role) {
          return NextResponse.json({ enabled: false })
        }
      }
    }

    // If we've passed all checks, the feature is enabled
    return NextResponse.json({ enabled: true })
  } catch (error) {
    console.error("Error checking feature flag:", error)
    return NextResponse.json({ error: "Failed to check feature flag" }, { status: 500 })
  }
}
