import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Cache TTL in seconds (10 minutes)
const CACHE_TTL = 600

/**
 * GET: Fetch user profile data
 * Returns the complete user profile with all related data
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

    // Try to get from cache first
    const cacheKey = `profile:${userId}`
    const cachedProfile = await getCache(cacheKey)

    if (cachedProfile) {
      return NextResponse.json(cachedProfile)
    }

    // Get user from database with basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true, // Include bio field from updated schema
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch additional user data based on the user's role
    const userProfile = await getUserProfileData(userId, userRole)

    // Cache the profile data
    await setCache(cacheKey, userProfile, CACHE_TTL)

    // Return the complete profile data
    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 })
  }
}

/**
 * PUT: Update user profile data
 * Updates the user profile with the provided data
 */
export async function PUT(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    // Parse the request body
    const profileData = await req.json()

    // Get the current user
    const userId = session.user.id
    const userRole = session.user.role

    // Update the user profile data
    const updatedProfile = await updateUserProfileData(userId, userRole, profileData)

    // Clear cache instead of just updating it to ensure fresh data
    const cacheKey = `profile:${userId}`
    await deleteCache(cacheKey)

    // Revalidate all paths that might use profile data
    revalidatePath('/profile')
    revalidatePath('/dashboard')
    revalidatePath('/settings')
    revalidatePath('/account')
    revalidatePath('/') // Homepage might also display user data

    // Return the updated profile data
    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile data" }, { status: 500 })
  }
}

/**
 * Helper function to get complete user profile data
 * Assembles all the data needed for the profile page based on user role
 */
async function getUserProfileData(userId: string, userRole: string) {
  // Get the base user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      bio: true, // Include bio field from updated schema
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Get user preferences or create default ones
  const userPreference = await prisma.userPreference.findUnique({
    where: { userId },
  })

  // Create default preferences if they don't exist
  const preferences = {
    theme: userPreference?.theme || "system",
    notifications: userPreference?.emailFrequency !== "never",
    newsletter: userPreference?.emailFrequency === "daily" || userPreference?.emailFrequency === "weekly",
    marketingEmails: userPreference?.emailFrequency === "daily",
  }

  // Get recent activity (last 10 items)
  const recentActivity = await getRecentActivity(userId, userRole)

  // Get user stats based on role
  const stats = await getUserStats(userId, userRole)

  // Get user certifications
  const certifications = await getUserCertifications(userId)

  // Determine last active time (from session or default to now)
  const lastActive = await getLastActiveTime(userId)

  // Initialize profile fields
  let bio = user.bio || ""
  let company = ""
  let position = ""
  let location = ""
  let phone = ""
  let website = ""

  // Add role-specific data
  if (userRole === "ADVERTISER") {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
    })

    if (advertiser) {
      company = advertiser.companyName
      phone = advertiser.phoneNumber
      location = advertiser.city ? `${advertiser.city}, ${advertiser.country || ""}` : advertiser.country || ""
      position = advertiser.contactPerson
    }
  } else if (userRole === "PARTNER") {
    const partner = await prisma.partner.findUnique({
      where: { userId },
    })

    if (partner) {
      company = partner.companyName
      phone = partner.phoneNumber
      location = partner.city ? `${partner.city}, ${partner.country || ""}` : partner.country || ""
      position = partner.contactPerson
    }
  } else if (userRole === "ADMIN") {
    const admin = await prisma.admin.findUnique({
      where: { userId },
    })

    if (admin) {
      // Extract any relevant admin data
      const permissions = admin.permissions as any
      position = "Administrator"
    }
  }

  // Construct the complete profile object
  return {
    ...user,
    bio,
    company,
    position,
    location,
    phone,
    website,
    lastActive: lastActive.toISOString(),
    preferences,
    stats,
    recentActivity,
    certifications,
  }
}

/**
 * Helper function to update user profile data
 * Updates all relevant tables based on the user's role
 */
async function updateUserProfileData(userId: string, userRole: string, profileData: any) {
  // Start a transaction to ensure all updates are atomic
  return await prisma.$transaction(async (tx) => {
    // Update basic user information
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        name: profileData.name,
        bio: profileData.bio, // Update bio field
        // Don't update email as it's a unique identifier
        // image is typically handled by a separate upload endpoint
      },
    })

    // Update or create user preferences
    const preferences = profileData.preferences || {}

    await tx.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        theme: preferences.theme || "system",
        emailFrequency: getEmailFrequency(preferences),
        dashboardLayout: {},
      },
      update: {
        theme: preferences.theme || "system",
        emailFrequency: getEmailFrequency(preferences),
      },
    })

    // Update role-specific information
    if (userRole === "ADVERTISER") {
      await updateAdvertiserProfile(tx, userId, profileData)
    } else if (userRole === "PARTNER") {
      await updatePartnerProfile(tx, userId, profileData)
    }

    // Log this activity
    await logUserActivity(tx, userId, "profile.update", "Updated profile information")

    // Return the updated profile
    return await getUserProfileData(userId, userRole)
  })
}

/**
 * Update advertiser-specific profile information
 */
async function updateAdvertiserProfile(tx: any, userId: string, profileData: any) {
  const advertiser = await tx.advertiser.findUnique({
    where: { userId },
  })

  if (advertiser) {
    await tx.advertiser.update({
      where: { userId },
      data: {
        companyName: profileData.company || advertiser.companyName,
        phoneNumber: profileData.phone || advertiser.phoneNumber,
        city: profileData.location ? profileData.location.split(",")[0].trim() : advertiser.city,
        country:
          profileData.location && profileData.location.includes(",")
            ? profileData.location.split(",")[1].trim()
            : advertiser.country,
        contactPerson: profileData.position || advertiser.contactPerson
      },
    })
  }
}

/**
 * Update partner-specific profile information
 */
async function updatePartnerProfile(tx: any, userId: string, profileData: any) {
  const partner = await tx.partner.findUnique({
    where: { userId },
  })

  if (partner) {
    await tx.partner.update({
      where: { userId },
      data: {
        companyName: profileData.company || partner.companyName,
        phoneNumber: profileData.phone || partner.phoneNumber,
        city: profileData.location ? profileData.location.split(",")[0].trim() : partner.city,
        country:
          profileData.location && profileData.location.includes(",")
            ? profileData.location.split(",")[1].trim()
            : partner.country,
        contactPerson: profileData.position || partner.contactPerson
      },
    })
  }
}

/**
 * Helper function to get recent user activity
 * Fetches activity from various sources based on user role
 */
async function getRecentActivity(userId: string, userRole: string) {
  const activities = []

  // Get recent sessions as login activity
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { expires: "desc" },
    take: 3,
  })

  sessions.forEach((session) => {
    activities.push({
      id: `session-${session.id}`,
      type: "login.session",
      description: `Logged in from a new device`,
      timestamp: new Date(session.expires).toISOString(),
    })
  })

  // Get notifications as activities
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
  })

  notifications.forEach((notification) => {
    activities.push({
      id: `notification-${notification.id}`,
      type: notification.type.toLowerCase(),
      description: notification.message,
      timestamp: notification.createdAt.toISOString(),
    })
  })

  // Add role-specific activities
  if (userRole === "ADVERTISER") {
    // Get recent campaigns
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      include: {
        campaigns: {
          orderBy: { updatedAt: "desc" },
          take: 3,
        },
      },
    })

    if (advertiser) {
      advertiser.campaigns.forEach((campaign) => {
        activities.push({
          id: `campaign-${campaign.id}`,
          type: "campaign.update",
          description: `Updated campaign "${campaign.name}"`,
          timestamp: campaign.updatedAt.toISOString(),
        })
      })
    }

    // Get recent payments
    const payments = await prisma.payment.findMany({
      where: { advertiserId: advertiser?.id },
      orderBy: { dateInitiated: "desc" },
      take: 2,
    })

    payments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        type: "payment.processed",
        description: `Payment of $${payment.amount} was ${payment.status.toLowerCase()}`,
        timestamp: payment.dateInitiated.toISOString(),
      })
    })
  } else if (userRole === "PARTNER") {
    // Get partner-specific activities
    const partner = await prisma.partner.findUnique({
      where: { userId },
      include: {
        devices: {
          orderBy: { updatedAt: "desc" },
          take: 3,
        },
      },
    })

    if (partner) {
      partner.devices.forEach((device) => {
        activities.push({
          id: `device-${device.id}`,
          type: "device.update",
          description: `Updated device "${device.name}"`,
          timestamp: device.updatedAt.toISOString(),
        })
      })
    }

    // Get recent earnings
    const earnings = await prisma.partnerEarning.findMany({
      where: { partnerId: partner?.id },
      orderBy: { updatedAt: "desc" },
      take: 2,
    })

    earnings.forEach((earning) => {
      activities.push({
        id: `earning-${earning.id}`,
        type: "earning.processed",
        description: `Earned $${earning.amount} for period ${new Date(earning.periodStart).toLocaleDateString()} - ${new Date(earning.periodEnd).toLocaleDateString()}`,
        timestamp: earning.updatedAt.toISOString(),
      })
    })
  } else if (userRole === "ADMIN") {
    // Get admin-specific activities
    const configChanges = await prisma.configAuditLog.findMany({
      where: { changedBy: userId },
      orderBy: { changeDate: "desc" },
      take: 5,
    })

    configChanges.forEach((change) => {
      activities.push({
        id: `config-${change.id}`,
        type: "settings.change",
        description: `Updated system setting "${change.configKey}"`,
        timestamp: change.changeDate.toISOString(),
      })
    })
  }

  // Sort by timestamp (newest first) and limit to 10
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}

/**
 * Helper function to get user stats based on role
 * Calculates different statistics depending on user role
 */
async function getUserStats(userId: string, userRole: string) {
  // Default stats
  const defaultStats = {
    campaignsCreated: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    averageCTR: 0,
    totalSpend: 0,
  }

  if (userRole === "ADVERTISER") {
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId },
      include: {
        campaigns: {
          include: {
            adDeliveries: true,
            analytics: true,
          },
        },
      },
    })

    if (advertiser) {
      const campaigns = advertiser.campaigns || []
      const campaignsCreated = campaigns.length

      // Calculate total impressions, clicks, conversions
      let totalImpressions = 0
      let totalClicks = 0
      let totalConversions = 0
      let totalSpend = 0

      // Sum up analytics data
      campaigns.forEach((campaign) => {
        campaign.analytics.forEach((analytic) => {
          totalImpressions += analytic.impressions
          totalClicks += analytic.engagements
          totalConversions += analytic.conversions

          // Extract spend from costData JSON
          try {
            const costData = typeof analytic.costData === "string" ? JSON.parse(analytic.costData) : analytic.costData
            totalSpend += costData.spend || 0
          } catch (e) {
            // Handle parsing error
          }
        })
      })

      // Calculate CTR
      const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

      return {
        campaignsCreated,
        totalImpressions,
        totalClicks,
        totalConversions,
        averageCTR,
        totalSpend,
      }
    }
  } else if (userRole === "PARTNER") {
    // Partner-specific stats
    const partner = await prisma.partner.findUnique({
      where: { userId },
      include: {
        devices: {
          include: {
            adDeliveries: true,
            deviceAnalytics: true,
          },
        },
        earnings: true,
      },
    })

    if (partner) {
      const totalDevices = partner.devices.length
      let totalImpressions = 0
      let totalEngagements = 0
      let totalEarnings = 0

      // Sum up analytics data
      partner.devices.forEach((device) => {
        device.deviceAnalytics.forEach((analytic) => {
          totalImpressions += analytic.impressionsServed
          totalEngagements += analytic.engagementsCount
        })
      })

      // Sum up earnings
      partner.earnings.forEach((earning) => {
        totalEarnings += Number(earning.amount)
      })

      return {
        totalDevices,
        totalImpressions,
        totalEngagements,
        totalEarnings,
        averageCTR: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
        totalSpend: 0, // Not applicable for partners
      }
    }
  }

  return defaultStats
}

/**
 * Helper function to get user certifications
 * In a real application, this would fetch from a certifications table
 */
async function getUserCertifications(userId: string) {
  // This would typically come from a certifications table
  // For now, we'll return sample certification data
  return [
    {
      id: "cert-1",
      name: "Digital Marketing Professional",
      issuer: "Digital Marketing Institute",
      date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days from now
    },
    {
      id: "cert-2",
      name: "Google Ads Certification",
      issuer: "Google",
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
      expiryDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString(), // 275 days from now
    },
  ]
}

/**
 * Helper function to get the last active time
 * Uses the most recent session or defaults to current time
 */
async function getLastActiveTime(userId: string) {
  // Try to get the most recent session
  const latestSession = await prisma.session.findFirst({
    where: { userId },
    orderBy: { expires: "desc" },
  })

  if (latestSession) {
    return latestSession.expires
  }

  // If no session found, return current time
  return new Date()
}

/**
 * Helper function to log user activity
 * Records activity in the database for audit and activity feed
 */
async function logUserActivity(tx: any, userId: string, type: string, description: string) {
  // Create a notification for this activity
  await tx.notification.create({
    data: {
      userId,
      title: "Profile Updated",
      message: description,
      type: type.toUpperCase(),
      isRead: false,
      relatedData: { timestamp: new Date().toISOString() },
    },
  })
}

/**
 * Helper function to determine email frequency from preferences
 */
function getEmailFrequency(preferences: any) {
  if (!preferences) return "never"

  if (preferences.marketingEmails) return "daily"
  if (preferences.newsletter) return "weekly"
  if (preferences.notifications) return "important"

  return "never"
}