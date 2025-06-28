import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET handler to fetch configuration audit logs
 * Supports filtering and pagination
 */
export async function GET(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const configKey = searchParams.get("configKey") || undefined
    const changedBy = searchParams.get("changedBy") || undefined
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate") as string) 
      : undefined
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate") as string) 
      : undefined
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build the query filters
    const where: any = {}
    if (configKey) where.configKey = configKey
    if (changedBy) where.changedBy = changedBy
    if (startDate || endDate) {
      where.changeDate = {}
      if (startDate) where.changeDate.gte = startDate
      if (endDate) where.changeDate.lte = endDate
    }

    // Get audit logs with pagination and filtering
    const logs = await prisma.configAuditLog.findMany({
      where,
      orderBy: {
        changeDate: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Get total count for pagination
    const total = await prisma.configAuditLog.count({ where })

    // Format the logs to mask sensitive data
    const formattedLogs = logs.map(log => {
      // To avoid exposing sensitive data, we'll redact certain fields
      // in previousValue and newValue
      let previousValue = log.previousValue
      let newValue = log.newValue

      // Example of sensitive key redaction - in production you would have a more robust solution
      const sensitiveKeys = ['apiKey', 'webhookSecret', 'password', 'secret', 'token']
      
      // Helper function to redact sensitive fields
      const redactSensitiveData = (obj: any) => {
        if (!obj || typeof obj !== 'object') return obj
        
        const result = { ...obj }
        for (const key of Object.keys(result)) {
          if (sensitiveKeys.includes(key)) {
            result[key] = '••••••••••••••••••••••••'
          } else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = redactSensitiveData(result[key])
          }
        }
        return result
      }

      // Redact sensitive data
      if (previousValue) previousValue = redactSensitiveData(previousValue)
      if (newValue) newValue = redactSensitiveData(newValue)

      return {
        id: log.id,
        configKey: log.configKey,
        previousValue,
        newValue,
        changedBy: log.changedBy,
        changeDate: log.changeDate,
        ipAddress: log.ipAddress,
        changeReason: log.changeReason,
        user: log.user
      }
    })

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total
      }
    })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 