import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for registration verification
const verificationSchema = z.object({
  registrationCode: z.string().min(1, "Registration code is required"),
  deviceIdentifier: z.string().min(1, "Device identifier is required"),
  deviceName: z.string().min(1, "Device name is required"),
  deviceType: z.enum(["BUS", "TRAM", "TRAIN", "METRO", "OTHER"]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  metadata: z.record(z.any()).optional(),
});

// POST handler for verifying and completing device registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validatedData = verificationSchema.parse(body);
    const { registrationCode, deviceIdentifier, deviceName, deviceType, location, metadata } = validatedData;

    // Find device with matching registration code
    const device = await prisma.device.findFirst({
      where: {
        deviceIdentifier,
        routeDetails: {
          path: ["registrationCode"],
          equals: registrationCode,
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Invalid registration code or device identifier" },
        { status: 400 }
      );
    }

    // Check if registration code has expired
    const routeDetails = device.routeDetails as any;
    const expiryTime = new Date(routeDetails.registrationCodeExpiry);
    
    if (new Date() > expiryTime) {
      return NextResponse.json(
        { error: "Registration code has expired" },
        { status: 400 }
      );
    }

    // Update device with registration details
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        name: deviceName,
        deviceType,
        status: "ACTIVE",
        location,
        metadata: metadata || {},
        routeDetails: {
          ...routeDetails,
          registrationCompleted: true,
          registrationCompletedAt: new Date().toISOString(),
          // Remove registration code and expiry after successful registration
          registrationCode: undefined,
          registrationCodeExpiry: undefined,
        },
      },
    });

    // Create initial analytics entry
    await prisma.deviceAnalytics.create({
      data: {
        deviceId: device.id,
        timestamp: new Date(),
        metrics: {
          status: "ACTIVE",
          location,
          batteryLevel: 100, // Assuming full battery on registration
          signalStrength: 100, // Assuming full signal on registration
        },
      },
    });

    return NextResponse.json({
      success: true,
      device: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        deviceType: updatedDevice.deviceType,
        status: updatedDevice.status,
        location: updatedDevice.location,
      },
    });
  } catch (error) {
    console.error("Error verifying device registration:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to verify device registration" },
      { status: 500 }
    );
  }
} 