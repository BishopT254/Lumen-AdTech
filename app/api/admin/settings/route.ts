import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import { getCache, setCache, deleteCache, deleteCachePattern } from "@/lib/redis"
import type { JsonValue } from "@prisma/client/runtime/library"

// Define types for our configuration values
type PaymentGateway = {
  provider: string
  apiKey?: string
  api_key?: string
  webhookSecret?: string
  webhook_secret?: string
  supportedCurrencies?: string[]
  testMode?: boolean
  test_mode?: boolean
  [key: string]: any
}

type NotificationConfig = {
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  emailConfig?: {
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPassword?: string
    smtp_host?: string
    smtp_port?: number
    smtp_username?: string
    smtp_password?: string
    [key: string]: any
  }
  smsConfig?: {
    provider?: string
    apiKey?: string
    api_key?: string
    senderId?: string
    [key: string]: any
  }
  [key: string]: any
}

// Type for any configuration section
interface ConfigSection {
  [key: string]: any
}

// Cache constants
const CACHE_TTL = 3600 // 1 hour cache duration
const CONFIG_CACHE_KEY_PREFIX = "system_config:"
const ALL_CONFIGS_CACHE_KEY = "system_config:all"

interface ConfigValue {
  api_key?: string;
  webhook_secret?: string;
  emailConfig?: {
    smtp_password?: string;
  };
  smsConfig?: {
    apiKey?: string;
  };
  [key: string]: any;
}

// Helper to validate config schema if provided
const validateConfig = (value: any, schema?: string): boolean => {
  if (!schema) return true

  try {
    const validationSchema = JSON.parse(schema)

    // Simple validation - in production this would use a full JSON schema validator
    if (validationSchema.required && Array.isArray(validationSchema.required)) {
      for (const field of validationSchema.required as string[]) {
        if (value[field] === undefined) return false
      }
    }

    return true
  } catch (error) {
    console.error("Schema validation error:", error)
    return false
  }
}

// Helper to safely parse JSON from Prisma
const safeParseJson = (jsonValue: JsonValue): any => {
  if (typeof jsonValue === "object" && jsonValue !== null) {
    return jsonValue
  }

  try {
    if (typeof jsonValue === "string") {
      return JSON.parse(jsonValue)
    }
    return jsonValue
  } catch (e) {
    console.error("Error parsing JSON:", e)
    return {}
  }
}

// GET handler to fetch all system settings
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
    const configKey = searchParams.get("configKey")
    const environment = searchParams.get("environment") || undefined
    const skipCache = searchParams.get("skipCache") === "true"

    // Check cache before database if not skipping cache
    if (!skipCache) {
      // If a specific config key is requested, check its cache
      if (configKey) {
        const cacheKey = `${CONFIG_CACHE_KEY_PREFIX}${configKey}:${environment || "default"}`
        const cachedConfig = await getCache(cacheKey)
        if (cachedConfig) {
          return NextResponse.json(cachedConfig)
        }
      } else {
        // Check cache for all configs
        const cacheKey = `${ALL_CONFIGS_CACHE_KEY}:${environment || "default"}`
        const cachedConfigs = await getCache(cacheKey)
        if (cachedConfigs) {
          return NextResponse.json(cachedConfigs)
        }
      }
    }

    // If a specific config key is requested, return only that one
    if (configKey) {
      const config = await prisma.systemConfig.findUnique({
        where: { configKey },
      })

      if (!config) {
        return NextResponse.json({ error: "Configuration not found" }, { status: 404 })
      }

      // Decrypt if necessary
      const configValue = safeParseJson(config.configValue)
      if (config.isEncrypted) {
        try {
          // Payment gateway keys
          if (configValue.apiKey) {
            configValue.apiKey = decrypt(configValue.apiKey)
          }

          if (configValue.api_key) {
            configValue.api_key = decrypt(configValue.api_key)
          }

          if (configValue.webhookSecret) {
            configValue.webhookSecret = decrypt(configValue.webhookSecret)
          }

          if (configValue.webhook_secret) {
            configValue.webhook_secret = decrypt(configValue.webhook_secret)
          }

          // Email and SMS configuration
          if (configValue.emailConfig?.smtpPassword) {
            configValue.emailConfig.smtpPassword = decrypt(configValue.emailConfig.smtpPassword)
          }

          if (configValue.emailConfig?.smtp_password) {
            configValue.emailConfig.smtp_password = decrypt(configValue.emailConfig.smtp_password)
          }

          if (configValue.smsConfig?.apiKey) {
            configValue.smsConfig.apiKey = decrypt(configValue.smsConfig.apiKey)
          }

          if (configValue.smsConfig?.api_key) {
            configValue.smsConfig.api_key = decrypt(configValue.smsConfig.api_key)
          }
        } catch (error) {
          console.error("Decryption error:", error)
          // Mask sensitive fields if decryption fails
          if (configValue.apiKey) configValue.apiKey = "••••••••••••••••••••••••"
          if (configValue.api_key) configValue.api_key = "••••••••••••••••••••••••"
          if (configValue.webhookSecret) configValue.webhookSecret = "••••••••••••••••••••••••"
          if (configValue.webhook_secret) configValue.webhook_secret = "••••••••••••••••••••••••"

          if (configValue.emailConfig?.smtpPassword) {
            configValue.emailConfig.smtpPassword = "••••••••••••••••••••••••"
          }

          if (configValue.emailConfig?.smtp_password) {
            configValue.emailConfig.smtp_password = "••••••••••••••••••••••••"
          }

          if (configValue.smsConfig?.apiKey) {
            configValue.smsConfig.apiKey = "••••••••••••••••••••••••"
          }

          if (configValue.smsConfig?.api_key) {
            configValue.smsConfig.api_key = "••••••••••••••••••••••••"
          }
        }
      }

      const result = {
        ...config,
        configValue,
      }

      // Cache the result
      const cacheKey = `${CONFIG_CACHE_KEY_PREFIX}${configKey}:${environment || "default"}`
      await setCache(cacheKey, result, CACHE_TTL)

      return NextResponse.json(result)
    }

    // Otherwise, get all system configs for the specified environment
    const configs = await prisma.systemConfig.findMany({
      where: environment ? { environment } : {},
    })

    // Process all configurations
    const formattedConfigs = configs.map((config) => {
      // Decrypt if necessary
      const configValue = safeParseJson(config.configValue)
      if (config.isEncrypted) {
        try {
          // Payment gateway keys
          if (configValue.apiKey) {
            configValue.apiKey = decrypt(configValue.apiKey)
          }

          if (configValue.api_key) {
            configValue.api_key = decrypt(configValue.api_key)
          }

          if (configValue.webhookSecret) {
            configValue.webhookSecret = decrypt(configValue.webhookSecret)
          }

          if (configValue.webhook_secret) {
            configValue.webhook_secret = decrypt(configValue.webhook_secret)
          }

          // Email and SMS configuration
          if (configValue.emailConfig?.smtpPassword) {
            configValue.emailConfig.smtpPassword = decrypt(configValue.emailConfig.smtpPassword)
          }

          if (configValue.emailConfig?.smtp_password) {
            configValue.emailConfig.smtp_password = decrypt(configValue.emailConfig.smtp_password)
          }

          if (configValue.smsConfig?.apiKey) {
            configValue.smsConfig.apiKey = decrypt(configValue.smsConfig.apiKey)
          }

          if (configValue.smsConfig?.api_key) {
            configValue.smsConfig.api_key = decrypt(configValue.smsConfig.api_key)
          }
        } catch (error) {
          console.error("Decryption error:", error)
          // Mask sensitive fields if decryption fails
          if (configValue.apiKey) configValue.apiKey = "••••••••••••••••••••••••"
          if (configValue.api_key) configValue.api_key = "••••••••••••••••••••••••"
          if (configValue.webhookSecret) configValue.webhookSecret = "••••••••••••••••••••••••"
          if (configValue.webhook_secret) configValue.webhook_secret = "••••••••••••••••••••••••"

          if (configValue.emailConfig?.smtpPassword) {
            configValue.emailConfig.smtpPassword = "••••••••••••••••••••••••"
          }

          if (configValue.emailConfig?.smtp_password) {
            configValue.emailConfig.smtp_password = "••••••••••••••••••••••••"
          }

          if (configValue.smsConfig?.apiKey) {
            configValue.smsConfig.apiKey = "••••••••••••••••••••••••"
          }

          if (configValue.smsConfig?.api_key) {
            configValue.smsConfig.api_key = "••••••••••••••••••••••••"
          }
        }
      }

      return {
        key: config.configKey,
        value: configValue,
        description: config.description,
        lastUpdated: config.lastUpdated,
        updatedBy: config.updatedBy,
        version: config.version,
        environment: config.environment,
      }
    })

    // Transform the result into a format expected by the settings page
    const settings = formattedConfigs.reduce(
      (acc, config) => {
        acc[config.key] = config.value
        return acc
      },
      {} as Record<string, any>,
    )

    // Add an audit log if available
    const recentAuditLogs = await prisma.configAuditLog.findMany({
      take: 10,
      orderBy: {
        changeDate: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    const auditLog = recentAuditLogs.map((log) => ({
      id: log.id,
      user: log.user?.name || "Unknown",
      action: `Updated ${log.configKey}`,
      timestamp: log.changeDate.toISOString(),
      reason: log.changeReason,
    }))

    const result = {
      settings,
      auditLog,
      lastSaved: configs.length > 0 ? Math.max(...configs.map((c) => c.lastUpdated.getTime())) : null,
    }

    // Cache the result
    const cacheKey = `${ALL_CONFIGS_CACHE_KEY}:${environment || "default"}`
    await setCache(cacheKey, result, CACHE_TTL)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST handler to create or update a system setting
export async function POST(req: Request) {
  try {
    // Get client info for audit
    const userAgent = req.headers.get("user-agent") || undefined
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined

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

    // Parse request data
    const data = await req.json()
    const timestamp = new Date().toISOString()

    // Track successful updates
    const results = []
    // Track any errors
    const errors = []

    // Process each section as a separate system config entry
    for (const [sectionKey, sectionData] of Object.entries(data)) {
      try {
        // Skip if this is not a section we want to save
        if (typeof sectionData !== "object" || sectionData === null) {
          continue
        }

        const configKey = sectionKey
        const configValue = sectionData as ConfigValue
        const description = `${sectionKey.replace(/_/g, " ")} configuration`
        const environment = data.environment || null

        // Validate payment terms if present
        if (configKey === 'paymentGateway' && configValue.paymentTerms) {
          const validTerms = ['net7', 'net15', 'net30', 'net45', 'net60']
          if (!validTerms.includes(configValue.paymentTerms)) {
            errors.push({ 
              sectionKey, 
              error: "Invalid payment terms. Must be one of: net7, net15, net30, net45, net60" 
            })
            continue
          }
        }

        // Determine if this section contains sensitive data that should be encrypted
        const isEncrypted =
          configKey.includes("security") ||
          configKey.includes("payment") ||
          (configKey.includes("notification") &&
            (configValue.emailConfig?.smtp_password || configValue.smsConfig?.apiKey))

        // Get the current version of the config
        const existingConfig = await prisma.systemConfig.findFirst({
          where: { configKey },
          orderBy: { version: 'desc' },
        })

        // Handle encryption if needed
        const finalConfigValue = { ...configValue }
        if (isEncrypted) {
          // Encrypt sensitive fields
          if (finalConfigValue.api_key && !finalConfigValue.api_key.includes("●")) {
            finalConfigValue.api_key = encrypt(finalConfigValue.api_key)
          }
          if (finalConfigValue.webhook_secret && !finalConfigValue.webhook_secret.includes("●")) {
            finalConfigValue.webhook_secret = encrypt(finalConfigValue.webhook_secret)
          }
          if (finalConfigValue.emailConfig?.smtp_password && !finalConfigValue.emailConfig.smtp_password.includes("●")) {
            finalConfigValue.emailConfig.smtp_password = encrypt(finalConfigValue.emailConfig.smtp_password)
          }
          if (finalConfigValue.smsConfig?.apiKey && !finalConfigValue.smsConfig.apiKey.includes("●")) {
            finalConfigValue.smsConfig.apiKey = encrypt(finalConfigValue.smsConfig.apiKey)
          }
        }

        // Create new version
        const newVersion = existingConfig ? existingConfig.version + 1 : 1

        // Update or create the configuration
        const updatedConfig = await prisma.systemConfig.upsert({
          where: {
            configKey,
          },
          create: {
            configKey,
            configValue: finalConfigValue,
            description,
            updatedBy: session.user.id,
            isEncrypted: Boolean(isEncrypted),
            environment,
            version: 1,
          },
          update: {
            configValue: finalConfigValue,
            description: description || existingConfig?.description,
            updatedBy: session.user.id,
            isEncrypted: isEncrypted !== undefined ? Boolean(isEncrypted) : existingConfig?.isEncrypted,
            version: newVersion,
            environment,
          },
        })

        // Log the change to audit log
        await prisma.configAuditLog.create({
          data: {
            configKey,
            previousValue: existingConfig?.configValue as any || null,
            newValue: finalConfigValue as any,
            changedBy: session.user.id,
            ipAddress,
            userAgent,
            changeReason: data.changeReason || "Updated from admin panel",
            changeDate: new Date(timestamp),
          },
        })

        // Clear cache for this config
        await deleteCache(`${CONFIG_CACHE_KEY_PREFIX}${configKey}:${environment || "default"}`)

        results.push({
          configKey,
          id: updatedConfig.id,
          version: newVersion,
          status: existingConfig ? "updated" : "created",
          timestamp,
        })
      } catch (error) {
        console.error(`Error processing config ${sectionKey}:`, error)
        errors.push({ sectionKey, error: "Processing error" })
      }
    }

    // Clear cache for all configs
    await deleteCachePattern(`${ALL_CONFIGS_CACHE_KEY}:*`)

    // Fetch the latest version of all updated settings
    const latestConfigs = await prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: Object.keys(data),
        },
      },
      orderBy: {
        version: 'desc',
      },
      distinct: ['configKey'],
    })

    // Transform the configs into the format expected by the frontend
    const settings = latestConfigs.reduce((acc, config) => {
      acc[config.configKey] = config.configValue
      return acc
    }, {} as Record<string, any>)

    // Return success response with results
    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      results,
      errors: errors.length > 0 ? errors : undefined,
      settings,
      lastSaved: timestamp,
      auditLog: await prisma.configAuditLog.findMany({
        take: 10,
        orderBy: {
          changeDate: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save settings",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT handler to update multiple settings at once in a different format
export async function PUT(req: Request) {
  try {
    // Get client info for audit
    const userAgent = req.headers.get("user-agent") || undefined
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined

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

    // Parse request data
    const data = await req.json()

    if (typeof data !== "object" || Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Invalid or empty settings data" }, { status: 400 })
    }

    // Track successful updates
    const results = []
    // Track any errors
    const errors = []

    // Process each config
    for (const [configKey, configData] of Object.entries(data)) {
      try {
        if (!configData || typeof configData !== "object") {
          errors.push({ configKey, error: "Invalid configuration data" })
          continue
        }

        const { value, description, environment, isEncrypted } = configData as any

        // Check if config exists to retrieve current version
        const existingConfig = await prisma.systemConfig.findUnique({
          where: { configKey },
        })

        // Handle encryption if needed
        let finalConfigValue = value
        if (isEncrypted || existingConfig?.isEncrypted) {
          // For this example, we'll check for common sensitive fields
          const valueObj = typeof finalConfigValue === "object" ? finalConfigValue : {}

          if (valueObj.apiKey && !valueObj.apiKey.includes("●")) {
            valueObj.apiKey = encrypt(valueObj.apiKey)
          }

          if (valueObj.webhookSecret && !valueObj.webhookSecret.includes("●")) {
            valueObj.webhookSecret = encrypt(valueObj.webhookSecret)
          }

          finalConfigValue = valueObj
        }

        // Create new version
        const newVersion = existingConfig ? existingConfig.version + 1 : 1

        // Update or create the configuration
        const updatedConfig = await prisma.systemConfig.upsert({
          where: {
            configKey,
          },
          create: {
            configKey,
            configValue: finalConfigValue,
            description,
            updatedBy: session.user.id,
            isEncrypted: Boolean(isEncrypted), // Fix: Convert to boolean
            environment,
            version: 1,
          },
          update: {
            configValue: finalConfigValue,
            description: description || existingConfig?.description,
            updatedBy: session.user.id,
            isEncrypted: isEncrypted !== undefined ? Boolean(isEncrypted) : existingConfig?.isEncrypted, // Fix: Convert to boolean
            version: newVersion,
            environment,
          },
        })

        // Log the change to audit log
        if (existingConfig) {
          await prisma.configAuditLog.create({
            data: {
              configKey,
              previousValue: existingConfig.configValue as any, // Cast to any to handle JSON values
              newValue: finalConfigValue as any, // Cast to any to handle JSON values
              changedBy: session.user.id,
              ipAddress,
              userAgent,
              changeReason: description || "Bulk update",
            },
          })
        }

        // Clear cache for this specific config
        await deleteCache(`${CONFIG_CACHE_KEY_PREFIX}${configKey}:${environment || "default"}`)

        results.push({
          configKey,
          id: updatedConfig.id,
          version: updatedConfig.version,
          status: existingConfig ? "updated" : "created",
        })
      } catch (error) {
        console.error(`Error processing config ${configKey}:`, error)
        errors.push({ configKey, error: "Processing error" })
      }
    }

    // Clear cache for all configs as well
    await deleteCachePattern(`${ALL_CONFIGS_CACHE_KEY}:*`)

    return NextResponse.json({
      success: results.length > 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error updating multiple settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
