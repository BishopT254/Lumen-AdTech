'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

// Icons
import { BarChart3, Download, Users, Cpu, Activity, AlertTriangle, Building, Car, Info, Leaf } from 'lucide-react';

// Types for dashboard data
type PlatformMetrics = {
  totalUsers: number;
  totalAdvertisers: number;
  totalPartners: number;
  totalDevices: number;
  devicesByStatus?: {
    status: string;
    _count: {
      _all: number;
    };
  }[];
  activeCampaigns: number;
  totalImpressions: number;
  totalRevenue: number;
  pendingApprovals: number;
  totalEngagements: number;
  totalConversions: number;
  averageCtr: number;
  averageRoi: number;
  totalSpend: number;
};

type RecentActivity = {
  id: string;
  type: 'USER_CREATED' | 'CAMPAIGN_CREATED' | 'PAYMENT_RECEIVED' | 'CAMPAIGN_APPROVED' | 'CAMPAIGN_REJECTED' | 'DEVICE_ADDED' | 'DEVICE_REMOVED' | 'SETTINGS_UPDATED';
  user: string;
  email: string;
  timestamp: string;
  details: string;
  metadata?: Record<string, any>;
};

type SystemHealth = {
  serverLoad: number;
  memoryUsage: number;
  diskUsage: number;
  activeSessions: number;
  apiRequests: number;
  errorRate: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  lastBackup?: string;
  backupStatus?: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  maintenanceMode: boolean;
  maintenanceWindow?: {
    start: string;
    end: string;
  };
};

type EnergyMetrics = {
  dailyConsumption: number;
  monthlyConsumption: number;
  carbonFootprintDaily: number;
  carbonFootprintMonthly: number;
  efficiencyRating: number;
  greenEnergyPercentage: number;
  offsetProgram?: {
    enabled: boolean;
    provider: string;
    percentage: number;
  };
  energyOptimization?: {
    enabled: boolean;
    brightnessThreshold: number;
    offHoursPowerSaving: boolean;
  };
};

type EmotionInsight = {
  overall: {
    avgJoy: number;
    avgSurprise: number;
    avgDwellTime: number;
    avgEngagement: number;
    totalSamples: number;
  };
  byDeviceType?: {
    deviceType: string;
    metrics: {
      avgJoy: number;
      avgSurprise: number;
      avgDwellTime: number;
    };
  }[];
  byLocation?: {
    location: string;
    metrics: {
      avgJoy: number;
      avgSurprise: number;
      avgDwellTime: number;
    };
  }[];
};

type AiRecommendation = {
  id: number;
  type: 'CAMPAIGN_OPTIMIZATION' | 'AUDIENCE_TARGETING' | 'CONTENT_SUGGESTION' | 'BUDGET_ALLOCATION' | 'TIMING_OPTIMIZATION';
  title: string;
  description: string;
  confidence: number;
  implementationDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedBenefit?: {
    metric: string;
    value: number;
    unit: string;
  };
  prerequisites?: string[];
};

type DeviceLocation = {
  id: string;
  name: string;
  type: string;
  location: {
    city: string;
    venueType: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
    postalCode?: string;
    country?: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OFFLINE';
  lastSeen?: string;
  metrics?: {
    uptime: number;
    impressions: number;
    engagements: number;
  };
};

type RegionInsight = {
  cityDistribution: {
    city: string;
    count: number;
    revenue: number;
    impressions: number;
  }[];
  venueDistribution: {
    type: string;
    count: number;
    averageEngagement: number;
    topPerformingDevices: number;
  }[];
  totalDevices: number;
  totalRevenue: number;
  averageEngagement: number;
  topPerformingCity?: {
    city: string;
    metrics: {
      revenue: number;
      impressions: number;
      engagement: number;
    };
  };
};

type DashboardData = {
  platformMetrics: PlatformMetrics;
  recentActivities: RecentActivity[];
  systemHealth: SystemHealth;
  energyMetrics?: EnergyMetrics;
  emotionInsights?: EmotionInsight;
  aiRecommendations?: AiRecommendation[];
  regionInsights?: RegionInsight;
  lastUpdated: string;
  dataRetention: {
    days: number;
    lastCleanup: string;
  };
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  
  // Fetch primary dashboard data
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch sustainability data
  const { data: sustainabilityData } = useQuery({
    queryKey: ['sustainability'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sustainability');
      if (!response.ok) {
        throw new Error('Failed to fetch sustainability data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  
  // Fetch AI insights data
  const { data: aiInsightsData } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  
  // Fetch smart city data
  const { data: smartCityData } = useQuery({
    queryKey: ['smartCity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/smart-city');
      if (!response.ok) {
        throw new Error('Failed to fetch smart city data');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-blue-500 border-gray-200"></div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load dashboard data</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    );
  }

  const { platformMetrics, recentActivities, systemHealth } = data;
  const energyMetrics = sustainabilityData?.energyMetrics as EnergyMetrics;
  const emotionInsights = aiInsightsData?.emotionInsights as EmotionInsight;
  const aiRecommendations = aiInsightsData?.aiRecommendations as AiRecommendation[];
  const regionInsights = smartCityData?.regionInsights as RegionInsight;

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {session?.user?.name || 'Admin'}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Link
            href="/admin/campaigns/approvals"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:bg-yellow-700 dark:hover:bg-yellow-600"
          >
            <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-yellow-800">
              {platformMetrics.pendingApprovals}
            </span>
            Pending Approvals
          </Link>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Users className="-ml-1 mr-2 h-5 w-5" />
            Add User
          </Link>
        </div>
      </div>

      {/* Platform overview cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Users card */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{platformMetrics.totalUsers.toLocaleString()}</p>
              <div className="mt-1 flex items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {platformMetrics.totalAdvertisers.toLocaleString()} Advertisers • {platformMetrics.totalPartners.toLocaleString()} Partners
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Devices card */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Cpu className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Devices</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{platformMetrics.totalDevices.toLocaleString()}</p>
              <div className="mt-1 flex items-center text-xs text-gray-600 dark:text-gray-400">
                Across {platformMetrics.totalPartners.toLocaleString()} partners
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns card */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Campaigns</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{platformMetrics.activeCampaigns.toLocaleString()}</p>
              <div className="mt-1 flex items-center">
                <span className="mr-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {platformMetrics.pendingApprovals} pending approval
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue card */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">${(platformMetrics.totalRevenue / 1000).toFixed(1)}K</p>
              <div className="mt-1 flex items-center">
                <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
                  {platformMetrics.totalImpressions.toLocaleString()} impressions
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      {(energyMetrics || regionInsights || emotionInsights) && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Sustainability card */}
          {energyMetrics && (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sustainability</h3>
                <Leaf className="h-5 w-5 text-green-500" />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Carbon Footprint (Daily)</p>
                    <p className="font-medium">{energyMetrics.carbonFootprintDaily.toFixed(1)} kg CO₂</p>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(energyMetrics.greenEnergyPercentage, 100)}%` }}></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{energyMetrics.greenEnergyPercentage}% green energy</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Energy Rating</p>
                    <p className="text-lg font-semibold">
                      {energyMetrics.efficiencyRating}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Usage</p>
                    <p className="text-lg font-semibold">
                      {energyMetrics.monthlyConsumption.toFixed(1)} kWh
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Link href="/admin/sustainability" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    View sustainability report →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Location Insights */}
          {regionInsights && (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Location Insights</h3>
                <Building className="h-5 w-5 text-blue-500" />
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Top Cities</p>
                  <div className="space-y-2">
                    {regionInsights.cityDistribution.slice(0, 3).map((city, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{city.city}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {city.count} devices
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Top Venue Types</p>
                  <div className="space-y-2">
                    {regionInsights.venueDistribution.slice(0, 3).map((venue, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{venue.type}</span>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          {venue.count} devices
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <Link href="/admin/analytics/locations" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    View all locations →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {emotionInsights && aiRecommendations && (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Insights</h3>
                <Info className="h-5 w-5 text-purple-500" />
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Emotional Response</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-700">
                      <p className="text-lg font-semibold">{(emotionInsights.overall.avgJoy * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Joy</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-700">
                      <p className="text-lg font-semibold">{(emotionInsights.overall.avgSurprise * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Surprise</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-700">
                      <p className="text-lg font-semibold">{emotionInsights.overall.avgDwellTime.toFixed(1)}s</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Dwell Time</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Top Recommendation</p>
                  {aiRecommendations && aiRecommendations.length > 0 && (
                    <div className="rounded-lg border border-purple-100 p-3 dark:border-purple-900/30">
                      <p className="text-sm font-medium">{aiRecommendations[0].title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{aiRecommendations[0].description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Confidence: {aiRecommendations[0].confidence}%</span>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          {aiRecommendations[0].implementationDifficulty}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <Link href="/admin/analytics/ai-insights" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    View all AI insights →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Feed & Performance Section */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-6">
                <div className="flex items-start">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    activity.type === 'USER_CREATED'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : activity.type === 'CAMPAIGN_CREATED'
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : activity.type === 'PAYMENT_RECEIVED'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-yellow-100 dark:bg-yellow-900/30'
                  }`}>
                    {activity.type === 'USER_CREATED' && (
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    {activity.type === 'CAMPAIGN_CREATED' && (
                      <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    )}
                    {activity.type === 'PAYMENT_RECEIVED' && (
                      <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{activity.user}</h4>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{activity.email}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{activity.details}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 px-6 py-4 text-center dark:border-gray-700">
            <Link href="/admin/activity" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              View all activity
            </Link>
          </div>
        </div>

        {/* System Health & Performance */}
        <div className="space-y-6">
          {/* System Status Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">System Status</h2>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                systemHealth.status === 'HEALTHY'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {systemHealth.status}
              </span>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              {/* Server Load */}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Server Load</p>
                <div className="mt-1 flex items-center">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500" 
                      style={{ width: `${systemHealth.serverLoad}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{systemHealth.serverLoad}%</span>
                </div>
              </div>
              
              {/* Memory Usage */}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</p>
                <div className="mt-1 flex items-center">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="h-full rounded-full bg-green-600 dark:bg-green-500" 
                      style={{ width: `${systemHealth.memoryUsage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{systemHealth.memoryUsage}%</span>
                </div>
              </div>
              
              {/* Disk Usage */}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Disk Usage</p>
                <div className="mt-1 flex items-center">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="h-full rounded-full bg-yellow-600 dark:bg-yellow-500" 
                      style={{ width: `${systemHealth.diskUsage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{systemHealth.diskUsage}%</span>
                </div>
              </div>
              
              {/* Error Rate */}
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">API Error Rate</p>
                <div className="mt-1 flex items-center">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className={`h-full rounded-full ${
                        systemHealth.errorRate < 0.5 ? 'bg-green-600 dark:bg-green-500' : 'bg-red-600 dark:bg-red-500'
                      }`}
                      style={{ width: `${Math.min(systemHealth.errorRate * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{(systemHealth.errorRate * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="text-lg font-medium text-gray-900 dark:text-white">{systemHealth.activeSessions.toLocaleString()}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Sessions</div>
              </div>
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="text-lg font-medium text-gray-900 dark:text-white">{systemHealth.apiRequests.toLocaleString()}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">API Requests (24h)</div>
              </div>
            </div>
          </div>
          
          {/* Performance Chart Placeholder - This would be replaced with an actual chart component */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Platform Performance</h2>
            <div className="mt-4 flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Impressions</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {platformMetrics.totalImpressions.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    ${platformMetrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue & Impressions Trend</h3>
                <Link 
                  href="/admin/analytics/reports"
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download Reports
                </Link>
              </div>
              
              <div className="mt-2 h-40 w-full rounded-lg bg-gray-100 dark:bg-gray-700">
                <div className="flex h-full w-full items-center justify-center">
                  <Link href="/admin/analytics" className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    View detailed analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 