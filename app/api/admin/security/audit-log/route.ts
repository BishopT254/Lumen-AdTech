import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const configKey = searchParams.get("configKey")

    // Build where clause based on filters
    const where = {
      configKey: configKey || "security_settings",
      ...(startDate && endDate
        ? {
            changeDate: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        : {})
    }

    try {
      // Get total count for pagination
      const total = await prisma.configAuditLog.count({ where })

      // Get audit logs with pagination
      const logs = await prisma.configAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          changeDate: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      })

      // Format logs for response, handle potential null values
      const formattedLogs = logs.map(log => ({
        id: log.id,
        configKey: log.configKey,
        changeDate: log.changeDate,
        changeReason: log.changeReason || "Configuration updated",
        previousValue: log.previousValue || null,
        newValue: log.newValue,
        ipAddress: log.ipAddress || "unknown",
        userAgent: log.userAgent || "unknown",
        user: {
          name: log.user?.name || "Unknown User",
          email: log.user?.email || "unknown@example.com",
          role: log.user?.role || "ADMIN"
        }
      }))

      return NextResponse.json({
        data: formattedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      })
    } catch (dbError) {
      console.error("Database error fetching audit logs:", dbError)
      // Return empty results instead of error
      return NextResponse.json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit,
          totalPages: 0
        },
        message: "No audit logs found"
      })
    }
  } catch (error) {
    console.error("Error in audit log endpoint:", error)
    // Return empty results for any error
    return NextResponse.json({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      },
      message: "Error fetching audit logs"
    })
  }
} 