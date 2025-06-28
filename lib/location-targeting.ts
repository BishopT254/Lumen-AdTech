import { prisma } from './prisma';
import { DeviceType } from '@prisma/client';

/**
 * Location-Based Targeting System
 * 
 * This module provides functionality for targeting ads based on user location,
 * including geo-fencing, proximity marketing, and location-based audience segmentation.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationContext {
  coordinates: GeoCoordinates;
  accuracy?: number;
  timestamp: Date;
  locationName?: string;
  locationType?: 'residential' | 'commercial' | 'industrial' | 'entertainment' | 'educational' | 'transit' | 'outdoor';
  poi?: {
    name: string;
    category: string;
    distance: number;
  }[];
}

export interface GeoFence {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'poi';
  coordinates: GeoCoordinates;
  radius?: number; // in meters, for circle type
  polygon?: GeoCoordinates[]; // for polygon type
  poiId?: string; // for poi type
  campaignIds: string[];
}

export interface LocationTargetingRule {
  id: string;
  name: string;
  type: 'include' | 'exclude';
  locationTypes?: string[];
  geoFenceIds?: string[];
  radiusMeters?: number;
  timeConstraints?: {
    daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
    startTime?: string; // in HH:MM format
    endTime?: string; // in HH:MM format
  };
  weatherConditions?: string[]; // e.g., 'sunny', 'rainy', 'cold'
  priority: number; // Higher number = higher priority
}

export class LocationTargetingSystem {
  /**
   * Create a new geo-fence for location targeting
   */
  async createGeoFence(geoFence: Omit<GeoFence, 'id'>): Promise<string> {
    try {
      // Generate a unique ID
      const id = `geofence_${Date.now()}_${Math.round(Math.random() * 10000)}`;
      
      // Store the geo-fence in the database
      await prisma.geoFence.create({
        data: {
          id,
          name: geoFence.name,
          type: geoFence.type,
          coordinates: {
            latitude: geoFence.coordinates.latitude,
            longitude: geoFence.coordinates.longitude
          },
          radius: geoFence.radius,
          polygon: geoFence.polygon ? JSON.stringify(geoFence.polygon) : null,
          poiId: geoFence.poiId,
          // Create campaign connections
          campaigns: {
            connect: geoFence.campaignIds.map(campaignId => ({ id: campaignId }))
          }
        }
      });
      
      return id;
    } catch (error) {
      console.error('Error creating geo-fence:', error);
      throw new Error(`Failed to create geo-fence: ${error}`);
    }
  }
  
  /**
   * Create a new location targeting rule
   */
  async createLocationTargetingRule(
    rule: Omit<LocationTargetingRule, 'id'>
  ): Promise<string> {
    try {
      // Generate a unique ID
      const id = `locRule_${Date.now()}_${Math.round(Math.random() * 10000)}`;
      
      // Store the rule in the database
      await prisma.locationTargetingRule.create({
        data: {
          id,
          name: rule.name,
          type: rule.type,
          locationTypes: rule.locationTypes ? JSON.stringify(rule.locationTypes) : null,
          geoFenceIds: rule.geoFenceIds ? JSON.stringify(rule.geoFenceIds) : null,
          radiusMeters: rule.radiusMeters || 0,
          timeConstraints: rule.timeConstraints ? JSON.stringify(rule.timeConstraints) : null,
          weatherConditions: rule.weatherConditions ? JSON.stringify(rule.weatherConditions) : null,
          priority: rule.priority
        }
      });
      
      return id;
    } catch (error) {
      console.error('Error creating location targeting rule:', error);
      throw new Error(`Failed to create location targeting rule: ${error}`);
    }
  }
  
  /**
   * Check if a device is within a geo-fence
   */
  isWithinGeoFence(geoFence: GeoFence, deviceLocation: GeoCoordinates): boolean {
    switch (geoFence.type) {
      case 'circle':
        return this.isWithinCircle(
          geoFence.coordinates,
          deviceLocation,
          geoFence.radius || 100
        );
        
      case 'polygon':
        if (!geoFence.polygon || geoFence.polygon.length < 3) {
          return false;
        }
        return this.isWithinPolygon(geoFence.polygon, deviceLocation);
        
      default:
        return false;
    }
  }
  
  /**
   * Check if coordinates are within a circular geo-fence
   */
  private isWithinCircle(
    center: GeoCoordinates,
    point: GeoCoordinates,
    radiusMeters: number
  ): boolean {
    // Calculate distance using the Haversine formula
    const distance = this.calculateDistance(center, point);
    return distance <= radiusMeters;
  }
  
  /**
   * Check if coordinates are within a polygon geo-fence
   */
  private isWithinPolygon(
    polygon: GeoCoordinates[],
    point: GeoCoordinates
  ): boolean {
    // Ray casting algorithm to determine if point is in polygon
    let isInside = false;
    const x = point.longitude;
    const y = point.latitude;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;
      
      const intersect = ((yi > y) !== (yj > y)) && 
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
      if (intersect) {
        isInside = !isInside;
      }
    }
    
    return isInside;
  }
  
  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(
    point1: GeoCoordinates,
    point2: GeoCoordinates
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
  
  /**
   * Find campaigns that match location targeting criteria
   */
  async findMatchingCampaigns(
    deviceId: string,
    location: LocationContext
  ): Promise<string[]> {
    try {
      // Get device information
      const device = await prisma.device.findUnique({
        where: { id: deviceId }
      });
      
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }
      
      // Update device location
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          lastLocation: {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
            timestamp: location.timestamp,
            accuracy: location.accuracy || 0,
            locationName: location.locationName,
            locationType: location.locationType
          }
        }
      });
      
      // Find all geo-fences
      const geoFences = await prisma.geoFence.findMany({
        include: {
          campaigns: {
            where: {
              status: 'ACTIVE'
            }
          }
        }
      });
      
      // Find matching geo-fences
      const matchingGeoFenceIds: string[] = [];
      const matchingCampaignIds = new Set<string>();
      
      for (const fence of geoFences) {
        const geoFenceObj: GeoFence = {
          id: fence.id,
          name: fence.name,
          type: fence.type as 'circle' | 'polygon' | 'poi',
          coordinates: {
            latitude: fence.coordinates.latitude,
            longitude: fence.coordinates.longitude
          },
          campaignIds: fence.campaigns.map(c => c.id)
        };
        
        // Add radius if it's a circle
        if (fence.type === 'circle' && fence.radius) {
          geoFenceObj.radius = fence.radius;
        }
        
        // Add polygon if it's a polygon
        if (fence.type === 'polygon' && fence.polygon) {
          try {
            geoFenceObj.polygon = JSON.parse(fence.polygon);
          } catch (e) {
            console.error(`Error parsing polygon for geo-fence ${fence.id}:`, e);
          }
        }
        
        // Check if device is within the geo-fence
        if (this.isWithinGeoFence(geoFenceObj, location.coordinates)) {
          matchingGeoFenceIds.push(fence.id);
          
          // Add all campaigns associated with this geo-fence
          for (const campaign of fence.campaigns) {
            matchingCampaignIds.add(campaign.id);
          }
        }
      }
      
      // Find all location targeting rules
      const targetingRules = await prisma.locationTargetingRule.findMany({
        orderBy: {
          priority: 'desc' // Process higher priority rules first
        }
      });
      
      // Apply location targeting rules
      for (const rule of targetingRules) {
        // Parse arrays from JSON
        const locationTypes = rule.locationTypes ? JSON.parse(rule.locationTypes) : [];
        const ruleGeoFenceIds = rule.geoFenceIds ? JSON.parse(rule.geoFenceIds) : [];
        const timeConstraints = rule.timeConstraints ? JSON.parse(rule.timeConstraints) : null;
        const weatherConditions = rule.weatherConditions ? JSON.parse(rule.weatherConditions) : [];
        
        // Check if the current time satisfies time constraints
        if (timeConstraints && !this.satisfiesTimeConstraints(timeConstraints)) {
          continue;
        }
        
        // Check if location type matches
        const locationTypeMatches = locationTypes.length === 0 || 
          (location.locationType && locationTypes.includes(location.locationType));
        
        // Check if geo-fence matches
        const geoFenceMatches = ruleGeoFenceIds.length === 0 || 
          ruleGeoFenceIds.some(id => matchingGeoFenceIds.includes(id));
        
        // If rule conditions are met
        if (locationTypeMatches && geoFenceMatches) {
          // Get campaigns associated with this rule
          const ruleCampaigns = await prisma.campaign.findMany({
            where: {
              locationTargetingRules: {
                some: {
                  id: rule.id
                }
              },
              status: 'ACTIVE'
            }
          });
          
          // Apply inclusion or exclusion
          if (rule.type === 'include') {
            for (const campaign of ruleCampaigns) {
              matchingCampaignIds.add(campaign.id);
            }
          } else if (rule.type === 'exclude') {
            for (const campaign of ruleCampaigns) {
              matchingCampaignIds.delete(campaign.id);
            }
          }
        }
      }
      
      return Array.from(matchingCampaignIds);
    } catch (error) {
      console.error('Error finding matching campaigns:', error);
      return [];
    }
  }
  
  /**
   * Check if the current time satisfies time constraints
   */
  private satisfiesTimeConstraints(
    timeConstraints: { daysOfWeek?: number[]; startTime?: string; endTime?: string }
  ): boolean {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check day of week
    if (timeConstraints.daysOfWeek && 
        timeConstraints.daysOfWeek.length > 0 && 
        !timeConstraints.daysOfWeek.includes(currentDay)) {
      return false;
    }
    
    // Check time of day
    if (timeConstraints.startTime && timeConstraints.endTime) {
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeMinutes = currentHours * 60 + currentMinutes;
      
      const [startHours, startMinutes] = timeConstraints.startTime.split(':').map(Number);
      const [endHours, endMinutes] = timeConstraints.endTime.split(':').map(Number);
      
      const startTimeMinutes = startHours * 60 + startMinutes;
      const endTimeMinutes = endHours * 60 + endMinutes;
      
      if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get recommended locations for a campaign based on performance data
   */
  async getLocationInsights(
    campaignId: string
  ): Promise<{
    topPerformingLocations: Array<{
      locationType: string;
      ctr: number;
      conversionRate: number;
      impressions: number;
    }>;
    recommendedGeoFences: Array<{
      name: string;
      coordinates: GeoCoordinates;
      radius: number;
      potentialReach: number;
    }>;
  }> {
    try {
      // Get all ad deliveries for the campaign
      const adDeliveries = await prisma.adDelivery.findMany({
        where: {
          campaignId
        },
        include: {
          device: true,
          interactions: true
        }
      });
      
      // Group deliveries by location type
      const locationData: Record<string, {
        impressions: number;
        clicks: number;
        conversions: number;
        deliveryIds: string[];
      }> = {};
      
      for (const delivery of adDeliveries) {
        if (!delivery.device?.lastLocation?.locationType) {
          continue;
        }
        
        const locationType = delivery.device.lastLocation.locationType;
        
        if (!locationData[locationType]) {
          locationData[locationType] = {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            deliveryIds: []
          };
        }
        
        // Add impressions
        locationData[locationType].impressions += delivery.impressions || 0;
        locationData[locationType].deliveryIds.push(delivery.id);
        
        // Count clicks and conversions from interactions
        for (const interaction of delivery.interactions) {
          if (interaction.interactionType === 'click') {
            locationData[locationType].clicks++;
          } else if (interaction.interactionType === 'conversion') {
            locationData[locationType].conversions++;
          }
        }
      }
      
      // Calculate performance metrics for each location type
      const topPerformingLocations = Object.entries(locationData)
        .map(([locationType, data]) => {
          const ctr = data.impressions > 0 ? data.clicks / data.impressions : 0;
          const conversionRate = data.clicks > 0 ? data.conversions / data.clicks : 0;
          
          return {
            locationType,
            ctr,
            conversionRate,
            impressions: data.impressions
          };
        })
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 5); // Top 5 locations
      
      // Generate recommended geo-fences based on top performing locations
      // This would typically use more sophisticated logic, possibly with a third-party
      // location intelligence API
      const recommendedGeoFences = topPerformingLocations.map((location, index) => {
        // Generate a sample geo-fence for illustration
        // In a real system, this would use actual POI data
        return {
          name: `Recommended ${location.locationType} Area ${index + 1}`,
          coordinates: {
            // Example coordinates - would be real data in production
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.006 + (Math.random() - 0.5) * 0.1
          },
          radius: 500 + Math.random() * 1000, // 500-1500m radius
          potentialReach: Math.round(1000 + Math.random() * 10000) // Estimated reach
        };
      });
      
      return {
        topPerformingLocations,
        recommendedGeoFences
      };
    } catch (error) {
      console.error('Error getting location insights:', error);
      return {
        topPerformingLocations: [],
        recommendedGeoFences: []
      };
    }
  }
  
  /**
   * Get nearby points of interest (POIs) for location-based targeting
   */
  async getNearbyPOIs(
    coordinates: GeoCoordinates,
    radius: number,
    categories?: string[]
  ): Promise<Array<{
    id: string;
    name: string;
    category: string;
    coordinates: GeoCoordinates;
    distance: number;
  }>> {
    try {
      // In a real implementation, this would call a location intelligence API
      // For demonstration, we'll return sample data
      
      // Simulated POIs around the given coordinates
      const samplePOIs = [
        {
          id: 'poi_1',
          name: 'Central Park',
          category: 'park',
          coordinates: {
            latitude: coordinates.latitude + 0.01,
            longitude: coordinates.longitude + 0.01
          }
        },
        {
          id: 'poi_2',
          name: 'Downtown Mall',
          category: 'shopping',
          coordinates: {
            latitude: coordinates.latitude - 0.005,
            longitude: coordinates.longitude + 0.007
          }
        },
        {
          id: 'poi_3',
          name: 'City Stadium',
          category: 'sports',
          coordinates: {
            latitude: coordinates.latitude + 0.02,
            longitude: coordinates.longitude - 0.01
          }
        },
        {
          id: 'poi_4',
          name: 'Business District',
          category: 'business',
          coordinates: {
            latitude: coordinates.latitude - 0.01,
            longitude: coordinates.longitude - 0.015
          }
        },
        {
          id: 'poi_5',
          name: 'University Campus',
          category: 'education',
          coordinates: {
            latitude: coordinates.latitude + 0.015,
            longitude: coordinates.longitude + 0.02
          }
        }
      ];
      
      // Calculate distance for each POI and filter by radius and category
      return samplePOIs
        .map(poi => {
          const distance = this.calculateDistance(coordinates, poi.coordinates);
          return { ...poi, distance };
        })
        .filter(poi => {
          const withinRadius = poi.distance <= radius;
          const matchesCategory = !categories || categories.length === 0 || 
            categories.includes(poi.category);
          
          return withinRadius && matchesCategory;
        })
        .sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Error getting nearby POIs:', error);
      return [];
    }
  }
  
  /**
   * Get device targeting recommendations based on location
   */
  async getDeviceTargetingRecommendations(
    campaignId: string
  ): Promise<{
    recommendedDeviceTypes: DeviceType[];
    timeOfDayRecommendations: Record<string, string[]>;
    locationTypeRecommendations: string[];
  }> {
    try {
      // Get campaign analytics with device breakdown
      const analytics = await prisma.campaignAnalytics.findMany({
        where: {
          campaignId
        },
        orderBy: {
          date: 'desc'
        },
        take: 30 // Last 30 days
      });
      
      // Get all ad deliveries for the campaign with device info
      const adDeliveries = await prisma.adDelivery.findMany({
        where: {
          campaignId
        },
        include: {
          device: true,
          interactions: true
        }
      });
      
      // Group performance by device type
      const devicePerformance: Record<DeviceType, {
        impressions: number;
        engagements: number;
        conversions: number;
      }> = {
        DESKTOP: { impressions: 0, engagements: 0, conversions: 0 },
        MOBILE: { impressions: 0, engagements: 0, conversions: 0 },
        TABLET: { impressions: 0, engagements: 0, conversions: 0 },
        SMART_TV: { impressions: 0, engagements: 0, conversions: 0 },
        BILLBOARD: { impressions: 0, engagements: 0, conversions: 0 },
        KIOSK: { impressions: 0, engagements: 0, conversions: 0 }
      };
      
      // Group performance by time of day
      const timeOfDayPerformance: Record<string, {
        impressions: number;
        engagements: number;
        conversions: number;
      }> = {
        'morning': { impressions: 0, engagements: 0, conversions: 0 },
        'afternoon': { impressions: 0, engagements: 0, conversions: 0 },
        'evening': { impressions: 0, engagements: 0, conversions: 0 },
        'night': { impressions: 0, engagements: 0, conversions: 0 }
      };
      
      // Group performance by location type
      const locationTypePerformance: Record<string, {
        impressions: number;
        engagements: number;
        conversions: number;
      }> = {};
      
      // Process deliveries
      for (const delivery of adDeliveries) {
        if (!delivery.device) continue;
        
        const deviceType = delivery.device.deviceType;
        devicePerformance[deviceType].impressions += delivery.impressions || 0;
        devicePerformance[deviceType].engagements += delivery.engagements || 0;
        
        // Process interactions for conversions
        for (const interaction of delivery.interactions) {
          if (interaction.interactionType === 'conversion') {
            devicePerformance[deviceType].conversions++;
          }
        }
        
        // Process time of day
        const hour = new Date(delivery.scheduledTime).getHours();
        let timeOfDay: string;
        
        if (hour >= 5 && hour < 12) {
          timeOfDay = 'morning';
        } else if (hour >= 12 && hour < 17) {
          timeOfDay = 'afternoon';
        } else if (hour >= 17 && hour < 22) {
          timeOfDay = 'evening';
        } else {
          timeOfDay = 'night';
        }
        
        timeOfDayPerformance[timeOfDay].impressions += delivery.impressions || 0;
        timeOfDayPerformance[timeOfDay].engagements += delivery.engagements || 0;
        
        // Process location type if available
        if (delivery.device.lastLocation?.locationType) {
          const locationType = delivery.device.lastLocation.locationType;
          
          if (!locationTypePerformance[locationType]) {
            locationTypePerformance[locationType] = {
              impressions: 0,
              engagements: 0,
              conversions: 0
            };
          }
          
          locationTypePerformance[locationType].impressions += delivery.impressions || 0;
          locationTypePerformance[locationType].engagements += delivery.engagements || 0;
          
          // Count conversions from location
          for (const interaction of delivery.interactions) {
            if (interaction.interactionType === 'conversion') {
              locationTypePerformance[locationType].conversions++;
            }
          }
        }
      }
      
      // Calculate engagement rates for devices
      const deviceEngagementRates = Object.entries(devicePerformance).map(([type, data]) => {
        const engagementRate = data.impressions > 0 ? data.engagements / data.impressions : 0;
        return { type, engagementRate };
      });
      
      // Sort by engagement rate and get top 3
      const recommendedDeviceTypes = deviceEngagementRates
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 3)
        .map(item => item.type as DeviceType);
      
      // Determine best time of day for each location type
      const timeOfDayRecommendations: Record<string, string[]> = {};
      
      Object.entries(locationTypePerformance).forEach(([locationType, _]) => {
        // Calculate engagement rate for each time of day at this location type
        const timePerformance = Object.entries(timeOfDayPerformance).map(([time, data]) => {
          const engagementRate = data.impressions > 0 ? data.engagements / data.impressions : 0;
          return { time, engagementRate };
        });
        
        // Sort by engagement rate and get top 2
        timeOfDayRecommendations[locationType] = timePerformance
          .sort((a, b) => b.engagementRate - a.engagementRate)
          .slice(0, 2)
          .map(item => item.time);
      });
      
      // Calculate engagement rates for location types
      const locationEngagementRates = Object.entries(locationTypePerformance).map(([type, data]) => {
        const engagementRate = data.impressions > 0 ? data.engagements / data.impressions : 0;
        return { type, engagementRate };
      });
      
      // Sort by engagement rate and get top 3
      const locationTypeRecommendations = locationEngagementRates
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, 3)
        .map(item => item.type);
      
      return {
        recommendedDeviceTypes,
        timeOfDayRecommendations,
        locationTypeRecommendations
      };
    } catch (error) {
      console.error('Error getting device targeting recommendations:', error);
      return {
        recommendedDeviceTypes: [],
        timeOfDayRecommendations: {},
        locationTypeRecommendations: []
      };
    }
  }
}

// Export singleton instance
export const locationTargeting = new LocationTargetingSystem(); 