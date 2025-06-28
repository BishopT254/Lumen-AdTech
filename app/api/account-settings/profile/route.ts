import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300

// Base user profile schema
const baseProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email({ message: "Please enter a valid email address." }).optional(),
  bio: z.string().optional(),
  image: z.string().optional(),
})

// Partner profile schema
const partnerProfileSchema = baseProfileSchema.extend({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }).optional(),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }).optional(),
  phoneNumber: z.string().min(6, { message: "Please enter a valid phone number." }).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  businessType: z.enum(["individual", "company", "partnership", "non-profit"]).optional(),
  paymentDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
    swiftCode: z.string().optional(),
    routingNumber: z.string().optional(),
    mpesaNumber: z.string().optional(),
    flutterwaveEmail: z.string().email().optional(),
    paypalEmail: z.string().email().optional(),
    stripeAccountId: z.string().optional(),
    preferredPaymentMethod: z.enum(["bank", "mpesa", "flutterwave", "paypal", "stripe"]).optional(),
  }).optional(),
  taxInformation: z.object({
    taxId: z.string().optional(),
    vatNumber: z.string().optional(),
    taxExempt: z.boolean().optional(),
    taxResidency: z.string().optional(),
    withholdingTaxRate: z.number().min(0).max(100).optional(),
  }).optional(),
})

// Advertiser profile schema
const advertiserProfileSchema = baseProfileSchema.extend({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }).optional(),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }).optional(),
  phoneNumber: z.string().min(6, { message: "Please enter a valid phone number." }).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  // Add other advertiser-specific fields as needed
})

// Notification preferences schema
const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  maintenanceAlerts: z.boolean().optional(),
  campaignUpdates: z.boolean().optional(),
  performanceReports: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  deviceOfflineAlerts: z.boolean().optional(),
  newCampaignNotifications: z.boolean().optional(),
  paymentFailureAlerts: z.boolean().optional(),
  documentExpiryReminders: z.boolean().optional(),
})

// Security settings schema
const securitySettingsSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  twoFactorMethod: z.enum(["app", "sms", "email"]).optional(),
  loginNotifications: z.boolean().optional(),
  sessionTimeout: z.number().min(5).max(240).optional(),
  passwordExpiryDays: z.number().min(30).max(365).optional(),
  accountLockoutThreshold: z.number().min(0).max(10).optional(),
  passwordComplexityLevel: z.enum(["low", "medium", "high"]).optional(),
})

/**
 * GET: Fetch user profile data
 * Returns the complete user profile with all related data based on user role
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
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
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Initialize response object with base user data
    const responseData: any = {
      user,
    }

    // Add role-specific data
    if (userRole === "PARTNER") {
      // Get partner profile
      const partner = await prisma.partner.findUnique({
        where: { userId },
      })

      if (partner) {
        responseData.profile = {
          id: partner.id,
          userId: partner.userId,
          companyName: partner.companyName,
          contactPerson: partner.contactPerson,
          phoneNumber: partner.phoneNumber,
          address: partner.address || "",
          city: partner.city || "",
          state: partner.state || "",
          postalCode: partner.postalCode || "",
          country: partner.country || "",
          commissionRate: partner.commissionRate,
          status: partner.status,
          verificationStatus: partner.verificationStatus || "unverified",
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
        }

        // Get notification preferences
        responseData.notificationPreferences = await getNotificationPreferences(userId, "PARTNER")

        // Get security settings
        responseData.securitySettings = await getSecuritySettings(userId)

        // Get login history
        responseData.loginHistory = await getLoginHistory(userId)
      }
    } else if (userRole === "ADVERTISER") {
      // Get advertiser profile
      const advertiser = await prisma.advertiser.findUnique({
        where: { userId },
      })

      if (advertiser) {
        responseData.profile = {
          id: advertiser.id,
          userId: advertiser.userId,
          companyName: advertiser.companyName,
          contactPerson: advertiser.contactPerson,
          phoneNumber: advertiser.phoneNumber,
          address: advertiser.address || "",
          city: advertiser.city || "",
          country: advertiser.country || "",
          createdAt: advertiser.createdAt.toISOString(),
          updatedAt: advertiser.updatedAt.toISOString(),
        }

        // Get notification preferences
        responseData.notificationPreferences = await getNotificationPreferences(userId, "ADVERTISER")

        // Get security settings
        responseData.securitySettings = await getSecuritySettings(userId)

        // Get login history
        responseData.loginHistory = await getLoginHistory(userId)
      }
    } else if (userRole === "ADMIN") {
      // Get admin profile
      const admin = await prisma.admin.findUnique({
        where: { userId },
      })

      if (admin) {
        responseData.profile = {
          id: admin.id,
          userId: admin.userId,
          permissions: admin.permissions,
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        }

        // Get security settings
        responseData.securitySettings = await getSecuritySettings(userId)

        // Get login history
        responseData.loginHistory = await getLoginHistory(userId)
      }
    }

    // Cache the profile data
    await setCache(cacheKey, responseData, CACHE_TTL)

    // Return the complete profile data
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 })
  }
}

/**
 * PUT: Update user profile data
 * Updates the user profile with the provided data based on user role
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
    const userRole = session.user.role

    // Parse the request body
    const body = await req.json()

    // Initialize response object
    const responseData: any = {}

    // Handle base user profile updates
    if (body.name !== undefined || body.email !== undefined || body.bio !== undefined || body.image !== undefined) {
      // Validate base profile data
      const validationResult = baseProfileSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
      }

      const { name, email, bio, image } = validationResult.data

      // Check if email is already in use by another user
      if (email && email !== session.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser && existingUser.id !== userId) {
          return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 })
        }
      }

      // Update the user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          email: email || undefined,
          bio: bio || undefined,
          image: image || undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      responseData.user = updatedUser
    }

    // Handle role-specific updates
    if (userRole === "PARTNER") {
      // Validate partner profile data
      const validationResult = partnerProfileSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
      }

      const { 
        companyName, contactPerson, phoneNumber, address, city, state, postalCode, 
        country, businessType, paymentDetails, taxInformation 
      } = validationResult.data

      // Check if partner profile exists
      const existingPartner = await prisma.partner.findUnique({
        where: { userId },
      })

      if (!existingPartner) {
        return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
      }

      // Prepare payment details
      const updatedPaymentDetails = paymentDetails ? {
        bankName: paymentDetails.bankName || existingPartner.paymentDetails?.bankName || "",
        accountNumber: paymentDetails.accountNumber || existingPartner.paymentDetails?.accountNumber || "",
        accountName: paymentDetails.accountName || existingPartner.paymentDetails?.accountName || "",
        swiftCode: paymentDetails.swiftCode || existingPartner.paymentDetails?.swiftCode || "",
        routingNumber: paymentDetails.routingNumber || existingPartner.paymentDetails?.routingNumber || "",
        mpesaNumber: paymentDetails.mpesaNumber || existingPartner.paymentDetails?.mpesaNumber || "",
        flutterwaveEmail: paymentDetails.flutterwaveEmail || existingPartner.paymentDetails?.flutterwaveEmail || "",
        paypalEmail: paymentDetails.paypalEmail || existingPartner.paymentDetails?.paypalEmail || "",
        stripeAccountId: paymentDetails.stripeAccountId || existingPartner.paymentDetails?.stripeAccountId || "",
        preferredPaymentMethod: paymentDetails.preferredPaymentMethod || existingPartner.paymentDetails?.preferredPaymentMethod || "bank",
      } : existingPartner.paymentDetails;

      // Prepare tax information
      const updatedTaxInformation = taxInformation ? {
        taxId: taxInformation.taxId || existingPartner.taxInformation?.taxId || "",
        vatNumber: taxInformation.vatNumber || existingPartner.taxInformation?.vatNumber || "",
        taxExempt: taxInformation.taxExempt !== undefined ? taxInformation.taxExempt : existingPartner.taxInformation?.taxExempt || false,
        taxResidency: taxInformation.taxResidency || existingPartner.taxInformation?.taxResidency || "",
        withholdingTaxRate: taxInformation.withholdingTaxRate !== undefined ? taxInformation.withholdingTaxRate : existingPartner.taxInformation?.withholdingTaxRate || 0,
        taxFormStatus: existingPartner.taxInformation?.taxFormStatus || "pending",
      } : existingPartner.taxInformation;

      // Update the partner profile
      const updatedPartner = await prisma.partner.update({
        where: { userId },
        data: {
          companyName: companyName || undefined,
          contactPerson: contactPerson || undefined,
          phoneNumber: phoneNumber || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
          businessType: businessType || undefined,
          paymentDetails: updatedPaymentDetails,
          taxInformation: updatedTaxInformation,
        },
      })

      responseData.profile = {
        ...updatedPartner,
        createdAt: updatedPartner.createdAt.toISOString(),
        updatedAt: updatedPartner.updatedAt.toISOString(),
      }

      // Handle notification preferences update
      if (body.notificationPreferences) {
        const validatedNotifications = notificationPreferencesSchema.safeParse(body.notificationPreferences)
        
        if (validatedNotifications.success) {
          const updatedPreferences = await updateNotificationPreferences(userId, "PARTNER", validatedNotifications.data)
          responseData.notificationPreferences = updatedPreferences
        }
      }

      // Handle security settings update
      if (body.securitySettings) {
        const validatedSecurity = securitySettingsSchema.safeParse(body.securitySettings)
        
        if (validatedSecurity.success) {
          const updatedSettings = await updateSecuritySettings(userId, validatedSecurity.data)
          responseData.securitySettings = updatedSettings
        }
      }
    } else if (userRole === "ADVERTISER") {
      // Validate advertiser profile data
      const validationResult = advertiserProfileSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
      }

      const { companyName, contactPerson, phoneNumber, address, city, country } = validationResult.data

      // Check if advertiser profile exists
      const existingAdvertiser = await prisma.advertiser.findUnique({
        where: { userId },
      })

      if (!existingAdvertiser) {
        return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 })
      }

      // Update the advertiser profile
      const updatedAdvertiser = await prisma.advertiser.update({
        where: { userId },
        data: {
          companyName: companyName || undefined,
          contactPerson: contactPerson || undefined,
          phoneNumber: phoneNumber || undefined,
          address: address || undefined,
          city: city || undefined,
          country: country || undefined,
        },
      })

      responseData.profile = {
        ...updatedAdvertiser,
        createdAt: updatedAdvertiser.createdAt.toISOString(),
        updatedAt: updatedAdvertiser.updatedAt.toISOString(),
      }

      // Handle notification preferences update
      if (body.notificationPreferences) {
        const validatedNotifications = notificationPreferencesSchema.safeParse(body.notificationPreferences)
        
        if (validatedNotifications.success) {
          const updatedPreferences = await updateNotificationPreferences(userId, "ADVERTISER", validatedNotifications.data)
          responseData.notificationPreferences = updatedPreferences
        }
      }

      // Handle security settings update
      if (body.securitySettings) {
        const validatedSecurity = securitySettingsSchema.safeParse(body.securitySettings)
        
        if (validatedSecurity.success) {
          const updatedSettings = await updateSecuritySettings(userId, validatedSecurity.data)
          responseData.securitySettings = updatedSettings
        }
      }
    } else if (userRole === "ADMIN") {
      // Handle admin-specific updates if needed

      // Handle security settings update
      if (body.securitySettings) {
        const validatedSecurity = securitySettingsSchema.safeParse(body.securitySettings)
        
        if (validatedSecurity.success) {
          const updatedSettings = await updateSecuritySettings(userId, validatedSecurity.data)
          responseData.securitySettings = updatedSettings
        }
      }
    }

    // Invalidate cache
    await deleteCache(`profile:${userId}`)

    // Revalidate paths
    revalidatePath("/profile")
    revalidatePath("/account-settings")
    revalidatePath("/partner/settings")
    revalidatePath("/advertiser/settings")
    revalidatePath("/admin/settings")

    // Log activity
    await logUserActivity(userId, "profile.update", "Updated profile information")

    return NextResponse.json({
      ...responseData,
      success: true,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile data" }, { status: 500 })
  }
}

/**
 * Helper function to get notification preferences
 */
async function getNotificationPreferences(userId: string, role: string) {
  try {
    let notificationPreferences;
    
    if (role === "PARTNER") {
      // Check if partner notification preferences exist
      notificationPreferences = await prisma.notificationPreference.findFirst({
        where: { 
          userId,
          userType: "PARTNER"
        },
      })
    } else if (role === "ADVERTISER") {
      // Check if advertiser notification preferences exist
      notificationPreferences = await prisma.notificationPreference.findFirst({
        where: { 
          userId,
          userType: "ADVERTISER"
        },
      })
    }

    if (notificationPreferences) {
      return {
        email: notificationPreferences.email,
        sms: notificationPreferences.sms,
        push: notificationPreferences.push,
        paymentNotifications: notificationPreferences.paymentNotifications,
        maintenanceAlerts: notificationPreferences.maintenanceAlerts,
        campaignUpdates: notificationPreferences.campaignUpdates,
        performanceReports: notificationPreferences.performanceReports,
        securityAlerts: notificationPreferences.securityAlerts,
        marketingEmails: notificationPreferences.marketingEmails,
        systemUpdates: notificationPreferences.systemUpdates,
        deviceOfflineAlerts: notificationPreferences.deviceOfflineAlerts,
        newCampaignNotifications: notificationPreferences.newCampaignNotifications,
        paymentFailureAlerts: notificationPreferences.paymentFailureAlerts,
        documentExpiryReminders: notificationPreferences.documentExpiryReminders,
      }
    }

    // Create default preferences if they don't exist
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

    // Save default preferences to database
    await prisma.notificationPreference.create({
      data: {
        userId,
        userType: role,
        ...defaultPrefs,
      },
    })

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
 * Helper function to update notification preferences
 */
async function updateNotificationPreferences(userId: string, role: string, preferences: any) {
  try {
    // Ensure security alerts are always enabled
    preferences.securityAlerts = true;

    // Check if notification preferences exist
    const existingPrefs = await prisma.notificationPreference.findFirst({
      where: { 
        userId,
        userType: role
      },
    })

    if (existingPrefs) {
      // Update existing preferences
      const updatedPrefs = await prisma.notificationPreference.update({
        where: { id: existingPrefs.id },
        data: preferences,
      })

      return {
        email: updatedPrefs.email,
        sms: updatedPrefs.sms,
        push: updatedPrefs.push,
        paymentNotifications: updatedPrefs.paymentNotifications,
        maintenanceAlerts: updatedPrefs.maintenanceAlerts,
        campaignUpdates: updatedPrefs.campaignUpdates,
        performanceReports: updatedPrefs.performanceReports,
        securityAlerts: updatedPrefs.securityAlerts,
        marketingEmails: updatedPrefs.marketingEmails,
        systemUpdates: updatedPrefs.systemUpdates,
        deviceOfflineAlerts: updatedPrefs.deviceOfflineAlerts,
        newCampaignNotifications: updatedPrefs.newCampaignNotifications,
        paymentFailureAlerts: updatedPrefs.paymentFailureAlerts,
        documentExpiryReminders: updatedPrefs.documentExpiryReminders,
      }
    } else {
      // Create new preferences
      const newPrefs = await prisma.notificationPreference.create({
        data: {
          userId,
          userType: role,
          ...preferences,
        },
      })

      return {
        email: newPrefs.email,
        sms: newPrefs.sms,
        push: newPrefs.push,
        paymentNotifications: newPrefs.paymentNotifications,
        maintenanceAlerts: newPrefs.maintenanceAlerts,
        campaignUpdates: newPrefs.campaignUpdates,
        performanceReports: newPrefs.performanceReports,
        securityAlerts: newPrefs.securityAlerts,
        marketingEmails: newPrefs.marketingEmails,
        systemUpdates: newPrefs.systemUpdates,
        deviceOfflineAlerts: newPrefs.deviceOfflineAlerts,
        newCampaignNotifications: newPrefs.newCampaignNotifications,
        paymentFailureAlerts: newPrefs.paymentFailureAlerts,
        documentExpiryReminders: newPrefs.documentExpiryReminders,
      }
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    throw error
  }
}

/**
 * Helper function to get security settings
 */
async function getSecuritySettings(userId: string) {
  try {
    // Check if security settings exist
    const existingSettings = await prisma.securitySetting.findUnique({
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
    await prisma.securitySetting.create({
      data: {
        userId,
        ...defaultSettings,
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
 * Helper function to update security settings
 */
async function updateSecuritySettings(userId: string, settings: any) {
  try {
    // Check if security settings exist
    const existingSettings = await prisma.securitySetting.findUnique({
      where: { userId },
    })

    if (existingSettings) {
      // Update existing settings
      const updatedSettings = await prisma.securitySetting.update({
        where: { userId },
        data: settings,
      })

      return {
        twoFactorEnabled: updatedSettings.twoFactorEnabled,
        twoFactorMethod: updatedSettings.twoFactorMethod,
        loginNotifications: updatedSettings.loginNotifications,
        sessionTimeout: updatedSettings.sessionTimeout,
        lastPasswordChange: updatedSettings.lastPasswordChange.toISOString(),
        passwordExpiryDays: updatedSettings.passwordExpiryDays,
        ipRestrictions: updatedSettings.ipRestrictions,
        allowedDevices: updatedSettings.allowedDevices,
        loginAttempts: updatedSettings.loginAttempts,
        accountLockoutThreshold: updatedSettings.accountLockoutThreshold,
        passwordComplexityLevel: updatedSettings.passwordComplexityLevel,
      }
    } else {
      // Create new settings
      const newSettings = await prisma.securitySetting.create({
        data: {
          userId,
          ...settings,
          lastPasswordChange: new Date(), // Set current date for new settings
        },
      })

      return {
        twoFactorEnabled: newSettings.twoFactorEnabled,
        twoFactorMethod: newSettings.twoFactorMethod,
        loginNotifications: newSettings.loginNotifications,
        sessionTimeout: newSettings.sessionTimeout,
        lastPasswordChange: newSettings.lastPasswordChange.toISOString(),
        passwordExpiryDays: newSettings.passwordExpiryDays,
        ipRestrictions: newSettings.ipRestrictions,
        allowedDevices: newSettings.allowedDevices,
        loginAttempts: newSettings.loginAttempts,
        accountLockoutThreshold: newSettings.accountLockoutThreshold,
        passwordComplexityLevel: newSettings.passwordComplexityLevel,
      }
    }
  } catch (error) {
    console.error("Error updating security settings:", error)
    throw error
  }
}

/**
 * Helper function to get login history
 */
async function getLoginHistory(userId: string) {
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

/**
 * Helper function to export profile data
 */
export async function exportProfileData(userId: string, userRole: string) {
  try {
    // Get user from database with basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Initialize export data
    const exportData: any = {
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }

    // Add role-specific data
    if (userRole === "PARTNER") {
      // Get partner profile
      const partner = await prisma.partner.findUnique({
        where: { userId },
      })

      if (partner) {
        exportData.profile = {
          ...partner,
          createdAt: partner.createdAt.toISOString(),
          updatedAt: partner.updatedAt.toISOString(),
        }

        // Get notification preferences
        exportData.notificationPreferences = await getNotificationPreferences(userId, "PARTNER")

        // Get security settings
        exportData.securitySettings = await getSecuritySettings(userId)
      }
    } else if (userRole === "ADVERTISER") {
      // Get advertiser profile
      const advertiser = await prisma.advertiser.findUnique({
        where: { userId },
      })

      if (advertiser) {
        exportData.profile = {
          ...advertiser,
          createdAt: advertiser.createdAt.toISOString(),
          updatedAt: advertiser.updatedAt.toISOString(),
        }

        // Get notification preferences
        exportData.notificationPreferences = await getNotificationPreferences(userId, "ADVERTISER")

        // Get security settings
        exportData.securitySettings = await getSecuritySettings(userId)
      }
    } else if (userRole === "ADMIN") {
      // Get admin profile
      const admin = await prisma.admin.findUnique({
        where: { userId },
      })

      if (admin) {
        exportData.profile = {
          ...admin,
          createdAt: admin.createdAt.toISOString(),
          updatedAt: admin.updatedAt.toISOString(),
        }

        // Get security settings
        exportData.securitySettings = await getSecuritySettings(userId)
      }
    }

    return exportData
  } catch (error) {
    console.error("Error exporting profile data:", error)
    throw error
  }
}