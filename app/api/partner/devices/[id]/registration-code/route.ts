import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { randomBytes, createHash } from "crypto"
import { getCache, setCache, getCacheKey } from "@/lib/redis"
import { redis } from "@/lib/redis"
import { nanoid } from "nanoid"
import { DeviceType } from "@prisma/client"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"

// Validation schema for device ID
const deviceIdSchema = z.object({
  id: z.string().min(1, "Device ID is required")
})

// Validation schema for registration code request
const registrationCodeRequestSchema = z.object({
  deviceIdentifier: z.string().min(1).max(255),
  deviceName: z.string().min(1).max(255).optional(),
  deviceType: z.nativeEnum(DeviceType).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  autoActivate: z.boolean().optional(),
  firmwareVersion: z.string().optional(),
  capabilities: z.record(z.any()).optional(),
  configSettings: z.record(z.any()).optional(),
})

// Validation schema for verification request
const verificationRequestSchema = z.object({
  registrationCode: z.string().min(1).max(255),
})

// Registration status enum
enum RegistrationStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  INVALID = "INVALID",
  EXPIRED = "EXPIRED"
}

// Generate a secure, unique registration code
function generateUniqueCode(length = 8): string {
  // Generate random bytes and convert to a hex string
  const randomString = randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)

  // Convert to uppercase for better readability
  return randomString.toUpperCase()
}

// Create a hash of the registration code for secure storage
function hashRegistrationCode(code: string, deviceId: string): string {
  return createHash("sha256")
    .update(`${code}-${deviceId}-${process.env.REGISTRATION_SECRET || "lumen-secret"}`)
    .digest("hex")
}

// Cache constants
const REGISTRATION_CODE_CACHE_PREFIX = "device_registration_code:"
const REGISTRATION_CODE_CACHE_TTL = 15 * 60 // 15 minutes in seconds

// Type for cached registration data
interface CachedRegistrationData {
  code: string
  codeHash: string
  deviceId: string
  expiresAt: Date
  isUsed: boolean
}

// Rate limiter for registration code generation
const registrationCodeLimiter = await rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 5 // Allow 5 requests per minute
})

// Rate limiter for verification attempts
const verificationLimiter = await rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 10 // Allow 10 verification attempts per minute
})

// Helper function to generate a unique registration code
async function generateUniqueRegistrationCode(): Promise<string> {
  // Apply rate limiting
  const rateLimitResult = await registrationCodeLimiter(
    getRateLimitKey("registration", "generate")
  )

  if (!rateLimitResult.success) {
    throw new Error("Rate limit exceeded. Please try again later.")
  }

  const code = nanoid(10).toUpperCase()
  const exists = await prisma.deviceRegistration.findUnique({
    where: { registrationCode: code },
  })
  
  if (exists) {
    return generateUniqueRegistrationCode()
  }
  
  return code
}

// Helper function to validate device ownership
async function validateDeviceOwnership(deviceId: string, partnerId: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { partnerId: true },
  })
  
  return device?.partnerId === partnerId
}

// Helper function to check if device is already registered
async function isDeviceAlreadyRegistered(deviceIdentifier: string): Promise<boolean> {
  const existingRegistration = await prisma.deviceRegistration.findUnique({
    where: { deviceIdentifier },
  })
  
  return !!existingRegistration
}

// Helper function to create a new device registration
async function createDeviceRegistration(
  deviceId: string,
  partnerId: string,
  userId: string,
  data: z.infer<typeof registrationCodeRequestSchema>
) {
  const registrationCode = await generateUniqueRegistrationCode()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiration
  
  return prisma.deviceRegistration.create({
    data: {
      deviceId,
      partnerId,
      userId,
      registrationCode,
      deviceIdentifier: data.deviceIdentifier,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      location: data.location,
      metadata: data.metadata,
      tags: data.tags || [],
      notes: data.notes,
      autoActivate: data.autoActivate || false,
      firmwareVersion: data.firmwareVersion,
      capabilities: data.capabilities,
      configSettings: data.configSettings,
      expiresAt,
    },
  })
}

// Helper function to update registration attempts
async function updateRegistrationAttempts(registrationId: string) {
  return prisma.deviceRegistration.update({
    where: { id: registrationId },
    data: {
      registrationAttempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  })
}

// Helper function to complete registration
async function completeRegistration(registrationId: string) {
  return prisma.deviceRegistration.update({
    where: { id: registrationId },
    data: {
      status: RegistrationStatus.COMPLETED,
      completedAt: new Date(),
    },
  })
}

// Helper function to invalidate registration
async function invalidateRegistration(registrationId: string) {
  return prisma.deviceRegistration.update({
    where: { id: registrationId },
    data: {
      status: RegistrationStatus.INVALID,
    },
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate device ID
    const validationResult = deviceIdSchema.safeParse({ id: params.id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid device ID", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const deviceId = params.id

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if device exists and belongs to the partner
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { partner: { include: { user: true } } },
    })

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Check if the device belongs to the current user
    if (device.partner.user.email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized access to this device" }, { status: 403 })
    }

    // Generate a unique registration code
    const registrationCode = generateUniqueCode(8)

    // Hash the registration code for secure storage
    const codeHash = hashRegistrationCode(registrationCode, deviceId)

    // Set expiration time (15 minutes from now)
    const expiryTime = new Date()
    expiryTime.setMinutes(expiryTime.getMinutes() + 15)

    // Store the registration code in the database
    await prisma.deviceRegistration.upsert({
      where: { deviceId },
      update: {
        registrationCode,
        expiresAt: expiryTime,
        status: "PENDING",
      },
      create: {
        deviceId,
        partnerId: device.partnerId,
        userId: session.user.id,
        deviceIdentifier: device.deviceIdentifier,
        deviceName: device.name,
        deviceType: device.deviceType,
        registrationCode,
        expiresAt: expiryTime,
        status: "PENDING",
      },
    })

    // Cache the registration code in Redis for faster verification
    const cacheKey = `${REGISTRATION_CODE_CACHE_PREFIX}${deviceId}`
    const cacheData: CachedRegistrationData = {
      code: registrationCode,
      codeHash,
      deviceId,
      expiresAt: expiryTime,
      isUsed: false
    }
    await setCache(cacheKey, cacheData, REGISTRATION_CODE_CACHE_TTL)

    // Return the registration code (not the hash) to the client
    return NextResponse.json({
      code: registrationCode,
      expiresAt: expiryTime,
    })
  } catch (error) {
    console.error("Error generating registration code:", error)
    return NextResponse.json({ error: "Failed to generate registration code" }, { status: 500 })
  }
}

// Verify a registration code
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply rate limiting for verification attempts
    const rateLimitResult = await verificationLimiter(
      getRateLimitKey("registration", "verify")
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      )
    }

    // Validate device ID
    const validationResult = deviceIdSchema.safeParse({ id: params.id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid device ID", details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const deviceId = params.id
    const url = new URL(request.url)
    const code = url.searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Registration code is required" }, { status: 400 })
    }

    // Try to get from Redis cache first
    const cacheKey = `${REGISTRATION_CODE_CACHE_PREFIX}${deviceId}`
    const cachedData = await getCache<CachedRegistrationData>(cacheKey)

    let registrationData: CachedRegistrationData | null = null
    if (cachedData) {
      // Use cached data if available
      registrationData = cachedData
    } else {
      // Fall back to database
      const registration = await prisma.deviceRegistration.findUnique({
        where: { deviceId },
      })

      if (!registration) {
        return NextResponse.json({ error: "Invalid registration code" }, { status: 400 })
      }

      registrationData = {
        code: registration.registrationCode,
        codeHash: hashRegistrationCode(registration.registrationCode, deviceId),
        deviceId,
        expiresAt: registration.expiresAt,
        isUsed: registration.status === "COMPLETED"
      }
    }

    if (!registrationData) {
      return NextResponse.json({ error: "Registration data not found" }, { status: 404 })
    }

    // Check if the code is expired
    if (new Date(registrationData.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Registration code has expired" }, { status: 400 })
    }

    // Check if the code has already been used
    if (registrationData.isUsed) {
      return NextResponse.json({ error: "Registration code has already been used" }, { status: 400 })
    }

    // Check if the code matches
    if (registrationData.code !== code) {
      return NextResponse.json({ error: "Invalid registration code" }, { status: 400 })
    }

    // Mark the code as used in the database
    await prisma.deviceRegistration.update({
      where: { deviceId },
      data: { 
        status: "COMPLETED",
        completedAt: new Date()
      },
    })

    // Update the device status to ACTIVE
    await prisma.device.update({
      where: { id: deviceId },
      data: { status: "ACTIVE" },
    })

    // Remove from cache
    await getCache(cacheKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error verifying registration code:", error)
    return NextResponse.json({ error: "Failed to verify registration code" }, { status: 500 })
  }
}
