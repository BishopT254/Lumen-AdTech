'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import LoadingState from '@/components/loading-state';

// Import the emotion-aware delivery service
import { emotionAwareDelivery } from '@/lib/emotion-aware-delivery';

// Import the emotion types for type safety
import { EmotionTargeting, EmotionKey, EmotionInsight } from '@/types/emotion';

interface ABTestProps {
  campaignId: string;
}

// Define the emotion targeting schema using our types
const emotionTargetingSchema = z.object({
  joy: z.boolean().default(false),
  surprise: z.boolean().default(false),
  anger: z.boolean().default(false),
  fear: z.boolean().default(false),
  disgust: z.boolean().default(false),
  sadness: z.boolean().default(false),
  neutral: z.boolean().default(false),
});

const newAbTestSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().optional(),
  emotionAware: z.boolean().default(false),
  targetEmotions: emotionTargetingSchema.optional(),
  variants: z.array(
    z.object({
      adCreativeId: z.string().min(1, { message: 'Ad creative is required' }),
      trafficAllocation: z.number().min(1).max(100),
    })
  ).min(2, { message: 'At least 2 variants are required' }),
});

type NewAbTestFormValues = z.infer<typeof newAbTestSchema>;

export default function ABTesting({ campaignId }: ABTestProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [adCreatives, setAdCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [emotionInsights, setEmotionInsights] = useState<EmotionInsight[] | null>(null);
  
  const form = useForm<NewAbTestFormValues>({
    resolver: zodResolver(newAbTestSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      emotionAware: false,
      targetEmotions: {
        joy: false,
        surprise: false,
        anger: false,
        fear: false,
        disgust: false,
        sadness: false,
        neutral: false,
      },
      variants: [
        { adCreativeId: '', trafficAllocation: 50 },
        { adCreativeId: '', trafficAllocation: 50 },
      ],
    },
  });

  // Watch emotionAware value to conditionally show/hide emotion targeting options
  const emotionAware = form.watch('emotionAware');
  const variants = form.watch('variants');

  // Calculate remaining allocation percentage
  const totalAllocation = variants.reduce((sum, variant) => sum + variant.trafficAllocation, 0);
  const isAllocationValid = totalAllocation === 100;

  useEffect(() => {
    // Fetch AB tests and ad creatives
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch AB tests
        const testsResponse = await fetch(`/api/advertiser/campaigns/${campaignId}/abtests`);
        if (!testsResponse.ok) throw new Error('Failed to fetch AB tests');
        const testsData = await testsResponse.json();
        
        // Separate active and completed tests
        const active = testsData.abTests.filter((test: any) => 
          ['DRAFT', 'ACTIVE'].includes(test.status)
        );
        const completed = testsData.abTests.filter((test: any) => 
          ['COMPLETED', 'CANCELLED'].includes(test.status)
        );
        
        setActiveTests(active);
        setCompletedTests(completed);

        // Fetch ad creatives
        const creativesResponse = await fetch(`/api/advertiser/campaigns/${campaignId}/creatives`);
        if (!creativesResponse.ok) throw new Error('Failed to fetch ad creatives');
        const creativesData = await creativesResponse.json();
        setAdCreatives(creativesData.adCreatives);

        // Get emotion insights with strong typing
        const emotionData = await emotionAwareDelivery.generateEmotionInsights(campaignId);
        setEmotionInsights(emotionData.insights as EmotionInsight[]);

      } catch (error) {
        console.error('Error fetching AB test data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load A/B testing data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, toast]);

  const onSubmit = async (data: NewAbTestFormValues) => {
    try {
      setSubmitLoading(true);

      // Format the data for API submission
      const payload = {
        ...data,
        campaignId,
        status: 'DRAFT',
      };

      // Create the AB test
      const response = await fetch(`/api/advertiser/campaigns/${campaignId}/abtests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create A/B test');
      }

      toast({
        title: 'Success',
        description: 'A/B test created successfully',
      });

      // Reset form and refresh data
      form.reset();
      router.refresh();
      
      // Fetch updated tests
      const testsResponse = await fetch(`/api/advertiser/campaigns/${campaignId}/abtests`);
      const testsData = await testsResponse.json();
      
      // Separate active and completed tests
      const active = testsData.abTests.filter((test: any) => 
        ['DRAFT', 'ACTIVE'].includes(test.status)
      );
      const completed = testsData.abTests.filter((test: any) => 
        ['COMPLETED', 'CANCELLED'].includes(test.status)
      );
      
      setActiveTests(active);
      setCompletedTests(completed);

    } catch (error) {
      console.error('Error creating AB test:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create A/B test',
        variant: 'destructive',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const addVariant = () => {
    const currentVariants = form.getValues('variants');
    
    // Calculate new traffic allocation
    const newAllocationPercent = Math.floor(100 / (currentVariants.length + 1));
    const updatedVariants = currentVariants.map(variant => ({
      ...variant,
      trafficAllocation: newAllocationPercent,
    }));
    
    // Add new variant
    updatedVariants.push({
      adCreativeId: '',
      trafficAllocation: newAllocationPercent + (100 - (newAllocationPercent * (currentVariants.length + 1))),
    });
    
    form.setValue('variants', updatedVariants);
  };

  const removeVariant = (index: number) => {
    const currentVariants = form.getValues('variants');
    if (currentVariants.length <= 2) return; // Minimum 2 variants
    
    // Remove the variant
    const filteredVariants = currentVariants.filter((_, i) => i !== index);
    
    // Redistribute allocation
    const newAllocationPercent = Math.floor(100 / filteredVariants.length);
    const updatedVariants = filteredVariants.map((variant, i) => ({
      ...variant,
      trafficAllocation: i === filteredVariants.length - 1 
        ? newAllocationPercent + (100 - (newAllocationPercent * filteredVariants.length))
        : newAllocationPercent,
    }));
    
    form.setValue('variants', updatedVariants);
  };

  // Type-safe emotion toggle handler
  const handleEmotionToggle = (emotion: EmotionKey, checked: boolean) => {
    const currentEmotions = form.getValues('targetEmotions') || {
      joy: false,
      surprise: false,
      anger: false,
      fear: false,
      disgust: false,
      sadness: false,
      neutral: false,
    };
    
    form.setValue('targetEmotions', {
      ...currentEmotions,
      [emotion]: checked
    });
  };

  // Type-safe slider handler
  const handleAllocationChange = (index: number, values: number[]) => {
    const value = values[0];
    const currentVariants = form.getValues('variants');
    
    // Calculate the difference from previous value
    const previousValue = currentVariants[index].trafficAllocation;
    const difference = value - previousValue;
    
    if (totalAllocation + difference > 100) return; // Cannot exceed 100%
    
    // Update the variant
    const updatedVariants = [...currentVariants];
    updatedVariants[index].trafficAllocation = value;
    
    form.setValue('variants', updatedVariants);
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

  if (loading) {
    return <LoadingState message="Loading A/B testing data..." />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Tests ({activeTests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed Tests ({completedTests.length})</TabsTrigger>
          <TabsTrigger value="create">Create New Test</TabsTrigger>
        </TabsList>
        
        {/* Active Tests Tab */}
        <TabsContent value="active" className="space-y-4 pt-4">
          {activeTests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg dark:bg-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active tests</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create a new A/B test to optimize your campaign performance
              </p>
            </div>
          ) : (
            activeTests.map((test) => (
              <Card key={test.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{test.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {test.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                        <span className="font-medium">{formatDate(test.startDate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                        <span className="font-medium">{formatDate(test.endDate || '')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Variants:</span>
                        <span className="font-medium">{test.variants?.length || 0}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Variants</h4>
                      <div className="space-y-2">
                        {test.variants?.map((variant: any) => (
                          <div key={variant.id} className="flex items-center justify-between">
                            <span className="text-sm truncate max-w-[200px]">
                              {variant.adCreative?.name || 'Unknown Creative'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full dark:bg-blue-500" 
                                  style={{ width: `${variant.trafficAllocation}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {variant.trafficAllocation}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {test.status === 'ACTIVE' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium mb-2">Performance</h4>
                      <div className="space-y-2">
                        {test.variants?.map((variant: any) => (
                          <div key={variant.id} className="flex items-center justify-between">
                            <span className="text-sm truncate max-w-[200px]">
                              {variant.adCreative?.name || 'Unknown Creative'}
                            </span>
                            <div className="flex items-center space-x-4">
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Impressions: </span>
                                <span className="font-medium">{variant.impressions}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Engagements: </span>
                                <span className="font-medium">{variant.engagements}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">CTR: </span>
                                <span className="font-medium">
                                  {variant.impressions > 0 
                                    ? ((variant.engagements / variant.impressions) * 100).toFixed(2) 
                                    : '0.00'}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-gray-50 flex justify-end space-x-2 dark:bg-gray-800">
                  {test.status === 'DRAFT' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        // Start the test
                        fetch(`/api/advertiser/campaigns/${campaignId}/abtests/${test.id}/status`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ status: 'ACTIVE' }),
                        }).then(response => {
                          if (response.ok) {
                            toast({
                              title: 'Success',
                              description: 'A/B test started successfully',
                            });
                            // Update local state
                            const updatedActiveTests = activeTests.map(t => 
                              t.id === test.id ? { ...t, status: 'ACTIVE' } : t
                            );
                            setActiveTests(updatedActiveTests);
                          } else {
                            toast({
                              title: 'Error',
                              description: 'Failed to start A/B test',
                              variant: 'destructive',
                            });
                          }
                        }).catch(error => {
                          console.error('Error starting AB test:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to start A/B test',
                            variant: 'destructive',
                          });
                        });
                      }}
                    >
                      Start Test
                    </Button>
                  )}
                  
                  {test.status === 'ACTIVE' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Complete the test
                        fetch(`/api/advertiser/campaigns/${campaignId}/abtests/${test.id}/status`, {
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
                            const updatedTest = { ...test, status: 'COMPLETED' };
                            setActiveTests(activeTests.filter(t => t.id !== test.id));
                            setCompletedTests([updatedTest, ...completedTests]);
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
                  
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => router.push(`/advertiser/campaigns/${campaignId}/abtests/${test.id}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        {/* Completed Tests Tab */}
        <TabsContent value="completed" className="space-y-4 pt-4">
          {completedTests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg dark:bg-gray-800">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No completed tests</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Tests that are finished or cancelled will appear here
              </p>
            </div>
          ) : (
            completedTests.map((test) => (
              <Card key={test.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{test.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {test.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Started:</span>
                        <span className="font-medium">{formatDate(test.startDate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                        <span className="font-medium">{formatDate(test.endDate || '')}</span>
                      </div>
                      {test.winningVariantId && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Winning Variant:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {test.variants?.find((v: any) => v.id === test.winningVariantId)?.adCreative?.name || 'Unknown'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Results</h4>
                      <div className="space-y-2">
                        {test.variants?.map((variant: any) => (
                          <div key={variant.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${variant.id === test.winningVariantId ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                              <span className="text-sm truncate max-w-[150px]">
                                {variant.adCreative?.name || 'Unknown Creative'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Imp: </span>
                                <span className="font-medium">{variant.impressions}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Eng: </span>
                                <span className="font-medium">{variant.engagements}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500 dark:text-gray-400">CTR: </span>
                                <span className="font-medium">
                                  {variant.impressions > 0 
                                    ? ((variant.engagements / variant.impressions) * 100).toFixed(2) 
                                    : '0.00'}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 flex justify-end dark:bg-gray-800">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => router.push(`/advertiser/campaigns/${campaignId}/abtests/${test.id}`)}
                  >
                    View Report
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        {/* Create New Test Tab */}
        <TabsContent value="create" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create A/B Test</CardTitle>
              <CardDescription>
                Test different ad creatives to optimize your campaign performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter test name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter test description" 
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Emotion-Aware Testing */}
                  <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                    <h3 className="text-base font-medium mb-4 text-gray-900 dark:text-white">
                      AI-Powered Optimization
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="emotionAware"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 dark:border-gray-700">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Emotion-Aware Testing</FormLabel>
                            <FormDescription>
                              Optimize ad delivery based on viewer emotional responses
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {emotionAware && (
                      <div className="mt-4 rounded-lg border p-4 dark:border-gray-700">
                        <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">Target Emotions</h4>
                        
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {Object.keys(form.getValues('targetEmotions') || {}).map((emotion) => (
                            <div key={emotion} className="flex items-center space-x-2">
                              <Switch 
                                checked={form.getValues(`targetEmotions.${emotion as EmotionKey}`) as boolean} 
                                onCheckedChange={(checked) => handleEmotionToggle(emotion as EmotionKey, checked)}
                                id={`emotion-${emotion}`}
                              />
                              <label 
                                htmlFor={`emotion-${emotion}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                              </label>
                            </div>
                          ))}
                        </div>
                        
                        {/* Display emotion insights if available */}
                        {emotionInsights && emotionInsights.length > 0 && (
                          <div className="mt-6 bg-blue-50 p-4 rounded-md dark:bg-blue-900/20">
                            <h3 className="text-lg font-medium mb-2 text-blue-800 dark:text-blue-300">
                              Emotion Insights
                            </h3>
                            <div className="space-y-3">
                              {emotionInsights.map((insight: EmotionInsight, index: number) => (
                                <div key={index} className="text-sm text-blue-700 dark:text-blue-400">
                                  <strong>{insight.title}:</strong> {insight.description}
                                  {insight.recommendation && (
                                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                                      Recommendation: {insight.recommendation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Test Variants */}
                  <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        Test Variants
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariant}
                      >
                        Add Variant
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className={`text-sm ${isAllocationValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Total allocation: {totalAllocation}% {isAllocationValid ? '✓' : '(must be exactly 100%)'}
                      </div>
                      
                      {variants.map((variant, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-gray-700">
                          <FormField
                            control={form.control}
                            name={`variants.${index}.adCreativeId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ad Creative</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select ad creative" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {adCreatives.map((creative) => (
                                      <SelectItem key={creative.id} value={creative.id}>
                                        {creative.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex items-end space-x-4">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.trafficAllocation`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Traffic Allocation ({field.value}%)</FormLabel>
                                  <FormControl>
                                    <Slider
                                      value={[field.value]}
                                      onValueChange={(values) => handleAllocationChange(index, values)}
                                      min={1}
                                      max={100}
                                      step={1}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {variants.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10"
                                onClick={() => removeVariant(index)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitLoading || !isAllocationValid}>
                      {submitLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create A/B Test'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 