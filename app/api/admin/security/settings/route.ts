import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schemas
const passwordPolicySchema = z.object({
  minLength: z.number().min(8).max(128),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSpecialChars: z.boolean(),
  expiryDays: z.number().min(0).max(365)
})

const securitySettingsSchema = z.object({
  mfaRequired: z.boolean(),
  passwordPolicy: passwordPolicySchema,
  sessionTimeout: z.number().min(5).max(1440),
  ipWhitelist: z.array(z.string()),
  apiRateLimiting: z.boolean(),
  rateLimit: z.number().min(1).max(10000),
  apiKeyExpiration: z.boolean(),
  keyExpiryDays: z.number().min(1).max(365),
  ipWhitelistEnabled: z.boolean(),
  maxLoginAttempts: z.number().min(1).max(10),
  lockoutDurationMinutes: z.number().min(5).max(1440),
  twoFactorEnabled: z.boolean()
}).partial() // Make all fields optional to handle partial updates

// Default security settings that match the schema
const defaultSettings = {
  mfaRequired: false,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expiryDays: 90
  },
  sessionTimeout: 30,
  ipWhitelist: [],
  apiRateLimiting: true,
  rateLimit: 100,
  apiKeyExpiration: true,
  keyExpiryDays: 90,
  ipWhitelistEnabled: false,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  twoFactorEnabled: false
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get security settings from SystemConfig
    const securityConfig = await prisma.systemConfig.findFirst({
      where: {
        configKey: "security_settings",
        environment: process.env.NODE_ENV || "development"
      }
    })

    // If no config exists, return default settings
    if (!securityConfig) {
      return NextResponse.json({
        data: defaultSettings,
        message: "Using default security settings"
      })
    }

    // Parse existing config, fallback to defaults for any missing fields
    const existingSettings = JSON.parse(securityConfig.configValue as string)
    const mergedSettings = {
      ...defaultSettings,
      ...existingSettings,
      passwordPolicy: {
        ...defaultSettings.passwordPolicy,
        ...(existingSettings.passwordPolicy || {})
      }
    }

    return NextResponse.json({
      data: mergedSettings,
      lastUpdated: securityConfig.lastUpdated
    })
  } catch (error) {
    console.error("Error fetching security settings:", error)
    return NextResponse.json({
      data: defaultSettings,
      message: "Error loading saved settings, using defaults",
      error: "Failed to load saved settings"
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await request.json()

    // Validate the request body
    const validatedData = securitySettingsSchema.parse(data)

    // Get existing config for audit log
    const existingConfig = await prisma.systemConfig.findFirst({
      where: {
        configKey: "security_settings",
        environment: process.env.NODE_ENV || "development"
      }
    })

    // Merge with defaults to ensure all required fields are present
    const mergedData = {
      ...defaultSettings,
      ...validatedData,
      passwordPolicy: {
        ...defaultSettings.passwordPolicy,
        ...(validatedData.passwordPolicy || {})
      }
    }

    // Update or create security settings
    const updatedConfig = await prisma.systemConfig.upsert({
      where: {
        configKey: "security_settings"
      },
      create: {
        configKey: "security_settings",
        configValue: mergedData as any,
        description: "Security and access control settings",
        environment: process.env.NODE_ENV || "development",
        updatedBy: session.user.id,
        version: 1
      },
      update: {
        configValue: mergedData as any,
        updatedBy: session.user.id,
        version: { increment: 1 }
      }
    })

    // Create audit log entry
    await prisma.configAuditLog.create({
      data: {
        configKey: "security_settings",
        changedBy: session.user.id,
        changeReason: "Security settings updated",
        previousValue: existingConfig?.configValue as any,
        newValue: updatedConfig.configValue as any,
        ipAddress: request.headers.get("x-forwarded-for") || request.ip || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown"
      }
    })

    return NextResponse.json({
      message: "Security settings updated successfully",
      data: mergedData
    })
  } catch (error) {
    console.error("Error updating security settings:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid data", 
        details: error.errors,
        data: defaultSettings 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: "Internal server error",
      data: defaultSettings
    }, { status: 500 })
  }
} 