'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingState from '@/components/loading-state';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { emotionAwareDelivery } from '@/lib/emotion-aware-delivery';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PageProps {
  params: {
    campaignId: string;
    id: string;
  };
}

export default function ABTestDetailsPage({ params }: PageProps) {
  const { campaignId, id } = params;
  const router = useRouter();
  const { toast } = useToast();
  const [abTest, setAbTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emotionData, setEmotionData] = useState<any>(null);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [timeframeData, setTimeframeData] = useState<any>(null);
  const [timeframeLoading, setTimeframeLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/advertiser/campaigns/${campaignId}/abtests/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch AB test: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAbTest(data.abTest);
        
        // If test is emotion-aware, fetch emotion data
        if (data.abTest.emotionAware) {
          fetchEmotionData();
        }
        
        // Fetch timeframe data for all variants
        fetchTimeframeData();
        
      } catch (error) {
        console.error('Error fetching AB test:', error);
        toast({
          title: 'Error',
          description: 'Failed to load AB test data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, id, toast]);

  const fetchEmotionData = async () => {
    try {
      setEmotionLoading(true);
      const emotionResults = await emotionAwareDelivery.getTestEmotionResults(id);
      setEmotionData(emotionResults);
    } catch (error) {
      console.error('Error fetching emotion data:', error);
    } finally {
      setEmotionLoading(false);
    }
  };

  const fetchTimeframeData = async () => {
    try {
      setTimeframeLoading(true);
      
      // For demo purposes, we'll generate mock data
      // In a real implementation, this would come from an API call
      const mockTimeframeData: any = {
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        datasets: [],
      };
      
      // We'll use setTimeout to simulate an API call
      setTimeout(() => {
        setTimeframeData(mockTimeframeData);
        setTimeframeLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error fetching timeframe data:', error);
      setTimeframeLoading(false);
    }
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare chart data for variant performance
  const preparePerformanceData = () => {
    if (!abTest?.variants) return null;
    
    const labels = abTest.variants.map((variant: any) => 
      variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`
    );
    
    const impressionData = abTest.variants.map((variant: any) => variant.impressions || 0);
    const engagementData = abTest.variants.map((variant: any) => variant.engagements || 0);
    const engagementRates = abTest.variants.map((variant: any) => {
      const impressions = variant.impressions || 0;
      return impressions > 0 ? ((variant.engagements || 0) / impressions) * 100 : 0;
    });
    
    return {
      labels,
      impressions: impressionData,
      engagements: engagementData,
      engagementRates,
    };
  };

  // Prepare emotion data chart
  const prepareEmotionData = () => {
    if (!emotionData) return null;
    
    const labels = abTest.variants.map((variant: any) => 
      variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`
    );
    
    return {
      labels,
      joy: emotionData.variants.map((variant: any) => variant.emotions.joy || 0),
      surprise: emotionData.variants.map((variant: any) => variant.emotions.surprise || 0),
      neutral: emotionData.variants.map((variant: any) => variant.emotions.neutral || 0),
    };
  };

  // Prepare timeframe data for line chart
  const prepareTimeframeChartData = () => {
    if (!timeframeData) return null;
    
    // Add datasets for each variant
    abTest.variants.forEach((variant: any, index: number) => {
      // Generate random data for demonstration
      const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
      
      timeframeData.datasets.push({
        label: variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`,
        data,
        borderColor: getChartColor(index),
        backgroundColor: getChartColor(index, 0.2),
        borderWidth: 2,
      });
    });
    
    return timeframeData;
  };
  
  // Get chart colors
  const getChartColor = (index: number, alpha = 1) => {
    const colors = [
      `rgba(59, 130, 246, ${alpha})`, // Blue
      `rgba(16, 185, 129, ${alpha})`, // Green
      `rgba(245, 158, 11, ${alpha})`, // Amber
      `rgba(236, 72, 153, ${alpha})`, // Pink
      `rgba(139, 92, 246, ${alpha})`, // Purple
      `rgba(239, 68, 68, ${alpha})`, // Red
    ];
    
    return colors[index % colors.length];
  };
  
  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  if (loading) {
    return <LoadingState message="Loading AB test data..." />;
  }

  if (!abTest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium mb-2">AB Test Not Found</h2>
        <p className="text-gray-500 mb-4">The requested AB test could not be found</p>
        <Button onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}>
          Return to Campaign
        </Button>
      </div>
    );
  }

  const performanceData = preparePerformanceData();
  const emotionDataChart = prepareEmotionData();
  const timeframeChartData = prepareTimeframeChartData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{abTest.name}</h1>
          <p className="text-gray-500">{abTest.description || 'No description'}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(abTest.status)}>
            {abTest.status}
          </Badge>
          
          <Button variant="outline" size="sm" onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}>
            Back to Campaign
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{formatDate(abTest.startDate)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">End Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {abTest.endDate ? formatDate(abTest.endDate) : 'Ongoing'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              {abTest.status === 'COMPLETED' ? 'Winning Variant' : 'Variants'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {abTest.status === 'COMPLETED' && abTest.winningVariantId ? (
              <p className="text-lg font-medium text-green-600 dark:text-green-400">
                {abTest.variants.find((v: any) => v.id === abTest.winningVariantId)?.adCreative?.name || 'Unknown'}
              </p>
            ) : (
              <p className="text-lg font-medium">{abTest.variants.length}</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Performance Overview</TabsTrigger>
          <TabsTrigger value="timeframe" disabled={timeframeLoading}>Timeline Analysis</TabsTrigger>
          {abTest.emotionAware && (
            <TabsTrigger value="emotions" disabled={emotionLoading}>Emotion Analysis</TabsTrigger>
          )}
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Impressions by Variant</CardTitle>
                <CardDescription>Total views for each variant</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {performanceData && (
                  <Bar 
                    data={{
                      labels: performanceData.labels,
                      datasets: [
                        {
                          label: 'Impressions',
                          data: performanceData.impressions,
                          backgroundColor: performanceData.labels.map((_: any, i: number) => getChartColor(i, 0.6)),
                        },
                      ],
                    }} 
                    options={barOptions} 
                  />
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Engagements by Variant</CardTitle>
                <CardDescription>Total user interactions for each variant</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {performanceData && (
                  <Bar 
                    data={{
                      labels: performanceData.labels,
                      datasets: [
                        {
                          label: 'Engagements',
                          data: performanceData.engagements,
                          backgroundColor: performanceData.labels.map((_: any, i: number) => getChartColor(i + 2, 0.6)),
                        },
                      ],
                    }} 
                    options={barOptions} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Engagement Rate by Variant</CardTitle>
              <CardDescription>Percentage of impressions that resulted in engagement</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {performanceData && (
                <Bar 
                  data={{
                    labels: performanceData.labels,
                    datasets: [
                      {
                        label: 'Engagement Rate (%)',
                        data: performanceData.engagementRates,
                        backgroundColor: performanceData.labels.map((_: any, i: number) => getChartColor(i + 4, 0.6)),
                      },
                    ],
                  }} 
                  options={barOptions} 
                />
              )}
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Variant Details</h3>
            <div className="space-y-4">
              {abTest.variants.map((variant: any) => (
                <Card key={variant.id} className={`overflow-hidden ${variant.id === abTest.winningVariantId ? 'border-green-500 dark:border-green-600' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          {variant.id === abTest.winningVariantId && (
                            <svg className="w-5 h-5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                            </svg>
                          )}
                          {variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Traffic Allocation: {variant.trafficAllocation}%
                        </CardDescription>
                      </div>
                      {variant.id === abTest.winningVariantId && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Winner
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Impressions</p>
                        <p className="text-xl font-medium">{variant.impressions || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Engagements</p>
                        <p className="text-xl font-medium">{variant.engagements || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Engagement Rate</p>
                        <p className="text-xl font-medium">
                          {variant.impressions > 0 
                            ? ((variant.engagements / variant.impressions) * 100).toFixed(2) 
                            : '0.00'}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
        
        {/* Timeline Analysis Tab */}
        <TabsContent value="timeframe" className="space-y-4 pt-4">
          {timeframeLoading ? (
            <LoadingState message="Loading timeline data..." />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time</CardTitle>
                  <CardDescription>Daily impressions for each variant</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {timeframeChartData && (
                    <Line data={timeframeChartData} options={lineOptions} height={100} />
                  )}
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Cumulative Engagements</CardTitle>
                    <CardDescription>Total engagements over the test period</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Line 
                      data={{
                        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                        datasets: abTest.variants.map((variant: any, index: number) => {
                          // Generate cumulative data for demonstration
                          const randomData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 20));
                          const cumulativeData = randomData.reduce((acc: number[], val: number, i: number) => {
                            acc.push((acc[i-1] || 0) + val);
                            return acc;
                          }, []);
                          
                          return {
                            label: variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`,
                            data: cumulativeData,
                            borderColor: getChartColor(index),
                            backgroundColor: getChartColor(index, 0.1),
                            borderWidth: 2,
                            fill: true,
                          };
                        }),
                      }}
                      options={lineOptions}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Distribution</CardTitle>
                    <CardDescription>Actual traffic split between variants</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-center">
                    <div style={{ width: '70%' }}>
                      <Doughnut 
                        data={{
                          labels: abTest.variants.map((variant: any) => 
                            variant.adCreative?.name || `Variant ${variant.id.slice(0, 6)}`
                          ),
                          datasets: [
                            {
                              data: abTest.variants.map((variant: any) => variant.impressions || 1),
                              backgroundColor: abTest.variants.map((_: any, i: number) => getChartColor(i, 0.6)),
                              borderColor: abTest.variants.map((_: any, i: number) => getChartColor(i)),
                              borderWidth: 1,
                            },
                          ],
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        {/* Emotion Analysis Tab */}
        {abTest.emotionAware && (
          <TabsContent value="emotions" className="space-y-4 pt-4">
            {emotionLoading ? (
              <LoadingState message="Loading emotion data..." />
            ) : emotionData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Emotional Response by Variant</CardTitle>
                    <CardDescription>How viewers emotionally responded to each variant</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {emotionDataChart && (
                      <Bar 
                        data={{
                          labels: emotionDataChart.labels,
                          datasets: [
                            {
                              label: 'Joy',
                              data: emotionDataChart.joy,
                              backgroundColor: 'rgba(255, 206, 86, 0.6)',
                              borderColor: 'rgba(255, 206, 86, 1)',
                              borderWidth: 1,
                            },
                            {
                              label: 'Surprise',
                              data: emotionDataChart.surprise,
                              backgroundColor: 'rgba(153, 102, 255, 0.6)',
                              borderColor: 'rgba(153, 102, 255, 1)',
                              borderWidth: 1,
                            },
                            {
                              label: 'Neutral',
                              data: emotionDataChart.neutral,
                              backgroundColor: 'rgba(201, 203, 207, 0.6)',
                              borderColor: 'rgba(201, 203, 207, 1)',
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={barOptions}
                      />
                    )}
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Emotional Engagement</CardTitle>
                      <CardDescription>Correlation between emotions and engagement</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* For demo purposes: artificial correlation visualization */}
                      <Line 
                        data={{
                          labels: ['1', '2', '3', '4', '5'],
                          datasets: [
                            {
                              label: 'Joy vs Engagement',
                              data: [30, 45, 57, 68, 82],
                              borderColor: 'rgba(255, 206, 86, 1)',
                              backgroundColor: 'rgba(255, 206, 86, 0.1)',
                              tension: 0.4,
                            },
                            {
                              label: 'Surprise vs Engagement',
                              data: [42, 53, 60, 63, 72],
                              borderColor: 'rgba(153, 102, 255, 1)',
                              backgroundColor: 'rgba(153, 102, 255, 0.1)',
                              tension: 0.4,
                            },
                            {
                              label: 'Neutral vs Engagement',
                              data: [35, 37, 40, 46, 50],
                              borderColor: 'rgba(201, 203, 207, 1)',
                              backgroundColor: 'rgba(201, 203, 207, 0.1)',
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                            },
                          },
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Emotion Intensity (1-5)',
                              },
                            },
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Engagement Rate (%)',
                              },
                            },
                          },
                        }}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Emotion Distribution</CardTitle>
                      <CardDescription>Overall distribution of emotional responses</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 flex justify-center">
                      <div style={{ width: '70%' }}>
                        <Doughnut 
                          data={{
                            labels: ['Joy', 'Surprise', 'Neutral'],
                            datasets: [
                              {
                                data: [
                                  emotionData.variants.reduce((sum: number, v: any) => sum + (v.emotions.joy || 0), 0),
                                  emotionData.variants.reduce((sum: number, v: any) => sum + (v.emotions.surprise || 0), 0),
                                  emotionData.variants.reduce((sum: number, v: any) => sum + (v.emotions.neutral || 0), 0),
                                ],
                                backgroundColor: [
                                  'rgba(255, 206, 86, 0.6)',
                                  'rgba(153, 102, 255, 0.6)',
                                  'rgba(201, 203, 207, 0.6)',
                                ],
                                borderColor: [
                                  'rgba(255, 206, 86, 1)',
                                  'rgba(153, 102, 255, 1)',
                                  'rgba(201, 203, 207, 1)',
                                ],
                                borderWidth: 1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                position: 'top',
                              },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Emotion Analysis Summary</CardTitle>
                    <CardDescription>Key insights from emotional data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                        <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
                          Key Insights
                        </h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-blue-600 dark:text-blue-300">
                          <li>
                            Variant "{emotionData.topEmotionalVariant?.name}" generated the strongest emotional response, with {emotionData.topEmotionalVariant?.primaryEmotion} being the dominant emotion.
                          </li>
                          <li>
                            A strong correlation was observed between {emotionData.correlations.strongestEmotion} responses and engagement rates.
                          </li>
                          <li>
                            {emotionData.insights.timeOfDay} shows the highest emotional engagement across all variants.
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                        <h4 className="font-medium mb-2 text-green-700 dark:text-green-300">
                          Recommendations
                        </h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-green-600 dark:text-green-300">
                          <li>
                            Continue developing creative content that evokes {emotionData.correlations.strongestEmotion} to maximize engagement.
                          </li>
                          <li>
                            Consider scheduling higher budget allocation during {emotionData.insights.timeOfDay} when emotional engagement is highest.
                          </li>
                          <li>
                            Elements from "{emotionData.topEmotionalVariant?.name}" should be incorporated into future campaigns.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg dark:bg-gray-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No emotion data available</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Emotion data may be unavailable or still being processed
                </p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
      
      <div className="flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}
        >
          Back to Campaign
        </Button>
        
        {abTest.status === 'ACTIVE' && (
          <Button 
            variant="default"
            onClick={() => {
              // Complete the test
              fetch(`/api/advertiser/campaigns/${campaignId}/abtests/${id}/status`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'COMPLETED' }),
              }).then(response => {
                if (response.ok) {
                  toast({
                    title: 'Success',
                    description: 'A/B test completed successfully',
                  });
                  // Update local state
                  setAbTest({
                    ...abTest,
                    status: 'COMPLETED',
                    endDate: new Date().toISOString(),
                  });
                } else {
                  toast({
                    title: 'Error',
                    description: 'Failed to complete A/B test',
                    variant: 'destructive',
                  });
                }
              }).catch(error => {
                console.error('Error completing AB test:', error);
                toast({
                  title: 'Error',
                  description: 'Failed to complete A/B test',
                  variant: 'destructive',
                });
              });
            }}
          >
            Complete Test
          </Button>
        )}
      </div>
    </div>
  );
} 