import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch partner notification preferences
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
    const cacheKey = `partner:notifications:${userId}`
    const cachedPreferences = await getCache(cacheKey)

    if (cachedPreferences) {
      return NextResponse.json(cachedPreferences)
    }

    // Get notification preferences from database
    const preferences = await prisma.partnerNotificationPreference.findUnique({
      where: { userId },
    })

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPreferences = {
        email: true,
        sms: true,
        push: false,
        paymentNotifications: true,
        maintenanceAlerts: true,
        campaignUpdates: false,
        performanceReports: true,
        securityAlerts: true,
        marketingEmails: false,
        systemUpdates: true,
        deviceOfflineAlerts: true,
        newCampaignNotifications: false,
        paymentFailureAlerts: true,
        documentExpiryReminders: true,
      }

      // Save default preferences to database
      const newPreferences = await prisma.partnerNotificationPreference.create({
        data: {
          userId,
          ...defaultPreferences,
        },
      })

      // Cache the preferences
      await setCache(cacheKey, newPreferences, CACHE_TTL)

      return NextResponse.json(newPreferences)
    }

    // Cache the preferences
    await setCache(cacheKey, preferences, CACHE_TTL)

    // Return the preferences
    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error fetching notification preferences:", error)
    return NextResponse.json({ error: "Failed to fetch notification preferences" }, { status: 500 })
  }
}

/**
 * PUT: Update partner notification preferences
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
      return NextResponse.json({ error: "Access denied. Only partners can update their preferences." }, { status: 403 })
    }

    // Parse the request body
    const preferencesData = await req.json()

    // Ensure security alerts are always enabled
    preferencesData.securityAlerts = true

    // Check if preferences exist
    const existingPreferences = await prisma.partnerNotificationPreference.findUnique({
      where: { userId },
    })

    let updatedPreferences

    if (existingPreferences) {
      // Update existing preferences
      updatedPreferences = await prisma.partnerNotificationPreference.update({
        where: { userId },
        data: {
          email: preferencesData.email ?? existingPreferences.email,
          sms: preferencesData.sms ?? existingPreferences.sms,
          push: preferencesData.push ?? existingPreferences.push,
          paymentNotifications: preferencesData.paymentNotifications ?? existingPreferences.paymentNotifications,
          maintenanceAlerts: preferencesData.maintenanceAlerts ?? existingPreferences.maintenanceAlerts,
          campaignUpdates: preferencesData.campaignUpdates ?? existingPreferences.campaignUpdates,
          performanceReports: preferencesData.performanceReports ?? existingPreferences.performanceReports,
          securityAlerts: true, // Always enabled
          marketingEmails: preferencesData.marketingEmails ?? existingPreferences.marketingEmails,
          systemUpdates: preferencesData.systemUpdates ?? existingPreferences.systemUpdates,
          deviceOfflineAlerts: preferencesData.deviceOfflineAlerts ?? existingPreferences.deviceOfflineAlerts,
          newCampaignNotifications:
            preferencesData.newCampaignNotifications ?? existingPreferences.newCampaignNotifications,
          paymentFailureAlerts: preferencesData.paymentFailureAlerts ?? existingPreferences.paymentFailureAlerts,
          documentExpiryReminders:
            preferencesData.documentExpiryReminders ?? existingPreferences.documentExpiryReminders,
        },
      })
    } else {
      // Create new preferences
      updatedPreferences = await prisma.partnerNotificationPreference.create({
        data: {
          userId,
          email: preferencesData.email ?? true,
          sms: preferencesData.sms ?? true,
          push: preferencesData.push ?? false,
          paymentNotifications: preferencesData.paymentNotifications ?? true,
          maintenanceAlerts: preferencesData.maintenanceAlerts ?? true,
          campaignUpdates: preferencesData.campaignUpdates ?? false,
          performanceReports: preferencesData.performanceReports ?? true,
          securityAlerts: true, // Always enabled
          marketingEmails: preferencesData.marketingEmails ?? false,
          systemUpdates: preferencesData.systemUpdates ?? true,
          deviceOfflineAlerts: preferencesData.deviceOfflineAlerts ?? true,
          newCampaignNotifications: preferencesData.newCampaignNotifications ?? false,
          paymentFailureAlerts: preferencesData.paymentFailureAlerts ?? true,
          documentExpiryReminders: preferencesData.documentExpiryReminders ?? true,
        },
      })
    }

    // Clear cache
    const cacheKey = `partner:notifications:${userId}`
    await deleteCache(cacheKey)

    // Also clear profile cache since it includes notification preferences
    await deleteCache(`partner:profile:${userId}`)

    // Log this activity
    await logUserActivity(userId, "notifications.update", "Updated notification preferences")

    // Revalidate paths
    revalidatePath("/partner/settings")

    // Return the updated preferences
    return NextResponse.json({
      ...updatedPreferences,
      success: true,
      message: "Notification preferences updated successfully",
    })
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
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
        title: "Notification Preferences Updated",
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
