'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon, PencilIcon, TrashIcon, Clock, Calendar, 
  CheckCircleIcon, XCircleIcon, DownloadIcon, BarChart4
} from 'lucide-react';
import { toast } from 'sonner';
import { CreativeType } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LoadingState from '@/components/loading-state';
import { useSession } from 'next-auth/react';

// Type definitions
interface AdCreative {
  id: string;
  campaignId: string;
  name: string;
  type: CreativeType;
  content: string;
  format: string;
  duration?: number | null;
  previewImage?: string | null;
  isApproved: boolean;
  rejectionReason?: string | null;
  ar_markers?: any | null;
  voiceCommands?: any | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    name: string;
  };
}

// Statistics interfaces
interface UsageStats {
  totalImpressions: number;
  totalEngagements: number;
  totalCompletions: number;
  ctr: number;
  deliveryCount: number;
}

// Helper function to format creative type for display
function formatCreativeType(type: CreativeType): string {
  const formatMap: Record<CreativeType, string> = {
    IMAGE: 'Image',
    VIDEO: 'Video',
    INTERACTIVE: 'Interactive',
    AR_EXPERIENCE: 'AR Experience',
    VOICE_INTERACTIVE: 'Voice Interactive'
  };
  return formatMap[type] || type;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Main component
export default function CreativeDetailPage({ params }: { params: { id: string }}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [creative, setCreative] = useState<AdCreative | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch creative data
  useEffect(() => {
    const fetchCreative = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/advertiser/creatives/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Creative not found');
            router.push('/advertiser/creatives');
            return;
          }
          throw new Error('Failed to fetch creative details');
        }
        
        const data = await response.json();
        setCreative(data);
        
        // Fetch usage statistics
        fetchUsageStats(data.id);
      } catch (error) {
        console.error('Error fetching creative details:', error);
        toast.error('Failed to load creative details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCreative();
    }
  }, [id, router]);

  // Fetch usage statistics
  const fetchUsageStats = async (creativeId: string) => {
    try {
      const response = await fetch(`/api/advertiser/analytics/creatives/${creativeId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      } else {
        // If analytics endpoint fails, we set default empty stats rather than showing an error
        setUsageStats({
          totalImpressions: 0,
          totalEngagements: 0,
          totalCompletions: 0,
          ctr: 0,
          deliveryCount: 0
        });
      }
    } catch (error) {
      console.error('Error fetching usage statistics:', error);
      // Set default empty stats
      setUsageStats({
        totalImpressions: 0,
        totalEngagements: 0,
        totalCompletions: 0,
        ctr: 0,
        deliveryCount: 0
      });
    }
  };

  // Handle creative deletion
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/advertiser/creatives/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete creative');
      }
      
      toast.success('Creative deleted successfully');
      router.push('/advertiser/creatives');
    } catch (error) {
      console.error('Error deleting creative:', error);
      toast.error('Failed to delete creative');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Render the content preview based on type
  const renderContentPreview = () => {
    if (!creative) return null;

    switch (creative.type) {
      case 'IMAGE':
        return (
          <div className="overflow-hidden rounded-lg border bg-white dark:bg-gray-950">
            <div className="relative">
              <img 
                src={creative.content} 
                alt={creative.name} 
                className="w-full object-contain"
              />
              <div className="absolute top-2 right-2">
                <Badge variant={creative.isApproved ? "success" : "destructive"}>
                  {creative.isApproved ? 'Approved' : 'Pending Approval'}
                </Badge>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mr-2">{creative.format}</Badge>
                <Badge variant="outline">{formatCreativeType(creative.type)}</Badge>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={creative.content} target="_blank" rel="noopener noreferrer" download>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        );
      case 'VIDEO':
        return (
          <div className="overflow-hidden rounded-lg border bg-white dark:bg-gray-950">
            <div className="relative">
              <video 
                src={creative.content} 
                controls
                className="w-full"
                poster={creative.previewImage || undefined}
              />
              <div className="absolute top-2 right-2">
                <Badge variant={creative.isApproved ? "success" : "destructive"}>
                  {creative.isApproved ? 'Approved' : 'Pending Approval'}
                </Badge>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mr-2">{creative.format}</Badge>
                <Badge variant="outline">{formatCreativeType(creative.type)}</Badge>
                {creative.duration && (
                  <Badge variant="outline" className="ml-2">
                    {creative.duration}s
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={creative.content} target="_blank" rel="noopener noreferrer" download>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        );
      case 'INTERACTIVE':
      case 'AR_EXPERIENCE':
      case 'VOICE_INTERACTIVE':
        return (
          <div className="overflow-hidden rounded-lg border bg-white dark:bg-gray-950">
            <div className="relative">
              {creative.previewImage ? (
                <img 
                  src={creative.previewImage} 
                  alt={creative.name} 
                  className="w-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800">
                  <p className="text-gray-500 dark:text-gray-400">No preview available</p>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant={creative.isApproved ? "success" : "destructive"}>
                  {creative.isApproved ? 'Approved' : 'Pending Approval'}
                </Badge>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mr-2">{creative.format}</Badge>
                <Badge variant="outline">{formatCreativeType(creative.type)}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={creative.content} target="_blank" rel="noopener noreferrer">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    View Content
                  </a>
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render JSON data for interactive types
  const renderJsonData = (jsonData: any) => {
    if (!jsonData) return null;
    
    try {
      // If it's already an object, stringify it
      const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
      
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto text-xs">
          {jsonString}
        </pre>
      );
    } catch (error) {
      return <p className="text-red-500">Invalid JSON data</p>;
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading creative details..." />;
  }

  if (!creative) {
    return (
      <div className="container px-6 mx-auto">
        <h1 className="text-2xl font-bold">Creative not found</h1>
        <Button asChild className="mt-4">
          <Link href="/advertiser/creatives">Back to Creatives</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-2">
            <Link href="/advertiser/creatives">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{creative.name}</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              <Link 
                href={`/advertiser/campaigns/${creative.campaignId}`}
                className="hover:underline"
              >
                {creative.campaign.name}
              </Link>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/advertiser/creatives/${id}/edit`}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Creative Preview</CardTitle>
              <CardDescription>
                {formatCreativeType(creative.type)} creative created on {formatDate(creative.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContentPreview()}
            </CardContent>
          </Card>

          {/* Usage and Analytics Tab */}
          <Tabs defaultValue="usage">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
              <TabsTrigger value="details">Technical Details</TabsTrigger>
            </TabsList>
            <TabsContent value="usage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    Engagement and performance statistics for this creative
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Impressions</div>
                      <div className="text-2xl font-bold">{usageStats?.totalImpressions?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Engagements</div>
                      <div className="text-2xl font-bold">{usageStats?.totalEngagements?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">CTR</div>
                      <div className="text-2xl font-bold">
                        {usageStats?.ctr ? (usageStats.ctr * 100).toFixed(2) + '%' : '0%'}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Deliveries</div>
                      <div className="text-2xl font-bold">{usageStats?.deliveryCount?.toLocaleString() || '0'}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Recent Performance</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <BarChart4 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Detailed analytics for this creative are available in the Analytics section</p>
                        <Button variant="outline" asChild className="mt-4">
                          <Link href="/advertiser/analytics">
                            View in Analytics
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Information</CardTitle>
                  <CardDescription>
                    Detailed specifications and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Creative ID</h3>
                      <p className="mt-1 text-sm">{creative.id}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h3>
                      <p className="mt-1 text-sm">{formatCreativeType(creative.type)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Format</h3>
                      <p className="mt-1 text-sm">{creative.format}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
                      <p className="mt-1 text-sm">{formatDate(creative.createdAt)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</h3>
                      <p className="mt-1 text-sm">{formatDate(creative.updatedAt)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                      <div className="mt-1">
                        {creative.isApproved ? (
                          <Badge variant="success" className="flex items-center gap-1 w-fit">
                            <CheckCircleIcon size={12} />
                            <span>Approved</span>
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircleIcon size={12} />
                            <span>Pending Approval</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    {creative.duration && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</h3>
                        <p className="mt-1 text-sm">{creative.duration} seconds</p>
                      </div>
                    )}
                    {creative.rejectionReason && (
                      <div className="col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejection Reason</h3>
                        <p className="mt-1 text-sm text-red-500">{creative.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Show AR markers or voice commands for specific creative types */}
                  {creative.type === 'AR_EXPERIENCE' && creative.ar_markers && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">AR Markers</h3>
                      {renderJsonData(creative.ar_markers)}
                    </div>
                  )}
                  
                  {creative.type === 'VOICE_INTERACTIVE' && creative.voiceCommands && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Voice Commands</h3>
                      {renderJsonData(creative.voiceCommands)}
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Content URLs</h3>
                    <div className="space-y-2">
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs font-mono break-all">
                        {creative.content}
                      </div>
                      {creative.previewImage && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs font-mono break-all">
                          {creative.previewImage}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Approval Status:</span>
                  {creative.isApproved ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircleIcon size={12} />
                      <span>Approved</span>
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircleIcon size={12} />
                      <span>Pending Approval</span>
                    </Badge>
                  )}
                </div>
                
                {!creative.isApproved && (
                  <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                    <p className="font-medium">Pending Moderation</p>
                    <p className="mt-1">This creative is currently under review by our team. This typically takes 1-2 business days.</p>
                  </div>
                )}
                
                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 opacity-70" />
                      Created
                    </span>
                    <span>{new Date(creative.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 opacity-70" />
                      Last Updated
                    </span>
                    <span>{new Date(creative.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Campaign Card */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{creative.campaign.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This creative is part of the above campaign
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/advertiser/campaigns/${creative.campaignId}`}>
                    View
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/advertiser/creatives/${id}/edit`}>
                    <PencilIcon className="mr-2 h-4 w-4" />
                    Edit Creative
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/advertiser/creatives/new?cloneFrom=${id}`}>
                    <svg 
                      className="mr-2 h-4 w-4" 
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="8" y="8" width="12" height="12" rx="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                    </svg>
                    Duplicate
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <a href={creative.content} download target="_blank" rel="noopener noreferrer">
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download Content
                  </a>
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Creative
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Creative</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this creative? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{creative.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatCreativeType(creative.type)} • {creative.format}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 