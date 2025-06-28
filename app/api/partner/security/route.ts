import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch partner security settings
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Check if user is a partner
    if (userRole !== "PARTNER") {
      return NextResponse.json({ error: "Access denied. Only partners can access this resource." }, { status: 403 })
    }

    // Try to get from cache first
    const cacheKey = `partner:security:${userId}`
    const cachedSettings = await getCache(cacheKey)

    if (cachedSettings) {
      return NextResponse.json(cachedSettings)
    }

    // Get security settings from database
    const settings = await prisma.partnerSecuritySetting.findUnique({
      where: { userId },
    })

    if (!settings) {
      // Get the user's last password change date
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { updatedAt: true },
      })

      // Create default security settings if they don't exist
      const defaultSettings = {
        twoFactorEnabled: false,
        twoFactorMethod: "app",
        loginNotifications: true,
        sessionTimeout: 30,
        lastPasswordChange: user?.updatedAt || new Date(),
        passwordExpiryDays: 90,
        ipRestrictions: [],
        allowedDevices: [],
        loginAttempts: 0,
        accountLockoutThreshold: 5,
        passwordComplexityLevel: "medium",
      }

      // Save default settings to database
      const newSettings = await prisma.partnerSecuritySetting.create({
        data: {
          userId,
          ...defaultSettings,
        },
      })

      // Format the response
      const formattedSettings = {
        ...newSettings,
        lastPasswordChange: newSettings.lastPasswordChange.toISOString(),
      }

      // Cache the settings
      await setCache(cacheKey, formattedSettings, CACHE_TTL)

      return NextResponse.json(formattedSettings)
    }

    // Format the response
    const formattedSettings = {
      ...settings,
      lastPasswordChange: settings.lastPasswordChange.toISOString(),
    }

    // Cache the settings
    await setCache(cacheKey, formattedSettings, CACHE_TTL)

    // Return the settings
    return NextResponse.json(formattedSettings)
  } catch (error) {
    console.error("Error fetching security settings:", error)
    return NextResponse.json({ error: "Failed to fetch security settings" }, { status: 500 })
  }
}

/**
 * PUT: Update partner security settings
 */
export async function PUT(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Check if user is a partner
    if (userRole !== "PARTNER") {
      return NextResponse.json(
        { error: "Access denied. Only partners can update their security settings." },
        { status: 403 },
      )
    }

    // Parse the request body
    const securityData = await req.json()

    // Check if settings exist
    const existingSettings = await prisma.partnerSecuritySetting.findUnique({
      where: { userId },
    })

    let updatedSettings

    if (existingSettings) {
      // Update existing settings
      updatedSettings = await prisma.partnerSecuritySetting.update({
        where: { userId },
        data: {
          twoFactorEnabled: securityData.twoFactorEnabled ?? existingSettings.twoFactorEnabled,
          twoFactorMethod: securityData.twoFactorMethod ?? existingSettings.twoFactorMethod,
          loginNotifications: securityData.loginNotifications ?? existingSettings.loginNotifications,
          sessionTimeout: securityData.sessionTimeout ?? existingSettings.sessionTimeout,
          passwordExpiryDays: securityData.passwordExpiryDays ?? existingSettings.passwordExpiryDays,
          ipRestrictions: securityData.ipRestrictions ?? existingSettings.ipRestrictions,
          allowedDevices: securityData.allowedDevices ?? existingSettings.allowedDevices,
          accountLockoutThreshold: securityData.accountLockoutThreshold ?? existingSettings.accountLockoutThreshold,
          passwordComplexityLevel: securityData.passwordComplexityLevel ?? existingSettings.passwordComplexityLevel,
        },
      })
    } else {
      // Get the user's last password change date
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { updatedAt: true },
      })

      // Create new security settings
      updatedSettings = await prisma.partnerSecuritySetting.create({
        data: {
          userId,
          twoFactorEnabled: securityData.twoFactorEnabled ?? false,
          twoFactorMethod: securityData.twoFactorMethod ?? "app",
          loginNotifications: securityData.loginNotifications ?? true,
          sessionTimeout: securityData.sessionTimeout ?? 30,
          lastPasswordChange: user?.updatedAt || new Date(),
          passwordExpiryDays: securityData.passwordExpiryDays ?? 90,
          ipRestrictions: securityData.ipRestrictions ?? [],
          allowedDevices: securityData.allowedDevices ?? [],
          loginAttempts: securityData.loginAttempts ?? 0,
          accountLockoutThreshold: securityData.accountLockoutThreshold ?? 5,
          passwordComplexityLevel: securityData.passwordComplexityLevel ?? "medium",
        },
      })
    }

    // Format the response
    const formattedSettings = {
      ...updatedSettings,
      lastPasswordChange: updatedSettings.lastPasswordChange.toISOString(),
    }

    // Clear cache
    const cacheKey = `partner:security:${userId}`
    await deleteCache(cacheKey)

    // Also clear profile cache since it includes security settings
    await deleteCache(`partner:profile:${userId}`)

    // Log this activity
    await logUserActivity(userId, "security.update", "Updated security settings")

    // Revalidate paths
    revalidatePath("/partner/settings")

    // Return the updated settings
    return NextResponse.json({
      ...formattedSettings,
      success: true,
      message: "Security settings updated successfully",
    })
  } catch (error) {
    console.error("Error updating security settings:", error)
    return NextResponse.json({ error: "Failed to update security settings" }, { status: 500 })
  }
}

/**
 * Helper function to log user activity
 */
async function logUserActivity(userId: string, type: string, description: string) {
  try {
    // Create a notification for this activity
    await prisma.notification.create({
      data: {
        userId,
        title: "Security Settings Updated",
        message: description,
        type: type.toUpperCase(),
        isRead: false,
        relatedData: { timestamp: new Date().toISOString() },
      },
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: type,
        description,
        ipAddress: "Unknown", // In a real app, you would get this from the request
        userAgent: "Unknown", // In a real app, you would get this from the request
      },
    })
  } catch (error) {
    console.error("Error logging user activity:", error)
  }
}
