import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Device update schema for validation
const deviceUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  deviceType: z.enum(["ANDROID_TV", "DIGITAL_SIGNAGE", "INTERACTIVE_KIOSK", "VEHICLE_MOUNTED", "RETAIL_DISPLAY"]).optional(),
  location: z.any().optional(),
  routeDetails: z.any().optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "MAINTENANCE"]).optional(),
  healthStatus: z.enum(["UNKNOWN", "HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]).optional(),
  lastActive: z.string().transform(str => new Date(str)).optional(),
});

// GET handler for fetching a single device
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deviceId = params.id;
    
    // Fetch the device with related data
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: {
          select: {
            companyName: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        adDeliveries: {
          take: 10,
          orderBy: { scheduledTime: "desc" },
          include: {
            campaign: {
              select: {
                name: true,
                status: true
              }
            }
          }
        },
        deviceAnalytics: {
          take: 10,
          orderBy: { timestamp: "desc" }
        }
      }
    });
    
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    // Access control based on user role
    if (session.user.role === "ADMIN") {
      // Admins can access any device
      return NextResponse.json(device);
    } else if (session.user.role === "PARTNER") {
      // Partners can only access their own devices
      if (device.partner.userId === session.user.id) {
        return NextResponse.json(device);
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Advertisers don't have direct access to devices
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch (error) {
    console.error("Error fetching device:", error);
    return NextResponse.json(
      { error: "Failed to fetch device" },
      { status: 500 }
    );
  }
}

// PUT handler for updating a device
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deviceId = params.id;
    
    // Fetch the existing device
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: {
          select: {
            userId: true
          }
        }
      }
    });
    
    if (!existingDevice) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    // Access control
    if (session.user.role === "PARTNER" && existingDevice.partner.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (session.user.role !== "ADMIN" && session.user.role !== "PARTNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = deviceUpdateSchema.parse(body);
      
      // Special rule: only admins can set status to "ACTIVE" from "PENDING"
      if (
        existingDevice.status === "PENDING" && 
        validatedData.status === "ACTIVE" && 
        session.user.role !== "ADMIN"
      ) {
        return NextResponse.json({ 
          error: "Only administrators can approve pending devices" 
        }, { status: 403 });
      }
      
      // Only admins can update device health status
      if (validatedData.healthStatus && session.user.role !== "ADMIN") {
        delete validatedData.healthStatus;
      }
      
      // Update the device
      const updatedDevice = await prisma.device.update({
        where: { id: deviceId },
        data: validatedData
      });
      
      return NextResponse.json(updatedDevice);
      
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
    console.error("Error updating device:", error);
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    );
  }
}

// DELETE handler for removing a device
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deviceId = params.id;
    
    // Fetch the existing device
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: {
          select: {
            userId: true
          }
        }
      }
    });
    
    if (!existingDevice) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    // Access control - only admins and device owners can delete
    if (
      session.user.role !== "ADMIN" && 
      (session.user.role !== "PARTNER" || existingDevice.partner.userId !== session.user.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Check if device has active ad deliveries
    const activeDeliveries = await prisma.adDelivery.count({
      where: {
        deviceId,
        status: {
          in: ["SCHEDULED", "PENDING"]
        }
      }
    });
    
    if (activeDeliveries > 0 && session.user.role !== "ADMIN") {
      return NextResponse.json({ 
        error: "Cannot delete device with active ad deliveries" 
      }, { status: 400 });
    }
    
    // For active devices, partners can only set to inactive, admins can delete
    if (existingDevice.status === "ACTIVE") {
      if (session.user.role === "ADMIN") {
        // Admins can delete active devices
        await prisma.device.delete({
          where: { id: deviceId }
        });
      } else {
        // Partners can only set active devices to inactive
        await prisma.device.update({
          where: { id: deviceId },
          data: { status: "INACTIVE" }
        });
        
        return NextResponse.json({ 
          message: "Device has been deactivated" 
        });
      }
    } else {
      // For non-active devices, perform deletion
      await prisma.device.delete({
        where: { id: deviceId }
      });
    }
    
    return NextResponse.json({ 
      message: "Device successfully deleted" 
    });
    
  } catch (error) {
    console.error("Error deleting device:", error);
    return NextResponse.json(
      { error: "Failed to delete device" },
      { status: 500 }
    );
  }
} 