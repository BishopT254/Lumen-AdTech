'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LoadingState from '@/components/loading-state';
import LoadingButton from '@/components/loading-button';

export default function CampaignCreativesPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showNewCreativeForm, setShowNewCreativeForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'IMAGE',
    content: '',
    headline: '',
    description: '',
    callToAction: '',
    assetUrl: '',
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [previewCreative, setPreviewCreative] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch campaign details
        const campaignResponse = await fetch(`/api/advertiser/campaigns/${id}`);
        if (!campaignResponse.ok) {
          throw new Error('Failed to fetch campaign details');
        }
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData.campaign);
        
        // Fetch campaign creatives
        const creativesResponse = await fetch(`/api/advertiser/campaigns/creatives?campaignId=${id}`);
        if (!creativesResponse.ok) {
          throw new Error('Failed to fetch campaign creatives');
        }
        const creativesData = await creativesResponse.json();
        setCreatives(creativesData.creatives || []);
        
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Creative name is required';
    }
    
    if (!formData.type) {
      errors.type = 'Creative type is required';
    }
    
    if (!formData.headline.trim()) {
      errors.headline = 'Headline is required';
    } else if (formData.headline.length > 50) {
      errors.headline = 'Headline must be 50 characters or less';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length > 150) {
      errors.description = 'Description must be 150 characters or less';
    }
    
    if (!formData.callToAction.trim()) {
      errors.callToAction = 'Call to action is required';
    }
    
    if ((formData.type === 'IMAGE' || formData.type === 'VIDEO') && !formData.assetUrl.trim()) {
      errors.assetUrl = 'Asset URL is required for image or video creatives';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      return;
    }
    
    setPreviewCreative({
      ...formData,
      id: 'preview',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/advertiser/campaigns/creatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: id,
          ...formData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create creative');
      }
      
      const data = await response.json();
      
      // Add new creative to the list
      setCreatives(prev => [...prev, data.creative]);
      
      // Reset form
      setFormData({
        name: '',
        type: 'IMAGE',
        content: '',
        headline: '',
        description: '',
        callToAction: '',
        assetUrl: '',
      });
      
      setSuccessMessage('Creative created successfully');
      setShowNewCreativeForm(false);
      setPreviewCreative(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating creative');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCreative = async (creativeId: string) => {
    if (!confirm('Are you sure you want to delete this creative? This action cannot be undone.')) {
      return;
    }
    
    try {
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch(`/api/advertiser/campaigns/creatives/${creativeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete creative');
      }
      
      // Remove creative from the list
      setCreatives(prev => prev.filter(creative => creative.id !== creativeId));
      setSuccessMessage('Creative deleted successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting creative');
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'ARCHIVED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Creative Card component
  const CreativeCard = ({ creative, onDelete }: { creative: any, onDelete?: (id: string) => void }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{creative.name}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Created on {formatDate(creative.createdAt)}
              </p>
            </div>
            {creative.id !== 'preview' && (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(creative.status)}`}>
                {creative.status}
              </span>
            )}
          </div>
          
          {creative.type === 'IMAGE' && creative.assetUrl && (
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img
                src={creative.assetUrl}
                alt={creative.name}
                className="h-48 w-full object-cover object-center"
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Image+Not+Available')}
              />
            </div>
          )}
          
          {creative.type === 'VIDEO' && creative.assetUrl && (
            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <video
                src={creative.assetUrl}
                controls
                className="h-48 w-full object-cover object-center"
                poster="https://via.placeholder.com/400x200?text=Video+Preview"
              />
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Headline</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{creative.headline}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Description</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{creative.description}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Call to Action</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{creative.callToAction}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Type</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{creative.type}</p>
            </div>
          </div>
          
          {creative.id !== 'preview' && onDelete && (
            <div className="mt-4 flex justify-end">
              <Link
                href={`/advertiser/campaigns/${id}/creatives/${creative.id}`}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 mr-3"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete(creative.id)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingState message="Loading creatives..." />;
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

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Creative Assets
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
          <button
            type="button"
            onClick={() => setShowNewCreativeForm(!showNewCreativeForm)}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showNewCreativeForm ? 'Cancel' : 'Add Creative'}
          </button>
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
        </div>
      )}

      {/* New Creative Form */}
      {showNewCreativeForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Add New Creative
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create a new ad creative for your campaign
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Creative Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                    {formErrors.name && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Creative Type
                  </label>
                  <div className="mt-1">
                    <select
                      id="type"
                      name="type"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="TEXT">Text</option>
                      <option value="HTML">HTML</option>
                    </select>
                    {formErrors.type && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="headline" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Headline
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="headline"
                      id="headline"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={formData.headline}
                      onChange={handleInputChange}
                      maxLength={50}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formData.headline.length}/50 characters
                    </p>
                    {formErrors.headline && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.headline}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={formData.description}
                      onChange={handleInputChange}
                      maxLength={150}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formData.description.length}/150 characters
                    </p>
                    {formErrors.description && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="callToAction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Call to Action
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="callToAction"
                      id="callToAction"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={formData.callToAction}
                      onChange={handleInputChange}
                    />
                    {formErrors.callToAction && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.callToAction}</p>
                    )}
                  </div>
                </div>

                {(formData.type === 'IMAGE' || formData.type === 'VIDEO') && (
                  <div className="sm:col-span-6">
                    <label htmlFor="assetUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Asset URL
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="assetUrl"
                        id="assetUrl"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={formData.assetUrl}
                        onChange={handleInputChange}
                        placeholder="https://example.com/image.jpg"
                      />
                      {formErrors.assetUrl && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.assetUrl}</p>
                      )}
                    </div>
                  </div>
                )}

                {formData.type === 'HTML' && (
                  <div className="sm:col-span-6">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      HTML Content
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="content"
                        name="content"
                        rows={6}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={formData.content}
                        onChange={handleInputChange}
                      />
                      {formErrors.content && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formErrors.content}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handlePreview}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                Preview
              </button>
              <LoadingButton
                type="submit"
                loading={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                Create Creative
              </LoadingButton>
            </div>
          </form>
        </div>
      )}

      {/* Preview */}
      {previewCreative && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Creative Preview
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <CreativeCard creative={previewCreative} />
          </div>
        </div>
      )}

      {/* Creatives Grid */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            Campaign Creatives
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {creatives.length === 0 ? (
            <div className="text-center py-10">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No creatives</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create your first creative to start running your campaign.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewCreativeForm(true)}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Creative
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {creatives.map((creative) => (
                <CreativeCard 
                  key={creative.id} 
                  creative={creative} 
                  onDelete={handleDeleteCreative}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 