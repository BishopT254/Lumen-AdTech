import { prisma } from './prisma';
import { Campaign, CampaignAnalytics, PricingModel, DeviceType } from '@prisma/client';

/**
 * Dynamic Pricing Engine Module
 * 
 * This module provides intelligent pricing calculations for ad campaigns,
 * implementing dynamic price adjustments based on demand, location,
 * time factors, and historical performance data.
 */

interface DynamicPricingInput {
  campaignId?: string;
  advertiserId?: string;
  location?: {
    city?: string;
    country?: string;
    locationType?: 'URBAN' | 'SUBURBAN' | 'RURAL';
  };
  timeFrame?: {
    startDate?: Date;
    endDate?: Date;
    timeOfDay?: number[];
    daysOfWeek?: number[];
  };
  targetAudience?: {
    ageRanges?: string[];
    genders?: string[];
  };
  adType?: string;
  deviceType?: DeviceType;
  pricingModel?: PricingModel;
  objective?: string;
}

interface PricingOutput {
  baseRate: {
    cpm: number;
    cpe: number;
    cpa: number;
  };
  adjustedRate: {
    cpm: number;
    cpe: number;
    cpa: number;
  };
  forecastData: {
    hourly: { hour: number; rate: number }[];
    daily: { day: number; rate: number }[];
    weeklyTrend: number[];
  };
  inventoryData: {
    availableSlots: number;
    demandLevel: number;
    competitionLevel: number;
  };
  recommendedBudget: {
    daily: number;
    total: number;
  };
  insights: {
    priceDrivers: { factor: string; impact: number }[];
    potentialSavings: { strategy: string; savingsPercent: number }[];
  };
}

export class DynamicPricingEngine {
  // Base rates by content type
  private baseRates = {
    IMAGE: { cpm: 5.0, cpe: 0.5, cpa: 10.0 },
    VIDEO: { cpm: 8.0, cpe: 0.8, cpa: 15.0 },
    INTERACTIVE: { cpm: 10.0, cpe: 1.0, cpa: 20.0 },
    AR_EXPERIENCE: { cpm: 15.0, cpe: 1.5, cpa: 25.0 },
    DEFAULT: { cpm: 5.0, cpe: 0.5, cpa: 10.0 }
  };

  // Demand multipliers by time of day (24-hour format)
  private timeMultipliers = Array(24).fill(0).map((_, hour) => {
    // Morning commute (6-9 AM)
    if (hour >= 6 && hour <= 9) return 1.3;
    // Lunch hours (12-2 PM)
    if (hour >= 12 && hour <= 14) return 1.2;
    // Evening commute (4-7 PM)
    if (hour >= 16 && hour <= 19) return 1.4;
    // Prime evening (7-10 PM)
    if (hour >= 19 && hour <= 22) return 1.5;
    // Late night (11 PM - 5 AM)
    if (hour >= 23 || hour <= 5) return 0.7;
    // Standard daytime
    return 1.0;
  });

  // Day of week multipliers (0 = Sunday, 6 = Saturday)
  private dayMultipliers = [
    0.9,  // Sunday
    1.1,  // Monday
    1.2,  // Tuesday
    1.2,  // Wednesday
    1.3,  // Thursday
    1.4,  // Friday
    1.0   // Saturday
  ];

  // Location type multipliers
  private locationMultipliers = {
    URBAN: 1.3,
    SUBURBAN: 1.0,
    RURAL: 0.8
  };

  // Device type multipliers
  private deviceMultipliers: Record<DeviceType, number> = {
    ANDROID_TV: 1.0,
    DIGITAL_SIGNAGE: 1.2,
    INTERACTIVE_KIOSK: 1.5,
    VEHICLE_MOUNTED: 1.3,
    RETAIL_DISPLAY: 1.4
  };

  // Campaign objective multipliers
  private objectiveMultipliers = {
    AWARENESS: 0.9,
    CONSIDERATION: 1.0,
    CONVERSION: 1.3,
    TRAFFIC: 1.1,
    ENGAGEMENT: 1.2
  };

  /**
   * Calculate dynamic pricing based on input parameters
   */
  async calculatePricing(input: DynamicPricingInput): Promise<PricingOutput> {
    try {
      // Get historical performance data
      const historicalData = await this.getHistoricalData(input);
      
      // Calculate base rates
      const baseRate = this.calculateBaseRate(input, historicalData);
      
      // Calculate demand level
      const demandLevel = await this.calculateDemandLevel(input);
      
      // Apply time-based adjustments
      const timeAdjustedRate = this.applyTimeAdjustments(baseRate, input);
      
      // Apply location-based adjustments
      const locationAdjustedRate = this.applyLocationAdjustments(timeAdjustedRate, input);
      
      // Apply demand-based adjustments
      const demandAdjustedRate = this.applyDemandAdjustments(locationAdjustedRate, demandLevel);
      
      // Calculate inventory data
      const inventoryData = await this.calculateInventoryData(input);
      
      // Generate price forecast
      const forecastData = this.generatePriceForecast(demandAdjustedRate, input);
      
      // Calculate recommended budget
      const recommendedBudget = this.calculateRecommendedBudget(demandAdjustedRate, input, inventoryData);
      
      // Generate insights
      const insights = this.generateInsights(baseRate, demandAdjustedRate, input, demandLevel);
      
      return {
        baseRate,
        adjustedRate: demandAdjustedRate,
        forecastData,
        inventoryData,
        recommendedBudget,
        insights
      };
    } catch (error) {
      console.error('Error calculating dynamic pricing:', error);
      throw error;
    }
  }

  /**
   * Get historical performance data for similar campaigns
   */
  private async getHistoricalData(input: DynamicPricingInput) {
    // Define query parameters
    const queryParams: any = {};
    
    // Time frame filters
    const startDate = input.timeFrame?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default to last 90 days
    const endDate = input.timeFrame?.endDate || new Date();
    
    // Fetch relevant campaign analytics
    let campaignAnalytics;
    
    if (input.campaignId) {
      // Get analytics for specific campaign
      campaignAnalytics = await prisma.campaignAnalytics.findMany({
        where: {
          campaignId: input.campaignId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          campaign: true
        }
      });
    } else if (input.advertiserId) {
      // Get analytics for all campaigns from this advertiser
      campaignAnalytics = await prisma.campaignAnalytics.findMany({
        where: {
          campaign: {
            advertiserId: input.advertiserId
          },
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          campaign: true
        }
      });
    } else {
      // Get analytics for similar campaigns based on criteria
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };
      
      if (input.pricingModel) {
        whereClause.campaign = {
          pricingModel: input.pricingModel
        };
      }
      
      if (input.objective) {
        whereClause.campaign = {
          ...(whereClause.campaign || {}),
          objective: input.objective
        };
      }
      
      campaignAnalytics = await prisma.campaignAnalytics.findMany({
        where: whereClause,
        include: {
          campaign: true
        },
        take: 100 // Limit to prevent excessive data
      });
    }
    
    // Calculate aggregated metrics
    const aggregatedData = this.aggregateAnalyticsData(campaignAnalytics);
    
    return {
      raw: campaignAnalytics,
      aggregated: aggregatedData
    };
  }

  /**
   * Aggregate analytics data to calculate performance metrics
   */
  private aggregateAnalyticsData(analytics: (CampaignAnalytics & { campaign: Campaign })[]) {
    if (!analytics || analytics.length === 0) {
      return {
        totalImpressions: 0,
        totalEngagements: 0,
        totalConversions: 0,
        averageCTR: 0,
        averageConversionRate: 0,
        averageCPM: 0,
        averageCPE: 0,
        averageCPA: 0,
        dailyImpressions: 0
      };
    }
    
    const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
    const totalEngagements = analytics.reduce((sum, item) => sum + item.engagements, 0);
    const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);
    
    // Calculate average rates
    const averageCTR = totalImpressions > 0 ? totalEngagements / totalImpressions : 0;
    const averageConversionRate = totalEngagements > 0 ? totalConversions / totalEngagements : 0;
    
    // Calculate cost metrics
    let totalCost = 0;
    for (const item of analytics) {
      const costData = item.costData as any;
      if (costData && costData.spend) {
        totalCost += costData.spend;
      }
    }
    
    const averageCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const averageCPE = totalEngagements > 0 ? totalCost / totalEngagements : 0;
    const averageCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
    
    // Calculate daily average
    const uniqueDays = new Set(analytics.map(item => item.date.toISOString().split('T')[0])).size;
    const dailyImpressions = uniqueDays > 0 ? totalImpressions / uniqueDays : 0;
    
    return {
      totalImpressions,
      totalEngagements,
      totalConversions,
      averageCTR,
      averageConversionRate,
      averageCPM,
      averageCPE,
      averageCPA,
      dailyImpressions
    };
  }

  /**
   * Calculate base rate for the specified pricing model
   */
  private calculateBaseRate(input: DynamicPricingInput, historicalData: any) {
    // Determine ad type for base rate
    const adType = input.adType || 'DEFAULT';
    
    // Get base rate for this ad type
    const baseRate = { ...this.baseRates[adType as keyof typeof this.baseRates] || this.baseRates.DEFAULT };
    
    // Adjust base rate based on historical performance if available
    if (historicalData.aggregated.totalImpressions > 1000) {
      // We have enough historical data to make adjustments
      if (historicalData.aggregated.averageCPM > 0) {
        baseRate.cpm = (baseRate.cpm + historicalData.aggregated.averageCPM) / 2;
      }
      
      if (historicalData.aggregated.averageCPE > 0) {
        baseRate.cpe = (baseRate.cpe + historicalData.aggregated.averageCPE) / 2;
      }
      
      if (historicalData.aggregated.averageCPA > 0) {
        baseRate.cpa = (baseRate.cpa + historicalData.aggregated.averageCPA) / 2;
      }
    }
    
    // Apply campaign objective adjustments if specified
    if (input.objective) {
      const objectiveMultiplier = this.objectiveMultipliers[input.objective as keyof typeof this.objectiveMultipliers] || 1.0;
      baseRate.cpm *= objectiveMultiplier;
      baseRate.cpe *= objectiveMultiplier;
      baseRate.cpa *= objectiveMultiplier;
    }
    
    return baseRate;
  }

  /**
   * Calculate current demand level (0-1 scale)
   */
  private async calculateDemandLevel(input: DynamicPricingInput): Promise<number> {
    try {
      // Get current time factors
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      // Get scheduled ad deliveries for the current time period
      const startOfHour = new Date(now);
      startOfHour.setMinutes(0, 0, 0);
      
      const endOfHour = new Date(startOfHour);
      endOfHour.setHours(startOfHour.getHours() + 1);
      
      // Count scheduled ads for this hour across all devices
      const scheduledAdsCount = await prisma.adDelivery.count({
        where: {
          scheduledTime: {
            gte: startOfHour,
            lt: endOfHour
          }
        }
      });
      
      // Count available devices
      const activeDevicesCount = await prisma.device.count({
        where: {
          status: 'ACTIVE'
        }
      });
      
      if (activeDevicesCount === 0) {
        return 0.5; // Default to medium demand if no active devices
      }
      
      // Calculate slots per device per hour (simplified)
      const averageSlotsPerDevice = 12; // Assume 5-minute slots on average (12 per hour)
      const totalSlots = activeDevicesCount * averageSlotsPerDevice;
      
      // Calculate demand level (0-1)
      let demandLevel = scheduledAdsCount / totalSlots;
      
      // Ensure it's in the 0-1 range
      demandLevel = Math.max(0, Math.min(1, demandLevel));
      
      // Apply time-based modifiers
      const timeMultiplier = this.timeMultipliers[currentHour];
      const dayMultiplier = this.dayMultipliers[currentDay];
      
      // Final weighted demand level
      demandLevel = demandLevel * 0.6 + (timeMultiplier / 1.5) * 0.25 + (dayMultiplier / 1.4) * 0.15;
      
      return Math.max(0, Math.min(1, demandLevel));
    } catch (error) {
      console.error('Error calculating demand level:', error);
      return 0.5; // Default to medium demand on error
    }
  }

  /**
   * Apply time-based adjustments to rates
   */
  private applyTimeAdjustments(baseRate: { cpm: number; cpe: number; cpa: number }, input: DynamicPricingInput) {
    const adjustedRate = { ...baseRate };
    
    // Apply time of day adjustments if specified
    if (input.timeFrame?.timeOfDay && input.timeFrame.timeOfDay.length > 0) {
      // Calculate average multiplier for selected hours
      const hourMultipliers = input.timeFrame.timeOfDay.map(hour => this.timeMultipliers[hour]);
      const avgHourMultiplier = hourMultipliers.reduce((sum, mult) => sum + mult, 0) / hourMultipliers.length;
      
      adjustedRate.cpm *= avgHourMultiplier;
      adjustedRate.cpe *= avgHourMultiplier;
      adjustedRate.cpa *= avgHourMultiplier;
    } else {
      // Apply general time of day distribution
      const avgTimeMultiplier = this.timeMultipliers.reduce((sum, mult) => sum + mult, 0) / 24;
      
      adjustedRate.cpm *= avgTimeMultiplier;
      adjustedRate.cpe *= avgTimeMultiplier;
      adjustedRate.cpa *= avgTimeMultiplier;
    }
    
    // Apply day of week adjustments if specified
    if (input.timeFrame?.daysOfWeek && input.timeFrame.daysOfWeek.length > 0) {
      // Calculate average multiplier for selected days
      const dayMultipliers = input.timeFrame.daysOfWeek.map(day => this.dayMultipliers[day]);
      const avgDayMultiplier = dayMultipliers.reduce((sum, mult) => sum + mult, 0) / dayMultipliers.length;
      
      adjustedRate.cpm *= avgDayMultiplier;
      adjustedRate.cpe *= avgDayMultiplier;
      adjustedRate.cpa *= avgDayMultiplier;
    } else {
      // Apply general day of week distribution
      const avgDayMultiplier = this.dayMultipliers.reduce((sum, mult) => sum + mult, 0) / 7;
      
      adjustedRate.cpm *= avgDayMultiplier;
      adjustedRate.cpe *= avgDayMultiplier;
      adjustedRate.cpa *= avgDayMultiplier;
    }
    
    return adjustedRate;
  }

  /**
   * Apply location-based adjustments to rates
   */
  private applyLocationAdjustments(
    rate: { cpm: number; cpe: number; cpa: number },
    input: DynamicPricingInput
  ) {
    const adjustedRate = { ...rate };
    
    // Apply location type adjustment if specified
    if (input.location?.locationType) {
      const locationMultiplier = this.locationMultipliers[input.location.locationType] || 1.0;
      
      adjustedRate.cpm *= locationMultiplier;
      adjustedRate.cpe *= locationMultiplier;
      adjustedRate.cpa *= locationMultiplier;
    }
    
    // Apply device type adjustment if specified
    if (input.deviceType) {
      const deviceMultiplier = this.deviceMultipliers[input.deviceType] || 1.0;
      
      adjustedRate.cpm *= deviceMultiplier;
      adjustedRate.cpe *= deviceMultiplier;
      adjustedRate.cpa *= deviceMultiplier;
    }
    
    return adjustedRate;
  }

  /**
   * Apply demand-based adjustments to rates
   */
  private applyDemandAdjustments(
    rate: { cpm: number; cpe: number; cpa: number },
    demandLevel: number
  ) {
    const adjustedRate = { ...rate };
    
    // Calculate demand multiplier (exponential curve)
    // At 0% demand: 0.7x multiplier
    // At 50% demand: 1.0x multiplier
    // At 100% demand: 1.8x multiplier
    const demandMultiplier = 0.7 + Math.pow(demandLevel, 1.5) * 1.1;
    
    adjustedRate.cpm *= demandMultiplier;
    adjustedRate.cpe *= demandMultiplier;
    adjustedRate.cpa *= demandMultiplier;
    
    return adjustedRate;
  }

  /**
   * Calculate inventory data (available slots, competition)
   */
  private async calculateInventoryData(input: DynamicPricingInput) {
    try {
      // Default values
      let availableSlots = 0;
      let demandLevel = 0.5;
      let competitionLevel = 0.5;
      
      // Get current time
      const now = new Date();
      const startDate = input.timeFrame?.startDate || now;
      const endDate = input.timeFrame?.endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days
      
      // Count active devices
      const activeDevicesCount = await prisma.device.count({
        where: {
          status: 'ACTIVE',
          ...(input.deviceType ? { deviceType: input.deviceType } : {})
        }
      });
      
      // Estimate available slots
      const hoursBetweenDates = Math.max(1, (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000));
      const averageSlotsPerDevicePerHour = 12; // 5-minute slots
      
      availableSlots = activeDevicesCount * averageSlotsPerDevicePerHour * hoursBetweenDates;
      
      // Count existing scheduled ads
      const scheduledAdsCount = await prisma.adDelivery.count({
        where: {
          scheduledTime: {
            gte: startDate,
            lte: endDate
          },
          ...(input.deviceType ? { 
            device: { 
              deviceType: input.deviceType 
            } 
          } : {})
        }
      });
      
      // Calculate demand level
      demandLevel = Math.min(1, scheduledAdsCount / Math.max(1, availableSlots));
      
      // Count unique campaigns in this period as a proxy for competition
      const uniqueCampaignsCount = await prisma.adDelivery.groupBy({
        by: ['campaignId'],
        where: {
          scheduledTime: {
            gte: startDate,
            lte: endDate
          }
        }
      }).then(groups => groups.length);
      
      // Calculate competition level (normalize to 0-1)
      // Assuming 50+ campaigns is high competition (1.0)
      competitionLevel = Math.min(1, uniqueCampaignsCount / 50);
      
      return {
        availableSlots,
        demandLevel,
        competitionLevel
      };
    } catch (error) {
      console.error('Error calculating inventory data:', error);
      return {
        availableSlots: 1000, // Fallback value
        demandLevel: 0.5,
        competitionLevel: 0.5
      };
    }
  }

  /**
   * Generate price forecast data
   */
  private generatePriceForecast(
    rate: { cpm: number; cpe: number; cpa: number },
    input: DynamicPricingInput
  ) {
    // Generate hourly forecast
    const hourly = Array(24).fill(0).map((_, hour) => {
      const hourlyRate = rate.cpm * this.timeMultipliers[hour];
      return { hour, rate: parseFloat(hourlyRate.toFixed(2)) };
    });
    
    // Generate daily forecast
    const daily = Array(7).fill(0).map((_, day) => {
      const dailyRate = rate.cpm * this.dayMultipliers[day];
      return { day, rate: parseFloat(dailyRate.toFixed(2)) };
    });
    
    // Generate weekly trend (simplified)
    // Shows how rates might change over the next 4 weeks
    const weeklyTrend = [0, 1, 2, 3].map(week => {
      // Basic simulation of market trends
      const trendFactor = 1 + (Math.random() * 0.1 - 0.05) * week;
      return parseFloat((rate.cpm * trendFactor).toFixed(2));
    });
    
    return {
      hourly,
      daily,
      weeklyTrend
    };
  }

  /**
   * Calculate recommended budget based on inventory and rates
   */
  private calculateRecommendedBudget(
    rate: { cpm: number; cpe: number; cpa: number },
    input: DynamicPricingInput,
    inventoryData: { availableSlots: number; demandLevel: number; competitionLevel: number }
  ) {
    // Calculate recommended daily impression count based on available slots
    const totalDays = input.timeFrame?.startDate && input.timeFrame?.endDate 
      ? Math.max(1, (input.timeFrame.endDate.getTime() - input.timeFrame.startDate.getTime()) / (24 * 60 * 60 * 1000))
      : 30; // Default to 30 days
    
    // Calculate impressions as a portion of available inventory
    // Use competition level to adjust portion (higher competition = need larger budget)
    const targetShareOfVoice = 0.1 + inventoryData.competitionLevel * 0.2; // 10-30% share of voice
    const recommendedImpressions = inventoryData.availableSlots * targetShareOfVoice;
    const dailyImpressions = recommendedImpressions / totalDays;
    
    // Calculate budget based on pricing model
    let dailyBudget = 0;
    
    if (input.pricingModel === 'CPM' || !input.pricingModel) {
      dailyBudget = (rate.cpm * dailyImpressions) / 1000;
    } else if (input.pricingModel === 'CPE') {
      // Estimate engagements based on average CTR of 0.5%
      const estimatedEngagements = dailyImpressions * 0.005;
      dailyBudget = rate.cpe * estimatedEngagements;
    } else if (input.pricingModel === 'CPA') {
      // Estimate conversions based on average conversion rate of 0.05%
      const estimatedConversions = dailyImpressions * 0.0005;
      dailyBudget = rate.cpa * estimatedConversions;
    } else if (input.pricingModel === 'HYBRID') {
      // Use a weighted combination
      const estimatedEngagements = dailyImpressions * 0.005;
      const estimatedConversions = dailyImpressions * 0.0005;
      dailyBudget = ((rate.cpm * dailyImpressions) / 1000 * 0.5) +
                   (rate.cpe * estimatedEngagements * 0.3) +
                   (rate.cpa * estimatedConversions * 0.2);
    }
    
    // Round to nearest dollar
    dailyBudget = Math.round(dailyBudget);
    
    // Calculate total campaign budget
    const totalBudget = dailyBudget * totalDays;
    
    return {
      daily: dailyBudget,
      total: totalBudget
    };
  }

  /**
   * Generate pricing insights
   */
  private generateInsights(
    baseRate: { cpm: number; cpe: number; cpa: number },
    adjustedRate: { cpm: number; cpe: number; cpa: number },
    input: DynamicPricingInput,
    demandLevel: number
  ) {
    const priceDrivers = [];
    const potentialSavings = [];
    
    // Calculate impact of each factor
    const demandImpact = adjustedRate.cpm / baseRate.cpm - 1;
    
    // Add price drivers
    priceDrivers.push({
      factor: 'Market Demand',
      impact: parseFloat((demandImpact * 100).toFixed(1))
    });
    
    if (input.deviceType) {
      const deviceMultiplier = this.deviceMultipliers[input.deviceType] || 1.0;
      priceDrivers.push({
        factor: 'Device Type',
        impact: parseFloat(((deviceMultiplier - 1) * 100).toFixed(1))
      });
    }
    
    if (input.location?.locationType) {
      const locationMultiplier = this.locationMultipliers[input.location.locationType] || 1.0;
      priceDrivers.push({
        factor: 'Location Type',
        impact: parseFloat(((locationMultiplier - 1) * 100).toFixed(1))
      });
    }
    
    // Add potential savings strategies
    potentialSavings.push({
      strategy: 'Off-Peak Hours',
      savingsPercent: Math.round((1 - this.timeMultipliers[3] / this.timeMultipliers[18]) * 100) // Comparing 3AM to 6PM
    });
    
    potentialSavings.push({
      strategy: 'Weekend Scheduling',
      savingsPercent: Math.round((1 - this.dayMultipliers[0] / this.dayMultipliers[4]) * 100) // Comparing Sunday to Thursday
    });
    
    if (demandLevel > 0.7) {
      potentialSavings.push({
        strategy: 'Advanced Booking',
        savingsPercent: Math.round(20 + Math.random() * 10) // 20-30% savings for booking in advance
      });
    }
    
    return {
      priceDrivers,
      potentialSavings
    };
  }
}

// Export singleton instance
export const dynamicPricingEngine = new DynamicPricingEngine(); 