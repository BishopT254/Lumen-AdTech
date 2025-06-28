'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LoadingState from '@/components/loading-state';
import LoadingButton from '@/components/loading-button';

export default function CampaignBudgetPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    budget: '',
    dailyBudget: '',
    hasBudgetAlert: false,
    budgetAlertThreshold: '',
  });

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/advertiser/campaigns/${id}/budget`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch campaign budget data');
        }
        
        const data = await response.json();
        setCampaign(data.campaign);
        setBudgetData(data.budget);
        
        // Initialize form with current values
        setFormData({
          budget: data.campaign.budget ? data.campaign.budget.toString() : '',
          dailyBudget: data.campaign.dailyBudget ? data.campaign.dailyBudget.toString() : '',
          hasBudgetAlert: data.campaign.hasBudgetAlert || false,
          budgetAlertThreshold: data.campaign.budgetAlertThreshold ? data.campaign.budgetAlertThreshold.toString() : '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchBudgetData();
    }
  }, [id, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Validate numbers
      if (formData.budget && isNaN(Number(formData.budget))) {
        throw new Error('Total budget must be a valid number');
      }
      
      if (formData.dailyBudget && isNaN(Number(formData.dailyBudget))) {
        throw new Error('Daily budget must be a valid number');
      }
      
      if (formData.budgetAlertThreshold && isNaN(Number(formData.budgetAlertThreshold))) {
        throw new Error('Budget alert threshold must be a valid number');
      }
      
      // Validate budget alert threshold is between 1 and 100
      if (formData.budgetAlertThreshold && (Number(formData.budgetAlertThreshold) < 1 || Number(formData.budgetAlertThreshold) > 100)) {
        throw new Error('Budget alert threshold must be between 1 and 100');
      }
      
      // Validate daily budget doesn't exceed total budget
      if (formData.budget && formData.dailyBudget && Number(formData.dailyBudget) > Number(formData.budget)) {
        throw new Error('Daily budget cannot exceed total budget');
      }
      
      const response = await fetch(`/api/advertiser/campaigns/${id}/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budget: formData.budget ? Number(formData.budget) : undefined,
          dailyBudget: formData.dailyBudget ? Number(formData.dailyBudget) : null,
          hasBudgetAlert: formData.hasBudgetAlert,
          budgetAlertThreshold: formData.budgetAlertThreshold ? Number(formData.budgetAlertThreshold) : null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update budget settings');
      }
      
      const data = await response.json();
      setCampaign(data.campaign);
      
      setSuccessMessage('Budget settings updated successfully');
      
      // Wait for 3 seconds before redirecting
      setTimeout(() => {
        router.push(`/advertiser/campaigns/${id}`);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving budget settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading budget data..." />;
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

  if (!campaign || !budgetData) {
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

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Budget Management
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

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Current Budget Overview
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Budget</h4>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(campaign.budget || 0)}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent</h4>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetData.totalSpend || 0)}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget Remaining</h4>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetData.remaining || 0)}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget Utilization</h4>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {budgetData.spendPercentage?.toFixed(1) || '0'}%
              </p>
              {campaign.budget > 0 && (
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full dark:bg-blue-500" 
                    style={{ width: `${Math.min(budgetData.spendPercentage || 0, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Daily spend chart placeholder */}
          {budgetData.dailySpend && budgetData.dailySpend.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Daily Spend</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Impressions
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Engagements
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                        Spend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                    {budgetData.dailySpend.map((day: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {day.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {day.engagements.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(day.spend)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Budget Settings
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Adjust your campaign's budget and spending limits
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Campaign Budget
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                name="budget"
                id="budget"
                className="block w-full pl-7 pr-12 py-2 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
                value={formData.budget}
                onChange={handleInputChange}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">USD</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              The maximum amount you want to spend on this campaign overall
            </p>
          </div>
          
          <div>
            <label htmlFor="dailyBudget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Daily Budget (Optional)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                name="dailyBudget"
                id="dailyBudget"
                className="block w-full pl-7 pr-12 py-2 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
                value={formData.dailyBudget}
                onChange={handleInputChange}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">USD</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              The maximum amount you want to spend per day (leave empty for no daily limit)
            </p>
          </div>
          
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                id="hasBudgetAlert"
                name="hasBudgetAlert"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
                checked={formData.hasBudgetAlert}
                onChange={handleInputChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="hasBudgetAlert" className="font-medium text-gray-700 dark:text-gray-300">
                Enable Budget Alert
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Get notified when your campaign reaches a specific budget threshold
              </p>
            </div>
          </div>
          
          {formData.hasBudgetAlert && (
            <div>
              <label htmlFor="budgetAlertThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Budget Alert Threshold (%)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="budgetAlertThreshold"
                  id="budgetAlertThreshold"
                  className="block w-full pr-12 py-2 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="75"
                  value={formData.budgetAlertThreshold}
                  onChange={handleInputChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                You'll be notified when your campaign reaches this percentage of its total budget
              </p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6 border-t border-gray-200 dark:border-gray-700">
          <LoadingButton
            type="submit"
            loading={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Save Budget Settings
          </LoadingButton>
        </div>
      </form>
    </div>
  );
} 