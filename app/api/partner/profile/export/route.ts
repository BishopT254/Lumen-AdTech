import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: Export partner profile data
 * Returns a JSON file with all partner data for download
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

    // Get partner from database with all related data
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
        devices: {
          select: {
            id: true,
            name: true,
            deviceIdentifier: true,
            deviceType: true,
            location: true,
            status: true,
            lastActive: true,
            healthStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        earnings: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            totalImpressions: true,
            totalEngagements: true,
            amount: true,
            status: true,
            paidDate: true,
            transactionId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50, // Limit to recent 50 earnings
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Get notification preferences
    const notificationPreferences = await prisma.partnerNotificationPreference.findUnique({
      where: { userId },
    })

    // Get security settings
    const securitySettings = await prisma.partnerSecuritySetting.findUnique({
      where: { userId },
    })

    // Get login history (limited to last 50 entries)
    const loginHistory = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 50,
    })

    // Format dates for JSON serialization
    const formattedPartner = {
      ...partner,
      user: {
        ...partner.user,
        createdAt: partner.user.createdAt.toISOString(),
        updatedAt: partner.user.updatedAt.toISOString(),
      },
      devices: partner.devices.map((device) => ({
        ...device,
        lastActive: device.lastActive ? device.lastActive.toISOString() : null,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString(),
      })),
      earnings: partner.earnings.map((earning) => ({
        ...earning,
        periodStart: earning.periodStart.toISOString(),
        periodEnd: earning.periodEnd.toISOString(),
        paidDate: earning.paidDate ? earning.paidDate.toISOString() : null,
        createdAt: earning.createdAt.toISOString(),
        updatedAt: earning.updatedAt.toISOString(),
      })),
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
    }

    // Format security settings
    const formattedSecuritySettings = securitySettings
      ? {
          ...securitySettings,
          lastPasswordChange: securitySettings.lastPasswordChange.toISOString(),
          createdAt: securitySettings.createdAt.toISOString(),
          updatedAt: securitySettings.updatedAt.toISOString(),
        }
      : null

    // Format login history
    const formattedLoginHistory = loginHistory.map((login) => ({
      ...login,
      timestamp: login.timestamp.toISOString(),
      createdAt: login.createdAt.toISOString(),
      updatedAt: login.updatedAt.toISOString(),
    }))

    // Construct the complete export data
    const exportData = {
      partner: formattedPartner,
      notificationPreferences: notificationPreferences
        ? {
            ...notificationPreferences,
            createdAt: notificationPreferences.createdAt.toISOString(),
            updatedAt: notificationPreferences.updatedAt.toISOString(),
          }
        : null,
      securitySettings: formattedSecuritySettings,
      loginHistory: formattedLoginHistory,
      exportDate: new Date().toISOString(),
    }

    // Log this activity
    await logUserActivity(userId, "profile.export", "Exported profile data")

    // Return the data as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="partner-profile-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting profile data:", error)
    return NextResponse.json({ error: "Failed to export profile data" }, { status: 500 })
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
        title: "Profile Data Exported",
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
