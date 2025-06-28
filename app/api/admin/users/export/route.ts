import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Parser } from "json2csv"
import * as XLSX from "xlsx"

// Validation schema for query parameters
const querySchema = z.object({
  format: z.enum(["csv", "json", "xlsx"]).default("csv"),
  includeActivity: z.coerce.boolean().optional().default(false),
  includePermissions: z.coerce.boolean().optional().default(false),
  includeRelated: z.coerce.boolean().optional().default(false),
})

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== "ADMIN") {
    return false
  }
  return true
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(req.url)
    const format = url.searchParams.get("format") || "csv"
    const includeActivity = url.searchParams.get("includeActivity") === "true"
    const includePermissions = url.searchParams.get("includePermissions") === "true"
    const includeRelated = url.searchParams.get("includeRelated") === "true"

    // Validate query parameters
    const validatedParams = querySchema.parse({
      format,
      includeActivity,
      includePermissions,
      includeRelated,
    })

    // Build select object based on what to include
    const select: any = {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
    }

    // Include related data if requested
    if (validatedParams.includeRelated) {
      select.advertiser = {
        select: {
          companyName: true,
          contactPerson: true,
          phoneNumber: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      }
      select.partner = {
        select: {
          companyName: true,
          contactPerson: true,
          phoneNumber: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          businessType: true,
          status: true,
          commissionRate: true,
        },
      }
    }

    // Include admin permissions if requested
    if (validatedParams.includePermissions) {
      select.admin = {
        select: {
          permissions: true,
        },
      }
    }

    // Fetch users with selected fields
    const users = await prisma.user.findMany({
      select,
    })

    // Process users to flatten the structure for export
    const processedUsers = users.map((user) => {
      const processedUser: any = {
        id: user.id,
        name: user.name || "",
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : "",
        bio: user.bio || "",
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }

      // Add advertiser or partner data if available
      if (validatedParams.includeRelated) {
        if (user.role === "ADVERTISER" && user.advertiser) {
          processedUser.companyName = user.advertiser.companyName
          processedUser.contactPerson = user.advertiser.contactPerson
          processedUser.phoneNumber = user.advertiser.phoneNumber
          processedUser.address = user.advertiser.address || ""
          processedUser.city = user.advertiser.city || ""
          processedUser.state = user.advertiser.state || ""
          processedUser.postalCode = user.advertiser.postalCode || ""
          processedUser.country = user.advertiser.country || ""
        } else if (user.role === "PARTNER" && user.partner) {
          processedUser.companyName = user.partner.companyName
          processedUser.contactPerson = user.partner.contactPerson
          processedUser.phoneNumber = user.partner.phoneNumber
          processedUser.address = user.partner.address || ""
          processedUser.city = user.partner.city || ""
          processedUser.state = user.partner.state || ""
          processedUser.postalCode = user.partner.postalCode || ""
          processedUser.country = user.partner.country || ""
          processedUser.businessType = user.partner.businessType || ""
          processedUser.partnerStatus = user.partner.status || ""
          processedUser.commissionRate = user.partner.commissionRate
            ? Number(user.partner.commissionRate) * 100 + "%"
            : ""
        }
      }

      // Add admin permissions if available
      if (validatedParams.includePermissions && user.role === "ADMIN" && user.admin) {
        processedUser.permissions = JSON.stringify(user.admin.permissions)
      }

      return processedUser
    })

    // Fetch user activity if requested
    if (validatedParams.includeActivity) {
      const userIds = users.map((user) => user.id)
      const activities = await prisma.activityLog.findMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1000, // Limit to prevent excessive data
      })

      // Create a map of user activities
      const userActivities: Record<string, any[]> = {}
      activities.forEach((activity) => {
        if (!userActivities[activity.userId]) {
          userActivities[activity.userId] = []
        }
        userActivities[activity.userId].push({
          action: activity.action,
          description: activity.description,
          timestamp: activity.createdAt.toISOString(),
          ipAddress: activity.ipAddress || "",
          userAgent: activity.userAgent || "",
        })
      })

      // Add activities to processed users
      processedUsers.forEach((user) => {
        user.activities = userActivities[user.id] ? JSON.stringify(userActivities[user.id]) : "[]"
      })
    }

    // Generate export based on format
    let exportData: any
    let contentType: string
    let filename: string
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

    switch (validatedParams.format) {
      case "json":
        exportData = JSON.stringify(processedUsers, null, 2)
        contentType = "application/json"
        filename = `users-export-${timestamp}.json`
        break

      case "xlsx":
        const worksheet = XLSX.utils.json_to_sheet(processedUsers)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users")
        exportData = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = `users-export-${timestamp}.xlsx`
        break

      case "csv":
      default:
        const parser = new Parser()
        exportData = parser.parse(processedUsers)
        contentType = "text/csv"
        filename = `users-export-${timestamp}.csv`
        break
    }

    // Log the export activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USERS_EXPORTED",
        description: `Exported ${processedUsers.length} users in ${validatedParams.format.toUpperCase()} format`,
        metadata: {
          format: validatedParams.format,
          includeActivity: validatedParams.includeActivity,
          includePermissions: validatedParams.includePermissions,
          includeRelated: validatedParams.includeRelated,
          userCount: processedUsers.length,
        },
      },
    })

    // Return the export data
    return new NextResponse(exportData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting users:", error)
    return NextResponse.json(
      { error: "Failed to export users", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
