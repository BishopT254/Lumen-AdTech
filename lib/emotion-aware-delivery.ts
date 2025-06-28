import { PrismaClient, EmotionData, DeviceType, AdCreative, AdDelivery, Campaign, Device } from '@prisma/client';
import { createLogger } from 'winston';
import { StatsD } from 'hot-shots';
import { Redis } from 'ioredis';
import { logger } from './logger';
import { metrics } from './metrics';
import { cache } from './cache';
import { usePublicSettings } from '../hooks/usePublicSettings';
import * as tf from '@tensorflow/tfjs';
import { Buffer } from 'buffer';

const prisma = new PrismaClient();
const logger = createLogger();
const metrics = new StatsD();
const cache = new Redis();

/**
 * Emotion-Aware Ad Delivery System
 * 
 * This system optimizes ad delivery based on detected viewer emotions,
 * enabling campaigns to target specific emotional states for maximum engagement.
 */

export interface EmotionAdaptiveConfig {
  enableEmotionDetection: boolean;
  targetEmotions?: {
    joy?: boolean;
    surprise?: boolean;
    neutral?: boolean;
  };
  adaptiveScheduling?: boolean;
  minEmotionScore?: number;
  fallbackAdCreativeId?: string;
}

// Add proper type definitions for emotion data
interface EmotionMetrics {
  joy: number;
  surprise: number;
  neutral: number;
  confidence: number;
}

interface EmotionTargeting {
  joyThreshold: number;
  surpriseThreshold: number;
  neutralThreshold: number;
  minConfidence: number;
}

interface EmotionDetectionResult {
  deviceId: string;
  emotions: EmotionMetrics;
  confidence: number;
  deviceType: DeviceType;
  createdAt: Date;
}

interface ImageData {
  data: Buffer;
  width: number;
  height: number;
}

export interface AdSelectionCriteria {
  campaignId: string;
  deviceId?: string;
  targetEmotions?: string[];
  audienceContext?: {
    demographicProfile?: Record<string, number>;
    attentionLevel?: number;
    previousInteractions?: Record<string, number>;
  };
}

export interface ViewerEmotionProfile {
  deviceId: string;
  dominantEmotion: keyof EmotionData;
  emotionScores: EmotionData;
  lastUpdated: Date;
}

export interface EmotionDeliveryConfig {
  enableEmotionTargeting: boolean;
  targetEmotions?: EmotionTargeting;
  minimumConfidenceThreshold?: number;
}

export interface AdDeliveryContext {
  deviceId: string;
  deviceType: DeviceType;
  location?: {
    latitude: number;
    longitude: number;
    accuracyInMeters: number;
  };
  viewerId?: string;
  timestamp: Date;
}

export interface EmotionAwareDeliveryResult {
  selectedAdCreativeId: string;
  selectedForEmotion?: keyof EmotionData;
  confidence: number;
  adDeliveryId: string;
}

export interface EmotionTestResult {
  topEmotionalVariant: {
    id: string;
    name: string;
    primaryEmotion: string;
    score: number;
  };
  correlations: {
    strongestEmotion: string;
    engagementIncrease: number;
  };
  insights: {
    timeOfDay: string;
    demographicGroup: string;
  };
  variants: Array<{
    id: string;
    name: string;
    emotions: EmotionData;
    engagementRate: number;
  }>;
  recommendedTargetEmotions: string[];
}

// Add proper integration with public settings
const { generalSettings, systemSettings } = usePublicSettings();

// Add proper error handling and retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}`, { error });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }
  
  throw lastError;
}

// Add model loading and preprocessing functions
async function loadModelWithRetry(modelName: string): Promise<tf.LayersModel> {
  return await retryOperation(async () => {
    const model = await tf.loadLayersModel(`/models/${modelName}/model.json`);
    return model;
  });
}

async function preprocessImage(imageData: ImageData): Promise<tf.Tensor3D> {
  try {
    const tensor = tf.browser.fromPixels({
      data: new Uint8Array(imageData.data),
      width: imageData.width,
      height: imageData.height
    });
    
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0) as tf.Tensor3D;
    
    tensor.dispose();
    resized.dispose();
    normalized.dispose();
    
    return batched;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
}

async function processPredictions(predictions: tf.Tensor): Promise<EmotionMetrics> {
  const data = await predictions.data();
  return {
    joy: data[0],
    surprise: data[1],
    neutral: data[2],
    confidence: Math.max(data[0], data[1], data[2])
  };
}

function calculateConfidence(predictions: tf.Tensor): number {
  const data = predictions.dataSync();
  return Math.max(...data);
}

// Add caching for emotion detection results
const EMOTION_CACHE_TTL = 300; // 5 minutes

async function getCachedEmotionResult(deviceId: string) {
  const cacheKey = `emotion:${deviceId}`;
  const cachedResult = await cache.get(cacheKey);
  
  if (cachedResult) {
    metrics.increment('emotion_cache_hits');
    return cachedResult;
  }
  
  metrics.increment('emotion_cache_misses');
  return null;
}

async function cacheEmotionResult(deviceId: string, result: EmotionDetectionResult) {
  const cacheKey = `emotion:${deviceId}`;
  await cache.set(cacheKey, result, EMOTION_CACHE_TTL);
}

class EmotionAwareDeliveryService {
  /**
   * Detect emotions from image data
   */
  async detectEmotions(deviceId: string, imageData: ImageData): Promise<EmotionDetectionResult> {
    const startTime = Date.now();
    
    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        select: { deviceType: true }
      });

      const model = await loadModelWithRetry('emotion');
      const preprocessedImage = await preprocessImage(imageData);
      const predictions = await model.predict(preprocessedImage) as tf.Tensor;
      const processedEmotions = await processPredictions(predictions);
      
      const result: EmotionDetectionResult = {
        deviceId,
        emotions: processedEmotions,
        confidence: processedEmotions.confidence,
        deviceType: device?.deviceType || DeviceType.OTHER,
        createdAt: new Date()
      };
      
      console.info('Emotion detection completed in', Date.now() - startTime, 'ms');
      
      return result;
    } catch (error) {
      console.error('Error detecting emotions:', error);
      throw error;
    }
  }
  
  /**
   * Simulate emotion detection with realistic values
   * This would be replaced with actual ML-based detection in production
   */
  private simulateEmotionDetection(): Omit<EmotionDetectionResult, 'timestamp'> {
    // Generate random emotion scores that sum to 1.0
    const joyScore = Math.random() * 0.5; // Joy between 0-0.5
    const surpriseScore = Math.random() * 0.3; // Surprise between 0-0.3
    
    // Ensure the scores sum to 1.0
    const neutralScore = 1.0 - (joyScore + surpriseScore);
    
    // Determine primary emotion
    let primaryEmotion: 'joy' | 'surprise' | 'neutral' | 'unknown' = 'unknown';
    let maxScore = 0;
    
    if (joyScore > maxScore) {
      primaryEmotion = 'joy';
      maxScore = joyScore;
    }
    
    if (surpriseScore > maxScore) {
      primaryEmotion = 'surprise';
      maxScore = surpriseScore;
    }
    
    if (neutralScore > maxScore) {
      primaryEmotion = 'neutral';
      maxScore = neutralScore;
    }
    
    return {
      deviceId: '',
      timestamp: new Date(),
      emotions: {
        joy: joyScore,
        surprise: surpriseScore,
        neutral: neutralScore,
        confidence: maxScore
      },
      confidence: maxScore,
      deviceType: DeviceType.UNKNOWN,
    };
  }
  
  /**
   * Selects the most appropriate ad creative based on emotion targeting
   */
  async selectAdCreative(
    campaignId: string,
    context: AdDeliveryContext,
    config: EmotionDeliveryConfig
  ): Promise<EmotionAwareDeliveryResult> {
    try {
      // Get all active ad creatives for the campaign
      const adCreatives = await prisma.adCreative.findMany({
        where: {
          campaignId,
          status: 'ACTIVE',
        },
      });

      if (adCreatives.length === 0) {
        throw new Error('No active ad creatives found for campaign');
      }

      let selectedCreativeId: string;
      let selectedForEmotion: keyof EmotionData | undefined;
      let confidence = 0;

      // If emotion targeting is enabled, try to match based on emotions
      if (config.enableEmotionTargeting && config.targetEmotions) {
        // Get viewer's emotion profile
        const emotionProfile = await this.getViewerEmotionProfile(context.deviceId);
        
        if (emotionProfile) {
          const { dominantEmotion, emotionScores } = emotionProfile;
          
          // Check if dominant emotion matches targeting criteria
          if (config.targetEmotions[dominantEmotion]) {
            // Randomly select an ad creative for now 
            // In a real system, you would have an emotion-ad mapping or scoring system
            selectedCreativeId = adCreatives[Math.floor(Math.random() * adCreatives.length)].id;
            selectedForEmotion = dominantEmotion;
            confidence = emotionScores[dominantEmotion];
          }
        }
      }

      // If no ad was selected based on emotions, fall back to standard delivery
      if (!selectedCreativeId) {
        // For demo purposes, just pick a random creative
        selectedCreativeId = adCreatives[Math.floor(Math.random() * adCreatives.length)].id;
        confidence = 1.0; // Default confidence
      }

      // Create ad delivery record
      const adDelivery = await prisma.adDelivery.create({
        data: {
          adCreative: {
            connect: {
              id: selectedCreativeId,
            },
          },
          device: {
            connectOrCreate: {
              where: {
                deviceId: context.deviceId,
              },
              create: {
                deviceId: context.deviceId,
                deviceType: context.deviceType,
              },
            },
          },
          viewer: context.viewerId ? {
            connect: {
              id: context.viewerId,
            },
          } : undefined,
          scheduledTime: context.timestamp,
          metadata: {
            emotionTargeted: selectedForEmotion,
            confidence,
            location: context.location,
          },
        },
      });

      return {
        selectedAdCreativeId,
        selectedForEmotion,
        confidence,
        adDeliveryId: adDelivery.id,
      };
    } catch (error) {
      console.error('Error in emotion-aware ad selection:', error);
      throw error;
    }
  }

  /**
   * Gets a viewer's emotional profile based on recent encounters
   */
  async getViewerEmotionProfile(deviceId: string): Promise<ViewerEmotionProfile | null> {
    try {
      // Get recent emotion data for this device (last 24 hours)
      const recentEmotionData = await prisma.emotionData.findMany({
        where: {
          adDelivery: {
            device: {
              deviceId,
            },
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Limit to most recent 10 records
      });

      if (recentEmotionData.length === 0) {
        return null;
      }

      // Calculate average emotion scores
      const emotionScores: EmotionData = {
        joy: 0,
        surprise: 0,
        neutral: 0,
      };

      recentEmotionData.forEach(data => {
        emotionScores.joy += data.joy || 0;
        emotionScores.surprise += data.surprise || 0;
        emotionScores.neutral += data.neutral || 0;
      });

      // Calculate averages
      const count = recentEmotionData.length;
      emotionScores.joy /= count;
      emotionScores.surprise /= count;
      emotionScores.neutral /= count;

      // Determine dominant emotion
      let dominantEmotion: keyof EmotionData = 'neutral';
      let highestScore = emotionScores.neutral;

      if (emotionScores.joy > highestScore) {
        dominantEmotion = 'joy';
        highestScore = emotionScores.joy;
      }

      if (emotionScores.surprise > highestScore) {
        dominantEmotion = 'surprise';
        highestScore = emotionScores.surprise;
      }

      return {
        deviceId,
        dominantEmotion,
        emotionScores,
        lastUpdated: recentEmotionData[0].createdAt,
      };
    } catch (error) {
      console.error('Error getting viewer emotion profile:', error);
      return null;
    }
  }

  /**
   * Records a viewer's emotional response to an ad
   */
  async recordEmotionData(
    adDeliveryId: string,
    emotionData: EmotionMetrics
  ): Promise<void> {
    try {
      await prisma.emotionData.create({
        data: {
          adDeliveryId,
          joyScore: emotionData.joy,
          surpriseScore: emotionData.surprise,
          neutralScore: emotionData.neutral,
          timestamp: new Date(),
          isAggregated: false
        }
      });
      
      logger.info('Emotion data recorded', { adDeliveryId });
      metrics.increment('emotion_data_recorded');
    } catch (error) {
      logger.error('Error recording emotion data', { error, adDeliveryId });
      metrics.increment('emotion_data_errors');
      throw error;
    }
  }

  /**
   * Gets aggregated emotion data for a campaign
   */
  async getCampaignEmotionInsights(campaignId: string): Promise<{
    overallEmotions: EmotionData;
    emotionsByCreative: Record<string, EmotionData>;
    emotionTrends: {
      timeOfDay: Record<string, EmotionData>;
      dayOfWeek: Record<string, EmotionData>;
    };
  }> {
    try {
      // Get all emotion data for this campaign in the last 30 days
      const emotionData = await prisma.emotionData.findMany({
        where: {
          adDelivery: {
            adCreative: {
              campaign: {
                id: campaignId,
              },
            },
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        include: {
          adDelivery: {
            include: {
              adCreative: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (emotionData.length === 0) {
        return {
          overallEmotions: { joy: 0, surprise: 0, neutral: 0 },
          emotionsByCreative: {},
          emotionTrends: {
            timeOfDay: {},
            dayOfWeek: {},
          },
        };
      }

      // Calculate overall emotions
      const overallEmotions: EmotionData = {
        joy: 0,
        surprise: 0,
        neutral: 0,
      };

      // Group by creative
      const creativeGroups: Record<string, EmotionData> = {};
      
      // Group by time of day (morning, afternoon, evening, night)
      const timeOfDayGroups: Record<string, EmotionData> = {
        morning: { joy: 0, surprise: 0, neutral: 0 },
        afternoon: { joy: 0, surprise: 0, neutral: 0 },
        evening: { joy: 0, surprise: 0, neutral: 0 },
        night: { joy: 0, surprise: 0, neutral: 0 },
      };
      
      // Group by day of week
      const dayOfWeekGroups: Record<string, EmotionData> = {
        monday: { joy: 0, surprise: 0, neutral: 0 },
        tuesday: { joy: 0, surprise: 0, neutral: 0 },
        wednesday: { joy: 0, surprise: 0, neutral: 0 },
        thursday: { joy: 0, surprise: 0, neutral: 0 },
        friday: { joy: 0, surprise: 0, neutral: 0 },
        saturday: { joy: 0, surprise: 0, neutral: 0 },
        sunday: { joy: 0, surprise: 0, neutral: 0 },
      };
      
      // Counts for averaging
      const creativeCounts: Record<string, number> = {};
      const timeOfDayCounts: Record<string, number> = {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      };
      const dayOfWeekCounts: Record<string, number> = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      };

      emotionData.forEach(data => {
        // Add to overall
        overallEmotions.joy += data.joy || 0;
        overallEmotions.surprise += data.surprise || 0;
        overallEmotions.neutral += data.neutral || 0;

        // Group by creative
        const creativeId = data.adDelivery.adCreative.id;
        if (!creativeGroups[creativeId]) {
          creativeGroups[creativeId] = { joy: 0, surprise: 0, neutral: 0 };
          creativeCounts[creativeId] = 0;
        }
        creativeGroups[creativeId].joy += data.joy || 0;
        creativeGroups[creativeId].surprise += data.surprise || 0;
        creativeGroups[creativeId].neutral += data.neutral || 0;
        creativeCounts[creativeId]++;

        // Group by time of day
        const hour = new Date(data.createdAt).getHours();
        let timeOfDay: string;
        if (hour >= 5 && hour < 12) {
          timeOfDay = 'morning';
        } else if (hour >= 12 && hour < 17) {
          timeOfDay = 'afternoon';
        } else if (hour >= 17 && hour < 21) {
          timeOfDay = 'evening';
        } else {
          timeOfDay = 'night';
        }
        
        timeOfDayGroups[timeOfDay].joy += data.joy || 0;
        timeOfDayGroups[timeOfDay].surprise += data.surprise || 0;
        timeOfDayGroups[timeOfDay].neutral += data.neutral || 0;
        timeOfDayCounts[timeOfDay]++;

        // Group by day of week
        const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(data.createdAt).getDay()];
        dayOfWeekGroups[day].joy += data.joy || 0;
        dayOfWeekGroups[day].surprise += data.surprise || 0;
        dayOfWeekGroups[day].neutral += data.neutral || 0;
        dayOfWeekCounts[day]++;
      });

      // Calculate averages
      const count = emotionData.length;
      overallEmotions.joy /= count;
      overallEmotions.surprise /= count;
      overallEmotions.neutral /= count;

      // Calculate averages for each creative
      for (const creativeId in creativeGroups) {
        const creativeCount = creativeCounts[creativeId];
        creativeGroups[creativeId].joy /= creativeCount;
        creativeGroups[creativeId].surprise /= creativeCount;
        creativeGroups[creativeId].neutral /= creativeCount;
      }

      // Calculate averages for time of day
      for (const timeOfDay in timeOfDayGroups) {
        const timeCount = timeOfDayCounts[timeOfDay];
        if (timeCount > 0) {
          timeOfDayGroups[timeOfDay].joy /= timeCount;
          timeOfDayGroups[timeOfDay].surprise /= timeCount;
          timeOfDayGroups[timeOfDay].neutral /= timeCount;
        }
      }

      // Calculate averages for day of week
      for (const day in dayOfWeekGroups) {
        const dayCount = dayOfWeekCounts[day];
        if (dayCount > 0) {
          dayOfWeekGroups[day].joy /= dayCount;
          dayOfWeekGroups[day].surprise /= dayCount;
          dayOfWeekGroups[day].neutral /= dayCount;
        }
      }

      return {
        overallEmotions,
        emotionsByCreative: creativeGroups,
        emotionTrends: {
          timeOfDay: timeOfDayGroups,
          dayOfWeek: dayOfWeekGroups,
        },
      };
    } catch (error) {
      console.error('Error getting campaign emotion insights:', error);
      throw error;
    }
  }

  /**
   * Generate insights for A/B testing with emotion data
   */
  async getTestEmotionResults(testId: string): Promise<EmotionTestResult> {
    try {
      // Get the AB test and its variants
      const abTest = await prisma.aBTest.findUnique({
        where: {
          id: testId,
        },
        include: {
          variants: {
            include: {
              adCreative: true,
            },
          },
        },
      });

      if (!abTest) {
        throw new Error('AB test not found');
      }

      // For each variant, get the emotion data
      const variantResults = await Promise.all(
        abTest.variants.map(async (variant) => {
          // Get emotion data for this variant
          const emotionData = await prisma.emotionData.findMany({
            where: {
              adDelivery: {
                adCreativeId: variant.adCreativeId,
              },
              createdAt: {
                gte: new Date(abTest.startDate),
                ...(abTest.endDate && { lte: new Date(abTest.endDate) }),
              },
            },
          });

          // Calculate average emotion scores
          const emotions: EmotionData = {
            joy: 0,
            surprise: 0,
            neutral: 0,
          };

          if (emotionData.length > 0) {
            emotionData.forEach((data) => {
              emotions.joy += data.joy || 0;
              emotions.surprise += data.surprise || 0;
              emotions.neutral += data.neutral || 0;
            });

            emotions.joy /= emotionData.length;
            emotions.surprise /= emotionData.length;
            emotions.neutral /= emotionData.length;
          }

          // Calculate engagement rate
          const engagementRate = variant.impressions > 0 
            ? (variant.engagements / variant.impressions) * 100
            : 0;

          return {
            id: variant.id,
            name: variant.adCreative.name,
            emotions,
            engagementRate,
          };
        })
      );

      // Find the variant with the highest emotional response
      let topEmotionalVariant = variantResults[0];
      let topEmotionName = 'neutral';
      let topEmotionScore = 0;

      variantResults.forEach((variant) => {
        // Find the dominant emotion for this variant
        let dominantEmotion = 'neutral';
        let highestScore = variant.emotions.neutral;

        if (variant.emotions.joy > highestScore) {
          dominantEmotion = 'joy';
          highestScore = variant.emotions.joy;
        }

        if (variant.emotions.surprise > highestScore) {
          dominantEmotion = 'surprise';
          highestScore = variant.emotions.surprise;
        }

        // Check if this is the highest overall emotional response
        if (highestScore > topEmotionScore) {
          topEmotionalVariant = variant;
          topEmotionName = dominantEmotion;
          topEmotionScore = highestScore;
        }
      });

      // For demo purposes, generate some insights
      // In a real implementation, this would involve more sophisticated analysis
      const correlations = {
        strongestEmotion: 'joy', // Placeholder
        engagementIncrease: 28.5, // Placeholder
      };

      const insights = {
        timeOfDay: 'evening', // Placeholder
        demographicGroup: 'young adults', // Placeholder
      };

      // Determine recommended emotion targets based on engagement rates
      const emotionEngagementMap: Record<string, number> = {
        joy: 0,
        surprise: 0,
        neutral: 0,
      };
      
      let totalJoyWeight = 0;
      let totalSurpriseWeight = 0;
      let totalNeutralWeight = 0;
      
      variantResults.forEach((variant) => {
        emotionEngagementMap.joy += variant.emotions.joy * variant.engagementRate;
        emotionEngagementMap.surprise += variant.emotions.surprise * variant.engagementRate;
        emotionEngagementMap.neutral += variant.emotions.neutral * variant.engagementRate;
        
        totalJoyWeight += variant.emotions.joy;
        totalSurpriseWeight += variant.emotions.surprise;
        totalNeutralWeight += variant.emotions.neutral;
      });
      
      // Normalize
      if (totalJoyWeight > 0) emotionEngagementMap.joy /= totalJoyWeight;
      if (totalSurpriseWeight > 0) emotionEngagementMap.surprise /= totalSurpriseWeight;
      if (totalNeutralWeight > 0) emotionEngagementMap.neutral /= totalNeutralWeight;
      
      // Sort emotions by their correlation with engagement
      const sortedEmotions = Object.entries(emotionEngagementMap)
        .sort(([, a], [, b]) => b - a)
        .map(([emotion]) => emotion);
      
      return {
        topEmotionalVariant: {
          id: topEmotionalVariant.id,
          name: topEmotionalVariant.name,
          primaryEmotion: topEmotionName,
          score: topEmotionScore,
        },
        correlations,
        insights,
        variants: variantResults,
        recommendedTargetEmotions: sortedEmotions,
      };
    } catch (error) {
      console.error('Error generating emotion test results:', error);
      throw error;
    }
  }

  /**
   * Generate emotion-based insights for campaign optimization
   */
  async generateEmotionInsights(campaignId: string) {
    try {
      // This would normally fetch real data and perform analysis
      // For demo purposes, we'll return mock data
      return {
        overallEmotionalResponse: {
          joy: 0.45,
          surprise: 0.30,
          neutral: 0.25,
        },
        recommendedTargetEmotions: ['joy', 'surprise'],
        topPerformingCreatives: [
          {
            id: 'creative1',
            name: 'Summer Promo',
            dominantEmotion: 'joy',
            engagementRate: 8.2,
          },
          {
            id: 'creative2',
            name: 'New Product Launch',
            dominantEmotion: 'surprise',
            engagementRate: 7.5,
          },
        ],
        optimizationSuggestions: [
          'Focus on joy-inducing visuals for morning delivery',
          'Surprise elements work best with younger demographics',
          'Consider A/B testing with more vibrant color schemes',
        ],
      };
    } catch (error) {
      console.error('Error generating emotion insights:', error);
      throw error;
    }
  }

  // Add proper ad selection with campaign targeting
  async selectAdForEmotions(
    deviceId: string,
    emotions: EmotionMetrics,
    targeting: EmotionTargeting
  ): Promise<string | null> {
    try {
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          devices: {
            some: { id: deviceId }
          }
        },
        include: {
          adCreatives: true
        }
      });

      let selectedCreativeId: string | null = null;
      let maxScore = 0;

      for (const campaign of activeCampaigns) {
        for (const creative of campaign.adCreatives) {
          const score = calculateEmotionScore(emotions, targeting);
          
          if (score > maxScore && score >= targeting.minConfidence) {
            maxScore = score;
            selectedCreativeId = creative.id;
          }
        }
      }

      return selectedCreativeId;
    } catch (error) {
      console.error('Error selecting ad for emotions:', error);
      return null;
    }
  }

  // Add proper campaign performance tracking
  async selectBestPerformingCampaign(campaigns: Campaign[]): Promise<Campaign> {
    const campaignPerformance = await Promise.all(
      campaigns.map(async (campaign) => {
        const analytics = await prisma.campaignAnalytics.findMany({
          where: {
            campaignId: campaign.id,
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        });
        
        const performance = analytics.reduce((acc, curr) => ({
          impressions: acc.impressions + curr.impressions,
          engagements: acc.engagements + curr.engagements,
          conversions: acc.conversions + curr.conversions
        }), { impressions: 0, engagements: 0, conversions: 0 });
        
        return {
          campaign,
          performance
        };
      })
    );
    
    // Select campaign with best performance
    return campaignPerformance.reduce((best, current) => {
      const bestScore = (best.performance.engagements / best.performance.impressions) || 0;
      const currentScore = (current.performance.engagements / current.performance.impressions) || 0;
      return currentScore > bestScore ? current : best;
    }).campaign;
  }
}

export const emotionAwareDelivery = new EmotionAwareDeliveryService(); 