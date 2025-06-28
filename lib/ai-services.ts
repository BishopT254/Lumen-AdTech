/**
 * AI Services Module
 * 
 * This module provides AI-powered services for the Lumen AdTech Platform,
 * including audience estimation, emotion analysis, and ad optimization algorithms.
 * It leverages TensorFlow.js for machine learning capabilities.
 */

import * as tf from '@tensorflow/tfjs';
import { prisma } from './prisma';
import { Campaign, AdCreative, ABTest, CampaignAnalytics } from '@prisma/client';
import { logger } from './logger';
import { metrics } from './metrics';
import { cache } from './cache';

// Ensure TensorFlow.js is initialized
let tfInitialized = false;

async function ensureTfInitialized() {
  if (!tfInitialized) {
    // Initialize TensorFlow.js
    await tf.ready();
    // Only set backend in browser environments
    if (typeof window !== 'undefined') {
      // Browser environment - use WebGL if available
      if (tf.getBackend() !== 'webgl' && tf.ENV.getBool('HAS_WEBGL')) {
        await tf.setBackend('webgl');
      }
    }
    // Don't set backend in server-side rendering
    tfInitialized = true;
  }
}

// Model loading and caching
const models: Record<string, tf.LayersModel> = {};

// Add model caching
const MODEL_CACHE_TTL = 3600; // 1 hour

async function getCachedModel(modelName: string) {
  const cacheKey = `model:${modelName}`;
  const cachedModel = await cache.get(cacheKey);
  
  if (cachedModel) {
    metrics.increment('model_cache_hits');
    return cachedModel;
  }
  
  metrics.increment('model_cache_misses');
  return null;
}

async function cacheModel(modelName: string, model: any) {
  const cacheKey = `model:${modelName}`;
  await cache.set(cacheKey, model, MODEL_CACHE_TTL);
}

// Add error handling for model loading
async function loadModelWithRetry(modelName: string, maxRetries = 3) {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries < maxRetries) {
    try {
      const startTime = Date.now();
      
      // Try to get from cache first
      const cachedModel = await getCachedModel(modelName);
      if (cachedModel) {
        metrics.timing('model_load_time', Date.now() - startTime);
        return cachedModel;
      }
      
      // Load from source if not in cache
      const model = await tf.loadLayersModel(`/models/${modelName}/model.json`);
      await cacheModel(modelName, model);
      
      metrics.timing('model_load_time', Date.now() - startTime);
      return model;
    } catch (error) {
      lastError = error as Error;
      retries++;
      logger.warn(`Failed to load model ${modelName}, attempt ${retries}/${maxRetries}`, { error });
      metrics.increment('model_load_errors');
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }
  
  throw new Error(`Failed to load model ${modelName} after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Loads a TensorFlow.js model from the specified path
 */
async function loadModel(modelType: string): Promise<tf.LayersModel> {
  if (!models[modelType]) {
    await ensureTfInitialized();
    
    // Define model paths based on model type
    const modelPaths: Record<string, string> = {
      'audience-estimation': process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/audience-estimation/model.json` : 'https://storage.googleapis.com/lumen-models/audience-estimation/model.json',
      'emotion-detection': process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/emotion-detection/model.json` : 'https://storage.googleapis.com/lumen-models/emotion-detection/model.json',
      'attention-scoring': process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/attention-scoring/model.json` : 'https://storage.googleapis.com/lumen-models/attention-scoring/model.json',
      'ad-optimization': process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/ad-optimization/model.json` : 'https://storage.googleapis.com/lumen-models/ad-optimization/model.json',
    };
    
    if (!modelPaths[modelType]) {
      throw new Error(`Unknown model type: ${modelType}`);
    }
    
    try {
      // Load the model
      models[modelType] = await tf.loadLayersModel(modelPaths[modelType]);
    } catch (error) {
      console.error(`Error loading ${modelType} model:`, error);
      throw error;
    }
  }
  
  return models[modelType];
}

/**
 * Audience Estimation Service
 * 
 * Uses computer vision models to estimate audience size and demographics from image data
 */
export async function estimateAudience(imageData: Float32Array, width: number, height: number) {
  try {
    await ensureTfInitialized();
    
    // Load the audience estimation model
    const model = await loadModel('audience-estimation');
    
    // Preprocess the image data
    const tensor = tf.tensor3d(Array.from(imageData), [height, width, 3])
      .expandDims(0) // Add batch dimension
      .div(255.0); // Normalize to [0, 1]
    
    // Run inference
    const predictions = await model.predict(tensor) as tf.Tensor;
    
    // Process predictions
    // For a people counting model, output might be:
    // [number of people, confidence score]
    const [count, confidence] = await predictions.data() as Float32Array;
    
    // Clean up tensors
    tensor.dispose();
    predictions.dispose();
    
    return {
      estimatedCount: Math.round(count),
      confidence: confidence,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Audience estimation error:", error);
    return {
      estimatedCount: 0,
      confidence: 0,
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Emotion Analysis Service
 * 
 * Analyzes facial expressions to determine emotional responses to advertisements
 */
export async function analyzeEmotions(faceData: Float32Array[], width: number, height: number) {
  try {
    await ensureTfInitialized();
    
    // Load the emotion detection model
    const model = await loadModel('emotion-detection');
    
    // Process each detected face
    const emotions = [];
    
    for (const faceArray of faceData) {
      // Preprocess the face data
      const tensor = tf.tensor3d(Array.from(faceArray), [height, width, 3])
        .expandDims(0) // Add batch dimension
        .div(255.0); // Normalize to [0, 1]
      
      // Run inference
      const predictions = await model.predict(tensor) as tf.Tensor;
      
      // Get the emotion probabilities
      // Model outputs probabilities for emotions: [neutral, happy, sad, angry, surprised, fearful, disgusted]
      const emotionScores = await predictions.data() as Float32Array;
      
      // Map indices to emotion labels
      const emotionLabels = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'];
      const emotionMap: Record<string, number> = {};
      
      emotionLabels.forEach((label, i) => {
        emotionMap[label] = emotionScores[i];
      });
      
      // Find the dominant emotion
      let dominantEmotion = emotionLabels[0];
      let maxScore = emotionScores[0];
      
      for (let i = 1; i < emotionLabels.length; i++) {
        if (emotionScores[i] > maxScore) {
          maxScore = emotionScores[i];
          dominantEmotion = emotionLabels[i];
        }
      }
      
      emotions.push({
        dominant: dominantEmotion,
        scores: emotionMap,
        confidence: maxScore
      });
      
      // Clean up tensors
      tensor.dispose();
      predictions.dispose();
    }
    
    return {
      faceCount: emotions.length,
      emotions: emotions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Emotion analysis error:", error);
    return {
      faceCount: 0,
      emotions: [],
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Attention Scoring Service
 * 
 * Determines how engaged viewers are with the advertisement
 */
export async function scoreAttention(imageSequence: Float32Array[], width: number, height: number) {
  try {
    await ensureTfInitialized();
    
    // Load the attention scoring model
    const model = await loadModel('attention-scoring');
    
    // Process the image sequence (multiple frames to detect attention over time)
    const sequenceLength = imageSequence.length;
    
    // Prepare tensor with shape [batch, frames, height, width, channels]
    const tensorArray = imageSequence.map(imgArray => 
      Array.from(imgArray).map(val => val / 255.0) // Normalize to [0, 1]
    );
    
    const tensor = tf.tensor5d(tensorArray, [1, sequenceLength, height, width, 3]);
    
    // Run inference
    const predictions = await model.predict(tensor) as tf.Tensor;
    
    // Get attention score (0-100)
    const attentionScore = await predictions.data() as Float32Array;
    
    // Clean up tensors
    tensor.dispose();
    predictions.dispose();
    
    return {
      attentionScore: Math.round(attentionScore[0] * 100),
      framesAnalyzed: sequenceLength,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Attention scoring error:", error);
    return {
      attentionScore: 0,
      framesAnalyzed: 0,
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Ad Optimization Algorithm
 * 
 * Uses machine learning to determine the optimal ad rotation schedule
 * based on historical performance data
 */
export async function optimizeAdRotation(deviceId: string, timeWindow: number) {
  try {
    // Fetch device information
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        adDeliveries: {
          where: {
            scheduledTime: {
              gte: new Date(new Date().getTime() - timeWindow * 60 * 60 * 1000), // timeWindow in hours
            },
          },
          include: {
            campaign: true,
            adCreative: true,
          },
          orderBy: {
            scheduledTime: 'desc',
          },
          take: 100, // Limit to recent deliveries
        },
      },
    });
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    // Extract features for optimization
    const timeOfDay = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const deviceType = device.deviceType;
    const locationData = device.location as any;
    
    // Get all active campaigns with available ad creatives
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        adCreatives: {
          some: {
            isApproved: true,
          },
        },
      },
      include: {
        adCreatives: {
          where: {
            isApproved: true,
          },
        },
      },
    });
    
    // Calculate historical performance metrics for each campaign on this device
    const campaignPerformance: Record<string, {
      impressions: number;
      engagements: number;
      completions: number;
      engagementRate: number;
      completionRate: number;
    }> = {};
    
    // Initialize with zero values
    activeCampaigns.forEach(campaign => {
      campaignPerformance[campaign.id] = {
        impressions: 0,
        engagements: 0,
        completions: 0,
        engagementRate: 0,
        completionRate: 0,
      };
    });
    
    // Populate with actual data
    device.adDeliveries.forEach(delivery => {
      if (campaignPerformance[delivery.campaign.id]) {
        campaignPerformance[delivery.campaign.id].impressions += delivery.impressions;
        campaignPerformance[delivery.campaign.id].engagements += delivery.engagements;
        campaignPerformance[delivery.campaign.id].completions += delivery.completions;
      }
    });
    
    // Calculate rates
    Object.keys(campaignPerformance).forEach(campaignId => {
      const perf = campaignPerformance[campaignId];
      if (perf.impressions > 0) {
        perf.engagementRate = perf.engagements / perf.impressions;
        perf.completionRate = perf.completions / perf.impressions;
      }
    });
    
    // Apply Multi-Armed Bandit algorithm (Thompson Sampling)
    // Each campaign is an "arm" with prior performance metrics
    const optimizedRotation = activeCampaigns.map(campaign => {
      const perf = campaignPerformance[campaign.id];
      
      // Add 1 to avoid division by zero for new campaigns (Laplace smoothing)
      const alpha = perf.engagements + 1;
      const beta = perf.impressions - perf.engagements + 1;
      
      // Sample from beta distribution to balance exploration vs exploitation
      // Using a simplified approach here since we can't directly sample from beta distribution
      const randomSample = Math.random() * (alpha / (alpha + beta));
      
      // Combine with deterministic factors like time targeting
      // Simplified targeting match score (0-1)
      const timeTargetingScore = 0.5 + (Math.cos((timeOfDay - 12) / 12 * Math.PI) / 2); // Highest at noon
      
      // Priority adjustment based on pricing model
      const pricingFactor = campaign.pricingModel === "CPM" ? 1.0 :
                             campaign.pricingModel === "CPE" ? 1.1 :
                             campaign.pricingModel === "CPA" ? 1.2 : 1.0;
      
      // Calculate a final score for ranking
      const score = (randomSample * 0.6) + (timeTargetingScore * 0.2) + (pricingFactor * 0.2);
      
      return {
        campaignId: campaign.id,
        score: score,
        adCreatives: campaign.adCreatives.map(creative => ({
          creativeId: creative.id,
          type: creative.type,
          name: creative.name,
        }))
      };
    });
    
    // Sort by score in descending order
    optimizedRotation.sort((a, b) => b.score - a.score);
    
    return {
      deviceId: device.id,
      optimizedCampaigns: optimizedRotation,
      rotationTiming: new Date().toISOString(),
      campaignCount: optimizedRotation.length,
    };
  } catch (error) {
    console.error("Ad rotation optimization error:", error);
    throw error;
  }
}

/**
 * Campaign Performance Prediction
 * 
 * Predicts future performance of a campaign based on current performance
 * and similar historical campaigns
 */
export async function predictCampaignPerformance(campaignId: string, daysAhead: number) {
  try {
    // Fetch campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        adCreatives: true,
        adDeliveries: {
          include: {
            device: true,
          },
        },
      },
    });
    
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }
    
    // Calculate current performance metrics
    const totalImpressions = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0);
    const totalEngagements = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0);
    const totalCompletions = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.completions, 0);
    
    // Calculate rates
    const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;
    const completionRate = totalImpressions > 0 ? totalCompletions / totalImpressions : 0;
    
    // Get campaign age in days
    const campaignStartDate = new Date(campaign.startDate);
    const currentDate = new Date();
    const campaignAgeDays = Math.max(1, Math.floor((currentDate.getTime() - campaignStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate daily averages
    const dailyImpressions = totalImpressions / campaignAgeDays;
    const dailyEngagements = totalEngagements / campaignAgeDays;
    
    // Fetch similar historical campaigns for comparison
    const similarCampaigns = await prisma.campaign.findMany({
      where: {
        id: { not: campaignId },
        status: "COMPLETED",
        budget: {
          gte: campaign.budget * 0.5,
          lte: campaign.budget * 1.5,
        },
        pricingModel: campaign.pricingModel,
      },
      include: {
        adDeliveries: true,
      },
      take: 10, // Limit to 10 similar campaigns
    });
    
    // Calculate growth curves from similar campaigns
    const growthFactors = similarCampaigns.map(similarCampaign => {
      // Get total duration in days
      const startDate = new Date(similarCampaign.startDate);
      const endDate = new Date(similarCampaign.endDate);
      const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate early vs late performance
      const earlyDeliveries = similarCampaign.adDeliveries.filter(d => {
        const deliveryDate = new Date(d.scheduledTime);
        const daysSinceStart = Math.floor((deliveryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceStart <= Math.floor(totalDays / 3); // First third of campaign
      });
      
      const lateDeliveries = similarCampaign.adDeliveries.filter(d => {
        const deliveryDate = new Date(d.scheduledTime);
        const daysSinceStart = Math.floor((deliveryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceStart >= Math.floor(totalDays * 2 / 3); // Last third of campaign
      });
      
      const earlyImpressions = earlyDeliveries.reduce((sum, d) => sum + d.impressions, 0);
      const lateImpressions = lateDeliveries.reduce((sum, d) => sum + d.impressions, 0);
      
      // Calculate growth factor (how much did performance improve/decline)
      const earlyDays = Math.max(1, Math.floor(totalDays / 3));
      const lateDays = Math.max(1, Math.floor(totalDays / 3));
      
      const earlyDailyImpressions = earlyImpressions / earlyDays;
      const lateDailyImpressions = lateImpressions / lateDays;
      
      return lateDailyImpressions / Math.max(1, earlyDailyImpressions);
    });
    
    // Average growth factor from similar campaigns
    const avgGrowthFactor = growthFactors.length > 0
      ? growthFactors.reduce((sum, factor) => sum + factor, 0) / growthFactors.length
      : 1.0; // Default to no growth if no similar campaigns
    
    // Predict future performance
    const predictions = Array.from({ length: daysAhead }, (_, i) => {
      const dayNumber = campaignAgeDays + i + 1;
      const growthAdjustment = Math.pow(avgGrowthFactor, (i + 1) / daysAhead);
      
      const predictedDailyImpressions = dailyImpressions * growthAdjustment;
      const predictedDailyEngagements = predictedDailyImpressions * engagementRate;
      const predictedDailyCompletions = predictedDailyImpressions * completionRate;
      
      return {
        day: dayNumber,
        date: new Date(currentDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impressions: Math.round(predictedDailyImpressions),
        engagements: Math.round(predictedDailyEngagements),
        completions: Math.round(predictedDailyCompletions),
      };
    });
    
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      currentPerformance: {
        impressions: totalImpressions,
        engagements: totalEngagements,
        completions: totalCompletions,
        engagementRate: engagementRate,
        completionRate: completionRate,
        dailyImpressions: dailyImpressions,
        dailyEngagements: dailyEngagements,
      },
      predictions: predictions,
      totalPredicted: {
        impressions: predictions.reduce((sum, day) => sum + day.impressions, 0),
        engagements: predictions.reduce((sum, day) => sum + day.engagements, 0),
        completions: predictions.reduce((sum, day) => sum + day.completions, 0),
      },
      confidenceScore: similarCampaigns.length / 10, // 0-1 based on number of similar campaigns
    };
  } catch (error) {
    console.error("Campaign performance prediction error:", error);
    throw error;
  }
}

interface AdRotationInput {
  campaignId: string;
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    location: string;
    deviceType: string;
    audienceMetrics?: {
      count: number;
      demographics?: Record<string, number>;
      emotions?: Record<string, number>;
    };
  };
}

interface AdRotationOutput {
  creativeId: string;
  displayDuration: number;
  priority: number;
  performancePrediction: number;
}

interface DynamicPricingInput {
  campaignId: string;
  location: string;
  timeSlot: string;
  demand: number;
  historicalPerformance: {
    impressions: number;
    engagements: number;
    conversions: number;
    revenue: number;
  };
}

interface DynamicPricingOutput {
  cpm: number;
  cpe: number;
  cpa: number;
  recommendedBudget: number;
  priceForecast: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export class AIServices {
  // AI-Powered Ad Rotation Algorithm
  async optimizeAdRotation(input: AdRotationInput): Promise<AdRotationOutput[]> {
    try {
      // Fetch campaign and creatives
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
        include: {
          adCreatives: true,
          analytics: {
            orderBy: { date: 'desc' },
            take: 30,
          },
          abTests: {
            include: {
              variants: {
                include: {
                  adCreative: true,
                },
              },
            },
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Calculate base performance scores
      const performanceScores = await this.calculatePerformanceScores(campaign);

      // Apply context-based adjustments
      const contextAdjustedScores = this.applyContextAdjustments(
        performanceScores,
        input.context
      );

      // Apply fairness mechanisms
      const fairScores = this.applyFairnessMechanisms(contextAdjustedScores);

      // Generate rotation sequence
      const rotationSequence = this.generateRotationSequence(fairScores);

      return rotationSequence;
    } catch (error) {
      console.error('Error in optimizeAdRotation:', error);
      throw error;
    }
  }
  
  public async getCampaignRecommendations(campaignId: string) {
    try {
      const prediction = await predictCampaignPerformance(campaignId, 7);
      return {
        insights: [
          {
            title: "Performance Forecast",
            description: `Predicted ${prediction.totalPredicted.impressions.toLocaleString()} impressions over next 7 days`,
          },
          {
            title: "Engagement Outlook",
            description: `Expected ${Math.round(prediction.currentPerformance.engagementRate * 100)}% engagement rate`,
          },
          {
            title: "Optimization Tip",
            description: prediction.confidenceScore > 0.5 
              ? "High confidence in predictions based on historical data"
              : "Consider expanding targeting for better predictions",
          }
        ]
      };
    } catch (error) {
      console.error("Recommendation engine error:", error);
      return {
        insights: [],
        error: String(error)
      };
    }
  }

  private async calculatePerformanceScores(campaign: Campaign & {
    adCreatives: AdCreative[];
    analytics: CampaignAnalytics[];
    abTests: (ABTest & {
      variants: {
        adCreative: AdCreative;
      }[];
    })[];
  }): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    // Calculate base performance metrics
    for (const creative of campaign.adCreatives) {
      const analytics = campaign.analytics.filter(a => 
        a.creativeId === creative.id
      );

      const performance = this.calculateCreativePerformance(analytics);
      scores.set(creative.id, performance);
    }

    // Adjust scores based on A/B test results
    for (const abTest of campaign.abTests) {
      for (const variant of abTest.variants) {
        const variantAnalytics = campaign.analytics.filter(a => 
          a.creativeId === variant.adCreative.id
        );

        const variantPerformance = this.calculateCreativePerformance(variantAnalytics);
        const currentScore = scores.get(variant.adCreative.id) || 0;
        scores.set(variant.adCreative.id, (currentScore + variantPerformance) / 2);
      }
    }

    return scores;
  }

  private calculateCreativePerformance(analytics: CampaignAnalytics[]): number {
    if (analytics.length === 0) return 0;

    const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
    const totalEngagements = analytics.reduce((sum, a) => sum + a.engagements, 0);
    const totalConversions = analytics.reduce((sum, a) => sum + a.conversions, 0);

    // Weighted performance score
    return (
      (totalEngagements / totalImpressions) * 0.4 +
      (totalConversions / totalImpressions) * 0.6
    );
  }

  private applyContextAdjustments(
    scores: Map<string, number>,
    context: AdRotationInput['context']
  ): Map<string, number> {
    const adjustedScores = new Map<string, number>();

    for (const [creativeId, score] of scores) {
      let adjustedScore = score;

      // Time-based adjustments
      const timeMultiplier = this.calculateTimeMultiplier(
        context.timeOfDay,
        context.dayOfWeek
      );
      adjustedScore *= timeMultiplier;

      // Location-based adjustments
      const locationMultiplier = this.calculateLocationMultiplier(context.location);
      adjustedScore *= locationMultiplier;

      // Audience-based adjustments
      if (context.audienceMetrics) {
        const audienceMultiplier = this.calculateAudienceMultiplier(
          context.audienceMetrics
        );
        adjustedScore *= audienceMultiplier;
      }

      adjustedScores.set(creativeId, adjustedScore);
    }

    return adjustedScores;
  }

  private calculateTimeMultiplier(timeOfDay: number, dayOfWeek: number): number {
    // Peak hours (e.g., 6-9 PM) get higher multipliers
    const isPeakHour = timeOfDay >= 18 && timeOfDay <= 21;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isPeakHour && !isWeekend) return 1.5;
    if (isPeakHour && isWeekend) return 1.2;
    if (!isPeakHour && isWeekend) return 0.8;
    return 1.0;
  }

  private calculateLocationMultiplier(location: string): number {
    // Implement location-based scoring logic
    // This could be based on historical performance data for the location
    return 1.0; // Placeholder
  }

  private calculateAudienceMultiplier(metrics: {
    count: number;
    demographics?: Record<string, number>;
    emotions?: Record<string, number>;
  }): number {
    let multiplier = 1.0;

    // Audience size adjustment
    if (metrics.count > 100) multiplier *= 1.2;
    if (metrics.count > 500) multiplier *= 1.3;

    // Emotional engagement adjustment
    if (metrics.emotions) {
      const positiveEmotions = Object.entries(metrics.emotions)
        .filter(([emotion]) => ['joy', 'interest', 'excitement'].includes(emotion))
        .reduce((sum, [, value]) => sum + value, 0);
      
      const totalEmotions = Object.values(metrics.emotions).reduce((sum, value) => sum + value, 0);
      if (totalEmotions > 0) {
        multiplier *= 1 + (positiveEmotions / totalEmotions) * 0.5;
      }
    }

    return multiplier;
  }

  private applyFairnessMechanisms(scores: Map<string, number>): Map<string, number> {
    const fairScores = new Map<string, number>();
    const minScore = Math.min(...Array.from(scores.values()));
    const maxScore = Math.max(...Array.from(scores.values()));

    // Normalize scores to ensure fair distribution
    for (const [creativeId, score] of scores) {
      const normalizedScore = (score - minScore) / (maxScore - minScore);
      fairScores.set(creativeId, normalizedScore);
    }

    return fairScores;
  }

  private generateRotationSequence(scores: Map<string, number>): AdRotationOutput[] {
    const sequence: AdRotationOutput[] = [];
    const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);

    for (const [creativeId, score] of scores) {
      const displayDuration = this.calculateDisplayDuration(score);
      const priority = score / totalScore;
      const performancePrediction = this.predictPerformance(score);

      sequence.push({
        creativeId,
        displayDuration,
        priority,
        performancePrediction,
      });
    }

    // Sort by priority
    return sequence.sort((a, b) => b.priority - a.priority);
  }

  private calculateDisplayDuration(score: number): number {
    // Base duration of 30 seconds, adjusted by performance
    return Math.max(15, Math.min(60, 30 * (1 + score)));
  }

  private predictPerformance(score: number): number {
    // Simple prediction model based on historical performance
    return Math.min(1, score * 1.2);
  }

  // Dynamic Pricing Engine
  async calculateDynamicPricing(input: DynamicPricingInput): Promise<DynamicPricingOutput> {
    try {
      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(input.campaignId, input.location);

      // Calculate base rates
      const baseRates = this.calculateBaseRates(historicalData);

      // Apply demand-based adjustments
      const demandAdjustedRates = this.applyDemandAdjustments(baseRates, input.demand);

      // Generate price forecasts
      const priceForecast = this.generatePriceForecast(demandAdjustedRates);

      // Calculate recommended budget
      const recommendedBudget = this.calculateRecommendedBudget(
        demandAdjustedRates,
        historicalData
      );

      return {
        cpm: demandAdjustedRates.cpm,
        cpe: demandAdjustedRates.cpe,
        cpa: demandAdjustedRates.cpa,
        recommendedBudget,
        priceForecast,
      };
    } catch (error) {
      console.error('Error in calculateDynamicPricing:', error);
      throw error;
    }
  }

  private async fetchHistoricalData(campaignId: string, location: string) {
    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId,
        location,
      },
      orderBy: {
        date: 'desc',
      },
      take: 30,
    });

    return analytics;
  }

  private calculateBaseRates(historicalData: any[]) {
    const totalImpressions = historicalData.reduce((sum, data) => sum + data.impressions, 0);
    const totalEngagements = historicalData.reduce((sum, data) => sum + data.engagements, 0);
    const totalConversions = historicalData.reduce((sum, data) => sum + data.conversions, 0);
    const totalRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);

    return {
      cpm: totalRevenue / (totalImpressions / 1000),
      cpe: totalRevenue / totalEngagements,
      cpa: totalRevenue / totalConversions,
    };
  }

  private applyDemandAdjustments(baseRates: any, demand: number) {
    const demandMultiplier = Math.max(0.5, Math.min(2, 1 + (demand - 0.5)));

    return {
      cpm: baseRates.cpm * demandMultiplier,
      cpe: baseRates.cpe * demandMultiplier,
      cpa: baseRates.cpa * demandMultiplier,
    };
  }

  private generatePriceForecast(rates: any) {
    // Generate hourly forecast
    const hourly = Array(24).fill(0).map((_, hour) => {
      const timeMultiplier = this.calculateTimeMultiplier(hour, 1);
      return rates.cpm * timeMultiplier;
    });

    // Generate daily forecast
    const daily = Array(7).fill(0).map((_, day) => {
      const dayMultiplier = this.calculateDayMultiplier(day);
      return rates.cpm * dayMultiplier;
    });

    // Generate weekly forecast
    const weekly = Array(4).fill(0).map((_, week) => {
      const weekMultiplier = this.calculateWeekMultiplier(week);
      return rates.cpm * weekMultiplier;
    });

    return {
      hourly,
      daily,
      weekly,
    };
  }

  private calculateTimeMultiplier(hour: number, day: number): number {
    // Peak hours (6-9 PM) get higher multipliers
    const isPeakHour = hour >= 18 && hour <= 21;
    const isWeekend = day === 0 || day === 6;

    if (isPeakHour && !isWeekend) return 1.5;
    if (isPeakHour && isWeekend) return 1.2;
    if (!isPeakHour && isWeekend) return 0.8;
    return 1.0;
  }

  private calculateDayMultiplier(day: number): number {
    // Weekends typically have different pricing
    return day === 0 || day === 6 ? 0.8 : 1.0;
  }

  private calculateWeekMultiplier(week: number): number {
    // Seasonal adjustments could be applied here
    return 1.0;
  }

  private calculateRecommendedBudget(rates: any, historicalData: any[]): number {
    const averageDailyImpressions = historicalData.reduce((sum, data) => sum + data.impressions, 0) / historicalData.length;
    const averageDailyRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0) / historicalData.length;

    // Calculate optimal budget based on historical performance
    const optimalBudget = averageDailyRevenue * 1.2; // 20% buffer for growth

    return optimalBudget;
  }
}

// Export singleton instance
export const aiServices = new AIServices(); 