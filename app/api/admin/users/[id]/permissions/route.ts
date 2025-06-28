import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== "ADMIN") {
    return false
  }
  return true
}

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userId = params.userId

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        admin: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user is not an admin, return empty permissions
    if (user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({})
    }

    // Return the admin permissions
    return NextResponse.json(user.admin.permissions)
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch user permissions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userId = params.userId

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Parse request body
    const permissions = await req.json()

    // Validate permissions object
    if (typeof permissions !== "object" || permissions === null) {
      return NextResponse.json({ error: "Invalid permissions format" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        admin: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user is not an admin, return error
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "User is not an admin" }, { status: 400 })
    }

    // Update or create admin record with permissions
    if (user.admin) {
      await prisma.admin.update({
        where: { id: user.admin.id },
        data: {
          permissions,
        },
      })
    } else {
      await prisma.admin.create({
        data: {
          userId: user.id,
          permissions,
        },
      })
    }

    // Log the permission update
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PERMISSIONS_UPDATED",
        description: `Updated permissions for user: ${user.email}`,
        metadata: {
          updatedUserId: user.id,
          permissions,
        },
      },
    })

    return NextResponse.json({ success: true, permissions })
  } catch (error) {
    console.error("Error updating user permissions:", error)
    return NextResponse.json(
      { error: "Failed to update user permissions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
