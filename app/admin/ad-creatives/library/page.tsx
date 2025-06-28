"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { format } from "date-fns"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import {
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  ChevronDown,
  Clock,
  PenTool,
  EyeOff,
  Eye,
  FileVideo,
  ImageIcon,
  FileText,
  Code,
  Layers,
  Mic,
  CheckCircle,
  XCircle,
  Play,
  Copy,
  Star,
  Trash2,
  Grid,
  List,
  SlidersHorizontal,
  Folder,
  FolderPlus,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react"

// Types based on Prisma schema
type AdCreativeStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED"
type CreativeType = "IMAGE" | "VIDEO" | "TEXT" | "HTML" | "INTERACTIVE" | "AR_EXPERIENCE" | "VOICE_INTERACTIVE"
type CreativeFormat = "jpg" | "png" | "gif" | "mp4" | "webm" | "html" | "json" | "glb" | "usdz" | "txt"

interface AdCreative {
  id: string
  campaignId: string | null
  name: string
  type: CreativeType
  status: AdCreativeStatus
  content: string
  format: string
  duration?: number | null
  previewImage?: string | null
  headline: string
  description: string
  callToAction: string
  isApproved: boolean
  rejectionReason?: string | null
  ar_markers?: any
  voiceCommands?: any
  createdAt: string
  updatedAt: string
  campaign?: {
    name: string
    advertiser: {
      companyName: string
    }
  } | null
  tags?: string[]
  dimensions?: {
    width: number
    height: number
  } | null
  fileSize?: number | null
  usageCount?: number
  lastUsed?: string | null
  isFeatured?: boolean
  isTemplate?: boolean
  category?: string | null
  metadata?: Record<string, any> | null
}

interface Category {
  id: string
  name: string
  count: number
}

interface TagType {
  id: string
  name: string
  count: number
}

interface Collection {
  id: string
  name: string
  description: string
  creativeCount: number
  createdAt: string
  updatedAt: string
}

export default function CreativeLibraryPage() {
  const { data: session } = useSession()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for UI controls
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">("medium")
  const [selectedCreatives, setSelectedCreatives] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("newest")
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false)
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newCollectionDescription, setNewCollectionDescription] = useState("")
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewCreative, setPreviewCreative] = useState<AdCreative | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [creativeToDelete, setCreativeToDelete] = useState<string | null>(null)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch creatives from API
  const {
    data: apiCreatives,
    isLoading: creativesLoading,
    error: creativesError,
    refetch: refetchCreatives,
  } = useQuery<AdCreative[]>({
    queryKey: ["adCreativesLibrary"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/ad-creatives/library")
        if (!response.ok) {
          throw new Error("Failed to fetch creative library")
        }
        const data = await response.json()
        // Ensure we return an array even if the API returns something else
        return Array.isArray(data) ? data : []
      } catch (error) {
        console.error("Error fetching creative library:", error)
        return [] // Return empty array on error
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  })

  // Fetch categories from API
  const {
    data: apiCategories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ["adCreativeCategories"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/ad-creatives/categories")
        if (!response.ok) {
          throw new Error("Failed to fetch categories")
        }
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } catch (error) {
        console.error("Error fetching categories:", error)
        return []
      }
    },
  })

  // Fetch tags from API
  const {
    data: apiTags,
    isLoading: tagsLoading,
    error: tagsError,
  } = useQuery<TagType[]>({
    queryKey: ["adCreativeTags"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/ad-creatives/tags")
        if (!response.ok) {
          throw new Error("Failed to fetch tags")
        }
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } catch (error) {
        console.error("Error fetching tags:", error)
        return []
      }
    },
  })

  // Fetch collections from API
  const {
    data: apiCollections,
    isLoading: collectionsLoading,
    error: collectionsError,
    refetch: refetchCollections,
  } = useQuery<Collection[]>({
    queryKey: ["adCreativeCollections"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/ad-creatives/collections")
        if (!response.ok) {
          throw new Error("Failed to fetch collections")
        }
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } catch (error) {
        console.error("Error fetching collections:", error)
        return []
      }
    },
  })

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchCreatives(), refetchCollections()])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return "Unknown"
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Format date based on system settings
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      const dateFormat = generalSettings?.dateFormat || "MMM dd, yyyy"
      return format(date, "MMM dd, yyyy")
    } catch (e) {
      return "Invalid date"
    }
  }

  // Filter and sort creatives
  const filteredCreatives = useMemo(() => {
    // Make sure apiCreatives is an array before filtering
    if (!apiCreatives || !Array.isArray(apiCreatives)) return []

    return apiCreatives
      .filter((creative) => {
        // Search term filter
        const matchesSearch =
          creative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creative.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creative.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (creative.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

        // Type filter
        const matchesType = filterType === "all" || creative.type === filterType

        // Status filter
        const matchesStatus = filterStatus === "all" || creative.status === filterStatus

        // Category filter
        const matchesCategory = filterCategory === "all" || creative.category === filterCategory

        // Tags filter
        const matchesTags =
          filterTags.length === 0 || (creative.tags && filterTags.every((tag) => creative.tags?.includes(tag)))

        // Template filter
        const matchesTemplate = !showTemplatesOnly || creative.isTemplate === true

        // Featured filter
        const matchesFeatured = !showFeaturedOnly || creative.isFeatured === true

        // Collection filter
        const matchesCollection = !selectedCollection || true // Would need to implement collection membership check

        return (
          matchesSearch &&
          matchesType &&
          matchesStatus &&
          matchesCategory &&
          matchesTags &&
          matchesTemplate &&
          matchesFeatured &&
          matchesCollection
        )
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          case "name_asc":
            return a.name.localeCompare(b.name)
          case "name_desc":
            return b.name.localeCompare(a.name)
          case "most_used":
            return (b.usageCount || 0) - (a.usageCount || 0)
          case "recently_used":
            if (!a.lastUsed && !b.lastUsed) return 0
            if (!a.lastUsed) return 1
            if (!b.lastUsed) return -1
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
          default:
            return 0
        }
      })
  }, [
    apiCreatives,
    searchTerm,
    filterType,
    filterStatus,
    filterCategory,
    filterTags,
    showTemplatesOnly,
    showFeaturedOnly,
    selectedCollection,
    sortBy,
  ])

  // Get type counts
  const typeCounts = useMemo(() => {
    // Make sure apiCreatives is an array before reducing
    if (!apiCreatives || !Array.isArray(apiCreatives)) return {}

    return apiCreatives.reduce(
      (acc, creative) => {
        acc[creative.type] = (acc[creative.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }, [apiCreatives])

  // Handle creative selection
  const handleSelectCreative = (creativeId: string, isMultiSelect = false) => {
    if (isMultiSelect) {
      setSelectedCreatives((prev) =>
        prev.includes(creativeId) ? prev.filter((id) => id !== creativeId) : [...prev, creativeId],
      )
    } else {
      setSelectedCreatives(selectedCreatives.includes(creativeId) ? [] : [creativeId])
    }
  }

  // Handle select all creatives
  const handleSelectAllCreatives = (checked: boolean) => {
    if (checked) {
      setSelectedCreatives(filteredCreatives.map((creative) => creative.id))
    } else {
      setSelectedCreatives([])
    }
  }

  // Handle creative preview
  const handlePreviewCreative = (creative: AdCreative) => {
    setPreviewCreative(creative)
    setIsPreviewOpen(true)
  }

  // Handle creative deletion
  const handleDeleteCreative = (creativeId: string) => {
    setCreativeToDelete(creativeId)
    setIsDeleteDialogOpen(true)
  }

  // Confirm creative deletion
  const confirmDeleteCreative = async () => {
    if (!creativeToDelete) return

    try {
      const response = await fetch(`/api/admin/ad-creatives/${creativeToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete creative")
      }

      // Remove from selected creatives
      setSelectedCreatives((prev) => prev.filter((id) => id !== creativeToDelete))

      // Refetch creatives
      refetchCreatives()

      // Close dialog
      setIsDeleteDialogOpen(false)
      setCreativeToDelete(null)
    } catch (error) {
      console.error("Error deleting creative:", error)
      // Show error notification
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedCreatives.length === 0) return

    try {
      switch (action) {
        case "delete":
          // Implement bulk delete
          const deleteResponse = await fetch("/api/admin/ad-creatives/bulk-delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: selectedCreatives }),
          })

          if (!deleteResponse.ok) {
            throw new Error("Failed to delete creatives")
          }

          // Refetch creatives
          refetchCreatives()

          // Clear selection
          setSelectedCreatives([])
          break

        case "tag":
          // Open tag dialog
          setIsTagDialogOpen(true)
          break

        case "collection":
          // Open add to collection dialog
          setIsAddToCollectionOpen(true)
          break

        case "approve":
          // Implement bulk approve
          const approveResponse = await fetch("/api/admin/ad-creatives/bulk-approve", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: selectedCreatives }),
          })

          if (!approveResponse.ok) {
            throw new Error("Failed to approve creatives")
          }

          // Refetch creatives
          refetchCreatives()

          // Clear selection
          setSelectedCreatives([])
          break

        case "reject":
          // Would need a dialog for rejection reason
          break

        case "feature":
          // Implement bulk feature
          const featureResponse = await fetch("/api/admin/ad-creatives/bulk-feature", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: selectedCreatives, featured: true }),
          })

          if (!featureResponse.ok) {
            throw new Error("Failed to feature creatives")
          }

          // Refetch creatives
          refetchCreatives()

          // Clear selection
          setSelectedCreatives([])
          break

        case "unfeature":
          // Implement bulk unfeature
          const unfeatureResponse = await fetch("/api/admin/ad-creatives/bulk-feature", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: selectedCreatives, featured: false }),
          })

          if (!unfeatureResponse.ok) {
            throw new Error("Failed to unfeature creatives")
          }

          // Refetch creatives
          refetchCreatives()

          // Clear selection
          setSelectedCreatives([])
          break

        default:
          console.log(`Unhandled bulk action: ${action}`)
      }
    } catch (error) {
      console.error(`Error performing bulk action ${action}:`, error)
      // Show error notification
    }
  }

  // Handle create collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    try {
      const response = await fetch("/api/admin/ad-creatives/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDescription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create collection")
      }

      // Refetch collections
      refetchCollections()

      // Reset form
      setNewCollectionName("")
      setNewCollectionDescription("")

      // Close dialog
      setIsCreateCollectionOpen(false)
    } catch (error) {
      console.error("Error creating collection:", error)
      // Show error notification
    }
  }

  // Handle add to collection
  const handleAddToCollection = async (collectionId: string) => {
    if (selectedCreatives.length === 0) return

    try {
      const response = await fetch(`/api/admin/ad-creatives/collections/${collectionId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ creativeIds: selectedCreatives }),
      })

      if (!response.ok) {
        throw new Error("Failed to add to collection")
      }

      // Refetch collections
      refetchCollections()

      // Close dialog
      setIsAddToCollectionOpen(false)
    } catch (error) {
      console.error("Error adding to collection:", error)
      // Show error notification
    }
  }

  // Handle tag management
  const handleTagManagement = async () => {
    if (selectedCreatives.length === 0) return

    try {
      const response = await fetch("/api/admin/ad-creatives/bulk-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creativeIds: selectedCreatives,
          tags: selectedTags,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update tags")
      }

      // Refetch creatives
      refetchCreatives()

      // Reset form
      setSelectedTags([])

      // Close dialog
      setIsTagDialogOpen(false)
    } catch (error) {
      console.error("Error updating tags:", error)
      // Show error notification
    }
  }

  // Handle add new tag
  const handleAddNewTag = () => {
    if (!newTag.trim() || selectedTags.includes(newTag.trim())) return

    setSelectedTags([...selectedTags, newTag.trim()])
    setNewTag("")
  }

  // Type badge component
  const TypeBadge = ({ type }: { type: CreativeType }) => {
    const typeConfig = {
      IMAGE: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <ImageIcon className="h-3 w-3 mr-1" />,
      },
      VIDEO: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        icon: <FileVideo className="h-3 w-3 mr-1" />,
      },
      TEXT: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        icon: <FileText className="h-3 w-3 mr-1" />,
      },
      HTML: {
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        icon: <Code className="h-3 w-3 mr-1" />,
      },
      INTERACTIVE: {
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: <Play className="h-3 w-3 mr-1" />,
      },
      AR_EXPERIENCE: {
        color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
        icon: <Layers className="h-3 w-3 mr-1" />,
      },
      VOICE_INTERACTIVE: {
        color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
        icon: <Mic className="h-3 w-3 mr-1" />,
      },
    }

    const config = typeConfig[type] || typeConfig["IMAGE"]

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {type.replace("_", " ")}
      </Badge>
    )
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: AdCreativeStatus }) => {
    const statusConfig = {
      APPROVED: {
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      PENDING_REVIEW: {
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      DRAFT: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        icon: <PenTool className="h-3 w-3 mr-1" />,
      },
      REJECTED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
      ARCHIVED: {
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        icon: <EyeOff className="h-3 w-3 mr-1" />,
      },
    }

    const config = statusConfig[status] || statusConfig["DRAFT"]

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.replace("_", " ")}
      </Badge>
    )
  }

  // Loading state
  if (creativesLoading || categoriesLoading || tagsLoading || collectionsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="aspect-video w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-4 h-4 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (creativesError || categoriesError || tagsError || collectionsError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load creative library. Please try refreshing the page.</AlertDescription>
        </Alert>

        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // Empty state
  if (filteredCreatives.length === 0 && !creativesLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-8 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Creative Library
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Browse, search and manage your creative assets
            </p>
          </div>
          <div className="mt-4 flex space-x-3 sm:mt-0">
            <Button
              variant="outline"
              className="inline-flex items-center"
              onClick={() => setIsCreateCollectionOpen(true)}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
            <Button className="inline-flex items-center" asChild>
              <Link href="/admin/ad-creatives/new">
                <Plus className="mr-2 h-4 w-4" />
                New Creative
              </Link>
            </Button>
          </div>
        </div>

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
                <DropdownMenuItem onClick={() => setFilterType("all")}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("IMAGE")}>
                  Images ({typeCounts["IMAGE"] || 0})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("VIDEO")}>
                  Videos ({typeCounts["VIDEO"] || 0})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("INTERACTIVE")}>
                  Interactive ({typeCounts["INTERACTIVE"] || 0})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("AR_EXPERIENCE")}>
                  AR Experience ({typeCounts["AR_EXPERIENCE"] || 0})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("VOICE_INTERACTIVE")}>
                  Voice Interactive ({typeCounts["VOICE_INTERACTIVE"] || 0})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("APPROVED")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("PENDING_REVIEW")}>Pending Review</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("DRAFT")}>Drafts</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                  <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name_asc">Name A-Z</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name_desc">Name Z-A</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="most_used">Most Used</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="recently_used">Recently Used</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Creatives Found</CardTitle>
            <CardDescription className="text-center">
              {searchTerm ||
              filterType !== "all" ||
              filterStatus !== "all" ||
              filterCategory !== "all" ||
              filterTags.length > 0 ||
              showTemplatesOnly ||
              showFeaturedOnly
                ? "No creatives match your current filters. Try adjusting your search criteria."
                : "Your creative library is empty. Start by adding new creatives."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href="/admin/ad-creatives/new">
                <Plus className="mr-2 h-4 w-4" />
                Add New Creative
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Creative Library
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Browse, search and manage your creative assets
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button
            variant="outline"
            className="inline-flex items-center"
            onClick={() => setIsCreateCollectionOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Collection
          </Button>
          <Button className="inline-flex items-center" asChild>
            <Link href="/admin/ad-creatives/new">
              <Plus className="mr-2 h-4 w-4" />
              New Creative
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs for collections */}
      <Tabs defaultValue="all" className="mb-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setSelectedCollection(null)}>
              All Creatives
            </TabsTrigger>
            <TabsTrigger value="featured" onClick={() => setShowFeaturedOnly(true)}>
              Featured
            </TabsTrigger>
            <TabsTrigger value="templates" onClick={() => setShowTemplatesOnly(true)}>
              Templates
            </TabsTrigger>
            {apiCollections && apiCollections.length > 0 && <TabsTrigger value="collections">Collections</TabsTrigger>}
          </TabsList>

          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-muted" : ""}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid View</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-muted" : ""}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {viewMode === "grid" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Grid Size</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={gridSize} onValueChange={(value) => setGridSize(value as any)}>
                    <DropdownMenuRadioItem value="small">Small</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="large">Large</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

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
                  <DropdownMenuItem onClick={() => setFilterType("all")}>All Types</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("IMAGE")}>
                    Images ({typeCounts["IMAGE"] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("VIDEO")}>
                    Videos ({typeCounts["VIDEO"] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("INTERACTIVE")}>
                    Interactive ({typeCounts["INTERACTIVE"] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("AR_EXPERIENCE")}>
                    AR Experience ({typeCounts["AR_EXPERIENCE"] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("VOICE_INTERACTIVE")}>
                    Voice Interactive ({typeCounts["VOICE_INTERACTIVE"] || 0})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Statuses</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("APPROVED")}>Approved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("PENDING_REVIEW")}>Pending Review</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("DRAFT")}>Drafts</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                    <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">Name A-Z</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">Name Z-A</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="most_used">Most Used</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="recently_used">Recently Used</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedCreatives.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedCreatives.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction("approve")}>Approve Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("tag")}>Manage Tags</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("collection")}>
                      Add to Collection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("feature")}>Mark as Featured</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("unfeature")}>Remove Featured</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction("delete")}
                      className="text-red-600 dark:text-red-400"
                    >
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Grid view */}
          {viewMode === "grid" && (
            <div
              className={`grid gap-6 ${
                gridSize === "small"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : gridSize === "medium"
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {filteredCreatives.map((creative) => (
                <Card
                  key={creative.id}
                  className={`group overflow-hidden transition-all duration-200 ${
                    selectedCreatives.includes(creative.id) ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`aspect-video w-full cursor-pointer bg-gray-100 dark:bg-gray-800 ${
                        gridSize === "large"
                          ? "aspect-[16/9]"
                          : gridSize === "medium"
                            ? "aspect-[4/3]"
                            : "aspect-square"
                      }`}
                      onClick={() => handlePreviewCreative(creative)}
                    >
                      {creative.previewImage ? (
                        <img
                          src={creative.previewImage || "/placeholder.svg"}
                          alt={creative.name}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          {creative.type === "IMAGE" && <ImageIcon className="h-12 w-12 text-gray-400" />}
                          {creative.type === "VIDEO" && <FileVideo className="h-12 w-12 text-gray-400" />}
                          {creative.type === "INTERACTIVE" && <Play className="h-12 w-12 text-gray-400" />}
                          {creative.type === "AR_EXPERIENCE" && <Layers className="h-12 w-12 text-gray-400" />}
                          {creative.type === "VOICE_INTERACTIVE" && <Mic className="h-12 w-12 text-gray-400" />}
                        </div>
                      )}

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 rounded-full p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePreviewCreative(creative)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8 w-8 rounded-full p-0" asChild>
                            <Link href={`/admin/ad-creatives/${creative.id}/edit`} onClick={(e) => e.stopPropagation()}>
                              <PenTool className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 rounded-full p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCreative(creative.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Selection checkbox */}
                      <div className="absolute left-2 top-2">
                        <Checkbox
                          checked={selectedCreatives.includes(creative.id)}
                          onCheckedChange={() => handleSelectCreative(creative.id, true)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded-sm border-2 border-white bg-black/30"
                        />
                      </div>

                      {/* Type badge */}
                      <div className="absolute right-2 top-2">
                        <TypeBadge type={creative.type} />
                      </div>

                      {/* Featured badge */}
                      {creative.isFeatured && (
                        <div className="absolute left-2 bottom-2">
                          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/80 text-white">
                            <Star className="h-3 w-3" />
                            Featured
                          </Badge>
                        </div>
                      )}

                      {/* Template badge */}
                      {creative.isTemplate && (
                        <div className="absolute right-2 bottom-2">
                          <Badge variant="secondary" className="flex items-center gap-1 bg-blue-500/80 text-white">
                            <Copy className="h-3 w-3" />
                            Template
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className={`p-3 ${gridSize === "small" ? "p-2" : "p-4"}`}>
                    <div className="mb-1 flex items-start justify-between">
                      <div className="mr-2">
                        <h3
                          className={`font-medium line-clamp-1 ${gridSize === "small" ? "text-sm" : "text-base"}`}
                          title={creative.name}
                        >
                          {creative.name}
                        </h3>
                        {gridSize !== "small" && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {creative.headline}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={creative.status} />
                    </div>

                    {gridSize === "large" && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {creative.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(creative.createdAt)}</span>
                      {creative.campaign && (
                        <Link
                          href={`/admin/campaigns/${creative.campaignId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {creative.campaign.name}
                        </Link>
                      )}
                    </div>

                    {gridSize === "large" && creative.tags && creative.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {creative.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {creative.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{creative.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && (
            <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="w-12 px-3 py-3.5">
                        <Checkbox
                          checked={
                            filteredCreatives.length > 0 && selectedCreatives.length === filteredCreatives.length
                          }
                          onCheckedChange={(checked) => handleSelectAllCreatives(checked === true)}
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Creative
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Campaign
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Size
                      </th>
                      <th scope="col" className="relative px-3 py-3.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCreatives.map((creative) => (
                      <tr
                        key={creative.id}
                        className={`${
                          selectedCreatives.includes(creative.id) ? "bg-primary/5" : ""
                        } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                      >
                        <td className="whitespace-nowrap px-3 py-4">
                          <Checkbox
                            checked={selectedCreatives.includes(creative.id)}
                            onCheckedChange={() => handleSelectCreative(creative.id, true)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                              {creative.previewImage ? (
                                <img
                                  src={creative.previewImage || "/placeholder.svg"}
                                  alt={creative.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  {creative.type === "IMAGE" && <ImageIcon className="h-5 w-5 text-gray-400" />}
                                  {creative.type === "VIDEO" && <FileVideo className="h-5 w-5 text-gray-400" />}
                                  {creative.type === "INTERACTIVE" && <Play className="h-5 w-5 text-gray-400" />}
                                  {creative.type === "AR_EXPERIENCE" && <Layers className="h-5 w-5 text-gray-400" />}
                                  {creative.type === "VOICE_INTERACTIVE" && <Mic className="h-5 w-5 text-gray-400" />}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {creative.name}
                                {creative.isFeatured && <Star className="ml-1 inline-block h-3 w-3 text-yellow-500" />}
                                {creative.isTemplate && <Copy className="ml-1 inline-block h-3 w-3 text-blue-500" />}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{creative.headline}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <TypeBadge type={creative.type} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <StatusBadge status={creative.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          {creative.campaign ? (
                            <Link
                              href={`/admin/campaigns/${creative.campaignId}`}
                              className="text-sm text-gray-900 hover:text-primary hover:underline dark:text-gray-200"
                            >
                              {creative.campaign.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No campaign</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(creative.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {creative.fileSize ? formatFileSize(creative.fileSize) : "N/A"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handlePreviewCreative(creative)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/ad-creatives/${creative.id}/edit`}>
                                <PenTool className="h-4 w-4" />
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/ad-creatives/${creative.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkAction("tag")}>Manage Tags</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkAction("collection")}>
                                  Add to Collection
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  {creative.isFeatured ? "Remove Featured" : "Mark as Featured"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCreative(creative.id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  Delete Creative
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          {/* Similar content as "all" but pre-filtered for featured creatives */}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {/* Similar content as "all" but pre-filtered for template creatives */}
        </TabsContent>

        <TabsContent value="collections" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apiCollections &&
              apiCollections.map((collection) => (
                <Card key={collection.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Folder className="mr-2 h-5 w-5 text-muted-foreground" />
                      {collection.name}
                    </CardTitle>
                    <CardDescription>{collection.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {collection.creativeCount} creatives
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Created {formatDate(collection.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/50 px-6 py-3">
                    <Button variant="ghost" className="w-full" onClick={() => setSelectedCollection(collection.id)}>
                      View Collection
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateCollectionOpen} onOpenChange={setIsCreateCollectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Collections help you organize your creative assets for easier management and reuse.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                placeholder="Enter collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="collection-description">Description (Optional)</Label>
              <Input
                id="collection-description"
                placeholder="Enter collection description"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCollectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Collection Dialog */}
      <Dialog open={isAddToCollectionOpen} onOpenChange={setIsAddToCollectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
            <DialogDescription>Select a collection to add the selected creatives to.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto py-4">
            {apiCollections && apiCollections.length > 0 ? (
              <div className="space-y-2">
                {apiCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div>
                      <div className="font-medium">{collection.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {collection.creativeCount} creatives
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddToCollection(collection.id)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">No collections found</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setIsAddToCollectionOpen(false)
                    setIsCreateCollectionOpen(true)
                  }}
                >
                  Create Collection
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToCollectionOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Management Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>Add or remove tags for the selected creatives.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNewTag()
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddNewTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </div>

            <div className="mt-2">
              <Label>Selected Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTags.length > 0 ? (
                  selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No tags selected</div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <Label>Common Tags</Label>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <div className="flex flex-wrap gap-2 p-1">
                  {apiTags &&
                    apiTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className={`cursor-pointer ${
                          selectedTags.includes(tag.name) ? "bg-primary text-primary-foreground" : ""
                        }`}
                        onClick={() => {
                          if (selectedTags.includes(tag.name)) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag.name))
                          } else {
                            setSelectedTags([...selectedTags, tag.name])
                          }
                        }}
                      >
                        {tag.name} ({tag.count})
                      </Badge>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTagManagement} disabled={selectedTags.length === 0}>
              Apply Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Creative</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this creative? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCreative}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creative Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          {previewCreative && (
            <>
              <DialogHeader>
                <DialogTitle>{previewCreative.name}</DialogTitle>
                <DialogDescription>{previewCreative.headline}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4 md:grid-cols-2">
                <div className="aspect-video w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                  {previewCreative.previewImage ? (
                    <img
                      src={previewCreative.previewImage || "/placeholder.svg"}
                      alt={previewCreative.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {previewCreative.type === "IMAGE" && <ImageIcon className="h-16 w-16 text-gray-400" />}
                      {previewCreative.type === "VIDEO" && <FileVideo className="h-16 w-16 text-gray-400" />}
                      {previewCreative.type === "INTERACTIVE" && <Play className="h-16 w-16 text-gray-400" />}
                      {previewCreative.type === "AR_EXPERIENCE" && <Layers className="h-16 w-16 text-gray-400" />}
                      {previewCreative.type === "VOICE_INTERACTIVE" && <Mic className="h-16 w-16 text-gray-400" />}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h3>
                    <TypeBadge type={previewCreative.type} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                    <StatusBadge status={previewCreative.status} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                    <p className="text-sm text-gray-900 dark:text-white">{previewCreative.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Call to Action</h3>
                    <p className="text-sm text-gray-900 dark:text-white">{previewCreative.callToAction}</p>
                  </div>

                  {previewCreative.campaign && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign</h3>
                      <p className="text-sm text-gray-900 dark:text-white">{previewCreative.campaign.name}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(previewCreative.createdAt)}</p>
                  </div>

                  {previewCreative.tags && previewCreative.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {previewCreative.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex justify-between sm:justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/ad-creatives/${previewCreative.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/ad-creatives/${previewCreative.id}/edit`}>
                      <PenTool className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </div>
                <Button variant="default" size="sm" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
