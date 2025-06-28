import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get active sessions in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const activeUsers = await prisma.session.count({
      where: {
        expires: {
          gt: new Date() // Only count non-expired sessions
        }
      }
    })

    // Get failed login attempts in the last 24 hours from audit log
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const failedAttempts = await prisma.configAuditLog.count({
      where: {
        configKey: "security_settings",
        changeDate: {
          gte: twentyFourHoursAgo
        },
        changeReason: "Failed login attempt"
      }
    })

    // Get API usage in the last hour from audit log
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const apiUsage = await prisma.configAuditLog.count({
      where: {
        changeDate: {
          gte: oneHourAgo
        },
        AND: {
          OR: [
            { configKey: { startsWith: 'api_' } },
            { changeReason: { contains: 'API' } }
          ]
        }
      }
    })

    // Calculate security score based on current settings
    const securityConfig = await prisma.systemConfig.findFirst({
      where: {
        configKey: "security_settings",
        environment: process.env.NODE_ENV || "development"
      }
    })

    let securityScore = 0
    if (securityConfig) {
      const settings = JSON.parse(securityConfig.configValue as string)
      
      // Calculate score based on enabled security features
      securityScore = calculateSecurityScore(settings)
    }

    return NextResponse.json({
      activeUsers,
      failedAttempts,
      apiUsage,
      securityScore
    })
  } catch (error) {
    console.error("Error fetching security stats:", error)
    return NextResponse.json({
      activeUsers: 0,
      failedAttempts: 0,
      apiUsage: 0,
      securityScore: 0,
      error: "Failed to fetch security statistics"
    })
  }
}

function calculateSecurityScore(settings: any): number {
  let score = 0
  const maxScore = 100

  // Password policy checks (30 points)
  if (settings.passwordPolicy) {
    if (settings.passwordPolicy.minLength >= 8) score += 6
    if (settings.passwordPolicy.requireUppercase) score += 6
    if (settings.passwordPolicy.requireLowercase) score += 6
    if (settings.passwordPolicy.requireNumbers) score += 6
    if (settings.passwordPolicy.requireSpecialChars) score += 6
  }

  // Authentication settings (30 points)
  if (settings.twoFactorEnabled) score += 10
  if (settings.maxLoginAttempts && settings.maxLoginAttempts <= 5) score += 10
  if (settings.sessionTimeout && settings.sessionTimeout <= 60) score += 10

  // API security (30 points)
  if (settings.apiRateLimiting) score += 10
  if (settings.apiKeyExpiration) score += 10
  if (settings.ipWhitelistEnabled && settings.ipWhitelist?.length > 0) score += 10

  // MFA requirement (10 points)
  if (settings.mfaRequired) score += 10

  return Math.min(score, maxScore)
} 