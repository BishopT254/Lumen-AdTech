'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdvertiserAnalytics() {
  const { data: session } = useSession();
  const { generalSettings, systemSettings, loading, error: settingsError } = usePublicSettings();
  const [dateRange, setDateRange] = useState('last30days');
  const [campaignFilter, setCampaignFilter] = useState('all');
  
  // Mock data for analytics
  const analyticsData = {
    impressions: 85432,
    clicks: 4271,
    conversions: 856,
    ctr: 5.0,
    conversionRate: 20.0,
    costPerClick: 0.42,
    costPerConversion: 2.10,
    totalSpend: 1793.82,
    roi: 3.2,
  };
  
  // Mock campaign data for filtering
  const campaigns = [
    { id: 'all', name: 'All Campaigns' },
    { id: 'camp1', name: 'Summer Sale Campaign' },
    { id: 'camp2', name: 'New Product Launch' },
    { id: 'camp3', name: 'Holiday Special' },
    { id: 'camp4', name: 'Black Friday' },
  ];
  
  // Date range options
  const dateRanges = [
    { id: 'today', name: 'Today' },
    { id: 'yesterday', name: 'Yesterday' },
    { id: 'last7days', name: 'Last 7 Days' },
    { id: 'last30days', name: 'Last 30 Days' },
    { id: 'thisMonth', name: 'This Month' },
    { id: 'lastMonth', name: 'Last Month' },
    { id: 'custom', name: 'Custom Range' },
  ];
  
  // Mock data for charts
  const dailyData = [
    { date: '2023-06-01', impressions: 2430, clicks: 121, conversions: 24, spend: 50.82 },
    { date: '2023-06-02', impressions: 2512, clicks: 125, conversions: 25, spend: 52.50 },
    { date: '2023-06-03', impressions: 2389, clicks: 119, conversions: 23, spend: 49.98 },
    { date: '2023-06-04', impressions: 2645, clicks: 132, conversions: 26, spend: 55.44 },
    { date: '2023-06-05', impressions: 2830, clicks: 141, conversions: 28, spend: 59.22 },
    { date: '2023-06-06', impressions: 2967, clicks: 148, conversions: 29, spend: 62.16 },
    { date: '2023-06-07', impressions: 3124, clicks: 156, conversions: 31, spend: 65.52 },
    { date: '2023-06-08', impressions: 3280, clicks: 164, conversions: 32, spend: 68.88 },
    { date: '2023-06-09', impressions: 3437, clicks: 171, conversions: 34, spend: 71.82 },
    { date: '2023-06-10', impressions: 3594, clicks: 179, conversions: 35, spend: 75.18 },
    { date: '2023-06-11', impressions: 3751, clicks: 187, conversions: 37, spend: 78.54 },
    { date: '2023-06-12', impressions: 3908, clicks: 195, conversions: 39, spend: 81.90 },
    { date: '2023-06-13', impressions: 4065, clicks: 203, conversions: 40, spend: 85.26 },
    { date: '2023-06-14', impressions: 4222, clicks: 211, conversions: 42, spend: 88.62 },
  ];
  
  // Mock data for audience metrics
  const audienceData = {
    demographics: [
      { age: '18-24', percentage: 15 },
      { age: '25-34', percentage: 32 },
      { age: '35-44', percentage: 28 },
      { age: '45-54', percentage: 18 },
      { age: '55+', percentage: 7 },
    ],
    genders: [
      { gender: 'Male', percentage: 52 },
      { gender: 'Female', percentage: 46 },
      { gender: 'Other', percentage: 2 },
    ],
    devices: [
      { device: 'Mobile', percentage: 63 },
      { device: 'Desktop', percentage: 24 },
      { device: 'Tablet', percentage: 8 },
      { device: 'Other', percentage: 5 },
    ],
    topLocations: [
      { location: 'New York, USA', users: 3254 },
      { location: 'London, UK', users: 2187 },
      { location: 'Los Angeles, USA', users: 1965 },
      { location: 'Toronto, Canada', users: 1432 },
      { location: 'Sydney, Australia', users: 1153 },
    ],
  };

  // Check if system is in maintenance mode
  if (systemSettings?.maintenanceMode) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="mb-8">
          <AlertTitle>System Maintenance</AlertTitle>
          <AlertDescription>
            The analytics dashboard is currently unavailable due to scheduled maintenance.
            {systemSettings.maintenanceDay && systemSettings.maintenanceTime && (
              <> Maintenance is scheduled for {systemSettings.maintenanceDay} at {systemSettings.maintenanceTime}.</>
            )}
            Please check back later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading settings state
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Settings error state
  if (settingsError) {
    console.error("Error loading system settings:", settingsError);
  }

  // Format currency based on system settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(generalSettings?.defaultLanguage || 'en-US', {
      style: 'currency',
      currency: generalSettings?.defaultCurrency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const sidebarItems = [
    {
      title: 'Dashboard',
      href: '/advertiser',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      title: 'Campaigns',
      href: '/advertiser/campaigns',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      title: 'Analytics',
      href: '/advertiser/analytics',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Billing',
      href: '/advertiser/billing',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const userNavItems = [
    { label: 'Your Profile', href: '/advertiser/profile' },
    { label: 'Settings', href: '/advertiser/settings' },
  ];

  return (
   <>
    {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track and analyze your campaign performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4 md:flex md:items-center md:space-x-4 md:space-y-0">
        <div className="flex-1 sm:max-w-[250px]">
          <label htmlFor="campaign-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Campaign
          </label>
          <select
            id="campaign-filter"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 sm:max-w-[200px]">
          <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date Range
          </label>
          <select
            id="date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          >
            {dateRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div className="flex-1 sm:max-w-[180px]">
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div className="flex-1 sm:max-w-[180px]">
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          </>
        )}

        <div className="flex-initial flex items-end">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Impressions */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Impressions</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {analyticsData.impressions.toLocaleString()}
          </p>
        </div>

        {/* Clicks */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {analyticsData.clicks.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            CTR: {analyticsData.ctr}%
          </p>
        </div>

        {/* Conversions */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {analyticsData.conversions.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conv. Rate: {analyticsData.conversionRate}%
          </p>
        </div>

        {/* Total Spend */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spend</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(analyticsData.totalSpend)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ROI: {analyticsData.roi}x
          </p>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* CPC */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Per Click</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            ${analyticsData.costPerClick.toFixed(2)}
          </p>
        </div>

        {/* CPA */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Per Conversion</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            ${analyticsData.costPerConversion.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts & Graphs */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Performance Trend Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Performance Trend</h3>
          <div className="mt-6 h-80 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Chart will be displayed here</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conversion Funnel</h3>
          <div className="mt-6 h-80 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Chart will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Audience Insights */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Demographics */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Demographics</h3>
            <div className="mt-4 grid grid-cols-2 gap-6">
              {/* Age Distribution */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Age Distribution</h4>
                <ul className="mt-2 space-y-2">
                  {audienceData.demographics.map((item) => (
                    <li key={item.age} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.age}</span>
                      <div className="flex w-2/3 items-center">
                        <div className="h-2 flex-grow rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.percentage}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gender Distribution */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender Distribution</h4>
                <ul className="mt-2 space-y-2">
                  {audienceData.genders.map((item) => (
                    <li key={item.gender} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.gender}</span>
                      <div className="flex w-2/3 items-center">
                        <div className="h-2 flex-grow rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-purple-600 dark:bg-purple-500"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.percentage}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Device & Location */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Devices & Locations</h3>
            <div className="mt-4 grid grid-cols-2 gap-6">
              {/* Device Types */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Device Types</h4>
                <ul className="mt-2 space-y-2">
                  {audienceData.devices.map((item) => (
                    <li key={item.device} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.device}</span>
                      <div className="flex w-2/3 items-center">
                        <div className="h-2 flex-grow rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-green-600 dark:bg-green-500"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.percentage}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Top Locations */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Locations</h4>
                <ul className="mt-2 space-y-3">
                  {audienceData.topLocations.map((item) => (
                    <li key={item.location} className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="ml-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{item.location}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.users.toLocaleString()} users</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Campaign */}
      {campaignFilter === 'all' && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Performance by Campaign</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Campaign
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Impressions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Clicks
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      CTR
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Conversions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Cost
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      CPC
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  <tr>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      Summer Sale Campaign
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      34,521
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      1,725
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      5.0%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      345
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      $724.50
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      $0.42
                    </td>
                  </tr>
                  {/* Additional campaign rows... */}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export Data */}
      <div className="mb-8 flex justify-end space-x-4">
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>
	</>
  );
}