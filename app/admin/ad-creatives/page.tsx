'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, Filter, MoreHorizontal, Plus, ChevronDown, 
  Calendar, Clock, PenTool, EyeOff, Eye, FileVideo, Image as ImageIcon, 
  FileText, Code, Layers, Mic, CheckCircle, XCircle, Play, Pause, ArrowUpRight 
} from 'lucide-react';

// Types based on Prisma schema
type AdCreativeStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
type CreativeType = 'IMAGE' | 'VIDEO' | 'TEXT' | 'HTML' | 'INTERACTIVE' | 'AR_EXPERIENCE' | 'VOICE_INTERACTIVE';

interface AdCreative {
  id: string;
  campaignId: string;
  name: string;
  type: CreativeType;
  status: AdCreativeStatus;
  content: string;
  format: string;
  duration?: number;
  previewImage?: string;
  headline: string;
  description: string;
  callToAction: string;
  isApproved: boolean;
  rejectionReason?: string;
  ar_markers?: any;
  voiceCommands?: any;
  createdAt: string;
  updatedAt: string;
  campaign: {
    name: string;
    advertiser: {
      companyName: string;
    }
  }
}

export default function AdCreativesPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedCreatives, setSelectedCreatives] = useState<string[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedCreativeForAction, setSelectedCreativeForAction] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch creatives
  const { data: apiData, isLoading, error } = useQuery<AdCreative[]>({
    queryKey: ['adCreatives'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ad-creatives');
      if (!response.ok) {
        throw new Error('Failed to fetch ad creatives');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Generate placeholder data when API is not ready
  const placeholderData: AdCreative[] = [
    {
      id: 'cr1',
      campaignId: 'camp1',
      name: 'Summer Sale Banner',
      type: 'IMAGE',
      status: 'APPROVED',
      content: 'https://example.com/images/summer-banner.jpg',
      format: 'jpg',
      previewImage: 'https://placehold.co/600x400',
      headline: 'Summer Sale Up to 50% Off',
      description: 'Get amazing deals on our summer collection. Limited time only!',
      callToAction: 'Shop Now',
      isApproved: true,
      createdAt: '2023-06-10T14:30:00Z',
      updatedAt: '2023-06-11T09:15:00Z',
      campaign: {
        name: 'Summer Sale 2023',
        advertiser: {
          companyName: 'Fashion Retail Co.'
        }
      }
    },
    {
      id: 'cr2',
      campaignId: 'camp2',
      name: 'Product Launch Video',
      type: 'VIDEO',
      status: 'PENDING_REVIEW',
      content: 'https://example.com/videos/new-product.mp4',
      format: 'mp4',
      duration: 30,
      previewImage: 'https://placehold.co/600x400',
      headline: 'Introducing Our New Product',
      description: 'Watch the reveal of our revolutionary new gadget that will change everything.',
      callToAction: 'Learn More',
      isApproved: false,
      createdAt: '2023-06-15T11:20:00Z',
      updatedAt: '2023-06-15T11:20:00Z',
      campaign: {
        name: 'New Product Launch',
        advertiser: {
          companyName: 'Tech Innovators Inc.'
        }
      }
    },
    {
      id: 'cr3',
      campaignId: 'camp3',
      name: 'AR Product Experience',
      type: 'AR_EXPERIENCE',
      status: 'DRAFT',
      content: 'https://example.com/ar/furniture-demo.glb',
      format: 'glb',
      previewImage: 'https://placehold.co/600x400',
      headline: 'See It In Your Space',
      description: 'Use your phone to place our furniture in your home before you buy.',
      callToAction: 'Try AR Demo',
      isApproved: false,
      ar_markers: {
        markerType: 'image',
        trackingImages: ['https://example.com/markers/furniture-marker.jpg']
      },
      createdAt: '2023-06-18T16:45:00Z',
      updatedAt: '2023-06-19T10:30:00Z',
      campaign: {
        name: 'AR Furniture Showcase',
        advertiser: {
          companyName: 'Home Furnishings Ltd.'
        }
      }
    },
    {
      id: 'cr4',
      campaignId: 'camp4',
      name: 'Voice Interactive Ad',
      type: 'VOICE_INTERACTIVE',
      status: 'PENDING_REVIEW',
      content: 'https://example.com/voice/interactive-ad.json',
      format: 'json',
      duration: 20,
      previewImage: 'https://placehold.co/600x400',
      headline: 'Ask About Our Services',
      description: 'Interactive voice experience to learn about our offerings.',
      callToAction: 'Say "Tell me more"',
      isApproved: false,
      voiceCommands: {
        wakeWords: ['tell me more', 'learn more', 'more info'],
        responses: {
          'tell me more': 'Our services include...',
          'pricing': 'Our pricing plans start at...'
        }
      },
      createdAt: '2023-06-20T09:10:00Z',
      updatedAt: '2023-06-20T09:10:00Z',
      campaign: {
        name: 'Interactive Services Campaign',
        advertiser: {
          companyName: 'Digital Solutions Co.'
        }
      }
    },
    {
      id: 'cr5',
      campaignId: 'camp5',
      name: 'Interactive Game Ad',
      type: 'INTERACTIVE',
      status: 'REJECTED',
      content: 'https://example.com/interactive/mini-game.html',
      format: 'html',
      previewImage: 'https://placehold.co/600x400',
      headline: 'Play & Win Discount',
      description: 'Play our mini-game and win up to 30% discount on your next purchase.',
      callToAction: 'Play Now',
      isApproved: false,
      rejectionReason: 'Game mechanics are too complex for target audience. Please simplify the gameplay.',
      createdAt: '2023-06-14T13:25:00Z',
      updatedAt: '2023-06-16T15:40:00Z',
      campaign: {
        name: 'Gamified Marketing',
        advertiser: {
          companyName: 'Game Studio XYZ'
        }
      }
    }
  ];

    // Use API data or fallback to placeholder data - fixed with Array check
  const creatives: AdCreative[] = Array.isArray(apiData) ? apiData : placeholderData;

  // Filter creatives based on search term and filters
  const filteredCreatives = creatives.filter(creative => {
    const matchesSearch = creative.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          creative.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          creative.campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || creative.status === filterStatus;
    const matchesType = filterType === 'all' || creative.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Status and type counts - with null check to avoid errors
  const statusCounts = creatives.reduce((acc, creative) => {
    acc[creative.status] = (acc[creative.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeCounts = creatives.reduce((acc, creative) => {
    acc[creative.type] = (acc[creative.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Handle creative selection
  const handleSelectCreative = (creativeId: string) => {
    setSelectedCreatives(prev => 
      prev.includes(creativeId) 
        ? prev.filter(id => id !== creativeId) 
        : [...prev, creativeId]
    );
  };

  // Handle select all creatives
  const handleSelectAllCreatives = (checked: boolean) => {
    if (checked) {
      setSelectedCreatives(filteredCreatives.map(creative => creative.id));
    } else {
      setSelectedCreatives([]);
    }
  };

  // Handle creative approval/rejection
  const handleCreativeAction = (creativeId: string, action: 'approve' | 'reject') => {
    setSelectedCreativeForAction(creativeId);
    setActionType(action);
    setIsReviewDialogOpen(true);
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on creatives:`, selectedCreatives);
    // Implement bulk action logic here
    setSelectedCreatives([]);
  };

  // Handle creative approval/rejection submission
  const handleReviewSubmit = () => {
    if (actionType === 'approve') {
      console.log(`Approving creative ${selectedCreativeForAction}`);
    } else if (actionType === 'reject') {
      console.log(`Rejecting creative ${selectedCreativeForAction} with reason: ${rejectionReason}`);
    }
    setIsReviewDialogOpen(false);
    setSelectedCreativeForAction(null);
    setActionType(null);
    setRejectionReason('');
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: AdCreativeStatus }) => {
    const statusConfig = {
      'APPROVED': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      'PENDING_REVIEW': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="h-3 w-3 mr-1" /> },
      'DRAFT': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <PenTool className="h-3 w-3 mr-1" /> },
      'REJECTED': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="h-3 w-3 mr-1" /> },
      'ARCHIVED': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <EyeOff className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status] || statusConfig['DRAFT'];

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Type badge component
  const TypeBadge = ({ type }: { type: CreativeType }) => {
    const typeConfig = {
      'IMAGE': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <ImageIcon className="h-3 w-3 mr-1" /> },
      'VIDEO': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <FileVideo className="h-3 w-3 mr-1" /> },
      'TEXT': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: <FileText className="h-3 w-3 mr-1" /> },
      'HTML': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: <Code className="h-3 w-3 mr-1" /> },
      'INTERACTIVE': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <Play className="h-3 w-3 mr-1" /> },
      'AR_EXPERIENCE': { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400', icon: <Layers className="h-3 w-3 mr-1" /> },
      'VOICE_INTERACTIVE': { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: <Mic className="h-3 w-3 mr-1" /> },
    };

    const config = typeConfig[type] || typeConfig['IMAGE'];

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-blue-500 border-gray-200"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load ad creatives</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Ad Creatives
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage and review all ad creatives across campaigns
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button
            variant="outline"
            className="inline-flex items-center"
            asChild
          >
            <Link href="/admin/ad-creatives/library">
              <Layers className="mr-2 h-4 w-4" />
              Creative Library
            </Link>
          </Button>
          <Button
            className="inline-flex items-center"
            asChild
          >
            <Link href="/admin/ad-creatives/new">
              <Plus className="mr-2 h-4 w-4" />
              New Creative
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="all" onClick={() => setFilterStatus('all')}>
            All ({creatives.length})
          </TabsTrigger>
          <TabsTrigger value="pending" onClick={() => setFilterStatus('PENDING_REVIEW')}>
            Pending Review ({statusCounts['PENDING_REVIEW'] || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" onClick={() => setFilterStatus('APPROVED')}>
            Approved ({statusCounts['APPROVED'] || 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" onClick={() => setFilterStatus('REJECTED')}>
            Rejected ({statusCounts['REJECTED'] || 0})
          </TabsTrigger>
          <TabsTrigger value="draft" onClick={() => setFilterStatus('DRAFT')}>
            Drafts ({statusCounts['DRAFT'] || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {/* Search and filter bar */}
          <div className="mb-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search creatives..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('IMAGE')}>
                    Images ({typeCounts['IMAGE'] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('VIDEO')}>
                    Videos ({typeCounts['VIDEO'] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('INTERACTIVE')}>
                    Interactive ({typeCounts['INTERACTIVE'] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('AR_EXPERIENCE')}>
                    AR Experience ({typeCounts['AR_EXPERIENCE'] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('VOICE_INTERACTIVE')}>
                    Voice Interactive ({typeCounts['VOICE_INTERACTIVE'] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuItem>Newest First</DropdownMenuItem>
                  <DropdownMenuItem>Oldest First</DropdownMenuItem>
                  <DropdownMenuItem>Name A-Z</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedCreatives.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCreatives.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction('approve')}>
                      Approve Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('reject')}>
                      Reject Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                      Archive Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction('delete')} className="text-red-600 dark:text-red-400">
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Creatives table */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={filteredCreatives.length > 0 && selectedCreatives.length === filteredCreatives.length} 
                      onCheckedChange={(checked) => handleSelectAllCreatives(checked === true)}
                    />
                  </TableHead>
                  <TableHead>Creative</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreatives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No ad creatives found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreatives.map((creative) => (
                    <TableRow key={creative.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedCreatives.includes(creative.id)} 
                          onCheckedChange={() => handleSelectCreative(creative.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            {creative.previewImage && (
                              <img 
                                src={creative.previewImage} 
                                alt={creative.name} 
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <Link 
                              href={`/admin/ad-creatives/${creative.id}`} 
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {creative.name}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                              {creative.headline}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={creative.type} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link 
                            href={`/admin/campaigns/${creative.campaignId}`} 
                            className="text-sm font-medium hover:underline"
                          >
                            {creative.campaign.name}
                          </Link>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {creative.campaign.advertiser.companyName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={creative.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(creative.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/ad-creatives/${creative.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/ad-creatives/${creative.id}/edit`}>Edit Creative</Link>
                            </DropdownMenuItem>
                            {creative.status === 'PENDING_REVIEW' && (
                              <>
                                <DropdownMenuItem onClick={() => handleCreativeAction(creative.id, 'approve')}>
                                  Approve Creative
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCreativeAction(creative.id, 'reject')}>
                                  Reject Creative
                                </DropdownMenuItem>
                              </>
                            )}
                            {creative.status === 'APPROVED' && (
                              <DropdownMenuItem onClick={() => console.log('Suspending creative', creative.id)}>
                                Suspend Creative
                              </DropdownMenuItem>
                            )}
                            {creative.status === 'REJECTED' && (
                              <DropdownMenuItem onClick={() => console.log('Resubmitting creative', creative.id)}>
                                Allow Resubmission
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                              Delete Creative
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Other tab contents would be similar but pre-filtered */}
        <TabsContent value="pending" className="mt-6">
          {/* Similar content as "all" but pre-filtered for pending creatives */}
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          {/* Similar content as "all" but pre-filtered for approved creatives */}
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          {/* Similar content as "all" but pre-filtered for rejected creatives */}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {/* Similar content as "all" but pre-filtered for draft creatives */}
        </TabsContent>
      </Tabs>

      {/* Creative types overview */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Creative Types Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeCounts['IMAGE'] || 0}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(((typeCounts['IMAGE'] || 0) / creatives.length) * 100)}% of all creatives
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeCounts['VIDEO'] || 0}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(((typeCounts['VIDEO'] || 0) / creatives.length) * 100)}% of all creatives
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Interactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(typeCounts['INTERACTIVE'] || 0) + (typeCounts['HTML'] || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((((typeCounts['INTERACTIVE'] || 0) + (typeCounts['HTML'] || 0)) / creatives.length) * 100)}% of all creatives
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Advanced (AR/Voice)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(typeCounts['AR_EXPERIENCE'] || 0) + (typeCounts['VOICE_INTERACTIVE'] || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((((typeCounts['AR_EXPERIENCE'] || 0) + (typeCounts['VOICE_INTERACTIVE'] || 0)) / creatives.length) * 100)}% of all creatives
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Creative Activity</CardTitle>
          <CardDescription>
            Latest updates and approvals for ad creatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Creative "Summer Sale Banner" was approved</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">By Admin User • 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium">New creative "Product Launch Video" submitted for review</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">By Marketing Team • 5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium">Creative "Interactive Game Ad" was rejected</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">By Content Moderator • 1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button variant="outline" className="w-full">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            View All Activity
          </Button>
        </CardFooter>
      </Card>

      {/* Creative Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Creative' : 'Reject Creative'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Are you sure you want to approve this creative? Once approved, it will be eligible for display in its associated campaign.'
                : 'Please provide a reason for rejecting this creative. This information will be sent to the advertiser.'}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'reject' && (
            <div className="mt-4">
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejection Reason
              </label>
              <textarea
                id="rejection-reason"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                rows={4}
                placeholder="Please explain why this creative is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReviewSubmit}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}