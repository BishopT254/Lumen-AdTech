'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UploadIcon, XIcon, InformationCircleIcon, CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreativeType } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Form, FormControl, FormDescription, FormField, FormItem, 
  FormLabel, FormMessage 
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoadingButton from '@/components/loading-button';
import LoadingState from '@/components/loading-state';

// Campaign interface
interface Campaign {
  id: string;
  name: string;
}

// Creative interface
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

// Edit form schema
const editCreativeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  campaignId: z.string().min(1, 'Please select a campaign'),
  content: z.string().min(1, 'Content URL is required'),
  previewImage: z.string().optional(),
  format: z.string().min(1, 'Format is required'),
  duration: z.coerce.number().optional(),
  ar_markers: z.any().optional(),
  voiceCommands: z.any().optional(),
});

// Main component
export default function EditCreativePage({ params }: { params: { id: string }}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [creative, setCreative] = useState<AdCreative | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [contentUrl, setContentUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize react-hook-form
  const form = useForm<z.infer<typeof editCreativeSchema>>({
    resolver: zodResolver(editCreativeSchema),
    defaultValues: {
      name: '',
      campaignId: '',
      content: '',
      previewImage: '',
      format: '',
    }
  });

  // Fetch creative and campaigns data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch creative details
        const creativeResponse = await fetch(`/api/advertiser/creatives/${id}`);
        if (!creativeResponse.ok) {
          if (creativeResponse.status === 404) {
            toast.error('Creative not found');
            router.push('/advertiser/creatives');
            return;
          }
          throw new Error('Failed to fetch creative details');
        }
        const creativeData = await creativeResponse.json();
        
        // Fetch all campaigns for selection dropdown
        const campaignsResponse = await fetch('/api/advertiser/campaigns');
        if (!campaignsResponse.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const campaignsData = await campaignsResponse.json();
        
        setCreative(creativeData);
        setCampaigns(campaignsData);
        
        // Initialize form with creative data
        form.reset({
          name: creativeData.name,
          campaignId: creativeData.campaignId,
          content: creativeData.content,
          previewImage: creativeData.previewImage || '',
          format: creativeData.format,
          duration: creativeData.duration || undefined,
          ar_markers: creativeData.ar_markers || undefined,
          voiceCommands: creativeData.voiceCommands || undefined,
        });
        
        // Set URLs for display
        setContentUrl(creativeData.content);
        if (creativeData.previewImage) {
          setPreviewUrl(creativeData.previewImage);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load creative data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router, form]);

  // Handle media upload to S3/storage
  const handleMediaUpload = async (file: File, type: 'content' | 'preview') => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('contentType', creative?.type || 'IMAGE');
      
      // Simulated progress updates (in production, use real progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.floor(Math.random() * 15) + 5;
          const newProgress = Math.min(prev + increment, 95);
          return newProgress;
        });
      }, 500);
      
      // Send the file to the API
      const response = await fetch('/api/advertiser/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      setUploadProgress(100);
      
      // Update form and state with the uploaded URL
      if (type === 'content') {
        form.setValue('content', data.url);
        setContentUrl(data.url);
      } else {
        form.setValue('previewImage', data.url);
        setPreviewUrl(data.url);
      }
      
      toast.success(`${type === 'content' ? 'Content' : 'Preview image'} uploaded successfully`);
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type === 'content' ? 'content' : 'preview image'}`);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle content file selection
  const handleContentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!creative) return;
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'];
    
    let isValid = false;
    
    if (creative.type === 'IMAGE' && validImageTypes.includes(file.type)) {
      isValid = true;
    } else if (creative.type === 'VIDEO' && validVideoTypes.includes(file.type)) {
      isValid = true;
    } else if (['INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE'].includes(creative.type)) {
      // For other types, we're more permissive about file types
      isValid = true;
    }
    
    if (!isValid) {
      toast.error(`Invalid file type for ${creative.type.toLowerCase()} creative`);
      return;
    }
    
    await handleMediaUpload(file, 'content');
  };

  // Handle preview image selection
  const handlePreviewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validImageTypes.includes(file.type)) {
      toast.error('Preview must be an image (JPG, PNG, GIF, WEBP)');
      return;
    }
    
    await handleMediaUpload(file, 'preview');
  };

  // Form submission handler
  const onSubmit = async (data: z.infer<typeof editCreativeSchema>) => {
    if (!creative) return;
    
    try {
      setIsSaving(true);
      
      // Prepare additional fields based on creative type
      let additionalData = {};
      
      if (creative.type === 'VIDEO' && data.duration !== undefined) {
        additionalData = { ...additionalData, duration: data.duration };
      }
      
      if (creative.type === 'AR_EXPERIENCE' && data.ar_markers) {
        additionalData = { ...additionalData, ar_markers: data.ar_markers };
      }
      
      if (creative.type === 'VOICE_INTERACTIVE' && data.voiceCommands) {
        additionalData = { ...additionalData, voiceCommands: data.voiceCommands };
      }
      
      // Send update to API
      const response = await fetch(`/api/advertiser/creatives/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          ...additionalData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update creative');
      }
      
      toast.success('Creative updated successfully');
      
      // Redirect to creative detail page
      router.push(`/advertiser/creatives/${id}`);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update creative');
    } finally {
      setIsSaving(false);
    }
  };

  // Get format options based on creative type
  const getFormatOptions = () => {
    if (!creative) return [];
    
    switch (creative.type) {
      case 'IMAGE':
        return [
          { value: 'JPG', label: 'JPEG Image (.jpg)' },
          { value: 'PNG', label: 'PNG Image (.png)' },
          { value: 'GIF', label: 'GIF Animation (.gif)' },
          { value: 'WEBP', label: 'WebP Image (.webp)' },
          { value: 'SVG', label: 'SVG Vector (.svg)' },
        ];
      case 'VIDEO':
        return [
          { value: 'MP4', label: 'MP4 Video (.mp4)' },
          { value: 'WEBM', label: 'WebM Video (.webm)' },
          { value: 'AVI', label: 'AVI Video (.avi)' },
          { value: 'MOV', label: 'QuickTime Video (.mov)' },
        ];
      case 'INTERACTIVE':
        return [
          { value: 'HTML', label: 'HTML Interactive (.html)' },
          { value: 'JS', label: 'JavaScript App (.js)' },
          { value: 'UNITY', label: 'Unity WebGL (.unity)' },
        ];
      case 'AR_EXPERIENCE':
        return [
          { value: 'ARKIT', label: 'Apple ARKit (.usdz)' },
          { value: 'ARCORE', label: 'Google ARCore (.glb)' },
          { value: 'WEBXR', label: 'WebXR (.glb/.gltf)' },
        ];
      case 'VOICE_INTERACTIVE':
        return [
          { value: 'AUDIO', label: 'Audio Response (.mp3/.wav)' },
          { value: 'DIALOGFLOW', label: 'DialogFlow Agent (.zip)' },
        ];
      default:
        return [];
    }
  };

  // Render content preview based on type
  const renderContentPreview = () => {
    if (!creative || !contentUrl) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-md">
          <p className="text-gray-500 dark:text-gray-400">No content uploaded</p>
        </div>
      );
    }

    switch (creative.type) {
      case 'IMAGE':
        return (
          <div className="rounded-md overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              <img 
                src={contentUrl} 
                alt="Preview" 
                className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
              />
            </AspectRatio>
          </div>
        );
      case 'VIDEO':
        return (
          <div className="rounded-md overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              <video 
                src={contentUrl} 
                controls 
                className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
              />
            </AspectRatio>
          </div>
        );
      default:
        // For other types, show a basic preview with a download link
        return (
          <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-md flex flex-col items-center justify-center space-y-4">
            <div className="text-4xl">📄</div>
            <p className="text-center text-gray-700 dark:text-gray-300">
              {creative.type} Creative
            </p>
            <a 
              href={contentUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline text-sm"
            >
              View Content File
            </a>
          </div>
        );
    }
  };

  // Render additional fields based on creative type
  const renderTypeSpecificFields = () => {
    if (!creative) return null;
    
    switch (creative.type) {
      case 'VIDEO':
        return (
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (seconds)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="e.g., 30" 
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  Length of the video in seconds
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'AR_EXPERIENCE':
        return (
          <FormField
            control={form.control}
            name="ar_markers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AR Markers (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='e.g., {"markers": [{"id": "marker1", "type": "image", "url": "https://example.com/marker.jpg"}]}'
                    className="font-mono text-sm"
                    rows={5}
                    {...field}
                    value={field.value ? JSON.stringify(field.value, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        // Try to parse as JSON if it's not empty
                        const value = e.target.value ? JSON.parse(e.target.value) : undefined;
                        field.onChange(value);
                      } catch (error) {
                        // If it's not valid JSON, just store the string
                        field.onChange(e.target.value);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  JSON data for AR markers and triggers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'VOICE_INTERACTIVE':
        return (
          <FormField
            control={form.control}
            name="voiceCommands"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice Commands (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='e.g., {"commands": [{"trigger": "tell me more", "response": "Here is more information"}]}'
                    className="font-mono text-sm"
                    rows={5}
                    {...field}
                    value={field.value ? JSON.stringify(field.value, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        // Try to parse as JSON if it's not empty
                        const value = e.target.value ? JSON.parse(e.target.value) : undefined;
                        field.onChange(value);
                      } catch (error) {
                        // If it's not valid JSON, just store the string
                        field.onChange(e.target.value);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  JSON data for supported voice commands
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  // Helper component for file upload label
  function Label({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) {
    return (
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {children}
      </label>
    );
  }

  if (isLoading || !creative) {
    return <LoadingState message="Loading creative data..." />;
  }

  return (
    <div className="container px-6 mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href={`/advertiser/creatives/${id}`}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Creative</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Creative Details</CardTitle>
                  <CardDescription>
                    Update the basic information for your {creative.type.toLowerCase()} creative
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Creative Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Summer Promotion Banner" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for your creative asset
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a campaign" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The campaign this creative will be part of
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getFormatOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The file format of your creative
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderTypeSpecificFields()}

                  {creative.isApproved && (
                    <Alert>
                      <InformationCircleIcon className="h-4 w-4" />
                      <AlertTitle>Approval Note</AlertTitle>
                      <AlertDescription>
                        This creative is currently approved. Updating the content or format will
                        require re-approval by our moderation team.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Content Upload Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Files</CardTitle>
                  <CardDescription>
                    Update your {creative.type.toLowerCase()} content or preview image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Content Preview */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Current Content</h3>
                      {renderContentPreview()}
                    </div>

                    <Separator />

                    {/* Content Upload */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">Upload New Content</h3>
                      <Alert className="mb-4">
                        <InformationCircleIcon className="h-4 w-4" />
                        <AlertTitle>Content Type</AlertTitle>
                        <AlertDescription>
                          {creative.type === 'IMAGE' && "Please upload JPG, PNG, GIF, WebP, or SVG files."}
                          {creative.type === 'VIDEO' && "Please upload MP4, WebM, AVI, or MOV video files."}
                          {creative.type === 'INTERACTIVE' && "Please upload HTML, JS, or Unity WebGL files."}
                          {creative.type === 'AR_EXPERIENCE' && "Please upload USDZ (ARKit), GLB/GLTF (ARCore), or WebXR assets."}
                          {creative.type === 'VOICE_INTERACTIVE' && "Please upload audio files or DialogFlow agent packages."}
                        </AlertDescription>
                      </Alert>

                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="content-upload">Content File</Label>
                        <Input
                          id="content-upload"
                          type="file"
                          onChange={handleContentFileChange}
                          disabled={isUploading}
                        />
                        {isUploading && (
                          <div className="w-full mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Uploading: {uploadProgress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Preview Image */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">Preview Image</h3>
                      <div className="mb-4">
                        {previewUrl ? (
                          <div className="relative w-full max-w-sm">
                            <img 
                              src={previewUrl} 
                              alt="Preview" 
                              className="w-full h-auto rounded-md object-cover"
                            />
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="absolute top-2 right-2 bg-white dark:bg-gray-800"
                              onClick={() => {
                                setPreviewUrl('');
                                form.setValue('previewImage', '');
                              }}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-md">
                            <p className="text-gray-500 dark:text-gray-400">No preview image</p>
                          </div>
                        )}
                      </div>

                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="preview-upload">Upload Preview Image</Label>
                        <Input
                          id="preview-upload"
                          type="file"
                          accept="image/*"
                          onChange={handlePreviewImageChange}
                          disabled={isUploading}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Card */}
            <div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Save Changes</CardTitle>
                    <CardDescription>
                      Update your creative or discard changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-medium">Type:</div>
                        <div>{creative.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-medium">Status:</div>
                        <div>{creative.isApproved ? 'Approved' : 'Pending Approval'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-medium">Created:</div>
                        <div>{new Date(creative.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2">
                    <LoadingButton 
                      loading={isSaving}
                      loadingText="Saving..."
                      className="w-full" 
                      type="submit"
                    >
                      Save Changes
                    </LoadingButton>
                    <Button
                      variant="outline"
                      className="w-full"
                      type="button"
                      asChild
                    >
                      <Link href={`/advertiser/creatives/${id}`}>Cancel</Link>
                    </Button>
                  </CardFooter>
                </Card>

                {/* Help Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <p>
                        <span className="font-medium">Changing Content:</span> Uploading new 
                        content will require re-approval by our moderation team.
                      </p>
                      <p>
                        <span className="font-medium">Formats:</span> Make sure your content 
                        format matches the file you're uploading.
                      </p>
                      <p>
                        <span className="font-medium">Preview Image:</span> A preview image helps 
                        your creative stand out in listings and reports.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
} 