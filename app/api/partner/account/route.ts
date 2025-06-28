import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

/**
 * DELETE: Request account deletion
 * This doesn't immediately delete the account but marks it for deletion
 * and creates a deletion request that can be reviewed by an admin
 */
export async function DELETE(req: NextRequest) {
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
      return NextResponse.json({ error: "Access denied. Only partners can delete their account." }, { status: 403 })
    }

    // Get the partner
    const partner = await prisma.partner.findUnique({
      where: { userId },
      include: {
        devices: true,
        earnings: {
          where: {
            status: "PENDING",
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner account not found" }, { status: 404 })
    }

    // Check if partner has pending earnings
    if (partner.earnings.length > 0) {
      return NextResponse.json(
        {
          error: "Account cannot be deleted while there are pending earnings. Please withdraw your earnings first.",
          pendingEarnings: true,
        },
        { status: 400 },
      )
    }

    // Check if partner has active devices
    if (partner.devices.some((device) => device.status === "ACTIVE")) {
      return NextResponse.json(
        {
          error: "Account cannot be deleted while there are active devices. Please deactivate all devices first.",
          activeDevices: true,
        },
        { status: 400 },
      )
    }

    // Create account deletion request
    const deletionRequest = await prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: "User requested account deletion",
        status: "PENDING",
        requestedAt: new Date(),
      },
    })

    // Update partner status to pending deletion
    await prisma.partner.update({
      where: { userId },
      data: {
        status: "PENDING_DELETION",
      },
    })

    // Clear all caches related to this user
    await deleteCache(`partner:profile:${userId}`)
    await deleteCache(`partner:notifications:${userId}`)
    await deleteCache(`partner:security:${userId}`)

    // Log this activity
    await logUserActivity(userId, "account.deletion_request", "Requested account deletion")

    // Revalidate paths
    revalidatePath("/partner/settings")
    revalidatePath("/partner/profile")
    revalidatePath("/partner/dashboard")

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Account deletion request submitted successfully",
      deletionRequestId: deletionRequest.id,
    })
  } catch (error) {
    console.error("Error requesting account deletion:", error)
    return NextResponse.json({ error: "Failed to process account deletion request" }, { status: 500 })
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
        title: "Account Deletion Requested",
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
