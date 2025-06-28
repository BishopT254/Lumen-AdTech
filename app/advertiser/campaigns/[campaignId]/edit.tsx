'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import LoadingState from '@/components/loading-state';

// Campaign form schema
const campaignFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Name must be at least 3 characters long' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  description: z
    .string()
    .max(500, { message: 'Description must be less than 500 characters' })
    .optional(),
  budget: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Budget must be a positive number',
    }),
  dailyBudget: z
    .string()
    .refine(
      (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
      {
        message: 'Daily budget must be a positive number or empty',
      }
    )
    .optional(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  campaignType: z.string(),
  objective: z.string(),
});

export default function EditCampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  
  // Initialize form with default values
  const form = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      budget: '',
      dailyBudget: '',
      campaignType: 'DISPLAY',
      objective: 'AWARENESS',
    },
  });
  
  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/advertiser/campaigns/${campaignId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch campaign');
        }
        
        const data = await response.json();
        setCampaign(data.campaign);
        
        // Set form values
        form.reset({
          name: data.campaign.name,
          description: data.campaign.description || '',
          budget: data.campaign.budget?.toString() || '',
          dailyBudget: data.campaign.dailyBudget?.toString() || '',
          startDate: data.campaign.startDate ? new Date(data.campaign.startDate) : new Date(),
          endDate: data.campaign.endDate ? new Date(data.campaign.endDate) : undefined,
          campaignType: data.campaign.type || 'DISPLAY',
          objective: data.campaign.objective || 'AWARENESS',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session) {
      fetchCampaign();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [campaignId, session, status, router, form]);
  
  const onSubmit = async (values: z.infer<typeof campaignFormSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Transform values for API
      const apiValues = {
        ...values,
        budget: parseFloat(values.budget),
        dailyBudget: values.dailyBudget ? parseFloat(values.dailyBudget) : undefined,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
      };
      
      const response = await fetch(`/api/advertiser/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiValues),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update campaign');
      }
      
      toast.success('Campaign updated successfully');
      router.push(`/advertiser/campaigns/${campaignId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return <LoadingState message="Loading campaign data..." />;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push('/advertiser/campaigns')}>
            Return to Campaigns
          </Button>
        </div>
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
  
  // Check if campaign is in a state that can be edited
  const canEditCampaign = ['DRAFT', 'PAUSED', 'REJECTED'].includes(campaign.status);
  
  if (!canEditCampaign) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Campaign Cannot Be Edited: </strong>
          <span className="block sm:inline">
            This campaign is currently in {campaign.status.replace('_', ' ')} status and cannot be edited.
            Please change the campaign status to DRAFT, PAUSED, or REJECTED to make changes.
          </span>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}>
              Return to Campaign Details
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Campaign</h1>
          <p className="text-gray-500">Campaign ID: {campaign.id}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}
          >
            Cancel
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name to identify your campaign.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter campaign description (optional)"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional details about your campaign objectives.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="campaignType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Type*</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DISPLAY">Display</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="SEARCH">Search</SelectItem>
                          <SelectItem value="SOCIAL">Social</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of advertising medium.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Objective*</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign objective" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AWARENESS">Brand Awareness</SelectItem>
                          <SelectItem value="CONSIDERATION">Consideration</SelectItem>
                          <SelectItem value="CONVERSION">Conversion</SelectItem>
                          <SelectItem value="TRAFFIC">Traffic</SelectItem>
                          <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                          <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        What you want to achieve with this campaign.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget (USD)*</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="e.g. 1000.00"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum amount to spend on this campaign.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dailyBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Budget (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="e.g. 100.00 (optional)"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum daily spend. Leave empty for no limit.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Select a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the campaign should start running.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>No end date (optional)</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => date < form.getValues('startDate')}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the campaign should stop. Leave empty for no end date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/advertiser/campaigns/${campaignId}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Campaign'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {campaign.status === 'DRAFT' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Submit for Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Once you've made your changes, submit your campaign for approval to start running it.
            </p>
            <Button
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  const response = await fetch(`/api/advertiser/campaigns/${campaignId}/status`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'PENDING_APPROVAL' }),
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to submit campaign for approval');
                  }
                  
                  toast.success('Campaign submitted for approval');
                  router.push(`/advertiser/campaigns/${campaignId}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'An error occurred');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Submit for Approval
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}