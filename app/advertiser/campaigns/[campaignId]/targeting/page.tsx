'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LoadingState from '@/components/loading-state';
import LoadingButton from '@/components/loading-button';

interface TargetingOptions {
  devices: {
    types: string[];
    selectedTypes: string[];
  };
  locations: {
    available: string[];
    selected: string[];
  };
  demographics: {
    ageRanges: string[];
    selectedAgeRanges: string[];
    genders: string[];
    selectedGenders: string[];
  };
  interests: {
    categories: string[];
    selected: string[];
  };
  timeSchedule: {
    days: string[];
    selectedDays: string[];
    timeRanges: {
      start: string;
      end: string;
    }[];
  };
}

export default function CampaignTargetingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [targetingOptions, setTargetingOptions] = useState<TargetingOptions | null>(null);
  const [selectedTargeting, setSelectedTargeting] = useState<any>({
    devices: {
      types: []
    },
    locations: [],
    demographics: {
      ageRanges: [],
      genders: []
    },
    interests: [],
    timeSchedule: {
      days: [],
      timeRanges: []
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch campaign
        const campaignResponse = await fetch(`/api/advertiser/campaigns/${id}`);
        if (!campaignResponse.ok) {
          throw new Error('Failed to fetch campaign details');
        }
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData.campaign);
        
        // Initialize selected targeting from campaign
        if (campaignData.campaign.targetDemographics) {
          const targetDemographics = typeof campaignData.campaign.targetDemographics === 'string' 
            ? JSON.parse(campaignData.campaign.targetDemographics)
            : campaignData.campaign.targetDemographics;
            
          setSelectedTargeting({
            devices: {
              types: targetDemographics.deviceTypes || []
            },
            locations: targetDemographics.locations || [],
            demographics: {
              ageRanges: targetDemographics.ageRanges || [],
              genders: targetDemographics.genders || []
            },
            interests: targetDemographics.interests || [],
            timeSchedule: targetDemographics.timeSchedule || {
              days: [],
              timeRanges: []
            }
          });
        }
        
        // Fetch targeting options
        const targetingResponse = await fetch('/api/advertiser/campaigns/targeting');
        if (!targetingResponse.ok) {
          throw new Error('Failed to fetch targeting options');
        }
        const targetingData = await targetingResponse.json();
        
        setTargetingOptions({
          devices: {
            types: targetingData.devices.types,
            selectedTypes: selectedTargeting.devices.types
          },
          locations: {
            available: targetingData.locations,
            selected: selectedTargeting.locations
          },
          demographics: {
            ageRanges: targetingData.demographics.ageRanges,
            selectedAgeRanges: selectedTargeting.demographics.ageRanges,
            genders: targetingData.demographics.genders,
            selectedGenders: selectedTargeting.demographics.genders
          },
          interests: {
            categories: targetingData.interests,
            selected: selectedTargeting.interests
          },
          timeSchedule: {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            selectedDays: selectedTargeting.timeSchedule.days,
            timeRanges: selectedTargeting.timeSchedule.timeRanges || []
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [id, session]);

  const handleDeviceTypeChange = (deviceType: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const types = checked 
        ? [...prev.devices.types, deviceType]
        : prev.devices.types.filter((type: string) => type !== deviceType);
        
      return {
        ...prev,
        devices: {
          ...prev.devices,
          types
        }
      };
    });
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const locations = checked 
        ? [...prev.locations, location]
        : prev.locations.filter((loc: string) => loc !== location);
        
      return {
        ...prev,
        locations
      };
    });
  };

  const handleAgeRangeChange = (ageRange: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const ageRanges = checked 
        ? [...prev.demographics.ageRanges, ageRange]
        : prev.demographics.ageRanges.filter((range: string) => range !== ageRange);
        
      return {
        ...prev,
        demographics: {
          ...prev.demographics,
          ageRanges
        }
      };
    });
  };

  const handleGenderChange = (gender: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const genders = checked 
        ? [...prev.demographics.genders, gender]
        : prev.demographics.genders.filter((g: string) => g !== gender);
        
      return {
        ...prev,
        demographics: {
          ...prev.demographics,
          genders
        }
      };
    });
  };

  const handleInterestChange = (interest: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const interests = checked 
        ? [...prev.interests, interest]
        : prev.interests.filter((i: string) => i !== interest);
        
      return {
        ...prev,
        interests
      };
    });
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setSelectedTargeting(prev => {
      const days = checked 
        ? [...prev.timeSchedule.days, day]
        : prev.timeSchedule.days.filter((d: string) => d !== day);
        
      return {
        ...prev,
        timeSchedule: {
          ...prev.timeSchedule,
          days
        }
      };
    });
  };

  const handleAddTimeRange = () => {
    setSelectedTargeting(prev => {
      const timeRanges = [
        ...prev.timeSchedule.timeRanges,
        { start: '08:00', end: '17:00' }
      ];
      
      return {
        ...prev,
        timeSchedule: {
          ...prev.timeSchedule,
          timeRanges
        }
      };
    });
  };

  const handleRemoveTimeRange = (index: number) => {
    setSelectedTargeting(prev => {
      const timeRanges = prev.timeSchedule.timeRanges.filter((_: any, i: number) => i !== index);
      
      return {
        ...prev,
        timeSchedule: {
          ...prev.timeSchedule,
          timeRanges
        }
      };
    });
  };

  const handleTimeRangeChange = (index: number, field: 'start' | 'end', value: string) => {
    setSelectedTargeting(prev => {
      const timeRanges = [...prev.timeSchedule.timeRanges];
      timeRanges[index][field] = value;
      
      return {
        ...prev,
        timeSchedule: {
          ...prev.timeSchedule,
          timeRanges
        }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch(`/api/advertiser/campaigns/targeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: id,
          targeting: {
            devices: {
              types: selectedTargeting.devices.types
            },
            demographics: {
              ageRanges: selectedTargeting.demographics.ageRanges,
              genders: selectedTargeting.demographics.genders
            },
            locations: selectedTargeting.locations,
            interests: selectedTargeting.interests,
            temporal: {
              days: selectedTargeting.timeSchedule.days,
              timeRanges: selectedTargeting.timeSchedule.timeRanges
            }
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update targeting options');
      }
      
      setSuccessMessage('Targeting options updated successfully');
      
      // Wait for 3 seconds before redirecting
      setTimeout(() => {
        router.push(`/advertiser/campaigns/${id}`);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving targeting options');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading targeting options..." />;
  }

  if (error && !campaign) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <div className="mt-4">
          <Link
            href={`/advertiser/campaigns/${id}`}
            className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Return to Campaign
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign || !targetingOptions) {
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

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Campaign Targeting
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {campaign.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/advertiser/campaigns/${id}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Campaign
          </Link>
        </div>
      </div>

      {/* Notification area */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400" role="alert">
          <strong className="font-bold">Success: </strong>
          <span className="block sm:inline">{successMessage}</span>
          <p className="mt-2 text-sm">Redirecting back to campaign details...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Device Targeting */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Device Targeting
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select which types of devices should display your ads
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {targetingOptions.devices.types.map((deviceType) => (
                <div key={deviceType} className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id={`device-${deviceType}`}
                      name={`device-${deviceType}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                      checked={selectedTargeting.devices.types.includes(deviceType)}
                      onChange={(e) => handleDeviceTypeChange(deviceType, e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`device-${deviceType}`} className="font-medium text-gray-700 dark:text-gray-300">
                      {deviceType}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Targeting */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Location Targeting
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select geographic locations where your ads should appear
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {targetingOptions.locations.available.map((location) => (
                <div key={location} className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id={`location-${location}`}
                      name={`location-${location}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                      checked={selectedTargeting.locations.includes(location)}
                      onChange={(e) => handleLocationChange(location, e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`location-${location}`} className="font-medium text-gray-700 dark:text-gray-300">
                      {location}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demographic Targeting */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Demographic Targeting
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Target specific demographic groups
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Age Ranges</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {targetingOptions.demographics.ageRanges.map((ageRange) => (
                    <div key={ageRange} className="relative flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id={`age-${ageRange}`}
                          name={`age-${ageRange}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                          checked={selectedTargeting.demographics.ageRanges.includes(ageRange)}
                          onChange={(e) => handleAgeRangeChange(ageRange, e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`age-${ageRange}`} className="font-medium text-gray-700 dark:text-gray-300">
                          {ageRange}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Gender</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {targetingOptions.demographics.genders.map((gender) => (
                    <div key={gender} className="relative flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id={`gender-${gender}`}
                          name={`gender-${gender}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                          checked={selectedTargeting.demographics.genders.includes(gender)}
                          onChange={(e) => handleGenderChange(gender, e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`gender-${gender}`} className="font-medium text-gray-700 dark:text-gray-300">
                          {gender}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interest Targeting */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Interest Targeting
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Target users based on their interests
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {targetingOptions.interests.categories.map((interest) => (
                <div key={interest} className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id={`interest-${interest}`}
                      name={`interest-${interest}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                      checked={selectedTargeting.interests.includes(interest)}
                      onChange={(e) => handleInterestChange(interest, e.target.checked)}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`interest-${interest}`} className="font-medium text-gray-700 dark:text-gray-300">
                      {interest}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time Scheduling */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Time Scheduling
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Schedule when your ads should be displayed
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Days of the Week</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {targetingOptions.timeSchedule.days.map((day) => (
                    <div key={day} className="relative flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id={`day-${day}`}
                          name={`day-${day}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                          checked={selectedTargeting.timeSchedule.days.includes(day)}
                          onChange={(e) => handleDayChange(day, e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`day-${day}`} className="font-medium text-gray-700 dark:text-gray-300">
                          {day}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Time Ranges</h4>
                  <button
                    type="button"
                    onClick={handleAddTimeRange}
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Time Range
                  </button>
                </div>
                
                {selectedTargeting.timeSchedule.timeRanges.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No time ranges added. Ads will be displayed all day by default.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTargeting.timeSchedule.timeRanges.map((timeRange: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="flex-grow sm:flex sm:items-center sm:space-x-4">
                          <div className="flex-1 sm:w-1/3">
                            <label htmlFor={`time-start-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Start Time
                            </label>
                            <input
                              type="time"
                              id={`time-start-${index}`}
                              value={timeRange.start}
                              onChange={(e) => handleTimeRangeChange(index, 'start', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          
                          <div className="flex-1 mt-3 sm:mt-0 sm:w-1/3">
                            <label htmlFor={`time-end-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              End Time
                            </label>
                            <input
                              type="time"
                              id={`time-end-${index}`}
                              value={timeRange.end}
                              onChange={(e) => handleTimeRangeChange(index, 'end', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeRange(index)}
                          className="mt-6 inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex justify-end">
          <Link
            href={`/advertiser/campaigns/${id}`}
            className="mr-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <LoadingButton
            type="submit"
            loading={saving}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Save Targeting Options
          </LoadingButton>
        </div>
      </form>
    </div>
  );
} 