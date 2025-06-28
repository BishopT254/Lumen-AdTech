import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Device schema for validation
const deviceSchema = z.object({
  name: z.string().min(3).max(100),
  deviceIdentifier: z.string().min(3).max(100),
  deviceType: z.enum(["ANDROID_TV", "DIGITAL_SIGNAGE", "INTERACTIVE_KIOSK", "VEHICLE_MOUNTED", "RETAIL_DISPLAY"]),
  location: z.any(), // Location data including lat/long and address
  routeDetails: z.any().optional(), // For mobile installations
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "MAINTENANCE"]).default("PENDING"),
  healthStatus: z.enum(["UNKNOWN", "HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]).default("UNKNOWN"),
});

// GET handler for fetching devices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = session.user.id;
    
    // Different queries based on user role
    if (session.user.role === "ADMIN") {
      // Admins can see all devices with optional filters
      const status = searchParams.get("status");
      const deviceType = searchParams.get("deviceType");
      const healthStatus = searchParams.get("healthStatus");
      
      const query: any = {};
      
      if (status) {
        query.status = status;
      }
      
      if (deviceType) {
        query.deviceType = deviceType;
      }
      
      if (healthStatus) {
        query.healthStatus = healthStatus;
      }
      
      const devices = await prisma.device.findMany({
        where: query,
        include: {
          partner: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      
      return NextResponse.json(devices);
      
    } else if (session.user.role === "PARTNER") {
      // Get the partner profile
      const partner = await prisma.partner.findUnique({
        where: { userId }
      });
      
      if (!partner) {
        return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
      }
      
      // Get devices for this partner
      const status = searchParams.get("status");
      const deviceType = searchParams.get("deviceType");
      const healthStatus = searchParams.get("healthStatus");
      
      const query: any = { partnerId: partner.id };
      
      if (status) {
        query.status = status;
      }
      
      if (deviceType) {
        query.deviceType = deviceType;
      }
      
      if (healthStatus) {
        query.healthStatus = healthStatus;
      }
      
      const devices = await prisma.device.findMany({
        where: query,
        orderBy: { createdAt: "desc" }
      });
      
      return NextResponse.json(devices);
      
    } else {
      // Advertisers don't have direct access to devices
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// POST handler for registering a new device
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is a partner
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.user.role !== "PARTNER") {
      return NextResponse.json({ error: "Only partners can register devices" }, { status: 403 });
    }
    
    // Get the partner profile
    const partner = await prisma.partner.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = deviceSchema.parse(body);
      
      // Check if device identifier is already registered
      const existingDevice = await prisma.device.findUnique({
        where: { deviceIdentifier: validatedData.deviceIdentifier }
      });
      
      if (existingDevice) {
        return NextResponse.json({ 
          error: "Device with this identifier already exists" 
        }, { status: 400 });
      }
      
      // Create the device
      const device = await prisma.device.create({
        data: {
          ...validatedData,
          partnerId: partner.id,
        }
      });
      
      return NextResponse.json(device, { status: 201 });
      
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
  } catch (error) {
    console.error("Error creating device:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
} 