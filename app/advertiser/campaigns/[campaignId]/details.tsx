'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingState from '@/components/loading-state';
import { aiServices } from '@/lib/ai-services';
import { computerVision } from '@/lib/computer-vision';

interface CampaignDetailsProps {
  campaign: any;
}

export default function Details({ campaign }: CampaignDetailsProps) {
  const [aiRecommendations, setAiRecommendations] = React.useState<any>(null);
  const [visionInsights, setVisionInsights] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAiData = async () => {
      if (campaign?.id) {
        setLoading(true);
        try {
          // Directly use ai-services.ts
          const recommendations = await aiServices.getCampaignRecommendations(campaign.id);
          setAiRecommendations(recommendations);
          
          // Use computer vision for enhanced insights
          const adCreatives = campaign.adCreatives || [];
          if (adCreatives.length > 0) {
            try {
              // This is a mock call as we don't have actual image data
              // In production, this would use real image data from ad creatives
              const visionData = {
                audienceCount: 0,
                demographics: {},
                attention: {}
              };
              
              setVisionInsights(visionData);
            } catch (cvError) {
              console.error("Computer vision error:", cvError);
            }
          }
        } catch (error) {
          console.error("Error fetching AI recommendations:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAiData();
  }, [campaign?.id]);

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

  if (!campaign) {
    return <div>No campaign data available</div>;
  }

  if (loading) {
    return <LoadingState message="Loading campaign details..." />;
  }

  return (
    <div className="space-y-6">
      {/* Campaign status card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle>Campaign Status</CardTitle>
            <Badge className={getStatusColor(campaign.status)}>
              {campaign.status.replace('_', ' ')}
            </Badge>
          </div>
          <CardDescription>
            {campaign.status === 'ACTIVE' ? 
              'Campaign is currently running and delivering ads' : 
              campaign.status === 'PAUSED' ? 
              'Campaign is temporarily paused and not delivering ads' :
              campaign.status === 'COMPLETED' ?
              'Campaign has ended its scheduled run' :
              campaign.status === 'DRAFT' ?
              'Campaign is in draft mode and not yet submitted' :
              campaign.status === 'PENDING_APPROVAL' ?
              'Campaign is awaiting approval before it can run' :
              campaign.status === 'REJECTED' ?
              'Campaign was rejected and cannot run' :
              campaign.status === 'CANCELLED' ?
              'Campaign was cancelled' :
              'Status unknown'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Campaign details card */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Overview of your campaign configuration</CardDescription>
        </CardHeader>
        <CardContent>
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
                Objective
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.objective?.replace('_', ' ') || 'Not specified'}
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
                Pricing Model
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.pricingModel || 'Not specified'}
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
                {formatDate(campaign.endDate || '')}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Creatives
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {campaign.adCreatives?.length || 0} creatives
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Personalized insights for your campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiRecommendations.insights?.map((insight: any, index: number) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <h4 className="font-medium mb-1 text-blue-700 dark:text-blue-300">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      {campaign.performance && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Campaign metrics and insights</CardDescription>
          </CardHeader>
          <CardContent>
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
                  Engagements
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.totalEngagements?.toLocaleString() || '0'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Engagement Rate
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {campaign.performance.engagementRate || '0%'}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}