import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Validation schema for device ID
const deviceIdSchema = z.object({
  id: z.string().min(1, "Device ID is required")
})

/**
 * POST handler for refreshing device status
 * Requires authentication and partner role
 */
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

    // Get the user's partner profile
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id }
    })

    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 })
    }

    // Check if device exists and belongs to the partner
    const device = await prisma.device.findUnique({
      where: { 
        id: deviceId,
        partnerId: partner.id
      }
    })

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Update the device's lastActive timestamp
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: { 
        lastActive: new Date(),
        // If the device was in PENDING status and has a completed registration, update to ACTIVE
        ...(device.status === "PENDING" && {
          status: "ACTIVE"
        })
      },
      include: {
        partner: {
          select: {
            companyName: true
          }
        }
      }
    })

    return NextResponse.json(updatedDevice)
  } catch (error) {
    console.error("Error refreshing device:", error)
    return NextResponse.json(
      { error: "Failed to refresh device status" },
      { status: 500 }
    )
  }
} 