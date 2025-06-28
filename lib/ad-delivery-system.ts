/**
 * Ad Delivery System
 * 
 * This module provides functionality for ad content delivery, scheduling, and verification
 * in the Lumen AdTech Platform. It handles the delivery of ad content to devices, ensuring
 * that the right content is delivered to the right device at the right time.
 */

import { prisma } from './prisma';
import { z } from 'zod';
import * as aiServices from './ai-services';
import { Prisma } from '@prisma/client';
import { logger } from './logger';
import { metrics } from './metrics';

// Validation schemas
const AdScheduleSchema = z.object({
  campaignId: z.string().uuid(),
  deviceId: z.string().uuid(),
  scheduledTime: z.coerce.date(),
  duration: z.number().min(5).max(300), // Duration in seconds
  priority: z.number().min(1).max(10).default(5),
});

const AdDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  deviceId: z.string().uuid(),
  campaignId: z.string().uuid(),
  adCreativeId: z.string().uuid().optional(),
  adContent: z.object({
    type: z.enum(['IMAGE', 'VIDEO', 'HTML', 'INTERACTIVE']),
    url: z.string().url(),
    duration: z.number(),
    format: z.string().optional(),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
  }),
});

// Ad delivery status
type DeliveryStatus = 'SCHEDULED' | 'DELIVERING' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

/**
 * Schedule an ad for delivery
 */
export async function scheduleAd(scheduleData: z.infer<typeof AdScheduleSchema>) {
  try {
    // Validate the schedule data
    const validatedData = AdScheduleSchema.parse(scheduleData);
    
    // Check if the campaign is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: validatedData.campaignId },
    });
    
    if (!campaign) {
      throw new Error(`Campaign with ID ${validatedData.campaignId} not found`);
    }
    
    if (campaign.status !== 'ACTIVE') {
      throw new Error(`Campaign ${campaign.name} is not active`);
    }
    
    // Check if the device is active
    const device = await prisma.device.findUnique({
      where: { id: validatedData.deviceId },
    });
    
    if (!device) {
      throw new Error(`Device with ID ${validatedData.deviceId} not found`);
    }
    
    if (device.status !== 'ACTIVE') {
      throw new Error(`Device ${device.name} is not active`);
    }
    
    // Check if there's a slot available
    const existingDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId: validatedData.deviceId,
        scheduledTime: {
          gte: new Date(validatedData.scheduledTime.getTime() - validatedData.duration * 1000),
          lte: new Date(validatedData.scheduledTime.getTime() + validatedData.duration * 1000),
        },
        status: {
          in: ['SCHEDULED', 'DELIVERING'],
        },
      },
    });
    
    if (existingDeliveries.length > 0) {
      // Check if this has higher priority
      const hasHigherPriority = existingDeliveries.every(
        delivery => (delivery.metadata as any)?.priority < validatedData.priority
      );
      
      if (!hasHigherPriority) {
        throw new Error('Time slot is already taken by a delivery with equal or higher priority');
      }
      
      // Cancel lower priority deliveries
      await prisma.adDelivery.updateMany({
        where: {
          id: {
            in: existingDeliveries.map(delivery => delivery.id),
          },
        },
        data: {
          status: 'CANCELLED',
          metadata: {
            ...existingDeliveries[0].metadata as any,
            cancelReason: 'Replaced by higher priority delivery',
          },
        },
      });
    }
    
    // Get the best ad creative for this delivery
    const adCreative = await selectBestAdCreative(validatedData.campaignId, device);
    
    if (!adCreative) {
      throw new Error('No suitable ad creative found for this campaign');
    }
    
    // Create the ad delivery
    const adDelivery = await prisma.adDelivery.create({
      data: {
        campaignId: validatedData.campaignId,
        deviceId: validatedData.deviceId,
        adCreativeId: adCreative.id,
        scheduledTime: validatedData.scheduledTime,
        status: 'SCHEDULED',
        metadata: {
          ...adCreative.metadata,
          priority: validatedData.priority,
          duration: validatedData.duration,
          scheduledBy: 'SYSTEM', // or could be USER_ID if scheduled manually
          type: adCreative.type,
          targetAudience: campaign.targetAudience,
        },
      },
    });
    
    return {
      success: true,
      deliveryId: adDelivery.id,
      scheduledTime: adDelivery.scheduledTime,
      deviceId: adDelivery.deviceId,
      campaignId: adDelivery.campaignId,
      adCreativeId: adDelivery.adCreativeId,
      status: adDelivery.status,
    };
  } catch (error) {
    console.error('Ad scheduling error:', error);
    throw error;
  }
}

/**
 * Get ad content for delivery
 */
export async function getAdContent(deviceId: string, currentTime: Date = new Date()) {
  try {
    const startTime = Date.now();
    
    // Find scheduled deliveries for this device and time
    const deliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId,
        scheduledTime: {
          lte: currentTime,
        },
        status: 'SCHEDULED',
      },
      include: {
        campaign: true,
        adCreative: true,
      },
      orderBy: {
        scheduledTime: 'asc',
      },
      take: 5,
    });
    
    metrics.timing('ad_content_query_time', Date.now() - startTime);
    
    if (deliveries.length === 0) {
      metrics.increment('ad_content_not_found');
      return {
        success: false,
        message: 'No scheduled deliveries found',
        fallbackContent: await getFallbackContent(deviceId),
      };
    }
    
    // Choose the best delivery based on priority and other factors
    const selectedDelivery = await selectBestDelivery(deliveries, deviceId);
    
    if (!selectedDelivery) {
      metrics.increment('ad_selection_failed');
      return {
        success: false,
        message: 'Failed to select a delivery',
        fallbackContent: await getFallbackContent(deviceId),
      };
    }
    
    // Monitor the delivery
    await monitorDelivery(selectedDelivery.id);
    
    // Update the delivery status
    await prisma.adDelivery.update({
      where: { id: selectedDelivery.id },
      data: {
        status: 'DELIVERING',
        startTime: currentTime,
      },
    });
    
    // Prepare the ad content
    const adContent = {
      type: selectedDelivery.adCreative?.type || 'IMAGE',
      url: selectedDelivery.adCreative?.url || '',
      duration: (selectedDelivery.metadata as any)?.duration || 30,
      format: selectedDelivery.adCreative?.format || 'standard',
      dimensions: selectedDelivery.adCreative?.dimensions || { width: 1080, height: 1920 },
    };
    
    metrics.increment('ad_content_delivered');
    
    return {
      success: true,
      deliveryId: selectedDelivery.id,
      adContent,
    };
  } catch (error) {
    logger.error('Error getting ad content', { error, deviceId });
    metrics.increment('ad_content_errors');
    throw error;
  }
}

/**
 * Record ad playback results
 */
export async function recordAdPlayback(
  deliveryId: string,
  playbackData: {
    impressions: number;
    engagements: number;
    completions: number;
    viewableTime: number;
    audienceMetrics?: {
      estimatedCount: number;
      demographics?: {
        ageRanges: Record<string, number>;
        genderDistribution: Record<string, number>;
      };
      emotions?: Record<string, number>;
      attentionScore?: number;
    };
    deviceMetrics?: {
      batteryLevel: number;
      memoryUsage: number;
      temperature: number;
      networkLatency: number;
    };
  }
) {
  try {
    // Get the delivery
    const delivery = await prisma.adDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        campaign: true,
      },
    });
    
    if (!delivery) {
      throw new Error(`Delivery with ID ${deliveryId} not found`);
    }
    
    if (delivery.status !== 'DELIVERING') {
      throw new Error(`Delivery is not in DELIVERING state`);
    }
    
    // Calculate completion status
    const duration = (delivery.metadata as any)?.duration || 30;
    const completionRatio = playbackData.viewableTime / (duration * 1000); // viewableTime in ms, duration in seconds
    const isCompleted = completionRatio >= 0.75; // Consider completed if viewed for at least 75% of duration
    
    // Update the delivery
    const updatedDelivery = await prisma.adDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        endTime: new Date(),
        impressions: playbackData.impressions,
        engagements: playbackData.engagements,
        completions: playbackData.completions,
        metadata: {
          ...delivery.metadata as any,
          playbackData: {
            viewableTime: playbackData.viewableTime,
            completionRatio,
            audienceMetrics: playbackData.audienceMetrics,
            deviceMetrics: playbackData.deviceMetrics,
          },
        },
      },
    });
    
    // Update campaign metrics
    await prisma.campaign.update({
      where: { id: delivery.campaignId },
      data: {
        totalImpressions: {
          increment: playbackData.impressions,
        },
        totalEngagements: {
          increment: playbackData.engagements,
        },
        totalCompletions: {
          increment: playbackData.completions,
        },
        // Update campaign metrics with audience data if available
        ...(playbackData.audienceMetrics ? {
          metadata: {
            ...(delivery.campaign?.metadata as any || {}),
            audienceReached: {
              ...((delivery.campaign?.metadata as any)?.audienceReached || {}),
              totalCount: ((delivery.campaign?.metadata as any)?.audienceReached?.totalCount || 0) + playbackData.audienceMetrics.estimatedCount,
              demographics: updateDemographics(
                (delivery.campaign?.metadata as any)?.audienceReached?.demographics,
                playbackData.audienceMetrics.demographics
              ),
              emotions: updateEmotions(
                (delivery.campaign?.metadata as any)?.audienceReached?.emotions,
                playbackData.audienceMetrics.emotions
              ),
            },
          },
        } : {}),
      },
    });
    
    // Process the audience metrics with AI if available
    if (playbackData.audienceMetrics) {
      try {
        // This could be done asynchronously (fire and forget)
        processAudienceMetrics(deliveryId, playbackData.audienceMetrics);
      } catch (aiError) {
        // Log but don't fail the request
        console.error('Error processing audience metrics with AI:', aiError);
      }
    }
    
    return {
      success: true,
      deliveryId: updatedDelivery.id,
      campaignId: updatedDelivery.campaignId,
      deviceId: updatedDelivery.deviceId,
      status: updatedDelivery.status,
      impressions: updatedDelivery.impressions,
      engagements: updatedDelivery.engagements,
      completions: updatedDelivery.completions,
    };
  } catch (error) {
    console.error('Ad playback recording error:', error);
    throw error;
  }
}

/**
 * Verify ad content meets platform policies
 */
export async function verifyAdContent(adCreativeId: string) {
  try {
    // Get the ad creative
    const adCreative = await prisma.adCreative.findUnique({
      where: { id: adCreativeId },
    });
    
    if (!adCreative) {
      throw new Error(`Ad creative with ID ${adCreativeId} not found`);
    }
    
    // Perform various checks
    const checks = {
      // Check content type
      contentTypeValid: ['IMAGE', 'VIDEO', 'HTML', 'INTERACTIVE'].includes(adCreative.type),
      
      // Check URL is valid and accessible
      urlValid: Boolean(adCreative.url && adCreative.url.startsWith('http')),
      
      // Check dimensions are appropriate
      dimensionsValid: true, // This would involve checking the actual dimensions of the content
      
      // Check for prohibited content (e.g., adult content, hate speech, etc.)
      contentAppropriate: true, // This would involve AI content moderation
      
      // Check for performance (e.g., file size, loading time, etc.)
      performanceAcceptable: true, // This would involve actual performance testing
    };
    
    // Use AI to validate content if available
    try {
      const aiContentCheck = await aiServices.validateAdContent(adCreative.url, adCreative.type);
      
      // Update content appropriateness check
      checks.contentAppropriate = aiContentCheck.appropriate;
      
      // Update the ad creative with the validation results
      await prisma.adCreative.update({
        where: { id: adCreativeId },
        data: {
          status: aiContentCheck.appropriate ? 'APPROVED' : 'REJECTED',
          metadata: {
            ...adCreative.metadata as any,
            contentValidation: {
              checks,
              aiVerification: aiContentCheck,
              verifiedAt: new Date().toISOString(),
            },
          },
        },
      });
      
      return {
        success: true,
        adCreativeId,
        status: aiContentCheck.appropriate ? 'APPROVED' : 'REJECTED',
        checks,
        aiVerification: aiContentCheck,
      };
    } catch (aiError) {
      console.error('AI content validation error:', aiError);
      
      // Fall back to basic validation
      const allChecksPass = Object.values(checks).every(Boolean);
      
      // Update the ad creative with the validation results
      await prisma.adCreative.update({
        where: { id: adCreativeId },
        data: {
          status: allChecksPass ? 'APPROVED' : 'REJECTED',
          metadata: {
            ...adCreative.metadata as any,
            contentValidation: {
              checks,
              verifiedAt: new Date().toISOString(),
              verificationMethod: 'BASIC', // Indicate this was basic verification without AI
            },
          },
        },
      });
      
      return {
        success: true,
        adCreativeId,
        status: allChecksPass ? 'APPROVED' : 'REJECTED',
        checks,
        verificationMethod: 'BASIC',
      };
    }
  } catch (error) {
    console.error('Ad content verification error:', error);
    throw error;
  }
}

/**
 * Get upcoming ad schedule for a device
 */
export async function getDeviceSchedule(deviceId: string, startTime: Date = new Date(), hours: number = 24) {
  try {
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
    
    // Get all deliveries scheduled for this device in the time range
    const deliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId,
        scheduledTime: {
          gte: startTime,
          lt: endTime,
        },
        status: {
          in: ['SCHEDULED', 'DELIVERING'],
        },
      },
      include: {
        campaign: {
          select: {
            name: true,
            advertiser: {
              select: {
                companyName: true,
              },
            },
          },
        },
        adCreative: {
          select: {
            name: true,
            type: true,
            url: true,
            format: true,
            dimensions: true,
          },
        },
      },
      orderBy: {
        scheduledTime: 'asc',
      },
    });
    
    return {
      success: true,
      deviceId,
      scheduleStartTime: startTime,
      scheduleEndTime: endTime,
      deliveries: deliveries.map(delivery => ({
        deliveryId: delivery.id,
        scheduledTime: delivery.scheduledTime,
        status: delivery.status,
        campaignId: delivery.campaignId,
        campaignName: delivery.campaign?.name,
        advertiserName: delivery.campaign?.advertiser?.companyName,
        duration: (delivery.metadata as any)?.duration || 30,
        priority: (delivery.metadata as any)?.priority || 5,
        adCreative: delivery.adCreative ? {
          id: delivery.adCreative.id,
          name: delivery.adCreative.name,
          type: delivery.adCreative.type,
          format: delivery.adCreative.format,
        } : undefined,
      })),
    };
  } catch (error) {
    console.error('Device schedule retrieval error:', error);
    throw error;
  }
}

/**
 * Generate an optimized ad schedule for a device
 */
export async function generateOptimizedSchedule(deviceId: string, startDate: Date, endDate: Date) {
  try {
    // Get the device
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: true,
      },
    });
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    // Get active campaigns suitable for this device
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
        targetLocations: {
          has: device.location,
        },
      },
      include: {
        adCreatives: {
          where: {
            status: 'APPROVED',
          },
        },
      },
    });
    
    if (campaigns.length === 0) {
      return {
        success: false,
        message: 'No active campaigns found for this device',
      };
    }
    
    // Filter campaigns with at least one approved ad creative
    const eligibleCampaigns = campaigns.filter(campaign => campaign.adCreatives.length > 0);
    
    if (eligibleCampaigns.length === 0) {
      return {
        success: false,
        message: 'No campaigns with approved ad creatives found',
      };
    }
    
    // Get existing schedule to avoid conflicts
    const existingDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId,
        scheduledTime: {
          gte: startDate,
          lt: endDate,
        },
        status: {
          in: ['SCHEDULED', 'DELIVERING'],
        },
      },
    });
    
    // Generate schedule slots (every 30 minutes by default)
    const slots = [];
    const slotDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    let currentSlot = new Date(startDate);
    
    while (currentSlot < endDate) {
      // Check if this slot is already occupied
      const isOccupied = existingDeliveries.some(delivery => {
        const deliveryTime = delivery.scheduledTime;
        return deliveryTime >= currentSlot && deliveryTime < new Date(currentSlot.getTime() + slotDuration);
      });
      
      if (!isOccupied) {
        slots.push(new Date(currentSlot));
      }
      
      // Move to next slot
      currentSlot = new Date(currentSlot.getTime() + slotDuration);
    }
    
    // Use AI to optimize campaign selection for each slot
    let scheduledDeliveries = [];
    
    try {
      // Try to use AI for optimization
      const optimizedSchedule = await aiServices.optimizeAdSchedule(
        eligibleCampaigns,
        slots,
        device
      );
      
      // Schedule the optimized deliveries
      scheduledDeliveries = await Promise.all(
        optimizedSchedule.map(async (slot) => {
          try {
            const scheduleResult = await scheduleAd({
              campaignId: slot.campaignId,
              deviceId,
              scheduledTime: slot.scheduledTime,
              duration: slot.duration,
              priority: slot.priority,
            });
            
            return scheduleResult;
          } catch (scheduleError) {
            console.error(`Error scheduling optimized delivery:`, scheduleError);
            return null;
          }
        })
      );
    } catch (aiError) {
      console.error('AI schedule optimization error:', aiError);
      
      // Fall back to basic scheduling logic
      scheduledDeliveries = await Promise.all(
        slots.map(async (slot, index) => {
          try {
            // Simple round-robin campaign selection
            const campaign = eligibleCampaigns[index % eligibleCampaigns.length];
            
            const scheduleResult = await scheduleAd({
              campaignId: campaign.id,
              deviceId,
              scheduledTime: slot,
              duration: 30, // Default duration in seconds
              priority: 5, // Default priority
            });
            
            return scheduleResult;
          } catch (scheduleError) {
            console.error(`Error scheduling delivery for slot ${slot}:`, scheduleError);
            return null;
          }
        })
      );
    }
    
    // Filter out failed schedules
    const successfulDeliveries = scheduledDeliveries.filter(Boolean);
    
    return {
      success: true,
      deviceId,
      scheduleStartDate: startDate,
      scheduleEndDate: endDate,
      scheduledDeliveries: successfulDeliveries,
      totalScheduled: successfulDeliveries.length,
    };
  } catch (error) {
    console.error('Schedule optimization error:', error);
    throw error;
  }
}

/**
 * Get fallback content for a device
 */
async function getFallbackContent(deviceId: string) {
  try {
    // Get device details to determine appropriate fallback
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        partner: true,
      },
    });
    
    if (!device) {
      // Return a generic fallback if device not found
      return {
        type: 'IMAGE',
        url: 'https://storage.lumenadtech.com/fallback/default-fallback.jpg',
        duration: 30,
      };
    }
    
    // Check if partner has a custom fallback
    if (device.partner?.metadata && (device.partner.metadata as any).fallbackContent) {
      return (device.partner.metadata as any).fallbackContent;
    }
    
    // Check if device has a custom fallback
    if (device.metadata && (device.metadata as any).fallbackContent) {
      return (device.metadata as any).fallbackContent;
    }
    
    // Return appropriate fallback based on device type
    switch (device.type) {
      case 'BILLBOARD':
        return {
          type: 'IMAGE',
          url: 'https://storage.lumenadtech.com/fallback/billboard-fallback.jpg',
          duration: 30,
        };
      case 'KIOSK':
        return {
          type: 'HTML',
          url: 'https://storage.lumenadtech.com/fallback/kiosk-fallback.html',
          duration: 60,
        };
      case 'DISPLAY':
        return {
          type: 'VIDEO',
          url: 'https://storage.lumenadtech.com/fallback/display-fallback.mp4',
          duration: 15,
        };
      default:
        return {
          type: 'IMAGE',
          url: 'https://storage.lumenadtech.com/fallback/default-fallback.jpg',
          duration: 30,
        };
    }
  } catch (error) {
    console.error('Error getting fallback content:', error);
    
    // Return a generic fallback in case of error
    return {
      type: 'IMAGE',
      url: 'https://storage.lumenadtech.com/fallback/default-fallback.jpg',
      duration: 30,
    };
  }
}

/**
 * Select the best ad creative for a campaign and device
 */
async function selectBestAdCreative(campaignId: string, device: any) {
  try {
    // Get all approved ad creatives for this campaign
    const adCreatives = await prisma.adCreative.findMany({
      where: {
        campaignId,
        status: 'APPROVED',
      },
    });
    
    if (adCreatives.length === 0) {
      return null;
    }
    
    // If only one creative, return it
    if (adCreatives.length === 1) {
      return adCreatives[0];
    }
    
    // Try to use AI for selection
    try {
      const selectedCreative = await aiServices.selectBestCreative(adCreatives, device);
      return selectedCreative;
    } catch (aiError) {
      console.error('AI creative selection error:', aiError);
      
      // Fall back to basic selection logic
      // For example, choose the one with the highest performance if available
      const creativesWithPerformance = adCreatives.map(creative => {
        const performance = ((creative.metadata as any)?.performance || {});
        const score = (performance.ctr || 0) * 0.4 + (performance.engagementRate || 0) * 0.6;
        return { creative, score };
      });
      
      creativesWithPerformance.sort((a, b) => b.score - a.score);
      
      return creativesWithPerformance[0].creative;
    }
  } catch (error) {
    console.error('Error selecting best ad creative:', error);
    
    // In case of error, return the first creative
    const adCreatives = await prisma.adCreative.findMany({
      where: {
        campaignId,
        status: 'APPROVED',
      },
      take: 1,
    });
    
    return adCreatives[0] || null;
  }
}

/**
 * Select the best delivery from available deliveries
 */
async function selectBestDelivery(deliveries: any[], deviceId: string) {
  try {
    if (deliveries.length === 0) {
      return null;
    }
    
    // If only one delivery, return it
    if (deliveries.length === 1) {
      return deliveries[0];
    }
    
    // Try to use AI for selection
    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });
      
      const selectedDelivery = await aiServices.selectBestDelivery(deliveries, device);
      return selectedDelivery;
    } catch (aiError) {
      console.error('AI delivery selection error:', aiError);
      
      // Fall back to priority-based selection
      // Sort by priority first, then by scheduled time
      deliveries.sort((a, b) => {
        const aPriority = (a.metadata as any)?.priority || 5;
        const bPriority = (b.metadata as any)?.priority || 5;
        
        if (bPriority !== aPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // If same priority, use scheduled time
        return a.scheduledTime.getTime() - b.scheduledTime.getTime();
      });
      
      return deliveries[0];
    }
  } catch (error) {
    console.error('Error selecting best delivery:', error);
    
    // In case of error, return the first delivery
    return deliveries[0] || null;
  }
}

/**
 * Process audience metrics with AI
 */
async function processAudienceMetrics(deliveryId: string, audienceMetrics: any) {
  try {
    // Get the delivery and related data
    const delivery = await prisma.adDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        campaign: true,
        adCreative: true,
      },
    });
    
    if (!delivery) {
      throw new Error(`Delivery with ID ${deliveryId} not found`);
    }
    
    // Process with AI
    const insights = await aiServices.analyzeAudienceResponse(
      audienceMetrics,
      delivery.adCreative,
      delivery.campaign
    );
    
    // Store the insights
    await prisma.adDelivery.update({
      where: { id: deliveryId },
      data: {
        metadata: {
          ...delivery.metadata as any,
          audienceInsights: insights,
        },
      },
    });
    
    // Update the ad creative with performance data
    if (delivery.adCreativeId) {
      await prisma.adCreative.update({
        where: { id: delivery.adCreativeId },
        data: {
          metadata: {
            ...delivery.adCreative?.metadata as any,
            performance: {
              ...((delivery.adCreative?.metadata as any)?.performance || {}),
              // Average in the new metrics with existing ones
              attentionScore: averageMetric(
                ((delivery.adCreative?.metadata as any)?.performance?.attentionScore || 0),
                audienceMetrics.attentionScore || 0,
                ((delivery.adCreative?.metadata as any)?.performance?.deliveryCount || 0)
              ),
              emotionScores: updateEmotions(
                ((delivery.adCreative?.metadata as any)?.performance?.emotionScores || {}),
                audienceMetrics.emotions
              ),
              deliveryCount: (((delivery.adCreative?.metadata as any)?.performance?.deliveryCount || 0) + 1),
              lastUpdated: new Date().toISOString(),
            },
          },
        },
      });
    }
    
    return insights;
  } catch (error) {
    console.error('Error processing audience metrics:', error);
    throw error;
  }
}

/**
 * Update demographics object with new data
 */
function updateDemographics(existing: any = {}, newData: any = {}) {
  if (!newData || Object.keys(newData).length === 0) {
    return existing || {};
  }
  
  const result = { ...existing };
  
  // Update age ranges
  if (newData.ageRanges) {
    result.ageRanges = result.ageRanges || {};
    Object.entries(newData.ageRanges).forEach(([range, count]) => {
      result.ageRanges[range] = (result.ageRanges[range] || 0) + (count as number);
    });
  }
  
  // Update gender distribution
  if (newData.genderDistribution) {
    result.genderDistribution = result.genderDistribution || {};
    Object.entries(newData.genderDistribution).forEach(([gender, count]) => {
      result.genderDistribution[gender] = (result.genderDistribution[gender] || 0) + (count as number);
    });
  }
  
  return result;
}

/**
 * Update emotions object with new data
 */
function updateEmotions(existing: any = {}, newData: any = {}) {
  if (!newData || Object.keys(newData).length === 0) {
    return existing || {};
  }
  
  const result = { ...existing };
  
  Object.entries(newData).forEach(([emotion, value]) => {
    result[emotion] = (result[emotion] || 0) + (value as number);
  });
  
  return result;
}

/**
 * Calculate average of a metric
 */
function averageMetric(existingValue: number, newValue: number, count: number): number {
  if (!count) return newValue;
  return ((existingValue * count) + newValue) / (count + 1);
}

// Add error handling middleware
async function handleDeliveryError(error: Error, deliveryId: string) {
  logger.error('Ad delivery error', { error, deliveryId });
  
  try {
    await prisma.adDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        metadata: {
          ...(await prisma.adDelivery.findUnique({ where: { id: deliveryId } }))?.metadata,
          error: error.message,
          errorTime: new Date(),
        },
      },
    });
    
    metrics.increment('ad_delivery_failures');
  } catch (updateError) {
    logger.error('Failed to update delivery status', { error: updateError, deliveryId });
  }
}

// Add delivery monitoring
async function monitorDelivery(deliveryId: string) {
  const startTime = Date.now();
  
  try {
    const delivery = await prisma.adDelivery.findUnique({
      where: { id: deliveryId },
      include: { campaign: true, adCreative: true },
    });
    
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }
    
    // Track delivery metrics
    metrics.timing('ad_delivery_latency', Date.now() - startTime);
    metrics.increment('ad_deliveries_total');
    
    // Log delivery details
    logger.info('Ad delivery started', {
      deliveryId,
      campaignId: delivery.campaignId,
      adCreativeId: delivery.adCreativeId,
      deviceId: delivery.deviceId,
    });
    
    return delivery;
  } catch (error) {
    await handleDeliveryError(error, deliveryId);
    throw error;
  }
}