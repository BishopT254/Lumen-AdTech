import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

/**
 * GET: Fetch partner profile data
 * Returns the complete partner profile with all related data
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
    const cacheKey = `partner:profile:${userId}`
    const cachedProfile = await getCache(cacheKey)

    if (cachedProfile) {
      return NextResponse.json(cachedProfile)
    }

    // Get partner from database
    const partner = await prisma.partner.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Get notification preferences
    const notificationPreferences = await getPartnerNotificationPreferences(userId)

    // Get security settings
    const securitySettings = await getPartnerSecuritySettings(userId)

    // Get login history
    const loginHistory = await getPartnerLoginHistory(userId)

    // Construct the complete profile object
    const profileData = {
      profile: {
        id: partner.id,
        userId: partner.userId,
        companyName: partner.companyName,
        contactPerson: partner.contactPerson,
        phoneNumber: partner.phoneNumber,
        email: partner.user.email,
        address: partner.address || "",
        city: partner.city || "",
        state: partner.state || "",
        postalCode: partner.postalCode || "",
        country: partner.country || "",
        commissionRate: partner.commissionRate,
        status: partner.status,
        verificationStatus: partner.verificationStatus,
        businessType: partner.businessType || "company",
        paymentDetails: partner.paymentDetails || {
          bankName: "",
          accountNumber: "",
          accountName: "",
          swiftCode: "",
          routingNumber: "",
          mpesaNumber: "",
          flutterwaveEmail: "",
          paypalEmail: "",
          stripeAccountId: "",
          preferredPaymentMethod: "bank",
        },
        taxInformation: partner.taxInformation || {
          taxId: "",
          vatNumber: "",
          taxExempt: false,
          taxResidency: "",
          withholdingTaxRate: 0,
          taxFormStatus: "pending",
        },
        createdAt: partner.createdAt.toISOString(),
        updatedAt: partner.updatedAt.toISOString(),
      },
      notificationPreferences,
      securitySettings,
      loginHistory,
    }

    // Cache the profile data
    await setCache(cacheKey, profileData, CACHE_TTL)

    // Return the complete profile data
    return NextResponse.json(profileData)
  } catch (error) {
    console.error("Error fetching partner profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 })
  }
}

/**
 * PUT: Update partner profile data
 * Updates the partner profile with the provided data
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
      return NextResponse.json({ error: "Access denied. Only partners can update their profile." }, { status: 403 })
    }

    // Parse the request body
    const profileData = await req.json()

    // Validate required fields
    if (!profileData.companyName || !profileData.contactPerson || !profileData.phoneNumber) {
      return NextResponse.json(
        { error: "Company name, contact person, and phone number are required fields." },
        { status: 400 },
      )
    }

    // Get the current partner
    const partner = await prisma.partner.findUnique({
      where: { userId },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Prepare payment details
    const paymentDetails = {
      bankName: profileData.paymentDetails?.bankName || "",
      accountNumber: profileData.paymentDetails?.accountNumber || "",
      accountName: profileData.paymentDetails?.accountName || "",
      swiftCode: profileData.paymentDetails?.swiftCode || "",
      routingNumber: profileData.paymentDetails?.routingNumber || "",
      mpesaNumber: profileData.paymentDetails?.mpesaNumber || "",
      flutterwaveEmail: profileData.paymentDetails?.flutterwaveEmail || "",
      paypalEmail: profileData.paymentDetails?.paypalEmail || "",
      stripeAccountId: profileData.paymentDetails?.stripeAccountId || "",
      preferredPaymentMethod: profileData.paymentDetails?.preferredPaymentMethod || "bank",
    }

    // Prepare tax information
    const taxInformation = {
      taxId: profileData.taxInformation?.taxId || "",
      vatNumber: profileData.taxInformation?.vatNumber || "",
      taxExempt: profileData.taxInformation?.taxExempt || false,
      taxResidency: profileData.taxInformation?.taxResidency || "",
      withholdingTaxRate: profileData.taxInformation?.withholdingTaxRate || 0,
      taxFormStatus: partner.taxInformation?.taxFormStatus || "pending",
    }

    // Update the partner profile
    const updatedPartner = await prisma.partner.update({
      where: { userId },
      data: {
        companyName: profileData.companyName,
        contactPerson: profileData.contactPerson,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        postalCode: profileData.postalCode,
        country: profileData.country,
        businessType: profileData.businessType,
        paymentDetails,
        taxInformation,
      },
    })

    // Clear cache
    const cacheKey = `partner:profile:${userId}`
    await deleteCache(cacheKey)

    // Log this activity
    await logUserActivity(userId, "profile.update", "Updated profile information")

    // Revalidate all paths that might use profile data
    revalidatePath("/partner/settings")
    revalidatePath("/partner/profile")
    revalidatePath("/partner/dashboard")

    // Return the updated profile data
    return NextResponse.json({
      profile: {
        ...updatedPartner,
        createdAt: updatedPartner.createdAt.toISOString(),
        updatedAt: updatedPartner.updatedAt.toISOString(),
      },
      success: true,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("Error updating partner profile:", error)
    return NextResponse.json({ error: "Failed to update profile data" }, { status: 500 })
  }
}

/**
 * Helper function to get partner notification preferences
 */
async function getPartnerNotificationPreferences(userId: string) {
  try {
    // Default preferences structure
    const defaultPrefs = {
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

    // Check if user preference exists
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    })

    if (userPreference) {
      // If user preference exists, extract notification settings
      const notificationSettings = userPreference.dashboardLayout?.notificationPreferences || defaultPrefs

      return {
        email: notificationSettings.email ?? defaultPrefs.email,
        sms: notificationSettings.sms ?? defaultPrefs.sms,
        push: notificationSettings.push ?? defaultPrefs.push,
        paymentNotifications: notificationSettings.paymentNotifications ?? defaultPrefs.paymentNotifications,
        maintenanceAlerts: notificationSettings.maintenanceAlerts ?? defaultPrefs.maintenanceAlerts,
        campaignUpdates: notificationSettings.campaignUpdates ?? defaultPrefs.campaignUpdates,
        performanceReports: notificationSettings.performanceReports ?? defaultPrefs.performanceReports,
        securityAlerts: notificationSettings.securityAlerts ?? defaultPrefs.securityAlerts,
        marketingEmails: notificationSettings.marketingEmails ?? defaultPrefs.marketingEmails,
        systemUpdates: notificationSettings.systemUpdates ?? defaultPrefs.systemUpdates,
        deviceOfflineAlerts: notificationSettings.deviceOfflineAlerts ?? defaultPrefs.deviceOfflineAlerts,
        newCampaignNotifications:
          notificationSettings.newCampaignNotifications ?? defaultPrefs.newCampaignNotifications,
        paymentFailureAlerts: notificationSettings.paymentFailureAlerts ?? defaultPrefs.paymentFailureAlerts,
        documentExpiryReminders: notificationSettings.documentExpiryReminders ?? defaultPrefs.documentExpiryReminders,
      }
    }

    // If user preference doesn't exist, create it with default notification settings
    try {
      await prisma.userPreference.create({
        data: {
          userId,
          theme: "system",
          emailFrequency: "daily",
          dashboardLayout: {
            notificationPreferences: defaultPrefs,
          },
        },
      })
    } catch (error) {
      console.error("Error creating user preference:", error)
    }

    return defaultPrefs
  } catch (error) {
    console.error("Error getting notification preferences:", error)
    // Return default preferences if there's an error
    return {
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
  }
}

/**
 * Helper function to get partner security settings
 */
async function getPartnerSecuritySettings(userId: string) {
  try {
    // Check if security settings exist
    const existingSettings = await prisma.partnerSecuritySetting.findUnique({
      where: { userId },
    })

    if (existingSettings) {
      return {
        twoFactorEnabled: existingSettings.twoFactorEnabled,
        twoFactorMethod: existingSettings.twoFactorMethod,
        loginNotifications: existingSettings.loginNotifications,
        sessionTimeout: existingSettings.sessionTimeout,
        lastPasswordChange: existingSettings.lastPasswordChange.toISOString(),
        passwordExpiryDays: existingSettings.passwordExpiryDays,
        ipRestrictions: existingSettings.ipRestrictions,
        allowedDevices: existingSettings.allowedDevices,
        loginAttempts: existingSettings.loginAttempts,
        accountLockoutThreshold: existingSettings.accountLockoutThreshold,
        passwordComplexityLevel: existingSettings.passwordComplexityLevel,
      }
    }

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
    await prisma.partnerSecuritySetting.create({
      data: {
        userId,
        twoFactorEnabled: defaultSettings.twoFactorEnabled,
        twoFactorMethod: defaultSettings.twoFactorMethod,
        loginNotifications: defaultSettings.loginNotifications,
        sessionTimeout: defaultSettings.sessionTimeout,
        lastPasswordChange: defaultSettings.lastPasswordChange,
        passwordExpiryDays: defaultSettings.passwordExpiryDays,
        ipRestrictions: defaultSettings.ipRestrictions,
        allowedDevices: defaultSettings.allowedDevices,
        loginAttempts: defaultSettings.loginAttempts,
        accountLockoutThreshold: defaultSettings.accountLockoutThreshold,
        passwordComplexityLevel: defaultSettings.passwordComplexityLevel,
      },
    })

    return {
      ...defaultSettings,
      lastPasswordChange: defaultSettings.lastPasswordChange.toISOString(),
    }
  } catch (error) {
    console.error("Error getting security settings:", error)
    // Return default settings if there's an error
    return {
      twoFactorEnabled: false,
      twoFactorMethod: "app",
      loginNotifications: true,
      sessionTimeout: 30,
      lastPasswordChange: new Date().toISOString(),
      passwordExpiryDays: 90,
      ipRestrictions: [],
      allowedDevices: [],
      loginAttempts: 0,
      accountLockoutThreshold: 5,
      passwordComplexityLevel: "medium",
    }
  }
}

/**
 * Helper function to get partner login history
 */
async function getPartnerLoginHistory(userId: string) {
  try {
    // Get login history from database
    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 10,
    })

    return loginHistory.map((login) => ({
      id: login.id,
      ipAddress: login.ipAddress,
      device: login.device,
      browser: login.browser,
      location: login.location,
      timestamp: login.timestamp.toISOString(),
      status: login.status,
    }))
  } catch (error) {
    console.error("Error getting login history:", error)
    // Return empty array if there's an error
    return []
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
        title: "Profile Updated",
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
