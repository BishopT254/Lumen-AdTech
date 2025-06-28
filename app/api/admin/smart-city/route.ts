import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';
import { DeviceType } from '@prisma/client';

// Type definitions for location data
type LocationData = {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  venue: string;
  venueType: string;
  area?: string;
};

type RouteDetails = {
  routeName: string;
  routeId: string;
  startPoint: LocationData;
  endPoint: LocationData;
  waypoints: LocationData[];
  schedule: Record<string, any>;
};

type DeviceLocation = {
  id: string;
  name: string;
  type: DeviceType;
  partnerId: string;
  partnerName: string;
  lastActive: Date | null;
  location: LocationData;
  routeDetails: RouteDetails | null;
};

type AdDeliveryRecord = {
  id: string;
  deviceId: string;
  locationData: any;
  weatherData: any;
  scheduledTime: Date;
  impressions: number | null;
  engagements: number | null;
  device?: {
    deviceType: DeviceType;
    location: any;
  } | null;
};

type LocationPerformance = {
  city: string;
  area: string;
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  deliveryCount: number;
  deviceTypes: { type: string; count: number }[];
};

export async function GET() {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Get devices with location data
    const devices = await prisma.device.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        location: true,
        routeDetails: true,
        partnerId: true,
        partner: {
          select: {
            companyName: true
          }
        },
        lastActive: true
      }
    });

    // Get ad deliveries with location data for the past 30 days
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        scheduledTime: {
          gte: subDays(new Date(), 30)
        },
        locationData: {
          not: null
        }
      },
      select: {
        id: true,
        deviceId: true,
        locationData: true,
        weatherData: true,
        scheduledTime: true,
        impressions: true,
        engagements: true,
        device: {
          select: {
            deviceType: true,
            location: true
          }
        }
      },
      take: 500
    });

    // Process device locations
    const deviceLocations: DeviceLocation[] = devices.map(device => {
      // Extract location data from JSON field
      const location = typeof device.location === 'string' 
        ? JSON.parse(device.location) 
        : device.location;
      
      // Extract route details if available
      const routeDetails = device.routeDetails 
        ? (typeof device.routeDetails === 'string' 
          ? JSON.parse(device.routeDetails) 
          : device.routeDetails)
        : null;
      
      return {
        id: device.id,
        name: device.name,
        type: device.deviceType,
        partnerId: device.partnerId,
        partnerName: device.partner?.companyName || 'Unknown',
        lastActive: device.lastActive,
        location: {
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          address: location?.address || '',
          city: location?.city || '',
          country: location?.country || '',
          venue: location?.venue || '',
          venueType: location?.venueType || '',
        },
        routeDetails: routeDetails ? {
          routeName: routeDetails.routeName || '',
          routeId: routeDetails.routeId || '',
          startPoint: routeDetails.startPoint || {},
          endPoint: routeDetails.endPoint || {},
          waypoints: routeDetails.waypoints || [],
          schedule: routeDetails.schedule || {}
        } : null
      };
    });

    // Process location-based performance data
    const locationPerformance = processLocationPerformance(adDeliveries);

    // Get all unique cities where devices are deployed
    const cities = [...new Set(deviceLocations
      .map(d => d.location.city)
      .filter(city => city && city.trim() !== '')
    )];

    // Get all unique venue types
    const venueTypes = [...new Set(deviceLocations
      .map(d => d.location.venueType)
      .filter(vt => vt && vt.trim() !== '')
    )];

    // Count devices by city and venue type
    const devicesByCity: Record<string, number> = {};
    const devicesByVenueType: Record<string, number> = {};

    deviceLocations.forEach(device => {
      const city = device.location.city || 'Unknown';
      const venueType = device.location.venueType || 'Unknown';
      
      devicesByCity[city] = (devicesByCity[city] || 0) + 1;
      devicesByVenueType[venueType] = (devicesByVenueType[venueType] || 0) + 1;
    });

    // Format device counts by city and venue type
    const cityDistribution = Object.entries(devicesByCity)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const venueDistribution = Object.entries(devicesByVenueType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Fetch traffic pattern data from database if available
    const trafficConfig = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'TRAFFIC_PATTERNS'
      }
    });
    
    // Traffic pattern insights - use real data or defaults
    const trafficPatterns = trafficConfig && typeof trafficConfig.configValue === 'object'
      ? trafficConfig.configValue
      : [
          {
            id: 1,
            city: 'Nairobi',
            area: 'Central Business District',
            peakHours: ['07:00-09:00', '17:00-19:00'],
            avgDwellTime: 12.5, // minutes
            congestionLevel: 'HIGH',
            dayOfWeek: 'WEEKDAY'
          },
          {
            id: 2,
            city: 'Nairobi',
            area: 'Westlands',
            peakHours: ['08:00-10:00', '16:00-18:00'],
            avgDwellTime: 18.2,
            congestionLevel: 'MEDIUM',
            dayOfWeek: 'WEEKDAY'
          },
          {
            id: 3,
            city: 'Mombasa',
            area: 'City Center',
            peakHours: ['07:30-09:30', '16:30-18:30'],
            avgDwellTime: 15.7,
            congestionLevel: 'MEDIUM',
            dayOfWeek: 'WEEKDAY'
          },
          {
            id: 4,
            city: 'Nairobi',
            area: 'Shopping Districts',
            peakHours: ['10:00-18:00'],
            avgDwellTime: 42.1,
            congestionLevel: 'MEDIUM',
            dayOfWeek: 'WEEKEND'
          }
        ];

    // Fetch weather impact data from database if available
    const weatherConfig = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'WEATHER_IMPACT'
      }
    });
    
    // Weather impact on engagement - use real data or defaults
    const weatherImpact = weatherConfig && typeof weatherConfig.configValue === 'object'
      ? weatherConfig.configValue
      : [
          {
            condition: 'SUNNY',
            avgEngagementRate: 5.2,
            relativePerformance: 1.0, // baseline
            sampleSize: 1250
          },
          {
            condition: 'CLOUDY',
            avgEngagementRate: 5.8,
            relativePerformance: 1.12,
            sampleSize: 920
          },
          {
            condition: 'RAINY',
            avgEngagementRate: 6.7,
            relativePerformance: 1.29,
            sampleSize: 480
          },
          {
            condition: 'NIGHT',
            avgEngagementRate: 4.3,
            relativePerformance: 0.83,
            sampleSize: 850
          }
        ];
        
    // Fetch location recommendations from database if available
    const recommendationsConfig = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'LOCATION_RECOMMENDATIONS'
      }
    });
    
    // Recommended locations - use real data or defaults
    const recommendedLocations = recommendationsConfig && typeof recommendationsConfig.configValue === 'object'
      ? recommendationsConfig.configValue
      : [
          {
            city: 'Nairobi',
            area: 'Kilimani',
            type: 'RETAIL',
            potentialScore: 92,
            reasonForRecommendation: 'High foot traffic, affluent demographic, complementary to existing advertising mix'
          },
          {
            city: 'Mombasa',
            area: 'Nyali',
            type: 'HOSPITALITY',
            potentialScore: 88,
            reasonForRecommendation: 'Tourism hotspot, longer dwell times, underserved by current device distribution'
          },
          {
            city: 'Kisumu',
            area: 'Central Business District',
            type: 'TRANSPORT_HUB',
            potentialScore: 85,
            reasonForRecommendation: 'Strategic expansion to new market, high commuter volume'
          }
        ];

    return NextResponse.json({
      deviceLocations,
      locationPerformance,
      regionInsights: {
        cities,
        venueTypes,
        cityDistribution,
        venueDistribution
      },
      trafficPatterns,
      weatherImpact,
      recommendedLocations
    });
  } catch (error) {
    console.error('Smart City API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch smart city data' },
      { status: 500 }
    );
  }
}

// Helper function to process location performance data
function processLocationPerformance(adDeliveries: AdDeliveryRecord[]): LocationPerformance[] {
  // Group deliveries by location
  const locationDataMap: Record<string, {
    city: string;
    area: string;
    totalImpressions: number;
    totalEngagements: number;
    deliveryCount: number;
    deviceTypes: Record<string, number>;
  }> = {};
  
  adDeliveries.forEach(delivery => {
    // Extract location data
    const locationData = typeof delivery.locationData === 'string'
      ? JSON.parse(delivery.locationData)
      : delivery.locationData;
      
    if (!locationData) return;
    
    // Generate a location key (city/area)
    const city = locationData.city || 'Unknown';
    const area = locationData.area || 'Unknown';
    const locationKey = `${city}/${area}`;
    
    // Initialize location data if not exists
    if (!locationDataMap[locationKey]) {
      locationDataMap[locationKey] = {
        city,
        area,
        totalImpressions: 0,
        totalEngagements: 0,
        deliveryCount: 0,
        deviceTypes: {}
      };
    }
    
    // Update location stats
    locationDataMap[locationKey].totalImpressions += delivery.impressions || 0;
    locationDataMap[locationKey].totalEngagements += delivery.engagements || 0;
    locationDataMap[locationKey].deliveryCount++;
    
    // Track device type distribution
    const deviceType = delivery.device?.deviceType || 'UNKNOWN';
    locationDataMap[locationKey].deviceTypes[deviceType] = 
      (locationDataMap[locationKey].deviceTypes[deviceType] || 0) + 1;
  });
  
  // Calculate engagement rates and format results
  return Object.values(locationDataMap).map(location => {
    return {
      city: location.city,
      area: location.area,
      totalImpressions: location.totalImpressions,
      totalEngagements: location.totalEngagements,
      engagementRate: location.totalImpressions > 0 
        ? (location.totalEngagements / location.totalImpressions) * 100
        : 0,
      deliveryCount: location.deliveryCount,
      deviceTypes: Object.entries(location.deviceTypes).map(([type, count]) => ({
        type,
        count
      }))
    };
  }).sort((a, b) => b.engagementRate - a.engagementRate);
} 