/**
 * Audience Measurement System
 * 
 * This module provides functionality for collecting, processing, and analyzing audience data
 * for the Lumen AdTech Platform. It leverages computer vision and AI to estimate audience
 * demographics, emotions, and attention levels.
 */

import { prisma } from './prisma';
import * as aiServices from './ai-services';
import { z } from 'zod';
import * as tf from '@tensorflow/tfjs';
import { EmotionData, CampaignAnalytics, AdDelivery } from '@prisma/client';

// Validation schemas
export const AudienceDataSchema = z.object({
  deviceId: z.string().uuid(),
  adDeliveryId: z.string().uuid().optional(),
});

interface AudienceMetrics {
  count: number;
  demographics: {
    ageRanges: Record<string, number>;
    gender: Record<string, number>;
    attention: number;
    dwellTime: number;
  };
  emotions: {
    joy: number;
    surprise: number;
    neutral: number;
  };
  engagement: {
    average: number;
    peak: number;
    duration: number;
  };
}

interface EmotionAnalysisResult {
  joy: number;
  surprise: number;
  neutral: number;
  dwellTime: number;
  viewerCount: number;
  timestamp: Date;
}

export class AudienceMeasurement {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      // Load the emotion detection model
      const modelPath = process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/emotion-detection/model.json`
        : 'https://storage.googleapis.com/lumen-models/emotion-detection/model.json';
      
      this.model = await tf.loadLayersModel(modelPath);
      this.isModelLoaded = true;
    } catch (error) {
      console.error('Error loading emotion detection model:', error);
    }
  }

  async measureAudience(
    adCreativeId: string,
    adDeliveryId: string,
    imageData: ImageData
  ): Promise<AudienceMetrics> {
    try {
      // Process image data for person detection
      const personCount = await this.detectPeople(imageData);
      
      // Analyze demographics
      const demographics = await this.analyzeDemographics(imageData);
      
      // Analyze emotions
      const emotions = await this.analyzeEmotions(imageData);
      
      // Calculate engagement metrics
      const engagement = await this.calculateEngagement(adCreativeId, adDeliveryId);

      // Store analytics data
      await this.storeAnalytics(adCreativeId, adDeliveryId, {
        impressions: personCount,
        demographics,
        emotions,
        engagement,
      });

      return {
        count: personCount,
        demographics,
        emotions,
        engagement,
      };
    } catch (error) {
      console.error('Error in measureAudience:', error);
      throw error;
    }
  }

  private async detectPeople(imageData: ImageData): Promise<number> {
    // Implement person detection using TensorFlow.js
    // This is a placeholder - actual implementation would use a pre-trained model
    return 1;
  }

  private async analyzeDemographics(imageData: ImageData) {
    // Implement demographic analysis
    // This is a placeholder - actual implementation would use computer vision models
    return {
      ageRanges: {
        '0-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0,
      },
      gender: {
        male: 0,
        female: 0,
        other: 0,
      },
      attention: 0,
      dwellTime: 0,
    };
  }

  private async analyzeEmotions(imageData: ImageData): Promise<{ joy: number; surprise: number; neutral: number }> {
    if (!this.isModelLoaded || !this.model) {
      throw new Error('Emotion detection model not loaded');
    }

    try {
      // Convert image data to tensor
      const tensor = tf.browser.fromPixels(imageData);
      const resized = tf.image.resizeBilinear(tensor, [224, 224]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);

      // Run inference
      const prediction = this.model.predict(batched) as tf.Tensor;
      const probabilities = await prediction.data();

      // Clean up tensors
      tensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      prediction.dispose();

      // Map probabilities to emotion labels
    return {
        joy: probabilities[0],
        surprise: probabilities[1],
        neutral: probabilities[2],
    };
  } catch (error) {
      console.error('Error in emotion analysis:', error);
    throw error;
  }
}

  private async calculateEngagement(
    adCreativeId: string,
    adDeliveryId: string
  ): Promise<{ average: number; peak: number; duration: number }> {
    // Fetch recent emotion data
    const recentEmotions = await prisma.emotionData.findMany({
      where: {
        adCreativeId,
        adDeliveryId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    if (recentEmotions.length === 0) {
      return {
        average: 0,
        peak: 0,
        duration: 0,
      };
    }

    // Calculate engagement metrics
    const engagementScores = recentEmotions.map(emotion => 
      this.calculateEmotionEngagement(emotion)
    );

    const average = engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
    const peak = Math.max(...engagementScores);
    const duration = this.calculateEngagementDuration(engagementScores);

    return {
      average,
      peak,
      duration,
    };
  }

  private calculateEmotionEngagement(emotion: EmotionData): number {
    // Weight different emotions for engagement calculation
    const weights = {
      joy: 1.5,
      surprise: 1.3,
      neutral: 0.5,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    if (emotion.joyScore) {
      weightedSum += emotion.joyScore * weights.joy;
      totalWeight += weights.joy;
    }
    if (emotion.surpriseScore) {
      weightedSum += emotion.surpriseScore * weights.surprise;
      totalWeight += weights.surprise;
    }
    if (emotion.neutralScore) {
      weightedSum += emotion.neutralScore * weights.neutral;
      totalWeight += weights.neutral;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateEngagementDuration(scores: number[]): number {
    // Calculate how long the audience was engaged
    // This is a simplified version - could be enhanced with more sophisticated analysis
    const threshold = 0.5;
    let duration = 0;

    for (const score of scores) {
      if (score >= threshold) {
        duration++;
      } else {
        break;
      }
    }

    return duration;
  }

  private async storeAnalytics(
    adCreativeId: string,
    adDeliveryId: string,
    data: {
      impressions: number;
      demographics: any;
      emotions: {
        joy: number;
        surprise: number;
        neutral: number;
      };
      engagement: {
        average: number;
        peak: number;
        duration: number;
      };
    }
  ) {
    try {
      // Get campaign ID from ad creative
      const adCreative = await prisma.adCreative.findUnique({
        where: { id: adCreativeId },
        select: { campaignId: true },
      });

      if (!adCreative) {
        throw new Error('Ad creative not found');
      }

      // Store campaign analytics
      await prisma.campaignAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: adCreative.campaignId,
            date: new Date(new Date().setHours(0, 0, 0, 0)), // Set to beginning of day for daily analytics
          }
        },
        update: {
          impressions: { increment: data.impressions },
          engagements: { increment: Math.round(data.engagement.average * data.impressions) },
          ctr: data.engagement.average,
          averageDwellTime: data.engagement.duration,
          audienceMetrics: data.demographics,
          emotionMetrics: data.emotions,
        },
        create: {
          campaignId: adCreative.campaignId,
          date: new Date(new Date().setHours(0, 0, 0, 0)), // Set to beginning of day for daily analytics
          impressions: data.impressions,
          engagements: Math.round(data.engagement.average * data.impressions),
          conversions: 0, // This would be updated by conversion tracking
          ctr: data.engagement.average,
          conversionRate: 0,
          averageDwellTime: data.engagement.duration,
          audienceMetrics: data.demographics,
          emotionMetrics: data.emotions,
          costData: {
            cpm: 0,
            cpe: 0,
            cpa: 0,
        },
      },
    });
    
      // Store emotion data
      await prisma.emotionData.create({
      data: {
          adCreativeId,
          adDeliveryId,
          timestamp: new Date(),
          joyScore: data.emotions.joy,
          surpriseScore: data.emotions.surprise,
          neutralScore: data.emotions.neutral,
          dwellTime: data.engagement.duration,
          viewerCount: data.impressions,
          isAggregated: true,
        },
      });
    } catch (error) {
      console.error('Error storing analytics:', error);
      throw error;
    }
  }

  async getEmotionTrends(
    adCreativeId: string,
    adDeliveryId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmotionAnalysisResult[]> {
    try {
      const emotionData = await prisma.emotionData.findMany({
        where: {
          adCreativeId,
          adDeliveryId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: 'asc',
      },
    });
    
      return emotionData.map(data => ({
        joy: data.joyScore || 0,
        surprise: data.surpriseScore || 0,
        neutral: data.neutralScore || 0,
        dwellTime: data.dwellTime || 0,
        viewerCount: data.viewerCount || 0,
        timestamp: data.timestamp,
      }));
  } catch (error) {
      console.error('Error getting emotion trends:', error);
    throw error;
  }
}

  async getAudienceInsights(
    adCreativeId: string,
    adDeliveryId: string,
    timeRange: 'day' | 'week' | 'month'
  ): Promise<{
    demographics: Record<string, number>;
    emotions: {
      joy: number;
      surprise: number;
      neutral: number;
    };
    engagement: {
      average: number;
      peak: number;
      duration: number;
    };
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const emotionData = await prisma.emotionData.findMany({
        where: {
          adCreativeId,
          adDeliveryId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (emotionData.length === 0) {
        return {
          demographics: {},
          emotions: {
            joy: 0,
            surprise: 0,
            neutral: 0,
          },
          engagement: {
            average: 0,
            peak: 0,
            duration: 0,
          },
        };
      }

      // Aggregate data
      const aggregatedData = this.aggregateEmotionData(emotionData);

      return aggregatedData;
  } catch (error) {
      console.error('Error getting audience insights:', error);
      throw error;
    }
  }

  private aggregateEmotionData(emotionData: EmotionData[]) {
    let totalJoy = 0;
    let totalSurprise = 0;
    let totalNeutral = 0;
    let totalDwellTime = 0;
    let totalViewers = 0;
    let peakEngagement = 0;

    emotionData.forEach(data => {
      if (data.joyScore) totalJoy += data.joyScore;
      if (data.surpriseScore) totalSurprise += data.surpriseScore;
      if (data.neutralScore) totalNeutral += data.neutralScore;
      if (data.dwellTime) totalDwellTime += data.dwellTime;
      if (data.viewerCount) totalViewers += data.viewerCount;

      const engagement = this.calculateEmotionEngagement(data);
      peakEngagement = Math.max(peakEngagement, engagement);
    });

    const count = emotionData.length || 1; // Avoid division by zero
      return {
      demographics: {
        totalViewers,
        averageViewers: totalViewers / count,
      },
      emotions: {
        joy: totalJoy / count,
        surprise: totalSurprise / count,
        neutral: totalNeutral / count,
      },
      engagement: {
        average: (totalJoy + totalSurprise + totalNeutral) / (count * 3),
        peak: peakEngagement,
        duration: totalDwellTime / count,
      },
    };
  }
}

// Export singleton instance
export const audienceMeasurement = new AudienceMeasurement();

// Additional utility functions for audience data processing
export async function processAudienceData(data: z.infer<typeof AudienceDataSchema>) {
  try {
    const { deviceId, adDeliveryId } = data;
    
    if (!adDeliveryId) {
      throw new Error('Ad delivery ID is required');
    }
    
    // Fetch the ad delivery
    const adDelivery = await prisma.adDelivery.findUnique({
      where: { id: adDeliveryId },
      include: {
        adCreative: true,
        device: true,
      },
    });
    
    if (!adDelivery) {
      throw new Error('Ad delivery not found');
    }
    
    // Update ad delivery with audience data
    await updateDeliveryWithAudienceData(adDeliveryId, {
      estimatedCount: 1, // Placeholder for actual detection
      demographics: {
        ageRanges: {
          '18-24': 0.3,
          '25-34': 0.5,
          '35-44': 0.2,
        },
        gender: {
          male: 0.6,
          female: 0.4,
        }
      },
      emotions: {
        joy: 0.6,
        surprise: 0.3,
        neutral: 0.1,
      }
    });
    
    // Update device with latest audience data
    await updateDeviceWithLatestAudience(deviceId, {
      viewerCount: 1,
      attentionLevel: 0.8,
    });
    
    return {
      success: true,
      message: 'Audience data processed successfully',
    };
  } catch (error) {
    console.error('Error processing audience data:', error);
    throw error;
  }
}

// Helper function to update ad delivery with audience data
async function updateDeliveryWithAudienceData(
  deliveryId: string,
  audienceData: {
    estimatedCount: number;
    demographics?: any;
    emotions?: {
      joy: number;
      surprise: number;
      neutral: number;
    };
  }
) {
  try {
    // Fetch current delivery
    const delivery = await prisma.adDelivery.findUnique({
      where: { id: deliveryId },
    });
    
    if (!delivery) {
      throw new Error('Delivery not found');
    }
    
    // Update with audience data
    await prisma.adDelivery.update({
      where: { id: deliveryId },
      data: {
        viewerCount: audienceData.estimatedCount,
        impressions: { increment: audienceData.estimatedCount },
      },
    });
    
    // Create emotion data entry
    if (audienceData.emotions) {
      await prisma.emotionData.create({
        data: {
          adCreativeId: delivery.adCreativeId,
          adDeliveryId: deliveryId,
          timestamp: new Date(),
          joyScore: audienceData.emotions.joy,
          surpriseScore: audienceData.emotions.surprise,
          neutralScore: audienceData.emotions.neutral,
          viewerCount: audienceData.estimatedCount,
          isAggregated: true,
        },
      });
    }
    
    return {
      success: true,
      deliveryId,
    };
  } catch (error) {
    console.error('Error updating delivery with audience data:', error);
    throw error;
  }
}

// Helper function to update device with latest audience data
async function updateDeviceWithLatestAudience(deviceId: string, audienceData: { viewerCount: number; attentionLevel: number }) {
  try {
    // Update device analytics for the current day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Upsert device analytics
    await prisma.deviceAnalytics.upsert({
      where: {
        deviceId_date: {
        deviceId,
          date: today,
        },
      },
      update: {
        impressionsServed: { increment: 1 },
        engagementsCount: { increment: audienceData.attentionLevel > 0.5 ? 1 : 0 },
        averageViewerCount: audienceData.viewerCount,
      },
      create: {
        deviceId,
        date: today,
        uptime: 0, // Will be updated by device health check
        impressionsServed: 1,
        engagementsCount: audienceData.attentionLevel > 0.5 ? 1 : 0,
        averageViewerCount: audienceData.viewerCount,
        performanceMetrics: {}, // Will be populated by device health check
      },
    });
    
      return {
      success: true,
        deviceId,
    };
  } catch (error) {
    console.error('Error updating device with audience data:', error);
    throw error;
  }
}

// Function to get audience insights for a campaign
export async function getCampaignAudienceInsights(campaignId: string, startDate?: Date, endDate?: Date) {
  try {
    // Set default date range if not provided
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    
    // Get campaign analytics
    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
    
    // Get emotion data for campaign's ad creatives
    const adCreatives = await prisma.adCreative.findMany({
      where: {
        campaignId,
      },
      select: {
        id: true,
      },
    });
    
    const adCreativeIds = adCreatives.map(creative => creative.id);
    
    const emotionData = await prisma.emotionData.findMany({
      where: {
        adCreativeId: {
          in: adCreativeIds,
        },
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });
    
    // Aggregate analytics data
    const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalEngagements = analytics.reduce((sum, a) => sum + a.engagements, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);
    
    // Aggregate demographics data
    const demographics: Record<string, any> = {};
    analytics.forEach(a => {
      if (a.audienceMetrics) {
        const metrics = a.audienceMetrics as any;
        Object.keys(metrics).forEach(key => {
          if (typeof metrics[key] === 'object') {
            demographics[key] = demographics[key] || {};
            Object.keys(metrics[key]).forEach(subKey => {
              demographics[key][subKey] = (demographics[key][subKey] || 0) + 
                ((metrics[key][subKey] * a.impressions) / totalImpressions);
            });
          } else {
            demographics[key] = (demographics[key] || 0) + 
              ((metrics[key] * a.impressions) / totalImpressions);
          }
        });
      }
    });
    
    // Aggregate emotion data
    let totalJoy = 0;
    let totalSurprise = 0;
    let totalNeutral = 0;
    let totalDwellTime = 0;
    let recordCount = 0;
    
    emotionData.forEach(data => {
      if (data.joyScore) totalJoy += data.joyScore;
      if (data.surpriseScore) totalSurprise += data.surpriseScore;
      if (data.neutralScore) totalNeutral += data.neutralScore;
      if (data.dwellTime) totalDwellTime += data.dwellTime;
      recordCount++;
    });
    
    const count = recordCount || 1; // Avoid division by zero
    
    return {
      campaignId,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      overview: {
        totalImpressions,
        totalEngagements,
        totalConversions,
        engagementRate: totalImpressions > 0 ? totalEngagements / totalImpressions : 0,
        conversionRate: totalImpressions > 0 ? totalConversions / totalImpressions : 0,
      },
      demographics,
      emotions: {
        joy: totalJoy / count,
        surprise: totalSurprise / count,
        neutral: totalNeutral / count,
      },
      engagement: {
        averageDwellTime: totalDwellTime / count,
        dailyTrend: analytics.map(a => ({
          date: a.date.toISOString().split('T')[0],
          impressions: a.impressions,
          engagements: a.engagements,
          engagementRate: a.impressions > 0 ? a.engagements / a.impressions : 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting campaign audience insights:', error);
    throw error;
  }
}

// Function to get audience insights for a device
export async function getDeviceAudienceInsights(deviceId: string, startDate?: Date, endDate?: Date) {
  try {
    // Set default date range if not provided
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    
    // Get device analytics
    const analytics = await prisma.deviceAnalytics.findMany({
      where: {
        deviceId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
    
    // Get ad deliveries for this device
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        deviceId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        adCreative: true,
        campaign: true,
      },
    });
    
    // Calculate performance metrics
    const totalImpressions = adDeliveries.reduce((sum, d) => sum + d.impressions, 0);
    const totalEngagements = adDeliveries.reduce((sum, d) => sum + d.engagements, 0);
    const totalCompletions = adDeliveries.reduce((sum, d) => sum + d.completions, 0);
    
    // Aggregate deliveries by campaign
    const campaignPerformance: Record<string, {
      campaignId: string;
      campaignName: string;
      impressions: number;
      engagements: number;
      completions: number;
    }> = {};
    
    adDeliveries.forEach(delivery => {
      const campaignId = delivery.campaign.id;
      if (!campaignPerformance[campaignId]) {
        campaignPerformance[campaignId] = {
          campaignId,
          campaignName: delivery.campaign.name,
          impressions: 0,
          engagements: 0,
          completions: 0,
        };
      }
      
      campaignPerformance[campaignId].impressions += delivery.impressions;
      campaignPerformance[campaignId].engagements += delivery.engagements;
      campaignPerformance[campaignId].completions += delivery.completions;
    });
    
    // Calculate daily trend
    const dailyTrend: Record<string, {
      date: string;
      impressions: number;
      engagements: number;
      uptime: number;
    }> = {};
    
    analytics.forEach(a => {
      const dateString = a.date.toISOString().split('T')[0];
      dailyTrend[dateString] = {
        date: dateString,
        impressions: a.impressionsServed,
        engagements: a.engagementsCount,
        uptime: a.uptime,
      };
    });
    
    return {
      deviceId,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      overview: {
        totalImpressions,
        totalEngagements,
        engagementRate: totalImpressions > 0 ? totalEngagements / totalImpressions : 0,
        completionRate: totalImpressions > 0 ? totalCompletions / totalImpressions : 0,
        averageUptime: analytics.reduce((sum, a) => sum + a.uptime, 0) / (analytics.length || 1),
      },
      campaignPerformance: Object.values(campaignPerformance),
      dailyTrend: Object.values(dailyTrend),
    };
  } catch (error) {
    console.error('Error getting device audience insights:', error);
    throw error;
  }
}

// Function to get real-time audience data for a device
export async function getRealTimeAudienceData(deviceId: string) {
  try {
    // Get device information
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        adDeliveries: {
          where: {
            scheduledTime: {
              gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            scheduledTime: 'desc',
          },
          take: 10,
          include: {
            adCreative: true,
            campaign: true,
          },
        },
      },
    });
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Get the most recent ad delivery
    const latestDelivery = device.adDeliveries[0];
    
    // Get the most recent emotion data for this device
    const recentEmotionData = latestDelivery ? await prisma.emotionData.findMany({
      where: {
        adDeliveryId: latestDelivery.id,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10,
    }) : [];
    
    // Calculate current emotional state
    let currentJoy = 0;
    let currentSurprise = 0;
    let currentNeutral = 0;
    let currentViewerCount = 0;
    
    if (recentEmotionData.length > 0) {
      currentJoy = recentEmotionData[0].joyScore || 0;
      currentSurprise = recentEmotionData[0].surpriseScore || 0;
      currentNeutral = recentEmotionData[0].neutralScore || 0;
      currentViewerCount = recentEmotionData[0].viewerCount || 0;
    }
    
    return {
      deviceId,
      deviceName: device.name,
      deviceType: device.deviceType,
      location: device.location,
      currentPlayback: latestDelivery ? {
        deliveryId: latestDelivery.id,
        campaignName: latestDelivery.campaign.name,
        creativeName: latestDelivery.adCreative.name,
        creativeType: latestDelivery.adCreative.type,
        startTime: latestDelivery.actualDeliveryTime || latestDelivery.scheduledTime,
      } : null,
      audienceMetrics: {
        currentViewerCount,
        emotions: {
          joy: currentJoy,
          surprise: currentSurprise,
          neutral: currentNeutral,
        },
        engagementScore: currentJoy * 0.6 + currentSurprise * 0.3 + currentNeutral * 0.1,
      },
      recentHistory: device.adDeliveries.map(delivery => ({
        deliveryId: delivery.id,
        campaignName: delivery.campaign.name,
        creativeName: delivery.adCreative.name,
        scheduledTime: delivery.scheduledTime,
        actualDeliveryTime: delivery.actualDeliveryTime,
        impressions: delivery.impressions,
        engagements: delivery.engagements,
        viewerCount: delivery.viewerCount,
      })),
    };
  } catch (error) {
    console.error('Error getting real-time audience data:', error);
    throw error;
  }
}

// Helper function to merge object values
function mergeObjectValues(obj1: Record<string, any> = {}, obj2: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = { ...obj1 };
  
  for (const key in obj2) {
    if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
      result[key] = mergeObjectValues(result[key] || {}, obj2[key]);
    } else if (typeof obj2[key] === 'number' && typeof result[key] === 'number') {
      result[key] += obj2[key];
    } else {
      result[key] = obj2[key];
    }
  }
  
  return result;
}

// Helper function to convert count maps to percentage maps
function convertToPercentages(counts: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (total > 0) {
    for (const key in counts) {
      result[key] = counts[key] / total;
    }
  }
  
  return result;
} 