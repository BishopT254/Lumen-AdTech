'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronRightIcon, PlusIcon, SearchIcon, FilterIcon, 
  EyeIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreativeType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import EmptyState from '@/components/empty-state';
import { DataTable } from "@/components/ui/data-table";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import LoadingState from '@/components/loading-state';

// Types
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

interface Campaign {
  id: string;
  name: string;
}

// Table headers/columns
const columns = [
  {
    id: "preview",
    header: "Preview",
    cell: ({ row }: any) => {
      const creative = row.original;
      return (
        <div className="relative w-20 h-12 overflow-hidden rounded">
          {creative.previewImage ? (
            <img 
              src={creative.previewImage} 
              alt={creative.name} 
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">No preview</span>
            </div>
          )}
        </div>
      );
    }
  },
  {
    id: "name",
    header: "Creative Name",
    accessorKey: "name",
    cell: ({ row }: any) => {
      const creative = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{creative.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatCreativeType(creative.type)}
          </span>
        </div>
      );
    }
  },
  {
    id: "campaign",
    header: "Campaign",
    accessorKey: "campaign.name",
  },
  {
    id: "format",
    header: "Format",
    accessorKey: "format",
    cell: ({ row }: any) => {
      const format = row.original.format;
      return (
        <Badge variant="outline" className="uppercase text-xs">
          {format}
        </Badge>
      );
    }
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }: any) => {
      const creative = row.original;
      return (
        <div className="flex items-center">
          {creative.isApproved ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircleIcon size={12} />
              <span>Approved</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <XCircleIcon size={12} />
              <span>Pending</span>
            </Badge>
          )}
        </div>
      );
    }
  },
  {
    id: "created",
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row }: any) => {
      return new Date(row.original.createdAt).toLocaleDateString();
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: any) => {
      const creative = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/advertiser/creatives/${creative.id}`}>
              <EyeIcon size={16} />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/advertiser/creatives/${creative.id}/edit`}>
              <PencilIcon size={16} />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteCreativeButton id={creative.id} name={creative.name} />
        </div>
      );
    }
  }
];

// Helper component for creative deletion
function DeleteCreativeButton({ id, name }: { id: string, name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIsOpen(false);
      // Force refresh the page to update the list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting creative:', error);
      toast.error('Failed to delete creative');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700">
          <TrashIcon size={16} />
          <span className="sr-only">Delete</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Creative</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
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
  );
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

// Main component
export default function CreativesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [filteredCreatives, setFilteredCreatives] = useState<AdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch creatives and campaigns data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all creatives
        const creativesResponse = await fetch('/api/advertiser/creatives');
        if (!creativesResponse.ok) {
          throw new Error('Failed to fetch creatives');
        }
        const creativesData = await creativesResponse.json();
        
        // Fetch all campaigns for filtering
        const campaignsResponse = await fetch('/api/advertiser/campaigns');
        if (!campaignsResponse.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const campaignsData = await campaignsResponse.json();
        
        setCreatives(creativesData);
        setFilteredCreatives(creativesData);
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load creatives');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters when any filter changes
  useEffect(() => {
    let result = [...creatives];
    
    // Apply tab filter
    if (activeTab !== 'all') {
      const typeMapping: Record<string, CreativeType[]> = {
        'images': ['IMAGE'],
        'videos': ['VIDEO'],
        'interactive': ['INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE']
      };
      
      if (typeMapping[activeTab]) {
        result = result.filter(item => typeMapping[activeTab].includes(item.type));
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerSearchTerm) || 
        item.campaign.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const isApproved = statusFilter === 'approved';
      result = result.filter(item => item.isApproved === isApproved);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(item => item.type === typeFilter);
    }
    
    // Apply campaign filter
    if (campaignFilter !== 'all') {
      result = result.filter(item => item.campaignId === campaignFilter);
    }
    
    setFilteredCreatives(result);
  }, [creatives, searchTerm, statusFilter, typeFilter, campaignFilter, activeTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (isLoading) {
    return <LoadingState message="Loading creative assets..." />;
  }

  return (
    <div className="container px-6 mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Creative Assets</h1>
          <p className="text-sm text-muted-foreground">
            Manage all your advertising creative assets in one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/advertiser/creatives/new" className="flex items-center gap-1">
            <PlusIcon size={16} />
            <span>New Creative</span>
          </Link>
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <Tabs defaultValue="all" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All Creatives</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="interactive">Interactive</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col gap-4 mt-4 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creatives..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-col gap-4 md:flex-row">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={typeFilter} 
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="INTERACTIVE">Interactive</SelectItem>
                  <SelectItem value="AR_EXPERIENCE">AR Experience</SelectItem>
                  <SelectItem value="VOICE_INTERACTIVE">Voice Interactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={campaignFilter} 
                onValueChange={setCampaignFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="mt-6">
            {filteredCreatives.length === 0 ? (
              <EmptyState
                title="No creatives found"
                description="You haven't added any creative assets yet or none match your filters."
                action={
                  <Button asChild>
                    <Link href="/advertiser/creatives/new">
                      Add your first creative
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="rounded-md border">
                <DataTable 
                  columns={columns} 
                  data={filteredCreatives} 
                  searchColumn="name"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            {filteredCreatives.length === 0 ? (
              <EmptyState
                title="No image creatives found"
                description="You haven't added any image creative assets yet or none match your filters."
                action={
                  <Button asChild>
                    <Link href="/advertiser/creatives/new?type=IMAGE">
                      Add your first image
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCreatives.map((creative) => (
                  <Link
                    key={creative.id}
                    href={`/advertiser/creatives/${creative.id}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all hover:shadow-md">
                      <div className="aspect-video relative overflow-hidden">
                        {creative.previewImage ? (
                          <img
                            src={creative.previewImage}
                            alt={creative.name}
                            className="object-cover w-full h-full transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              No preview
                            </span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          {creative.isApproved ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircleIcon size={12} />
                              <span>Approved</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircleIcon size={12} />
                              <span>Pending</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-1">{creative.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {creative.campaign.name}
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="uppercase text-xs">
                          {creative.format}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(creative.createdAt).toLocaleDateString()}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="videos" className="mt-6">
            {filteredCreatives.length === 0 ? (
              <EmptyState
                title="No video creatives found"
                description="You haven't added any video creative assets yet or none match your filters."
                action={
                  <Button asChild>
                    <Link href="/advertiser/creatives/new?type=VIDEO">
                      Add your first video
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCreatives.map((creative) => (
                  <Link
                    key={creative.id}
                    href={`/advertiser/creatives/${creative.id}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all hover:shadow-md">
                      <div className="aspect-video relative overflow-hidden">
                        {creative.previewImage ? (
                          <div className="relative">
                            <img
                              src={creative.previewImage}
                              alt={creative.name}
                              className="object-cover w-full h-full transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="rounded-full bg-black/50 p-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              No preview
                            </span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          {creative.isApproved ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircleIcon size={12} />
                              <span>Approved</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircleIcon size={12} />
                              <span>Pending</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-1">{creative.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {creative.campaign.name}
                        </p>
                        {creative.duration && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Duration: {creative.duration} seconds
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="uppercase text-xs">
                          {creative.format}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(creative.createdAt).toLocaleDateString()}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="interactive" className="mt-6">
            {filteredCreatives.length === 0 ? (
              <EmptyState
                title="No interactive creatives found"
                description="You haven't added any interactive creative assets yet or none match your filters."
                action={
                  <Button asChild>
                    <Link href="/advertiser/creatives/new?type=INTERACTIVE">
                      Add your first interactive creative
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCreatives.map((creative) => (
                  <Link
                    key={creative.id}
                    href={`/advertiser/creatives/${creative.id}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all hover:shadow-md">
                      <div className="aspect-video relative overflow-hidden">
                        {creative.previewImage ? (
                          <img
                            src={creative.previewImage}
                            alt={creative.name}
                            className="object-cover w-full h-full transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              No preview
                            </span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          {creative.isApproved ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircleIcon size={12} />
                              <span>Approved</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircleIcon size={12} />
                              <span>Pending</span>
                            </Badge>
                          )}
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-black/50 text-white border-0">
                            {formatCreativeType(creative.type)}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-1">{creative.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {creative.campaign.name}
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="uppercase text-xs">
                          {creative.format}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(creative.createdAt).toLocaleDateString()}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 