import { prisma } from './prisma';
import { Campaign, AdCreative, ABTest, ABTestVariant, AdDelivery, Device } from '@prisma/client';

/**
 * AI-Powered Ad Rotation Algorithm Module
 * 
 * This module provides intelligent ad rotation and optimization functionality,
 * implementing the Multi-Armed Bandit approach to balance exploration vs. exploitation
 * while ensuring fair distribution of ad impressions across campaigns.
 */

interface AdRotationInput {
  deviceId: string;
  context?: {
    timeOfDay?: number;
    dayOfWeek?: number;
    viewerCount?: number;
    emotions?: {
      joy?: number;
      surprise?: number;
      neutral?: number;
    };
  };
}

interface AdRotationOutput {
  deviceId: string;
  scheduledAds: {
    adCreativeId: string;
    campaignId: string;
    adDeliveryId: string;
    priority: number;
    displayDuration: number;
    scheduledTime: Date;
  }[];
  nextRefreshTime: Date;
}

export class AdRotationAlgorithm {
  /**
   * Generate an optimized ad rotation schedule for a device
   */
  async generateAdRotation(input: AdRotationInput): Promise<AdRotationOutput> {
    try {
      // Get device information
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
        include: {
          adDeliveries: {
            where: {
              scheduledTime: {
                gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            include: {
              campaign: true,
              adCreative: true,
            },
            orderBy: {
              scheduledTime: 'desc',
            },
            take: 50,
          },
        },
      });

      if (!device) {
        throw new Error(`Device with ID ${input.deviceId} not found`);
      }

      // Get current context
      const context = this.getContextData(input, device);

      // Get all active campaigns with available ad creatives
      const activeCampaigns = await this.getActiveCampaigns(device);
      
      // Calculate campaign performance scores
      const campaignScores = await this.calculateCampaignScores(activeCampaigns, device, context);
      
      // Apply Multi-Armed Bandit algorithm
      const rotationSchedule = this.applyMultiArmedBandit(campaignScores, device, context);
      
      // Create ad delivery records for each scheduled ad
      const scheduledAds = await this.createAdDeliveryRecords(rotationSchedule, device);
      
      // Calculate next refresh time
      const nextRefreshTime = this.calculateNextRefreshTime(context);
      
      return {
        deviceId: device.id,
        scheduledAds,
        nextRefreshTime,
      };
    } catch (error) {
      console.error('Error generating ad rotation:', error);
      throw error;
    }
  }

  /**
   * Get or construct context data for the rotation
   */
  private getContextData(input: AdRotationInput, device: Device): {
    timeOfDay: number;
    dayOfWeek: number;
    location: any;
    viewerCount: number;
    emotions: {
      joy: number;
      surprise: number;
      neutral: number;
    };
  } {
    const now = new Date();
    
    return {
      // Time context
      timeOfDay: input.context?.timeOfDay !== undefined ? input.context.timeOfDay : now.getHours(),
      dayOfWeek: input.context?.dayOfWeek !== undefined ? input.context.dayOfWeek : now.getDay(),
      
      // Location context
      location: device.location,
      
      // Audience context
      viewerCount: input.context?.viewerCount || 1,
      emotions: {
        joy: input.context?.emotions?.joy || 0.33,
        surprise: input.context?.emotions?.surprise || 0.33,
        neutral: input.context?.emotions?.neutral || 0.34,
      },
    };
  }

  /**
   * Fetch all active campaigns that are eligible for the device
   */
  private async getActiveCampaigns(device: Device & {
    adDeliveries: (AdDelivery & {
      campaign: Campaign;
      adCreative: AdCreative;
    })[];
  }) {
    const now = new Date();
    
    // Get all active campaigns with available ad creatives
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { 
          gte: now,
          // If endDate is null, the campaign is considered always active
          // (lte and gte operators in Prisma handle null values appropriately)
        },
        adCreatives: {
          some: {
            isApproved: true,
            status: "APPROVED",
          },
        },
        // Daily budget not exceeded
        OR: [
          { dailyBudget: null }, // No daily budget constraint
          {
            dailyBudget: {
              gt: 0,
            },
            analytics: {
              some: {
                date: {
                  equals: new Date(now.setHours(0, 0, 0, 0)), // Today
                },
                costData: {
                  path: ['spend'],
                  lt: prisma.campaign.fields.dailyBudget,
                },
              },
            },
          },
          {
            dailyBudget: {
              gt: 0,
            },
            analytics: {
              none: {
                date: {
                  equals: new Date(now.setHours(0, 0, 0, 0)), // Today
                },
              },
            },
          },
        ],
      },
      include: {
        adCreatives: {
          where: {
            isApproved: true,
            status: "APPROVED",
          },
        },
        abTests: {
          where: {
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
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
    
    return this.filterCampaignsByTargeting(activeCampaigns, device);
  }

  /**
   * Filter campaigns based on targeting criteria
   */
  private filterCampaignsByTargeting(campaigns: Campaign[], device: Device): Campaign[] {
    return campaigns.filter(campaign => {
      // Location targeting
      if (campaign.targetLocations) {
        const targetLocations = campaign.targetLocations as any[];
        
        // Check if device location matches any target location
        // This is a simplified version - actual implementation would be more sophisticated
        const deviceLocation = device.location as any;
        const locationMatch = targetLocations.some(targetLocation => {
          // Check for matching city, country, etc.
          return targetLocation.city === deviceLocation.city || 
                 targetLocation.country === deviceLocation.country;
        });
        
        if (!locationMatch) {
          return false;
        }
      }
      
      // Schedule targeting
      if (campaign.targetSchedule) {
        const schedule = campaign.targetSchedule as any;
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check if current time is within target schedule
        // This is a simplified version - actual implementation would be more sophisticated
        if (schedule.hours && schedule.days) {
          const hourMatch = schedule.hours.includes(currentHour);
          const dayMatch = schedule.days.includes(currentDay);
          
          if (!hourMatch || !dayMatch) {
            return false;
          }
        }
      }
      
      // If all targeting criteria are met, include the campaign
      return true;
    });
  }

  /**
   * Calculate performance scores for each campaign
   */
  private async calculateCampaignScores(
    campaigns: Campaign[],
    device: Device & {
      adDeliveries: (AdDelivery & {
        campaign: Campaign;
        adCreative: AdCreative;
      })[];
    },
    context: any
  ) {
    const campaignScores: {
      campaign: Campaign;
      adCreatives: {
        creative: AdCreative;
        score: number;
        impressions: number;
        engagements: number;
        isABTestVariant: boolean;
        variantAllocation?: number;
      }[];
      abTests: ABTest[];
      score: number;
      weight: number;
      priority: number;
    }[] = [];
    
    // Calculate historical performance metrics for each campaign on this device
    for (const campaign of campaigns) {
      // Get deliveries for this campaign on this device
      const campaignDeliveries = device.adDeliveries.filter(d => d.campaignId === campaign.id);
      
      // Calculate aggregate performance metrics
      const totalImpressions = campaignDeliveries.reduce((sum, d) => sum + d.impressions, 0);
      const totalEngagements = campaignDeliveries.reduce((sum, d) => sum + d.engagements, 0);
      const totalCompletions = campaignDeliveries.reduce((sum, d) => sum + d.completions, 0);
      
      // Calculate engagement and completion rates
      const engagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;
      const completionRate = totalImpressions > 0 ? totalCompletions / totalImpressions : 0;
      
      // Calculate performance score
      // This score is used as the "value" in Thompson Sampling
      const performanceScore = this.calculatePerformanceScore(
        engagementRate,
        completionRate,
        campaign.pricingModel
      );
      
      // Calculate ad creative scores
      const adCreativeScores = campaign.adCreatives.map(creative => {
        // Get deliveries for this creative
        const creativeDeliveries = campaignDeliveries.filter(d => d.adCreativeId === creative.id);
        
        // Calculate creative performance metrics
        const impressions = creativeDeliveries.reduce((sum, d) => sum + d.impressions, 0);
        const engagements = creativeDeliveries.reduce((sum, d) => sum + d.engagements, 0);
        const engagementRate = impressions > 0 ? engagements / impressions : 0;
        
        // Check if creative is part of an active A/B test
        let isABTestVariant = false;
        let variantAllocation;
        
        for (const abTest of campaign.abTests || []) {
          const variant = abTest.variants.find(v => v.adCreative.id === creative.id);
          if (variant) {
            isABTestVariant = true;
            variantAllocation = variant.trafficAllocation;
            break;
          }
        }
        
        // Calculate creative score (blend of performance and exploration)
        const creativeScore = this.calculateCreativeScore(
          engagementRate,
          impressions,
          creative.type
        );
        
        return {
          creative,
          score: creativeScore,
          impressions,
          engagements,
          isABTestVariant,
          variantAllocation,
        };
      });
      
      // Calculate campaign priority based on objective and pricing model
      const priority = this.calculateCampaignPriority(
        campaign,
        performanceScore,
        context
      );
      
      // Add campaign to scores
      campaignScores.push({
        campaign,
        adCreatives: adCreativeScores,
        abTests: campaign.abTests || [],
        score: performanceScore,
        weight: 1.0, // Default weight, will be adjusted by Multi-Armed Bandit
        priority,
      });
    }
    
    return campaignScores;
  }

  /**
   * Calculate performance score based on engagement, completion, and pricing model
   */
  private calculatePerformanceScore(
    engagementRate: number,
    completionRate: number,
    pricingModel: string
  ): number {
    // Base score from engagement and completion
    let score = engagementRate * 0.6 + completionRate * 0.4;
    
    // Adjust based on pricing model
    switch (pricingModel) {
      case 'CPM':
        // No adjustment needed
        break;
      case 'CPE':
        // Prioritize engagement
        score = engagementRate * 0.8 + completionRate * 0.2;
        break;
      case 'CPA':
        // Prioritize completion/conversion
        score = engagementRate * 0.2 + completionRate * 0.8;
        break;
      case 'HYBRID':
        // Balanced approach
        score = engagementRate * 0.5 + completionRate * 0.5;
        break;
    }
    
    return score;
  }

  /**
   * Calculate ad creative score
   */
  private calculateCreativeScore(
    engagementRate: number,
    impressions: number,
    creativeType: string
  ): number {
    // Base score from engagement rate
    let score = engagementRate;
    
    // Apply exploration bonus for creatives with few impressions
    // Using a simple version of UCB1 (Upper Confidence Bound)
    const explorationBonus = impressions > 0 ? Math.sqrt(2 * Math.log(100) / impressions) : 1.0;
    
    // Combine performance and exploration
    score = score * 0.7 + explorationBonus * 0.3;
    
    // Adjust based on creative type
    switch (creativeType) {
      case 'VIDEO':
        score *= 1.2; // Video typically performs better
        break;
      case 'INTERACTIVE':
        score *= 1.3; // Interactive content usually gets more engagement
        break;
      case 'AR_EXPERIENCE':
        score *= 1.4; // AR experiences tend to be highly engaging
        break;
    }
    
    return score;
  }

  /**
   * Calculate campaign priority
   */
  private calculateCampaignPriority(
    campaign: Campaign,
    performanceScore: number,
    context: any
  ): number {
    // Start with the performance score
    let priority = performanceScore;
    
    // Adjust based on campaign objective
    switch (campaign.objective) {
      case 'AWARENESS':
        // Prioritize reach
        priority *= 1.0;
        break;
      case 'CONSIDERATION':
        // Prioritize engagement
        priority *= context.emotions.joy * 1.5;
        break;
      case 'CONVERSION':
        // Prioritize conversions
        priority *= 1.2;
        break;
      case 'ENGAGEMENT':
        // Prioritize engagement even more
        priority *= 1.3;
        break;
    }
    
    // Adjust based on time factors
    // Campaigns nearing their end date get a boost
    if (campaign.endDate) {
      const now = new Date();
      const daysLeft = Math.max(0, (new Date(campaign.endDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const totalDays = Math.max(1, (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysLeft < totalDays * 0.2) { // Last 20% of campaign duration
        priority *= 1.5;
      }
    }
    
    return priority;
  }

  /**
   * Apply Multi-Armed Bandit algorithm to determine the optimal ad rotation
   */
  private applyMultiArmedBandit(
    campaignScores: {
      campaign: Campaign;
      adCreatives: {
        creative: AdCreative;
        score: number;
        impressions: number;
        engagements: number;
        isABTestVariant: boolean;
        variantAllocation?: number;
      }[];
      abTests: ABTest[];
      score: number;
      weight: number;
      priority: number;
    }[],
    device: Device,
    context: any
  ) {
    // Sort campaigns by priority
    campaignScores.sort((a, b) => b.priority - a.priority);
    
    // Determine how many ads to schedule
    // This could be based on device type, time of day, etc.
    const numAdsToSchedule = this.determineAdScheduleCount(device, context);
    
    // Apply Thompson Sampling to select campaigns
    const selectedCampaigns: {
      campaign: Campaign;
      adCreative: AdCreative;
      weight: number;
      displayDuration: number;
      scheduledTime: Date;
    }[] = [];
    
    // Calculate scheduling time slots
    const now = new Date();
    const schedulingWindow = 60 * 60 * 1000; // 1 hour in milliseconds
    const timePerAd = schedulingWindow / numAdsToSchedule;
    
    for (let i = 0; i < numAdsToSchedule; i++) {
      // Apply Thompson Sampling
      const selectedCampaign = this.applySampling(campaignScores);
      
      if (selectedCampaign) {
        // Select an ad creative from the campaign
        const selectedCreative = this.selectAdCreative(selectedCampaign);
        
        if (selectedCreative) {
          // Calculate the scheduled time
          const scheduledTime = new Date(now.getTime() + i * timePerAd);
          
          // Calculate the display duration (can vary based on creative type)
          const displayDuration = this.calculateDisplayDuration(selectedCreative);
          
          // Add to selected campaigns
          selectedCampaigns.push({
            campaign: selectedCampaign.campaign,
            adCreative: selectedCreative,
            weight: selectedCampaign.weight,
            displayDuration,
            scheduledTime,
          });
        }
      }
    }
    
    return selectedCampaigns;
  }

  /**
   * Determine how many ads to schedule
   */
  private determineAdScheduleCount(device: Device, context: any): number {
    // Base count depends on device type
    let baseCount = 12; // Default: 12 ads per hour
    
    switch (device.deviceType) {
      case 'ANDROID_TV':
        baseCount = 12; // 5-minute slots
        break;
      case 'DIGITAL_SIGNAGE':
        baseCount = 20; // 3-minute slots
        break;
      case 'INTERACTIVE_KIOSK':
        baseCount = 30; // 2-minute slots
        break;
      case 'VEHICLE_MOUNTED':
        baseCount = 15; // 4-minute slots
        break;
      case 'RETAIL_DISPLAY':
        baseCount = 10; // 6-minute slots
        break;
    }
    
    // Adjust based on time of day
    const hour = context.timeOfDay;
    
    // Peak hours (6-9 AM, 11-2 PM, 5-8 PM) get more ads
    if ((hour >= 6 && hour <= 9) || (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)) {
      baseCount = Math.floor(baseCount * 1.2); // 20% more ads during peak hours
    }
    
    // Late night (11 PM - 5 AM) gets fewer ads
    if (hour >= 23 || hour <= 5) {
      baseCount = Math.floor(baseCount * 0.8); // 20% fewer ads during late night
    }
    
    return baseCount;
  }

  /**
   * Apply Thompson Sampling to select a campaign
   */
  private applySampling(campaignScores: {
    campaign: Campaign;
    adCreatives: any[];
    score: number;
    weight: number;
    priority: number;
  }[]) {
    // Calculate total weight
    const totalWeight = campaignScores.reduce((sum, campaign) => sum + campaign.priority, 0);
    
    if (totalWeight <= 0) {
      return null;
    }
    
    // Generate a random value between 0 and totalWeight
    const random = Math.random() * totalWeight;
    
    // Select campaign based on weight
    let cumulativeWeight = 0;
    
    for (const campaign of campaignScores) {
      cumulativeWeight += campaign.priority;
      
      if (random <= cumulativeWeight) {
        return campaign;
      }
    }
    
    // Fallback to first campaign if something goes wrong
    return campaignScores[0];
  }

  /**
   * Select an ad creative from a campaign
   */
  private selectAdCreative(campaignScore: {
    campaign: Campaign;
    adCreatives: {
      creative: AdCreative;
      score: number;
      impressions: number;
      engagements: number;
      isABTestVariant: boolean;
      variantAllocation?: number;
    }[];
    abTests: ABTest[];
    score: number;
    weight: number;
    priority: number;
  }): AdCreative | null {
    // Check if campaign has any active A/B tests
    if (campaignScore.abTests.length > 0) {
      // Prioritize A/B test variants
      return this.selectABTestVariant(campaignScore);
    }
    
    // No A/B tests, use Thompson Sampling to select creative
    const adCreatives = campaignScore.adCreatives;
    
    if (adCreatives.length === 0) {
      return null;
    }
    
    // Calculate total score
    const totalScore = adCreatives.reduce((sum, creative) => sum + creative.score, 0);
    
    if (totalScore <= 0) {
      // If all scores are 0, return a random creative
      return adCreatives[Math.floor(Math.random() * adCreatives.length)].creative;
    }
    
    // Generate a random value between 0 and totalScore
    const random = Math.random() * totalScore;
    
    // Select creative based on score
    let cumulativeScore = 0;
    
    for (const creative of adCreatives) {
      cumulativeScore += creative.score;
      
      if (random <= cumulativeScore) {
        return creative.creative;
      }
    }
    
    // Fallback to first creative if something goes wrong
    return adCreatives[0].creative;
  }

  /**
   * Select a variant from an A/B test
   */
  private selectABTestVariant(campaignScore: {
    campaign: Campaign;
    adCreatives: {
      creative: AdCreative;
      score: number;
      impressions: number;
      engagements: number;
      isABTestVariant: boolean;
      variantAllocation?: number;
    }[];
    abTests: ABTest[];
    score: number;
    weight: number;
    priority: number;
  }): AdCreative | null {
    // Get all creatives that are part of an A/B test
    const testVariants = campaignScore.adCreatives.filter(c => c.isABTestVariant);
    
    if (testVariants.length === 0) {
      // No variants, fall back to regular creative selection
      return this.selectAdCreative({
        ...campaignScore,
        abTests: [],
      });
    }
    
    // Calculate total allocation
    const totalAllocation = testVariants.reduce((sum, variant) => sum + (variant.variantAllocation || 0), 0);
    
    if (totalAllocation <= 0) {
      // If total allocation is 0, select a random variant
      return testVariants[Math.floor(Math.random() * testVariants.length)].creative;
    }
    
    // Generate a random value between 0 and totalAllocation
    const random = Math.random() * totalAllocation;
    
    // Select variant based on allocation
    let cumulativeAllocation = 0;
    
    for (const variant of testVariants) {
      cumulativeAllocation += (variant.variantAllocation || 0);
      
      if (random <= cumulativeAllocation) {
        return variant.creative;
      }
    }
    
    // Fallback to first variant if something goes wrong
    return testVariants[0].creative;
  }

  /**
   * Calculate the display duration for an ad creative
   */
  private calculateDisplayDuration(creative: AdCreative): number {
    // Base duration depends on creative type
    let baseDuration = 30; // Default: 30 seconds
    
    switch (creative.type) {
      case 'IMAGE':
        baseDuration = 20;
        break;
      case 'VIDEO':
        // Use video duration if available, otherwise default to 30 seconds
        baseDuration = creative.duration || 30;
        break;
      case 'TEXT':
        baseDuration = 15;
        break;
      case 'HTML':
        baseDuration = 25;
        break;
      case 'INTERACTIVE':
        baseDuration = 45;
        break;
      case 'AR_EXPERIENCE':
        baseDuration = 60;
        break;
      case 'VOICE_INTERACTIVE':
        baseDuration = 45;
        break;
    }
    
    return baseDuration;
  }

  /**
   * Create ad delivery records for the scheduled ads
   */
  private async createAdDeliveryRecords(
    scheduledAds: {
      campaign: Campaign;
      adCreative: AdCreative;
      weight: number;
      displayDuration: number;
      scheduledTime: Date;
    }[],
    device: Device
  ) {
    const deliveryRecords = [];
    
    for (const ad of scheduledAds) {
      // Create a new ad delivery record
      const delivery = await prisma.adDelivery.create({
        data: {
          campaignId: ad.campaign.id,
          adCreativeId: ad.adCreative.id,
          deviceId: device.id,
          scheduledTime: ad.scheduledTime,
          status: 'SCHEDULED',
          impressions: 0,
          engagements: 0,
          completions: 0,
        },
      });
      
      deliveryRecords.push({
        adCreativeId: ad.adCreative.id,
        campaignId: ad.campaign.id,
        adDeliveryId: delivery.id,
        priority: ad.weight,
        displayDuration: ad.displayDuration,
        scheduledTime: ad.scheduledTime,
      });
    }
    
    return deliveryRecords;
  }

  /**
   * Calculate the next time to refresh the ad rotation schedule
   */
  private calculateNextRefreshTime(context: any): Date {
    // Base refresh interval is 1 hour
    const refreshInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Calculate the next refresh time
    return new Date(new Date().getTime() + refreshInterval);
  }
}

// Export singleton instance
export const adRotationAlgorithm = new AdRotationAlgorithm(); 