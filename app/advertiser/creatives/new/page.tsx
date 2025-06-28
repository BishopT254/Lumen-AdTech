'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UploadIcon, XIcon, InfoIcon, CheckIcon, ChevronRightIcon } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import LoadingButton from '@/components/loading-button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Campaign interface
interface Campaign {
  id: string;
  name: string;
}

// Base creative form schema
const baseCreativeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  campaignId: z.string().min(1, 'Please select a campaign'),
  type: z.enum(['IMAGE', 'VIDEO', 'INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE']),
  format: z.string().min(1, 'Format is required'),
  content: z.string().min(1, 'Content URL is required'),
  previewImage: z.string().optional(),
});

// Extended schemas for specific creative types
const imageCreativeSchema = baseCreativeSchema.extend({
  format: z.enum(['JPG', 'PNG', 'GIF', 'WEBP', 'SVG']),
});

const videoCreativeSchema = baseCreativeSchema.extend({
  format: z.enum(['MP4', 'WEBM', 'AVI', 'MOV']),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 second').optional(),
});

const interactiveCreativeSchema = baseCreativeSchema.extend({
  format: z.enum(['HTML', 'JS', 'UNITY']),
});

const arExperienceSchema = baseCreativeSchema.extend({
  format: z.enum(['ARKIT', 'ARCORE', 'WEBXR']),
  ar_markers: z.any().optional(),
});

const voiceInteractiveSchema = baseCreativeSchema.extend({
  format: z.enum(['AUDIO', 'DIALOGFLOW']),
  voiceCommands: z.any().optional(),
});

// Union schema for all creative types
const creativeSchema = z.discriminatedUnion('type', [
  imageCreativeSchema.extend({ type: z.literal('IMAGE') }),
  videoCreativeSchema.extend({ type: z.literal('VIDEO') }),
  interactiveCreativeSchema.extend({ type: z.literal('INTERACTIVE') }),
  arExperienceSchema.extend({ type: z.literal('AR_EXPERIENCE') }),
  voiceInteractiveSchema.extend({ type: z.literal('VOICE_INTERACTIVE') }),
]);

// Main component
export default function NewCreativePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') as CreativeType || 'IMAGE';
  
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedType, setSelectedType] = useState<CreativeType>(initialType);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [contentUrl, setContentUrl] = useState<string>('');
  const [creationStep, setCreationStep] = useState<'details' | 'upload' | 'preview'>('details');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize react-hook-form
  const form = useForm<z.infer<typeof creativeSchema>>({
    resolver: zodResolver(creativeSchema),
    defaultValues: {
      name: '',
      campaignId: '',
      type: initialType,
      format: '',
      content: '',
      previewImage: '',
    }
  });

  // Load campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/advertiser/campaigns');
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Failed to load campaigns');
      }
    };

    fetchCampaigns();
  }, []);

  // Update form when creative type changes
  useEffect(() => {
    form.setValue('type', selectedType);
    
    // Reset format when type changes
    form.setValue('format', '');
    
    // Reset fields specific to certain types
    if (selectedType !== 'VIDEO') {
      form.setValue('duration', undefined);
    }
    if (selectedType !== 'AR_EXPERIENCE') {
      form.setValue('ar_markers', undefined);
    }
    if (selectedType !== 'VOICE_INTERACTIVE') {
      form.setValue('voiceCommands', undefined);
    }
  }, [selectedType, form]);

  // Handle media upload to S3/storage
  const handleMediaUpload = async (file: File, type: 'content' | 'preview') => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('contentType', selectedType);
      
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
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'];
    
    let isValid = false;
    
    if (selectedType === 'IMAGE' && validImageTypes.includes(file.type)) {
      isValid = true;
    } else if (selectedType === 'VIDEO' && validVideoTypes.includes(file.type)) {
      isValid = true;
    } else if (['INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE'].includes(selectedType)) {
      // For other types, we're more permissive about file types
      isValid = true;
    }
    
    if (!isValid) {
      toast.error(`Invalid file type for ${selectedType.toLowerCase()} creative`);
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
  const onSubmit = async (data: z.infer<typeof creativeSchema>) => {
    try {
      setIsLoading(true);
      
      // Prepare the payload based on the selected type
      const payload = {
        ...data,
        // Only include specific fields if they exist
        ...(data.duration && { duration: data.duration }),
        ...(data.ar_markers && { ar_markers: data.ar_markers }),
        ...(data.voiceCommands && { voiceCommands: data.voiceCommands }),
      };
      
      const response = await fetch('/api/advertiser/creatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create creative');
      }
      
      const responseData = await response.json();
      
      toast.success('Creative asset created successfully');
      router.push(`/advertiser/creatives/${responseData.id}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create creative');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation between steps
  const goToUploadStep = () => {
    const result = form.trigger(['name', 'campaignId', 'type', 'format']);
    if (result) {
      setCreationStep('upload');
    }
  };

  const goToPreviewStep = () => {
    if (!form.getValues('content')) {
      toast.error('Please upload content first');
      return;
    }
    setCreationStep('preview');
  };

  const goToDetailsStep = () => {
    setCreationStep('details');
  };

  // Get format options based on selected type
  const getFormatOptions = () => {
    switch (selectedType) {
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
    if (!contentUrl) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-md">
          <p className="text-gray-500 dark:text-gray-400">No content uploaded</p>
        </div>
      );
    }

    switch (selectedType) {
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
              {selectedType} Creative
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
    switch (selectedType) {
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

  // Render the appropriate step UI
  const renderStep = () => {
    switch (creationStep) {
      case 'details':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Creative Details</CardTitle>
                <CardDescription>
                  Enter the basic information about your creative asset
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creative Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedType(value as CreativeType);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IMAGE">Image</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="INTERACTIVE">Interactive</SelectItem>
                          <SelectItem value="AR_EXPERIENCE">AR Experience</SelectItem>
                          <SelectItem value="VOICE_INTERACTIVE">Voice Interactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of creative asset you are uploading
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
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  asChild
                >
                  <Link href="/advertiser/creatives">Cancel</Link>
                </Button>
                <Button onClick={goToUploadStep}>Continue to Upload</Button>
              </CardFooter>
            </Card>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Upload Creative Assets</CardTitle>
                <CardDescription>
                  Upload your {selectedType.toLowerCase()} content and an optional preview image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Content Upload</h3>
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>File type guidance</AlertTitle>
                    <AlertDescription>
                      {selectedType === 'IMAGE' && "Please upload JPG, PNG, GIF, WebP, or SVG files."}
                      {selectedType === 'VIDEO' && "Please upload MP4, WebM, AVI, or MOV video files."}
                      {selectedType === 'INTERACTIVE' && "Please upload HTML, JS, or Unity WebGL files."}
                      {selectedType === 'AR_EXPERIENCE' && "Please upload USDZ (ARKit), GLB/GLTF (ARCore), or WebXR assets."}
                      {selectedType === 'VOICE_INTERACTIVE' && "Please upload audio files or DialogFlow agent packages."}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="content-upload">Content File</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="content-upload"
                        type="file"
                        onChange={handleContentFileChange}
                        disabled={isUploading}
                        className={contentUrl ? "hidden" : ""}
                      />
                      {contentUrl && (
                        <div className="flex-1 flex items-center gap-2 p-2 border rounded-md">
                          <CheckIcon className="h-4 w-4 text-green-500" />
                          <span className="text-sm truncate flex-1">Content uploaded successfully</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              setContentUrl('');
                              form.setValue('content', '');
                            }}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
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

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Preview Image (Optional)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload a preview image that will be shown in listings and thumbnails
                  </p>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="preview-upload">Preview Image</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="preview-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePreviewImageChange}
                        disabled={isUploading}
                        className={previewUrl ? "hidden" : ""}
                      />
                      {previewUrl && (
                        <div className="flex-1 flex items-center gap-2 p-2 border rounded-md">
                          <img src={previewUrl} alt="Preview" className="h-8 w-8 object-cover rounded" />
                          <span className="text-sm truncate flex-1">Preview image uploaded</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              setPreviewUrl('');
                              form.setValue('previewImage', '');
                            }}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={goToDetailsStep}
                >
                  Back to Details
                </Button>
                <Button 
                  onClick={goToPreviewStep} 
                  disabled={!contentUrl || isUploading}
                >
                  Continue to Preview
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Preview & Submit</CardTitle>
                <CardDescription>
                  Review your creative before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Creative Details</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Name:</div>
                      <div className="text-sm">{form.getValues('name')}</div>
                      
                      <div className="text-sm font-medium">Campaign:</div>
                      <div className="text-sm">
                        {campaigns.find(c => c.id === form.getValues('campaignId'))?.name}
                      </div>
                      
                      <div className="text-sm font-medium">Type:</div>
                      <div className="text-sm">{selectedType}</div>
                      
                      <div className="text-sm font-medium">Format:</div>
                      <div className="text-sm">{form.getValues('format')}</div>
                      
                      {selectedType === 'VIDEO' && form.getValues('duration') && (
                        <>
                          <div className="text-sm font-medium">Duration:</div>
                          <div className="text-sm">{form.getValues('duration')} seconds</div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Preview</h3>
                    {renderContentPreview()}
                  </div>
                </div>
                
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Approval Process</AlertTitle>
                  <AlertDescription>
                    Your creative will be reviewed by our team before it can be used in campaigns.
                    This typically takes 1-2 business days.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCreationStep('upload')}
                >
                  Back to Upload
                </Button>
                <LoadingButton 
                  loading={isLoading}
                  loadingText="Creating..."
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Create Creative
                </LoadingButton>
              </CardFooter>
            </Card>
          </div>
        );
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

  return (
    <div className="container px-6 mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" asChild className="mr-2">
          <Link href="/advertiser/creatives">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Creative Asset</h1>
      </div>

      <div className="mb-8">
        <nav className="flex space-x-1" aria-label="Progress">
          {['details', 'upload', 'preview'].map((step, index) => (
            <button
              key={step}
              className={`flex items-center ${
                creationStep === step
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => {
                // Only allow navigating to previous steps or current step
                if (
                  (step === 'details') ||
                  (step === 'upload' && creationStep !== 'details') ||
                  (step === 'preview' && creationStep === 'preview')
                ) {
                  setCreationStep(step as any);
                }
              }}
              disabled={
                (step === 'upload' && creationStep === 'details') ||
                (step === 'preview' && creationStep !== 'preview')
              }
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  creationStep === step
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {index + 1}
              </span>
              <span className="ml-2 text-sm font-medium hidden sm:inline">
                {step === 'details' && 'Details'}
                {step === 'upload' && 'Upload'}
                {step === 'preview' && 'Preview'}
              </span>
              {index < 2 && <ChevronRightIcon className="h-4 w-4 mx-2" />}
            </button>
          ))}
        </nav>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {renderStep()}
        </form>
      </Form>
    </div>
  );
} 