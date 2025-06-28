'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LoadingButton from '@/components/loading-button';

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState({
    name: '',
    objective: 'AWARENESS',
    startDate: '',
    endDate: '',
    budget: '',
    dailyBudget: '',
    status: 'DRAFT',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const objectives = [
    { id: 'AWARENESS', name: 'Brand Awareness' },
    { id: 'CONSIDERATION', name: 'Consideration' },
    { id: 'CONVERSION', name: 'Conversion' },
    { id: 'TRAFFIC', name: 'Website Traffic' },
    { id: 'ENGAGEMENT', name: 'Engagement' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (!formData.objective) {
      newErrors.objective = 'Campaign objective is required';
    }
    
    // Date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    // Budget validation
    if (!formData.budget) {
      newErrors.budget = 'Total budget is required';
    } else if (isNaN(Number(formData.budget)) || Number(formData.budget) <= 0) {
      newErrors.budget = 'Budget must be a positive number';
    }
    
    if (!formData.dailyBudget) {
      newErrors.dailyBudget = 'Daily budget is required';
    } else if (isNaN(Number(formData.dailyBudget)) || Number(formData.dailyBudget) <= 0) {
      newErrors.dailyBudget = 'Daily budget must be a positive number';
    } else if (Number(formData.dailyBudget) > Number(formData.budget)) {
      newErrors.dailyBudget = 'Daily budget cannot exceed total budget';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setApiError(null);
      
      // Format data for API
      const payload = {
        ...formData,
        budget: Number(formData.budget),
        dailyBudget: Number(formData.dailyBudget),
      };
      
      const response = await fetch('/api/advertiser/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
      
      const data = await response.json();
      
      // Redirect to the new campaign page
      router.push(`/advertiser/campaigns/${data.campaign.id}`);
      
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An error occurred while creating the campaign');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date for start date (today)
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Create New Campaign
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Set up your advertising campaign and start reaching your audience
        </p>
      </div>
        <Link
          href="/advertiser/campaigns"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
          Cancel
        </Link>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Campaign Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Basic information about your advertising campaign
              </p>
            </div>

        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Campaign Name */}
            <div className="sm:col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Campaign Name *
                </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Summer Sale 2023"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>
              </div>

            {/* Campaign Objective */}
            <div className="sm:col-span-3">
                <label htmlFor="objective" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Campaign Objective *
                </label>
              <div className="mt-1">
                <select
                  id="objective"
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {objectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>
                      {objective.name}
                    </option>
                  ))}
                </select>
                {errors.objective && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.objective}</p>
                )}
              </div>
            </div>

            {/* Campaign Status */}
            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Campaign Status
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>
              </div>

            {/* Campaign Dates */}
            <div className="sm:col-span-3">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date *
                  </label>
              <div className="mt-1">
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={formData.startDate}
                  onChange={handleChange}
                  min={getTodayFormatted()}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                {errors.startDate && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
                )}
              </div>
                </div>

            <div className="sm:col-span-3">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
              <div className="mt-1">
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || getTodayFormatted()}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errors.endDate && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Campaign Budget */}
            <div className="sm:col-span-3">
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Budget ($) *
                </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
                  </div>
                  <input
                    type="number"
                    name="budget"
                    id="budget"
                    value={formData.budget}
                  onChange={handleChange}
                  min="1"
                  step="0.01"
                  className="block w-full pl-7 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="1000.00"
                />
                {errors.budget && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.budget}</p>
                )}
                </div>
              </div>

            <div className="sm:col-span-3">
                <label htmlFor="dailyBudget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Daily Budget ($) *
                </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
                  </div>
                  <input
                    type="number"
                    name="dailyBudget"
                    id="dailyBudget"
                    value={formData.dailyBudget}
                  onChange={handleChange}
                  min="1"
                  step="0.01"
                  className="block w-full pl-7 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="100.00"
                />
                {errors.dailyBudget && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.dailyBudget}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <LoadingButton
              type="submit"
            loading={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
                  Create Campaign
          </LoadingButton>
        </div>
      </form>
    </div>
  );
} 