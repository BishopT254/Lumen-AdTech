"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

// Icons
import {
  ArrowLeft,
  CalendarIcon,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  FileImage,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Save,
  Search,
  Target,
  Trash2,
  Upload,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

// Types based on Prisma schema
type Campaign = {
  id: string
  advertiserId: string
  name: string
  description?: string | null
  status: CampaignStatus
  objective: CampaignObjective
  budget: number
  dailyBudget?: number | null
  startDate: string
  endDate?: string | null
  targetLocations?: any
  targetSchedule?: any
  targetDemographics?: any
  pricingModel: PricingModel
  createdAt: string
  updatedAt: string
  advertiser: {
    id: string
    companyName: string
    user: {
      id: string
      name: string | null
      email: string
    }
  }
  adCreatives: AdCreative[]
  audienceSegment?: {
    id: string
    name: string
    description?: string | null
    type: string
    rules: any
  } | null
  audienceSegmentId?: string | null
}

type AdCreative = {
  id: string
  campaignId: string
  name: string
  type: CreativeType
  status: CreativeStatus
  content: string
  format: string
  duration?: number | null
  previewImage?: string | null
  headline: string
  description: string
  callToAction: string
  isApproved: boolean
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

type Advertiser = {
  id: string
  companyName: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

type AudienceSegment = {
  id: string
  name: string
  description?: string | null
  type: string
  rules: any
}

// Enums from Prisma schema
enum CampaignStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

enum CampaignObjective {
  AWARENESS = "AWARENESS",
  CONSIDERATION = "CONSIDERATION",
  CONVERSION = "CONVERSION",
  TRAFFIC = "TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT",
}

enum PricingModel {
  CPM = "CPM",
  CPE = "CPE",
  CPA = "CPA",
  HYBRID = "HYBRID",
}

enum CreativeType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  TEXT = "TEXT",
  HTML = "HTML",
  INTERACTIVE = "INTERACTIVE",
  AR_EXPERIENCE = "AR_EXPERIENCE",
  VOICE_INTERACTIVE = "VOICE_INTERACTIVE",
}

enum CreativeStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

// Location data type
type Location = {
  id: string
  name: string
  type?: string
}

// Define the campaign schema based on Prisma model
const campaignSchema = z.object({
  name: z
    .string()
    .min(3, "Campaign name must be at least 3 characters")
    .max(100, "Campaign name cannot exceed 100 characters"),
  description: z.string().optional(),
  objective: z.enum(["AWARENESS", "CONSIDERATION", "CONVERSION", "TRAFFIC", "ENGAGEMENT"]),
  budget: z.coerce.number().positive("Budget must be greater than 0"),
  dailyBudget: z.coerce.number().positive("Daily budget must be greater than 0").optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z
    .date({
      required_error: "End date is required",
    })
    .optional(),
  pricingModel: z.enum(["CPM", "CPE", "CPA", "HYBRID"]),
  targetLocations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string().optional(),
      }),
    )
    .min(1, "At least one location must be selected"),
  targetDemographics: z
    .object({
      ageRanges: z.array(z.string()).optional(),
      genders: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
    })
    .optional(),
  targetSchedule: z
    .object({
      weekdays: z.array(z.string()).optional(),
      timeRanges: z
        .array(
          z.object({
            start: z.string(),
            end: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
  audienceSegmentId: z.string().optional(),
  creatives: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(3, "Creative name must be at least 3 characters"),
        type: z.enum(["IMAGE", "VIDEO", "TEXT", "HTML", "INTERACTIVE", "AR_EXPERIENCE", "VOICE_INTERACTIVE"]),
        headline: z
          .string()
          .min(3, "Headline must be at least 3 characters")
          .max(100, "Headline cannot exceed 100 characters"),
        description: z.string().min(10, "Description must be at least 10 characters"),
        callToAction: z
          .string()
          .min(2, "Call to action must be at least 2 characters")
          .max(50, "Call to action cannot exceed 50 characters"),
        content: z.string().optional(), // URL to content
        previewImage: z.string().optional(),
        format: z.string().optional(),
        duration: z.coerce.number().optional(),
        status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional(),
      }),
    )
    .min(1, "At least one creative must be added"),
  status: z
    .enum(["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"])
    .default("DRAFT"),
})

type CampaignFormValues = z.infer<typeof campaignSchema>

// API functions
const fetchCampaign = async (campaignId: string): Promise<Campaign> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch campaign details")
  }
  return response.json()
}

const fetchAdvertisers = async (): Promise<Advertiser[]> => {
  const response = await fetch("/api/admin/advertisers")
  if (!response.ok) {
    throw new Error("Failed to fetch advertisers")
  }
  return response.json()
}

const fetchAudienceSegments = async (): Promise<AudienceSegment[]> => {
  const response = await fetch("/api/admin/audience-segments")
  if (!response.ok) {
    // If the endpoint doesn't exist yet, use mock data
    const mockSegments: AudienceSegment[] = [
      {
        id: "seg1",
        name: "Young Urban Professionals",
        type: "DEMOGRAPHIC",
        description: "Ages 25-35 in urban areas",
        rules: {},
      },
      {
        id: "seg2",
        name: "Tech Enthusiasts",
        type: "BEHAVIORAL",
        description: "People interested in technology and gadgets",
        rules: {},
      },
      {
        id: "seg3",
        name: "Nairobi Commuters",
        type: "LOCATION",
        description: "Regular commuters in Nairobi",
        rules: {},
      },
      {
        id: "seg4",
        name: "Weekend Shoppers",
        type: "BEHAVIORAL",
        description: "Active shoppers during weekends",
        rules: {},
      },
      {
        id: "seg5",
        name: "Business Decision Makers",
        type: "CUSTOM",
        description: "Senior executives and business owners",
        rules: {},
      },
    ]
    return mockSegments
  }
  return response.json()
}

const updateCampaign = async (campaignId: string, data: any): Promise<Campaign> => {
  const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to update campaign")
  }

  return response.json()
}

const searchLocations = async (query: string): Promise<Location[]> => {
  if (!query) return []

  const response = await fetch(`/api/admin/locations?search=${encodeURIComponent(query)}`)
  if (!response.ok) {
    // If the endpoint doesn't exist yet, use mock data
    const mockLocations: Location[] = [
      { id: "loc1", name: "Nairobi CBD", type: "urban" },
      { id: "loc2", name: "Westlands", type: "urban" },
      { id: "loc3", name: "Kilimani", type: "urban" },
      { id: "loc4", name: "Mombasa", type: "coastal" },
      { id: "loc5", name: "Kisumu", type: "lakeside" },
      { id: "loc6", name: "Nakuru", type: "urban" },
      { id: "loc7", name: "Eldoret", type: "highland" },
      { id: "loc8", name: "Thika", type: "industrial" },
      { id: "loc9", name: "Machakos", type: "rural" },
      { id: "loc10", name: "Malindi", type: "coastal" },
    ]

    return mockLocations.filter((loc) => loc.name.toLowerCase().includes(query.toLowerCase()))
  }

  return response.json()
}

export default function EditCampaignPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const queryClient = useQueryClient()
  const { generalSettings, loading: loadingSettings } = usePublicSettings()

  // State
  const [activeTab, setActiveTab] = useState("basics")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [searchingLocation, setSearchingLocation] = useState(false)
  const [locationSearchTerm, setLocationSearchTerm] = useState("")
  const [uploadingCreative, setUploadingCreative] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [formProgress, setFormProgress] = useState(0)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [formTouched, setFormTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [originalFormValues, setOriginalFormValues] = useState<CampaignFormValues | null>(null)

  // Fetch campaign data
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => fetchCampaign(campaignId),
  })

  // Fetch advertisers
  const { data: advertisers = [], isLoading: isLoadingAdvertisers } = useQuery({
    queryKey: ["advertisers"],
    queryFn: fetchAdvertisers,
  })

  // Fetch audience segments
  const { data: audienceSegments = [], isLoading: isLoadingAudienceSegments } = useQuery({
    queryKey: ["audienceSegments"],
    queryFn: fetchAudienceSegments,
  })

  // Initialize form with default values
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      objective: CampaignObjective.AWARENESS,
      budget: 0,
      dailyBudget: 0,
      startDate: new Date(),
      pricingModel: PricingModel.CPM,
      targetLocations: [],
      targetDemographics: {
        ageRanges: [],
        genders: [],
        interests: [],
      },
      targetSchedule: {
        weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        timeRanges: [{ start: "09:00", end: "18:00" }],
      },
      creatives: [
        {
          name: "",
          type: CreativeType.IMAGE,
          headline: "",
          description: "",
          callToAction: "",
          content: "",
          format: "jpg",
        },
      ],
      status: CampaignStatus.DRAFT,
    },
    mode: "onChange",
  })

  // Field array for creatives
  const {
    fields: creativeFields,
    append: appendCreative,
    remove: removeCreative,
  } = useFieldArray({
    control: form.control,
    name: "creatives",
  })

  // Field array for time ranges
  const {
    fields: timeRangeFields,
    append: appendTimeRange,
    remove: removeTimeRange,
  } = useFieldArray({
    control: form.control,
    name: "targetSchedule.timeRanges",
  })

  // Watch form values for progress calculation
  const formValues = form.watch()

  // Update form with campaign data when loaded
  useEffect(() => {
    if (campaign) {
      // Set selected advertiser
      setSelectedAdvertiser(campaign.advertiserId)

      // Parse target locations
      let targetLocations = []
      if (campaign.targetLocations) {
        if (typeof campaign.targetLocations === "string") {
          try {
            targetLocations = JSON.parse(campaign.targetLocations)
          } catch (e) {
            console.error("Error parsing targetLocations:", e)
            targetLocations = []
          }
        } else {
          targetLocations = campaign.targetLocations
        }
      }

      // Parse target demographics
      let targetDemographics = {
        ageRanges: [],
        genders: [],
        interests: [],
      }
      if (campaign.targetDemographics) {
        if (typeof campaign.targetDemographics === "string") {
          try {
            targetDemographics = JSON.parse(campaign.targetDemographics)
          } catch (e) {
            console.error("Error parsing targetDemographics:", e)
            targetDemographics = {
              ageRanges: [],
              genders: [],
              interests: [],
            }
          }
        } else {
          targetDemographics = campaign.targetDemographics
        }
      }

      // Parse target schedule
      let targetSchedule = {
        weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        timeRanges: [{ start: "09:00", end: "18:00" }],
      }
      if (campaign.targetSchedule) {
        if (typeof campaign.targetSchedule === "string") {
          try {
            targetSchedule = JSON.parse(campaign.targetSchedule)
          } catch (e) {
            console.error("Error parsing targetSchedule:", e)
            targetSchedule = {
              weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              timeRanges: [{ start: "09:00", end: "18:00" }],
            }
          }
        } else {
          targetSchedule = campaign.targetSchedule
        }
      }

      // Format creatives
      const creatives = campaign.adCreatives.map((creative) => ({
        id: creative.id,
        name: creative.name,
        type: creative.type,
        headline: creative.headline,
        description: creative.description,
        callToAction: creative.callToAction,
        content: creative.content,
        previewImage: creative.previewImage,
        format: creative.format,
        duration: creative.duration,
        status: creative.status,
      }))

      // Set form values
      const formData: CampaignFormValues = {
        name: campaign.name,
        description: campaign.description || "",
        objective: campaign.objective,
        budget: campaign.budget,
        dailyBudget: campaign.dailyBudget || undefined,
        startDate: new Date(campaign.startDate),
        endDate: campaign.endDate ? new Date(campaign.endDate) : undefined,
        pricingModel: campaign.pricingModel,
        targetLocations: targetLocations,
        targetDemographics: targetDemographics,
        targetSchedule: targetSchedule,
        audienceSegmentId: campaign.audienceSegmentId || undefined,
        creatives:
          creatives.length > 0
            ? creatives
            : [
                {
                  name: "",
                  type: CreativeType.IMAGE,
                  headline: "",
                  description: "",
                  callToAction: "",
                  content: "",
                  format: "jpg",
                },
              ],
        status: campaign.status,
      }

      form.reset(formData)
      setOriginalFormValues(formData)
    }
  }, [campaign, form])

  // Calculate form progress
  useEffect(() => {
    const requiredFields = ["name", "objective", "budget", "startDate", "pricingModel"]

    const creativeRequiredFields = ["name", "type", "headline", "description", "callToAction"]

    let completedFields = 0
    const totalFields = requiredFields.length + 2 // +2 for targetLocations and at least one creative

    // Check basic fields
    requiredFields.forEach((field) => {
      if (formValues[field as keyof CampaignFormValues]) {
        completedFields++
      }
    })

    // Check target locations
    if (formValues.targetLocations && formValues.targetLocations.length > 0) {
      completedFields++
    }

    // Check creatives
    if (formValues.creatives && formValues.creatives.length > 0) {
      const firstCreative = formValues.creatives[0]
      let creativeFieldsComplete = true

      creativeRequiredFields.forEach((field) => {
        if (!firstCreative[field as keyof typeof firstCreative]) {
          creativeFieldsComplete = false
        }
      })

      if (creativeFieldsComplete) {
        completedFields++
      }
    }

    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)

    // Set form as touched if any values change from original
    if (originalFormValues && JSON.stringify(formValues) !== JSON.stringify(originalFormValues)) {
      setFormTouched(true)
    }
  }, [formValues, originalFormValues])

  // Fetch locations based on search term
  useEffect(() => {
    const fetchLocations = async () => {
      if (!locationSearchTerm) {
        return
      }

      setSearchingLocation(true)

      try {
        const fetchedLocations = await searchLocations(locationSearchTerm)
        setLocations(fetchedLocations)
      } catch (error) {
        console.error("Error searching locations:", error)
      } finally {
        setSearchingLocation(false)
      }
    }

    const debounce = setTimeout(fetchLocations, 300)
    return () => clearTimeout(debounce)
  }, [locationSearchTerm])

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (data: any) => updateCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] })
      setFormTouched(false)
      toast.success("Campaign updated successfully")
      router.push(`/admin/campaigns/${campaignId}`)
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "An unknown error occurred")
      toast.error(error instanceof Error ? error.message : "Failed to update campaign")
    },
  })

  // Handle form submission
  const onSubmit = async (data: CampaignFormValues) => {
    if (!selectedAdvertiser) {
      setFormError("Please select an advertiser for this campaign")
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      // Prepare the data for submission
      const campaignData = {
        ...data,
        advertiserId: selectedAdvertiser,
      }

      updateCampaignMutation.mutate(campaignData)
    } catch (error) {
      console.error("Error updating campaign:", error)
      setFormError(error instanceof Error ? error.message : "An unknown error occurred")
      toast.error(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel button
  const handleCancel = () => {
    if (formTouched) {
      setShowUnsavedChangesDialog(true)
    } else {
      router.push(`/admin/campaigns/${campaignId}`)
    }
  }

  // Handle discard changes
  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false)
    router.push(`/admin/campaigns/${campaignId}`)
  }

  // Handle adding a new creative
  const handleAddCreative = () => {
    appendCreative({
      name: `Creative ${creativeFields.length + 1}`,
      type: CreativeType.IMAGE,
      headline: "",
      description: "",
      callToAction: "",
      content: "",
      format: "jpg",
    })
  }

  // Handle adding a new time range
  const handleAddTimeRange = () => {
    appendTimeRange({
      start: "09:00",
      end: "18:00",
    })
  }

  // Handle location selection
  const handleSelectLocation = (location: Location) => {
    const currentLocations = form.getValues("targetLocations") || []

    // Check if location is already selected
    if (!currentLocations.some((loc) => loc.id === location.id)) {
      form.setValue("targetLocations", [...currentLocations, location])
    }

    setLocationSearchTerm("")
  }

  // Handle removing a location
  const handleRemoveLocation = (locationId: string) => {
    const currentLocations = form.getValues("targetLocations") || []
    form.setValue(
      "targetLocations",
      currentLocations.filter((loc) => loc.id !== locationId),
    )
  }

  // Handle creative file upload
  const handleCreativeUpload = async (index: number, file: File) => {
    setUploadingCreative(true)

    try {
      // In a real app, this would upload to your storage service
      // For now, we'll simulate a delay and return a mock URL
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockUrl = URL.createObjectURL(file)

      // Update the creative with the file URL
      const creatives = form.getValues("creatives")
      creatives[index].content = mockUrl
      creatives[index].format = file.type.split("/")[1] || "jpg"

      if (file.type.startsWith("video/")) {
        creatives[index].type = CreativeType.VIDEO
        // Get video duration if possible
        try {
          const video = document.createElement("video")
          video.preload = "metadata"
          video.src = mockUrl
          await new Promise((resolve) => {
            video.onloadedmetadata = resolve
          })
          creatives[index].duration = Math.round(video.duration)
        } catch (e) {
          console.error("Error getting video duration:", e)
        }
      } else if (file.type.startsWith("image/")) {
        creatives[index].type = CreativeType.IMAGE
        creatives[index].previewImage = mockUrl
      }

      form.setValue("creatives", creatives)

      toast.success(`${file.name} has been uploaded successfully.`)
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setUploadingCreative(false)
    }
  }

  // Age range options
  const ageRangeOptions = [
    { value: "13-17", label: "13-17" },
    { value: "18-24", label: "18-24" },
    { value: "25-34", label: "25-34" },
    { value: "35-44", label: "35-44" },
    { value: "45-54", label: "45-54" },
    { value: "55-64", label: "55-64" },
    { value: "65+", label: "65+" },
  ]

  // Gender options
  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ]

  // Interest options
  const interestOptions = [
    { value: "technology", label: "Technology" },
    { value: "fashion", label: "Fashion" },
    { value: "sports", label: "Sports" },
    { value: "food", label: "Food & Dining" },
    { value: "travel", label: "Travel" },
    { value: "music", label: "Music" },
    { value: "movies", label: "Movies & Entertainment" },
    { value: "business", label: "Business" },
    { value: "education", label: "Education" },
    { value: "health", label: "Health & Fitness" },
  ]

  // Weekday options
  const weekdayOptions = [
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
    { value: "Sunday", label: "Sunday" },
  ]

  // Creative type options
  const creativeTypeOptions = [
    { value: CreativeType.IMAGE, label: "Image" },
    { value: CreativeType.VIDEO, label: "Video" },
    { value: CreativeType.TEXT, label: "Text" },
    { value: CreativeType.HTML, label: "HTML" },
    { value: CreativeType.INTERACTIVE, label: "Interactive" },
    { value: CreativeType.AR_EXPERIENCE, label: "AR Experience" },
    { value: CreativeType.VOICE_INTERACTIVE, label: "Voice Interactive" },
  ]

  // Call to action options
  const ctaOptions = [
    { value: "Learn More", label: "Learn More" },
    { value: "Shop Now", label: "Shop Now" },
    { value: "Sign Up", label: "Sign Up" },
    { value: "Download", label: "Download" },
    { value: "Get Offer", label: "Get Offer" },
    { value: "Book Now", label: "Book Now" },
    { value: "Contact Us", label: "Contact Us" },
    { value: "Watch Video", label: "Watch Video" },
    { value: "Subscribe", label: "Subscribe" },
    { value: "Apply Now", label: "Apply Now" },
  ]

  // Loading state
  if (isLoadingCampaign) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Skeleton className="mr-2 h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (campaignError) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load campaign details</h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {campaignError instanceof Error ? campaignError.message : "An unknown error occurred"}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Edit Campaign
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Update your campaign settings, targeting, and creatives
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <div className="flex items-center space-x-2">
              <Progress value={formProgress} className="h-2 w-32" />
              <span className="text-sm text-gray-500 dark:text-gray-400">{formProgress}% complete</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="default" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || !formTouched}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Form error message */}
      {formError && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column - Form navigation */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Setup</CardTitle>
              <CardDescription>Complete all sections to update your campaign</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                <button
                  type="button"
                  className={`flex items-center space-x-2 border-l-2 px-6 py-3 text-left transition-colors ${
                    activeTab === "basics"
                      ? "border-l-primary bg-primary/5 font-medium text-primary"
                      : "border-l-transparent hover:border-l-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => setActiveTab("basics")}
                >
                  <Megaphone className="h-5 w-5" />
                  <span>Campaign Basics</span>
                  {form.formState.errors.name ||
                  form.formState.errors.objective ||
                  form.formState.errors.budget ||
                  form.formState.errors.startDate ||
                  form.formState.errors.pricingModel ? (
                    <Badge variant="destructive" className="ml-auto">
                      Required
                    </Badge>
                  ) : formValues.name && formValues.objective && formValues.budget && formValues.startDate ? (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  ) : null}
                </button>

                <button
                  type="button"
                  className={`flex items-center space-x-2 border-l-2 px-6 py-3 text-left transition-colors ${
                    activeTab === "targeting"
                      ? "border-l-primary bg-primary/5 font-medium text-primary"
                      : "border-l-transparent hover:border-l-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => setActiveTab("targeting")}
                >
                  <Target className="h-5 w-5" />
                  <span>Targeting & Audience</span>
                  {form.formState.errors.targetLocations ? (
                    <Badge variant="destructive" className="ml-auto">
                      Required
                    </Badge>
                  ) : formValues.targetLocations && formValues.targetLocations.length > 0 ? (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  ) : null}
                </button>

                <button
                  type="button"
                  className={`flex items-center space-x-2 border-l-2 px-6 py-3 text-left transition-colors ${
                    activeTab === "schedule"
                      ? "border-l-primary bg-primary/5 font-medium text-primary"
                      : "border-l-transparent hover:border-l-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => setActiveTab("schedule")}
                >
                  <Clock className="h-5 w-5" />
                  <span>Schedule & Timing</span>
                  {formValues.targetSchedule &&
                  formValues.targetSchedule.weekdays &&
                  formValues.targetSchedule.weekdays.length > 0 ? (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  ) : null}
                </button>

                <button
                  type="button"
                  className={`flex items-center space-x-2 border-l-2 px-6 py-3 text-left transition-colors ${
                    activeTab === "creatives"
                      ? "border-l-primary bg-primary/5 font-medium text-primary"
                      : "border-l-transparent hover:border-l-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => setActiveTab("creatives")}
                >
                  <FileImage className="h-5 w-5" />
                  <span>Creatives & Content</span>
                  {form.formState.errors.creatives ? (
                    <Badge variant="destructive" className="ml-auto">
                      Required
                    </Badge>
                  ) : formValues.creatives &&
                    formValues.creatives.length > 0 &&
                    formValues.creatives[0].name &&
                    formValues.creatives[0].headline ? (
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  ) : null}
                </button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 border-t p-6">
              <div className="flex items-center space-x-2">
                <Progress value={formProgress} className="h-2 w-full" />
                <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formProgress}%</span>
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (originalFormValues) {
                      form.reset(originalFormValues)
                      setFormTouched(false)
                    }
                  }}
                  disabled={!formTouched}
                >
                  Reset Form
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                  {previewMode ? "Edit Mode" : "Preview Mode"}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Advertiser selection */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Advertiser</CardTitle>
              <CardDescription>Campaign advertiser</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAdvertisers ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div>
                  <Select value={selectedAdvertiser || ""} onValueChange={setSelectedAdvertiser} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an advertiser" />
                    </SelectTrigger>
                    <SelectContent>
                      {advertisers.map((advertiser) => (
                        <SelectItem key={advertiser.id} value={advertiser.id}>
                          {advertiser.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    The advertiser cannot be changed after campaign creation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help & Resources */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="mr-2 h-5 w-5" />
                Help & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                <a
                  href="#"
                  className="flex items-center space-x-2 px-6 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                >
                  <span>Campaign Editing Guide</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 px-6 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                >
                  <span>Targeting Best Practices</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 px-6 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                >
                  <span>Creative Specifications</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 px-6 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                >
                  <span>Contact Support</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Form content */}
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Campaign Basics */}
              <Card className={activeTab === "basics" ? "block" : "hidden"}>
                <CardHeader>
                  <CardTitle>Campaign Basics</CardTitle>
                  <CardDescription>Update the basic information for your campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Summer Sale 2023" {...field} />
                        </FormControl>
                        <FormDescription>A clear, descriptive name for your campaign</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your campaign objectives and details..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Optional: Provide additional details about your campaign</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Objective</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an objective" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AWARENESS">Brand Awareness</SelectItem>
                            <SelectItem value="CONSIDERATION">Consideration</SelectItem>
                            <SelectItem value="CONVERSION">Conversion</SelectItem>
                            <SelectItem value="TRAFFIC">Traffic</SelectItem>
                            <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>What is the primary goal of your campaign?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Budget</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <Input type="number" placeholder="5000" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>Total budget for the entire campaign</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dailyBudget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Budget (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <Input type="number" placeholder="500" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>Maximum daily spend limit</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="pricingModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pricing Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pricing model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CPM">CPM (Cost Per Thousand Impressions)</SelectItem>
                            <SelectItem value="CPE">CPE (Cost Per Engagement)</SelectItem>
                            <SelectItem value="CPA">CPA (Cost Per Action)</SelectItem>
                            <SelectItem value="HYBRID">Hybrid (Mixed Pricing)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How would you like to pay for this campaign?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("targeting")}>
                    Continue to Targeting
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Targeting & Audience */}
              <Card className={activeTab === "targeting" ? "block" : "hidden"}>
                <CardHeader>
                  <CardTitle>Targeting & Audience</CardTitle>
                  <CardDescription>Define where and to whom your campaign will be shown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-4 text-base font-medium">Target Locations</h3>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {form.watch("targetLocations")?.map((location) => (
                          <Badge key={location.id} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                            <MapPin className="h-3 w-3" />
                            {location.name}
                            <X
                              className="ml-1 h-3 w-3 cursor-pointer"
                              onClick={() => handleRemoveLocation(location.id)}
                            />
                          </Badge>
                        ))}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Search for locations..."
                          className="pl-8"
                          value={locationSearchTerm}
                          onChange={(e) => setLocationSearchTerm(e.target.value)}
                        />
                      </div>

                      {locationSearchTerm && (
                        <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          {searchingLocation ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                              <span className="ml-2 text-sm text-gray-500">Searching locations...</span>
                            </div>
                          ) : locations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              No locations found. Try a different search term.
                            </div>
                          ) : (
                            <ScrollArea className="h-[200px]">
                              <div className="p-2">
                                {locations.map((location) => (
                                  <div
                                    key={location.id}
                                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => handleSelectLocation(location)}
                                  >
                                    <div className="flex items-center">
                                      <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                      <span>{location.name}</span>
                                    </div>
                                    {location.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {location.type}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}

                      {form.formState.errors.targetLocations && (
                        <p className="text-sm font-medium text-destructive">
                          {form.formState.errors.targetLocations.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4 text-base font-medium">Demographics</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="targetDemographics.ageRanges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age Ranges</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {ageRangeOptions.map((option) => (
                                <Badge
                                  key={option.value}
                                  variant={field.value?.includes(option.value) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || []
                                    const updated = current.includes(option.value)
                                      ? current.filter((v) => v !== option.value)
                                      : [...current, option.value]
                                    field.onChange(updated)
                                  }}
                                >
                                  {option.label}
                                </Badge>
                              ))}
                            </div>
                            <FormDescription>Select all applicable age ranges for your target audience</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetDemographics.genders"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {genderOptions.map((option) => (
                                <Badge
                                  key={option.value}
                                  variant={field.value?.includes(option.value) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || []
                                    const updated = current.includes(option.value)
                                      ? current.filter((v) => v !== option.value)
                                      : [...current, option.value]
                                    field.onChange(updated)
                                  }}
                                >
                                  {option.label}
                                </Badge>
                              ))}
                            </div>
                            <FormDescription>Select all applicable genders for your target audience</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetDemographics.interests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interests</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {interestOptions.map((option) => (
                                <Badge
                                  key={option.value}
                                  variant={field.value?.includes(option.value) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || []
                                    const updated = current.includes(option.value)
                                      ? current.filter((v) => v !== option.value)
                                      : [...current, option.value]
                                    field.onChange(updated)
                                  }}
                                >
                                  {option.label}
                                </Badge>
                              ))}
                            </div>
                            <FormDescription>Select interests relevant to your target audience</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4 text-base font-medium">Audience Segments</h3>
                    <FormField
                      control={form.control}
                      name="audienceSegmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audience Segment (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an audience segment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {audienceSegments.map((segment) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  {segment.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Select a pre-defined audience segment to target</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("basics")}>
                    <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Basics
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("schedule")}>
                    Continue to Schedule
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Schedule & Timing */}
              <Card className={activeTab === "schedule" ? "block" : "hidden"}>
                <CardHeader>
                  <CardTitle>Schedule & Timing</CardTitle>
                  <CardDescription>Set when your campaign will run and display</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className="w-full pl-3 text-left font-normal">
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>When should the campaign start running?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className="w-full pl-3 text-left font-normal">
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date() ||
                                  (form.getValues("startDate") && date < form.getValues("startDate"))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>Leave blank for an ongoing campaign</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4 text-base font-medium">Days of Week</h3>
                    <FormField
                      control={form.control}
                      name="targetSchedule.weekdays"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-wrap gap-2">
                            {weekdayOptions.map((option) => (
                              <Badge
                                key={option.value}
                                variant={field.value?.includes(option.value) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const current = field.value || []
                                  const updated = current.includes(option.value)
                                    ? current.filter((v) => v !== option.value)
                                    : [...current, option.value]
                                  field.onChange(updated)
                                }}
                              >
                                {option.label}
                              </Badge>
                            ))}
                          </div>
                          <FormDescription className="mt-2">
                            Select the days of the week when your campaign should run
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-medium">Time Ranges</h3>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddTimeRange}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add Time Range
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {timeRangeFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-4">
                          <FormField
                            control={form.control}
                            name={`targetSchedule.timeRanges.${index}.start`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`targetSchedule.timeRanges.${index}.end`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTimeRange(index)}
                            className="mb-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("targeting")}>
                    <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Targeting
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("creatives")}>
                    Continue to Creatives
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>

              {/* Creatives & Content */}
              <Card className={activeTab === "creatives" ? "block" : "hidden"}>
                <CardHeader>
                  <CardTitle>Creatives & Content</CardTitle>
                  <CardDescription>Update the visual and text content for your campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Campaign Creatives</h3>
                    <Button type="button" variant="outline" onClick={handleAddCreative}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Creative
                    </Button>
                  </div>

                  <div className="space-y-8">
                    {creativeFields.map((field, index) => (
                      <div key={field.id} className="rounded-lg border p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-sm font-medium">Creative {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCreative(index)}
                            disabled={creativeFields.length === 1}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`creatives.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Creative Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Main Banner" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`creatives.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Creative Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {creativeTypeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`creatives.${index}.headline`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Headline</FormLabel>
                                <FormControl>
                                  <Input placeholder="Introducing Our New Product" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`creatives.${index}.callToAction`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Call to Action</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select CTA" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ctaOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name={`creatives.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe your product or service..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="mt-4">
                          <FormLabel>Creative Content</FormLabel>
                          <div className="mt-2 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
                            {form.watch(`creatives.${index}.content`) ? (
                              <div className="space-y-2">
                                {form.watch(`creatives.${index}.type`) === "VIDEO" ? (
                                  <video
                                    src={form.watch(`creatives.${index}.content`)}
                                    controls
                                    className="mx-auto max-h-[200px]"
                                  />
                                ) : (
                                  <img
                                    src={form.watch(`creatives.${index || "/placeholder.svg"}.content`)}
                                    alt="Creative preview"
                                    className="mx-auto max-h-[200px] object-contain"
                                  />
                                )}
                                <p className="text-sm text-gray-500">
                                  {form.watch(`creatives.${index}.type`)} • {form.watch(`creatives.${index}.format`)}
                                  {form.watch(`creatives.${index}.duration`) &&
                                    ` • ${form.watch(`creatives.${index}.duration`)}s`}
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const creatives = form.getValues("creatives")
                                    creatives[index].content = ""
                                    creatives[index].previewImage = ""
                                    form.setValue("creatives", creatives)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-center">
                                  <FileImage className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500">Drag and drop or click to upload</p>
                                <p className="text-xs text-gray-400">
                                  Supports images (JPG, PNG, GIF) and videos (MP4, MOV)
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingCreative}
                                  onClick={() => {
                                    const input = document.createElement("input")
                                    input.type = "file"
                                    input.accept = "image/*,video/*"
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0]
                                      if (file) {
                                        handleCreativeUpload(index, file)
                                      }
                                    }
                                    input.click()
                                  }}
                                >
                                  {uploadingCreative ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          {form.formState.errors.creatives?.[index]?.content && (
                            <p className="mt-2 text-sm font-medium text-destructive">
                              {form.formState.errors.creatives[index]?.content?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <Button variant="outline" type="button" onClick={() => setActiveTab("schedule")}>
                    <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Schedule
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formTouched}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave this page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
