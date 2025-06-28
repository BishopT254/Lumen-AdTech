/**
 * Android TV SDK Library
 * 
 * This module provides the client-side interface for the Android TV application
 * to communicate with the Lumen AdTech Platform. It handles device registration,
 * content delivery, analytics, and status reporting.
 */

import { prisma } from './prisma';
import { z } from 'zod';

// Validation schemas
const deviceRegistrationSchema = z.object({
  deviceIdentifier: z.string().min(3).max(100),
  deviceType: z.enum(["ANDROID_TV", "DIGITAL_SIGNAGE", "INTERACTIVE_KIOSK", "VEHICLE_MOUNTED", "RETAIL_DISPLAY"]),
  name: z.string().min(3).max(100),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
  routeDetails: z.any().optional(),
  specs: z.object({
    model: z.string().optional(),
    osVersion: z.string().optional(),
    screenResolution: z.string().optional(),
    storageCapacity: z.number().optional(),
    availableStorage: z.number().optional(),
    networkType: z.string().optional(),
  }).optional(),
});

const statusUpdateSchema = z.object({
  deviceIdentifier: z.string(),
  healthStatus: z.enum(["UNKNOWN", "HEALTHY", "WARNING", "CRITICAL", "OFFLINE"]),
  lastActive: z.string().transform(str => new Date(str)),
  metrics: z.object({
    cpuUsage: z.number().optional(),
    memoryUsage: z.number().optional(),
    storageUsage: z.number().optional(),
    batteryLevel: z.number().optional(),
    networkSpeed: z.number().optional(),
    temperature: z.number().optional(),
  }).optional(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string().transform(str => new Date(str)),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  })).optional(),
});

const adPlaybackSchema = z.object({
  deviceIdentifier: z.string(),
  adDeliveryId: z.string(),
  adCreativeId: z.string(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)).optional(),
  completed: z.boolean(),
  interrupted: z.boolean().optional(),
  interactionCount: z.number().optional(),
  viewerData: z.object({
    estimatedCount: z.number().optional(),
    estimatedViews: z.number().optional(),
    attentionScore: z.number().min(0).max(100).optional(),
    demographicData: z.any().optional(),
    emotionData: z.any().optional(),
  }).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

/**
 * Registers a new Android TV device in the system.
 * This function is called during the initial setup of a device.
 */
export async function registerDevice(partnerId: string, deviceData: z.infer<typeof deviceRegistrationSchema>) {
  try {
    // Validate device data
    const validatedData = deviceRegistrationSchema.parse(deviceData);
    
    // Check if device already exists
    const existingDevice = await prisma.device.findUnique({
      where: { deviceIdentifier: validatedData.deviceIdentifier }
    });
    
    if (existingDevice) {
      throw new Error(`Device with identifier ${validatedData.deviceIdentifier} already exists`);
    }
    
    // Create the device
    const device = await prisma.device.create({
      data: {
        partnerId,
        deviceIdentifier: validatedData.deviceIdentifier,
        name: validatedData.name,
        deviceType: validatedData.deviceType,
        location: validatedData.location,
        routeDetails: validatedData.routeDetails,
        status: "PENDING", // New devices start in pending status
        healthStatus: "UNKNOWN",
        lastActive: new Date(),
      }
    });
    
    return {
      success: true,
      message: "Device registered successfully",
      deviceId: device.id,
    };
  } catch (error) {
    console.error("Device registration error:", error);
    throw error;
  }
}

/**
 * Updates the status of an Android TV device.
 * Called periodically by the device to report its health status.
 */
export async function updateDeviceStatus(statusData: z.infer<typeof statusUpdateSchema>) {
  try {
    // Validate status data
    const validatedData = statusUpdateSchema.parse(statusData);
    
    // Find the device
    const device = await prisma.device.findFirst({
      where: { deviceIdentifier: validatedData.deviceIdentifier }
    });
    
    if (!device) {
      throw new Error(`Device with identifier ${validatedData.deviceIdentifier} not found`);
    }
    
    // Update the device status
    await prisma.device.update({
      where: { id: device.id },
      data: {
        healthStatus: validatedData.healthStatus,
        lastActive: validatedData.lastActive,
      }
    });
    
    // Log the status update for analytics
    await prisma.deviceAnalytics.create({
      data: {
        deviceId: device.id,
        healthStatus: validatedData.healthStatus,
        metrics: validatedData.metrics || {},
        errors: validatedData.errors || [],
        timestamp: new Date(),
      }
    });
    
    return {
      success: true,
      message: "Device status updated successfully",
    };
  } catch (error) {
    console.error("Device status update error:", error);
    throw error;
  }
}

/**
 * Records playback of an advertisement on an Android TV device.
 * Called when an ad is played, completed, or interrupted.
 */
export async function recordAdPlayback(playbackData: z.infer<typeof adPlaybackSchema>) {
  try {
    // Validate playback data
    const validatedData = adPlaybackSchema.parse(playbackData);
    
    // Find the device
    const device = await prisma.device.findFirst({
      where: { deviceIdentifier: validatedData.deviceIdentifier }
    });
    
    if (!device) {
      throw new Error(`Device with identifier ${validatedData.deviceIdentifier} not found`);
    }
    
    // Find the ad delivery
    const adDelivery = await prisma.adDelivery.findUnique({
      where: { id: validatedData.adDeliveryId }
    });
    
    if (!adDelivery) {
      throw new Error(`Ad delivery with ID ${validatedData.adDeliveryId} not found`);
    }
    
    // Update the ad delivery status
    await prisma.adDelivery.update({
      where: { id: validatedData.adDeliveryId },
      data: {
        actualDeliveryTime: validatedData.startTime,
        status: validatedData.completed ? "DELIVERED" : "FAILED",
        impressions: { increment: validatedData.viewerData?.estimatedViews || 1 },
        engagements: { increment: validatedData.interactionCount || 0 },
        completions: validatedData.completed ? { increment: 1 } : undefined,
        viewerCount: validatedData.viewerData?.estimatedCount,
        locationData: validatedData.location,
      }
    });
    
    // Record emotion data if available
    if (validatedData.viewerData?.emotionData) {
      await prisma.emotionData.create({
        data: {
          adDeliveryId: validatedData.adDeliveryId,
          adCreativeId: validatedData.adCreativeId,
          data: validatedData.viewerData.emotionData,
          timestamp: validatedData.startTime,
        }
      });
    }
    
    return {
      success: true,
      message: "Ad playback recorded successfully",
    };
  } catch (error) {
    console.error("Ad playback recording error:", error);
    throw error;
  }
}

/**
 * Gets the content queue for a specific device.
 * Called by the device to retrieve its scheduled content.
 */
export async function getContentQueue(deviceIdentifier: string) {
  try {
    // Find the device
    const device = await prisma.device.findFirst({
      where: { deviceIdentifier }
    });
    
    if (!device) {
      throw new Error(`Device with identifier ${deviceIdentifier} not found`);
    }
    
    // Get scheduled ad deliveries for this device
    const now = new Date();
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId: device.id,
        scheduledTime: {
          gte: new Date(now.getTime() - 1000 * 60 * 60) // Include deliveries from the past hour
        },
        status: {
          in: ["SCHEDULED", "PENDING"]
        }
      },
      include: {
        adCreative: true,
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            pricingModel: true,
          }
        }
      },
      orderBy: {
        scheduledTime: 'asc'
      }
    });
    
    // Filter out deliveries from inactive campaigns
    const validDeliveries = adDeliveries.filter(delivery => 
      delivery.campaign.status === "ACTIVE"
    );
    
    return {
      success: true,
      deviceId: device.id,
      queue: validDeliveries.map(delivery => ({
        deliveryId: delivery.id,
        scheduledTime: delivery.scheduledTime,
        creative: {
          id: delivery.adCreative.id,
          name: delivery.adCreative.name,
          type: delivery.adCreative.type,
          content: delivery.adCreative.content,
          format: delivery.adCreative.format,
          duration: delivery.adCreative.duration,
          previewImage: delivery.adCreative.previewImage,
          ar_markers: delivery.adCreative.ar_markers,
          voiceCommands: delivery.adCreative.voiceCommands,
        },
        campaign: {
          id: delivery.campaign.id,
          name: delivery.campaign.name,
          pricingModel: delivery.campaign.pricingModel,
        }
      }))
    };
  } catch (error) {
    console.error("Content queue retrieval error:", error);
    throw error;
  }
}

/**
 * Initiates device synchronization - fetching any configuration updates
 * and reporting current device state.
 */
export async function syncDevice(deviceIdentifier: string, currentConfig: any) {
  try {
    // Find the device
    const device = await prisma.device.findFirst({
      where: { deviceIdentifier }
    });
    
    if (!device) {
      throw new Error(`Device with identifier ${deviceIdentifier} not found`);
    }
    
    // Update last active timestamp
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastActive: new Date(),
      }
    });
    
    // Check if there are any configuration updates
    // This could be fetched from a settings table or other configuration source
    const systemConfig = {
      contentCacheLimit: 2048, // MB
      heartbeatInterval: 300, // seconds
      logLevel: "INFO",
      adPreloadWindow: 3600, // seconds, preload ads 1 hour before scheduled time
      offlinePlaybackEnabled: true,
      minimumStorageRequired: 500, // MB
      networkSavingMode: device.deviceType === "VEHICLE_MOUNTED", // Enable for mobile devices
      screensaverTimeout: 300, // seconds
      powerSavingEnabled: true,
      debugMode: false,
      requiredVersion: "1.2.0",
      serverTime: new Date().toISOString(),
    };
    
    // Compare current config with system config to determine if update is needed
    const needsUpdate = JSON.stringify(currentConfig) !== JSON.stringify(systemConfig);
    
    return {
      success: true,
      deviceId: device.id,
      configurationUpdated: needsUpdate,
      configuration: systemConfig,
      commands: [], // Any specific commands for the device to execute
    };
  } catch (error) {
    console.error("Device sync error:", error);
    throw error;
  }
}

/**
 * Processes audience metrics data collected by the device using edge AI
 */
export async function processAudienceMetrics(deviceIdentifier: string, metricsData: any) {
  try {
    // Find the device
    const device = await prisma.device.findFirst({
      where: { deviceIdentifier }
    });
    
    if (!device) {
      throw new Error(`Device with identifier ${deviceIdentifier} not found`);
    }

    // Store the anonymized metrics data
    await prisma.deviceAnalytics.create({
      data: {
        deviceId: device.id,
        metrics: metricsData,
        timestamp: new Date(),
      }
    });
    
    return {
      success: true,
      message: "Audience metrics processed successfully",
    };
  } catch (error) {
    console.error("Audience metrics processing error:", error);
    throw error;
  }
} 