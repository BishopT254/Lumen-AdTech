import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';
import { DeviceType } from '@prisma/client';

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

    // Get device counts and statuses for calculations
    const [activeDevicesCount, devicesByType] = await Promise.all([
      prisma.device.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      prisma.device.groupBy({
        by: ['deviceType'],
        _count: {
          _all: true
        },
        where: {
          status: 'ACTIVE'
        }
      })
    ]);
    
    // Retrieve device analytics for actual energy consumption data
    const deviceAnalytics = await prisma.deviceAnalytics.findMany({
      where: {
        date: {
          gte: subDays(new Date(), 30)
        },
        energyConsumption: {
          not: null
        }
      },
      select: {
        date: true,
        energyConsumption: true,
        device: {
          select: {
            deviceType: true
          }
        }
      },
      take: 100,
    });
    
    // Calculate energy consumption by device type using analytics data
    const deviceTypeEnergy: Record<DeviceType, number> = {
      ANDROID_TV: 0,
      DIGITAL_SIGNAGE: 0,
      INTERACTIVE_KIOSK: 0,
      VEHICLE_MOUNTED: 0,
      RETAIL_DISPLAY: 0
    };
    
    // Use actual energy consumption data where available
    let totalMeasuredEnergy = 0;
    let totalMeasuredDevices = 0;
    
    deviceAnalytics.forEach(record => {
      if (record.energyConsumption && record.device.deviceType) {
        const type = record.device.deviceType;
        deviceTypeEnergy[type] += Number(record.energyConsumption);
        totalMeasuredEnergy += Number(record.energyConsumption);
        totalMeasuredDevices++;
      }
    });
    
    // Calculate the average energy consumption per device based on real measurements
    const avgEnergyPerDevice = totalMeasuredDevices > 0 
      ? totalMeasuredEnergy / totalMeasuredDevices 
      : 0.42; // Fallback to estimated value if no measurements
    
    // Calculate daily energy consumption based on active devices
    const totalDailyEnergy = totalMeasuredDevices > 0
      ? activeDevicesCount * avgEnergyPerDevice
      : activeDevicesCount * 0.42; // 35W * 12h = 0.42 kWh per day
    
    // Carbon footprint estimation (using 0.5 kg CO2 per kWh as a global average)
    const carbonFootprint = totalDailyEnergy * 0.5; // kg CO2 per day
    
    // Calculate metrics for the past 30 days
    const thirtyDaysEnergy = totalDailyEnergy * 30;
    const thirtyDaysCarbonFootprint = carbonFootprint * 30;
    
    // Fetch system configuration for green energy percentage if available
    const systemConfig = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'SUSTAINABILITY'
      }
    });
    
    // Extract green energy percentage from system config or use default
    let greenEnergyPercentage = 35;
    let efficiencyRating = 70;
    
    if (systemConfig && typeof systemConfig.configValue === 'object') {
      const configValue = systemConfig.configValue as any;
      if (configValue.greenEnergyPercentage) {
        greenEnergyPercentage = Number(configValue.greenEnergyPercentage);
      }
      if (configValue.efficiencyRating) {
        efficiencyRating = Number(configValue.efficiencyRating);
      }
    }
    
    // Fetch actual carbon offset projects from database if available
    const carbonProjects = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'CARBON_OFFSET_PROJECTS'
      }
    });
    
    // Default carbon offset projects if none found in database
    const carbonOffsetProjects = carbonProjects && typeof carbonProjects.configValue === 'object'
      ? carbonProjects.configValue
      : [
          {
            id: 1,
            name: "Reforestation Initiative",
            location: "Kenya",
            costPerTonCO2: 15,
            availableCredits: 2500,
            verificationStandard: "Gold Standard"
          },
          {
            id: 2,
            name: "Renewable Energy Farm",
            location: "India",
            costPerTonCO2: 12,
            availableCredits: 5000,
            verificationStandard: "VCS"
          },
          {
            id: 3,
            name: "Methane Capture Project",
            location: "Brazil",
            costPerTonCO2: 18,
            availableCredits: 1800,
            verificationStandard: "CDM"
          }
        ];
    
    // Fetch recommendations from the database if available
    const recommendationsConfig = await prisma.systemConfig.findUnique({
      where: {
        configKey: 'SUSTAINABILITY_RECOMMENDATIONS'
      }
    });
    
    // Default recommendations if none found in database
    const sustainabilityRecommendations = recommendationsConfig && typeof recommendationsConfig.configValue === 'object'
      ? recommendationsConfig.configValue
      : [
          {
            id: 1,
            title: "Optimize Screen Brightness",
            description: "Implement adaptive brightness based on ambient light to reduce energy consumption.",
            potentialSavings: "10-15% reduction in energy usage",
            implementationDifficulty: "EASY"
          },
          {
            id: 2,
            title: "Schedule Off-Peak Content Downloads",
            description: "Set content downloads during nighttime when energy demand is lower.",
            potentialSavings: "Reduce peak energy demand by 20%",
            implementationDifficulty: "MEDIUM"
          },
          {
            id: 3,
            title: "Transition to Green Hosting",
            description: "Migrate backend services to carbon-neutral cloud providers.",
            potentialSavings: "Up to 40% reduction in server carbon footprint",
            implementationDifficulty: "HARD"
          }
        ];
    
    // Return sustainability metrics
    return NextResponse.json({
      energyMetrics: {
        dailyConsumption: parseFloat(totalDailyEnergy.toFixed(2)),
        monthlyConsumption: parseFloat(thirtyDaysEnergy.toFixed(2)),
        carbonFootprintDaily: parseFloat(carbonFootprint.toFixed(2)),
        carbonFootprintMonthly: parseFloat(thirtyDaysCarbonFootprint.toFixed(2)),
        efficiencyRating,
        greenEnergyPercentage,
        deviceTypeDistribution: deviceTypeEnergy,
        deviceCountByType: devicesByType.reduce((acc, item) => {
          acc[item.deviceType] = item._count._all;
          return acc;
        }, {} as Record<DeviceType, number>)
      },
      sustainabilityRecommendations,
      carbonOffsetProjects
    });
  } catch (error) {
    console.error('Sustainability API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sustainability data' },
      { status: 500 }
    );
  }
} 