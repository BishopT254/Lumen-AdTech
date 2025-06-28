'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LoadingState from '@/components/loading-state';
import AiInsights from './ai-insights';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Details from './details';
import ABTesting from './ab-testing';
import { aiServices } from '@/lib/ai-services'; // Directly import AI services

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.campaignId as string; // Fix the ID reference
  const router = useRouter();
  const { data: session } = useSession();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/advertiser/campaigns/${campaignId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch campaign details');
        }
        
        const data = await response.json();
        setCampaign(data.campaign);
        
        // Directly integrate with AI services for campaign suggestions
        try {
          const suggestions = await aiServices.getQuickSuggestions(campaignId);
          if (suggestions && suggestions.items) {
            setAiSuggestions(suggestions.items.slice(0, 3));
          }
        } catch (aiError) {
          console.error("Error fetching AI suggestions:", aiError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchCampaign();
    }
  }, [campaignId, session]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatusUpdating(true);
      const response = await fetch(`/api/advertiser/campaigns/${campaignId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      // Refresh campaign data
      const updatedData = await response.json();
      setCampaign(updatedData.campaign);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading campaign details..." />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Campaign not found</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">The campaign you're looking for doesn't exist or you don't have access to it.</p>
        <div className="mt-6">
          <Link 
            href="/advertiser/campaigns"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Return to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper function to determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'PENDING_APPROVAL':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Define valid status transitions
  const getValidStatusTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'DRAFT':
        return ['PENDING_APPROVAL', 'CANCELLED'];
      case 'PENDING_APPROVAL':
        return ['ACTIVE', 'REJECTED', 'CANCELLED'];
      case 'ACTIVE':
        return ['PAUSED', 'COMPLETED', 'CANCELLED'];
      case 'PAUSED':
        return ['ACTIVE', 'COMPLETED', 'CANCELLED'];
      case 'COMPLETED':
        return [];
      case 'REJECTED':
        return ['DRAFT'];
      case 'CANCELLED':
        return ['DRAFT'];
      default:
        return [];
    }
  };

  const validTransitions = getValidStatusTransitions(campaign.status);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-gray-500">Campaign ID: {campaign.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/advertiser/campaigns/${campaign.id}/edit`}>
            <Button variant="outline">Edit Campaign</Button>
          </Link>
        </div>
      </div>
      
      {/* AI Quick Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-4 dark:bg-blue-900/20 dark:border-blue-900/30">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            AI Suggestions
          </h3>
          <ul className="space-y-1">
            {aiSuggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-blue-700 dark:text-blue-400 flex items-start">
                <span className="inline-block w-4 h-4 mr-2 mt-0.5 text-blue-500">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
          <TabsTrigger value="abtesting">A/B Testing</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Details campaign={campaign} />
        </TabsContent>
        
        <TabsContent value="abtesting" className="mt-6">
          <ABTesting campaignId={campaign.id} />
        </TabsContent>
        
        <TabsContent value="ai-insights" className="mt-6">
          <AiInsights campaignId={campaign.id} />
        </TabsContent>
      </Tabs>

      {/* Campaign status badge and controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Status</h2>
            <span 
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(campaign.status)}`}
            >
              {campaign.status.replace('_', ' ')}
            </span>
          </div>
          
          {validTransitions.length > 0 && (
            <div className="mt-4 sm:mt-0">
              <label htmlFor="status-change" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Change Status
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <select
                  id="status-change"
                  name="status-change"
                  disabled={statusUpdating}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  onChange={(e) => handleStatusChange(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select new status</option>
                  {validTransitions.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {statusUpdating && (
                  <div className="ml-3 flex items-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign details card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Campaign Details
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.name}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Description
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.description || 'No description'}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Budget
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                ${campaign.budget ? campaign.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Daily Budget
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.dailyBudget ? (
                  `$${campaign.dailyBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  'No daily limit'
                )}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Start Date
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {formatDate(campaign.startDate)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                End Date
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {formatDate(campaign.endDate)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Creatives
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.adCreatives ? campaign.adCreatives.length : 0} creatives
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created At
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {formatDate(campaign.createdAt)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Last Updated
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {formatDate(campaign.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* AI-Powered Insights Section */}
      <AiInsights campaignId={campaign.id} />

      {/* Campaign performance summary */}
      {campaign.performance && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Performance Overview
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Impressions
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.totalImpressions?.toLocaleString() || '0'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Clicks
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.totalClicks?.toLocaleString() || '0'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  CTR
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.clickThroughRate || '0%'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Conversions
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.totalConversions?.toLocaleString() || '0'}
                </dd>
              </div>
            </dl>
            
            <div className="mt-6 text-right">
              <Link
                href={`/advertiser/campaigns/${campaignId}/performance`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View detailed analytics
                <svg className="ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Campaign management cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Targeting card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Targeting Options
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure who sees your campaign by setting up targeting parameters including demographics, geography, devices, and more.
            </p>
            
            <div className="mt-6">
              <Link
                href={`/advertiser/campaigns/${campaignId}/targeting`}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Manage Targeting
              </Link>
            </div>
          </div>
        </div>

        {/* Budget card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Budget Management
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set and manage your campaign's budget, including total budget, daily spending limits, and budget alerts.
            </p>
            
            <div className="mt-6">
              <Link
                href={`/advertiser/campaigns/${campaignId}/budget`}
                className="inline-flex items-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manage Budget
              </Link>
            </div>
          </div>
        </div>

        {/* A/B Testing card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              A/B Testing
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create and manage A/B tests to optimize your campaign performance by testing different ad creatives and targeting options.
            </p>
            
            <div className="mt-6">
              <Link
                href={`/advertiser/campaigns/${campaignId}/abtests`}
                className="inline-flex items-center rounded-md border border-transparent bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Manage A/B Tests
              </Link>
            </div>
          </div>
        </div>

        {/* Creative Assets card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Ad Creatives
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage the ad creatives associated with this campaign, including images, videos, text, and HTML ads.
            </p>
            
            <div className="mt-6">
              <Link
                href={`/advertiser/campaigns/${campaignId}/creatives`}
                className="inline-flex items-center rounded-md border border-transparent bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Manage Creatives
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign ad creatives list */}
      {campaign.adCreatives && campaign.adCreatives.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Campaign Creatives
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {campaign.adCreatives.map((creative: any) => (
                <div 
                  key={creative.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {creative.type === 'IMAGE' && creative.content?.url ? (
                      <img 
                        src={creative.content.url} 
                        alt={creative.content.altText || creative.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : creative.type === 'VIDEO' && creative.content?.url ? (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <svg className="w-12 h-12 text-white opacity-70" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : creative.type === 'TEXT' ? (
                      <div className="p-4 text-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {creative.content?.text?.substring(0, 100) || 'Text Creative'}
                          {creative.content?.text?.length > 100 ? '...' : ''}
                        </span>
                      </div>
                    ) : creative.type === 'HTML' ? (
                      <div className="flex items-center justify-center p-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          HTML Creative
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          No preview available
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {creative.name}
                    </h4>
                    <div className="mt-2 flex items-center justify-between">
                      <span 
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          creative.status === 'APPROVED' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : creative.status === 'PENDING_REVIEW'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {creative.status.replace('_', ' ')}
                      </span>
                      <Link
                        href={`/advertiser/creatives/${creative.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 