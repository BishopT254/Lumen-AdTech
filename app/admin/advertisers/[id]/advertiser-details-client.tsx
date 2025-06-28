"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronLeft,
  Clock,
  CreditCard,
  Download,
  Edit,
  Eye,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Trash,
  User,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define types based on the Prisma schema
interface Payment {
  id: string
  advertiserId: string
  amount: number
  paymentMethod: PaymentMethodType
  paymentMethodId?: string
  transactionId?: string
  status: PaymentStatus
  dateInitiated: string
  dateCompleted?: string
  receiptUrl?: string
  notes?: string
}

enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

enum PaymentMethodType {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
  AMEX = "AMEX",
  MPESA = "MPESA",
  FLUTTERWAVE = "FLUTTERWAVE",
  PAYPAL = "PAYPAL",
  BANK_TRANSFER = "BANK_TRANSFER",
  OTHER = "OTHER",
}

interface CampaignMetrics {
  impressions: number
  engagements: number
  clicks: number
  conversions: number
  ctr: number
  conversionRate: number
  averageDwellTime?: number
  audienceMetrics?: any
  emotionMetrics?: any
  costData: any
}

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

interface Campaign {
  id: string
  advertiserId: string
  name: string
  description?: string
  status: CampaignStatus
  objective: CampaignObjective
  pricingModel: PricingModel
  budget: number
  dailyBudget?: number
  startDate: string
  endDate?: string
  targetLocations?: any
  targetSchedule?: any
  targetDemographics?: any
  createdAt: string
  updatedAt: string
  metrics?: CampaignMetrics
  _count?: {
    impressions: number
    engagements: number
    adCreatives: number
    adDeliveries: number
  }
}

interface PaymentMethod {
  id: string
  advertiserId: string
  type: PaymentMethodType
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface Advertiser {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string
  city?: string
  country?: string
  status?: string
  email: string
  campaigns: Campaign[]
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  totalSpend: number
  createdAt: string
  updatedAt: string
}

interface AdvertiserSettings {
  notifyOnCampaignEnd: boolean
  notifyOnLowBudget: boolean
  autoRenewCampaigns: boolean
  lowBudgetThreshold: number
  emailNotifications: boolean
  smsNotifications: boolean
  weeklyReports: boolean
  monthlyReports: boolean
  budgetAlertPercentage: number
  defaultCampaignDuration: number
  defaultPricingModel: PricingModel
}

const defaultAdvertiserSettings: AdvertiserSettings = {
  notifyOnCampaignEnd: true,
  notifyOnLowBudget: true,
  autoRenewCampaigns: false,
  lowBudgetThreshold: 100,
  emailNotifications: true,
  smsNotifications: false,
  weeklyReports: true,
  monthlyReports: true,
  budgetAlertPercentage: 20,
  defaultCampaignDuration: 30,
  defaultPricingModel: PricingModel.CPM,
}

interface AdvertiserDetailsClientProps {
  advertiser: Advertiser
  advertiserId: string
}

// Calculate total metrics from all campaigns
const calculateTotalMetrics = (
  campaigns: Campaign[],
): {
  impressions: number
  engagements: number
  clicks: number
  conversions: number
  activeCampaigns: number
  pendingCampaigns: number
  completedCampaigns: number
} => {
  const metrics = {
    impressions: 0,
    engagements: 0,
    clicks: 0,
    conversions: 0,
    activeCampaigns: 0,
    pendingCampaigns: 0,
    completedCampaigns: 0,
  }

  campaigns.forEach((campaign) => {
    // Count campaign statuses
    if (campaign.status === CampaignStatus.ACTIVE) {
      metrics.activeCampaigns++
    } else if (campaign.status === CampaignStatus.PENDING_APPROVAL) {
      metrics.pendingCampaigns++
    } else if (campaign.status === CampaignStatus.COMPLETED) {
      metrics.completedCampaigns++
    }

    // Add up metrics
    metrics.impressions += campaign._count?.impressions || campaign.metrics?.impressions || 0
    metrics.engagements += campaign._count?.engagements || campaign.metrics?.engagements || 0
    metrics.clicks += campaign.metrics?.clicks || 0
    metrics.conversions += campaign.metrics?.conversions || 0
  })

  return metrics
}

export default function AdvertiserDetailsClient({ advertiser, advertiserId }: AdvertiserDetailsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [advertiserSettings, setAdvertiserSettings] = useState<AdvertiserSettings>(defaultAdvertiserSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [campaignFilter, setCampaignFilter] = useState("")
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editingNote, setEditingNote] = useState("")
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  // Load advertiser settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/admin/advertisers/${advertiserId}/settings`)
        if (response.ok) {
          const data = await response.json()
          setAdvertiserSettings({
            ...defaultAdvertiserSettings,
            ...data.settings,
          })
        }
      } catch (error) {
        console.error("Error loading advertiser settings:", error)
      }
    }

    loadSettings()
  }, [advertiserId])

  const totalMetrics = useMemo(() => calculateTotalMetrics(advertiser.campaigns), [advertiser.campaigns])

  // Filter campaigns based on search and status
  const filteredCampaigns = useMemo(() => {
    return advertiser.campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(campaignFilter.toLowerCase()) ||
        (campaign.description || "").toLowerCase().includes(campaignFilter.toLowerCase())

      const matchesStatus =
        campaignStatusFilter === "all" || campaign.status.toLowerCase() === campaignStatusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [advertiser.campaigns, campaignFilter, campaignStatusFilter])

  // Handle advertiser deletion
  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/advertisers/${advertiserId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete advertiser")
      }

      toast({
        title: "Success",
        description: "Advertiser has been deleted successfully",
      })

      router.push("/admin/advertisers")
    } catch (error) {
      console.error("Error deleting advertiser:", error)
      toast({
        title: "Error",
        description: "Failed to delete advertiser. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteConfirmOpen(false)
    }
  }

  // Handle settings update
  const handleSettingsUpdate = async (newSettings: Partial<AdvertiserSettings>) => {
    try {
      const updatedSettings = {
        ...advertiserSettings,
        ...newSettings,
      }

      const response = await fetch(`/api/admin/advertisers/${advertiserId}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: updatedSettings,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }

      const data = await response.json()
      setAdvertiserSettings(data.settings || defaultAdvertiserSettings)
      toast({
        title: "Success",
        description: "Settings updated successfully",
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle payment note update
  const handleUpdatePaymentNote = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: editingNote,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update payment note")
      }

      toast({
        title: "Success",
        description: "Payment note updated successfully",
      })

      // Update the payment in the local state
      const updatedPayments = advertiser.payments.map((payment) =>
        payment.id === paymentId ? { ...payment, notes: editingNote } : payment,
      )

      advertiser.payments = updatedPayments
      setEditingPaymentId(null)
      setEditingNote("")
    } catch (error) {
      console.error("Error updating payment note:", error)
      toast({
        title: "Error",
        description: "Failed to update payment note. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Refresh advertiser data
  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      router.refresh()
      toast({
        title: "Refreshed",
        description: "Advertiser data has been refreshed",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "pending":
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "rejected":
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case PaymentMethodType.VISA:
      case PaymentMethodType.MASTERCARD:
      case PaymentMethodType.AMEX:
        return <CreditCard className="h-4 w-4" />
      case PaymentMethodType.MPESA:
      case PaymentMethodType.FLUTTERWAVE:
        return <Phone className="h-4 w-4" />
      case PaymentMethodType.PAYPAL:
        return <Globe className="h-4 w-4" />
      case PaymentMethodType.BANK_TRANSFER:
        return <Building2 className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/admin/advertisers")} className="hover:bg-transparent">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Advertisers
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={refreshData} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/advertisers/${advertiserId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg" alt={advertiser.companyName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400 text-xl">
                {advertiser.companyName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight">{advertiser.companyName}</h1>
                <Badge
                  variant="outline"
                  className={
                    advertiser.status?.toLowerCase() === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : advertiser.status?.toLowerCase() === "inactive"
                        ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }
                >
                  {advertiser.status
                    ? advertiser.status.charAt(0).toUpperCase() + advertiser.status.slice(1).toLowerCase()
                    : "Active"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {advertiser.email}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {advertiser.phoneNumber}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {advertiser.contactPerson}
                </div>
                {advertiser.address && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {advertiser.address}, {advertiser.city || ""} {advertiser.country || ""}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Member since {formatDate(advertiser.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Lifetime Spend</div>
            <div className="text-3xl font-bold">{formatCurrency(advertiser.totalSpend)}</div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.activeCampaigns}</div>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                {totalMetrics.pendingCampaigns} Pending
              </Badge>
              <Badge variant="outline">{totalMetrics.completedCampaigns} Completed</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.engagements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">User interactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.conversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total campaign conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Latest campaign activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {advertiser.campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10">
                          {campaign.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{campaign.name}</p>
                        <div className="flex items-center">
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            {formatStatus(campaign.status)}
                          </Badge>
                          <span className="ml-2 text-xs text-muted-foreground">{formatDate(campaign.startDate)}</span>
                        </div>
                      </div>
                      <div className="ml-auto font-medium">{formatCurrency(campaign.budget)}</div>
                    </div>
                  ))}
                </div>
                {advertiser.campaigns.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.querySelector('[data-value="campaigns"]')?.click()}
                    >
                      View All Campaigns
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {advertiser.payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{payment.paymentMethod} Payment</p>
                        <div className="flex items-center">
                          <Badge variant="outline" className={getStatusColor(payment.status)}>
                            {formatStatus(payment.status)}
                          </Badge>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatDate(payment.dateInitiated)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto font-medium">{formatCurrency(payment.amount)}</div>
                    </div>
                  ))}
                </div>
                {advertiser.payments.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.querySelector('[data-value="billing"]')?.click()}
                    >
                      View All Payments
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Advertiser Details</CardTitle>
              <CardDescription>Complete information about this advertiser</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company Name</span>
                      <span>{advertiser.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact Person</span>
                      <span>{advertiser.contactPerson}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{advertiser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{advertiser.phoneNumber}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Address</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Street Address</span>
                      <span>{advertiser.address || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City</span>
                      <span>{advertiser.city || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span>{advertiser.country || "Not provided"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Account Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID</span>
                      <span className="font-mono">{advertiser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono">{advertiser.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate(advertiser.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{formatDate(advertiser.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Campaign Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Campaigns</span>
                      <span>{advertiser.campaigns.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Campaigns</span>
                      <span>{totalMetrics.activeCampaigns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Spend</span>
                      <span>{formatCurrency(advertiser.totalSpend)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Methods</span>
                      <span>{advertiser.paymentMethods?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" onClick={() => router.push(`/admin/advertisers/${advertiserId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-1 items-center space-x-2">
              <Input
                placeholder="Search campaigns..."
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="w-full md:w-[250px]"
              />
              <Select value={campaignStatusFilter} onValueChange={setCampaignStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => router.push(`/admin/advertisers/${advertiserId}/campaigns/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">{campaign.objective}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(campaign.status)}>
                          {formatStatus(campaign.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(campaign.budget)}</TableCell>
                      <TableCell>{formatDate(campaign.startDate)}</TableCell>
                      <TableCell>{campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}</TableCell>
                      <TableCell>
                        {(campaign._count?.impressions || campaign.metrics?.impressions || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/campaigns/${campaign.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Campaign
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {campaign.status === CampaignStatus.ACTIVE && (
                              <DropdownMenuItem
                                onClick={() => {
                                  // Implement campaign pause functionality
                                  toast({
                                    title: "Campaign Paused",
                                    description: "The campaign has been paused successfully",
                                  })
                                }}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Pause Campaign
                              </DropdownMenuItem>
                            )}
                            {campaign.status === CampaignStatus.PAUSED && (
                              <DropdownMenuItem
                                onClick={() => {
                                  // Implement campaign resume functionality
                                  toast({
                                    title: "Campaign Resumed",
                                    description: "The campaign has been resumed successfully",
                                  })
                                }}
                              >
                                <Activity className="mr-2 h-4 w-4" />
                                Resume Campaign
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                // Implement campaign deletion functionality
                                toast({
                                  title: "Campaign Deleted",
                                  description: "The campaign has been deleted successfully",
                                })
                              }}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {campaignFilter || campaignStatusFilter !== "all" ? (
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-muted-foreground">No campaigns match your filters</p>
                          <Button
                            variant="link"
                            onClick={() => {
                              setCampaignFilter("")
                              setCampaignStatusFilter("all")
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-muted-foreground">No campaigns found</p>
                          <Button
                            variant="link"
                            onClick={() => router.push(`/admin/advertisers/${advertiserId}/campaigns/new`)}
                          >
                            Create your first campaign
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advertiser.paymentMethods?.length > 0 ? (
                    advertiser.paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800">
                            {getPaymentMethodIcon(method.type)}
                          </div>
                          <div>
                            <p className="font-medium">
                              {method.type} ending in {method.last4}
                            </p>
                            <p className="text-sm text-gray-500">
                              Expires {method.expMonth}/{method.expYear}
                            </p>
                          </div>
                        </div>
                        <Badge variant={method.isDefault ? "default" : "outline"}>
                          {method.isDefault ? "Default" : "Set as Default"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No payment methods added yet</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Billing Summary</CardTitle>
                <CardDescription>Overview of billing activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Spend</span>
                    <span className="font-medium">{formatCurrency(advertiser.totalSpend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Campaign Budget</span>
                    <span className="font-medium">
                      {formatCurrency(
                        advertiser.campaigns
                          .filter((c) => c.status === CampaignStatus.ACTIVE)
                          .reduce((sum, c) => sum + c.budget, 0),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recent Payments</span>
                    <span className="font-medium">
                      {formatCurrency(
                        advertiser.payments
                          .filter((p) => p.status === PaymentStatus.COMPLETED)
                          .slice(0, 5)
                          .reduce((sum, p) => sum + p.amount, 0),
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Payment Methods</span>
                    <span>{advertiser.paymentMethods?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Default Method</span>
                    <span>{advertiser.paymentMethods?.find((m) => m.isDefault)?.type || "None"}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Billing History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertiser.payments.length > 0 ? (
                    advertiser.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateTime(payment.dateInitiated)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(payment.status)}>
                            {formatStatus(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{payment.transactionId || "N/A"}</span>
                        </TableCell>
                        <TableCell>
                          {editingPaymentId === payment.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editingNote}
                                onChange={(e) => setEditingNote(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleUpdatePaymentNote(payment.id)}>
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:underline"
                              onClick={() => {
                                setEditingPaymentId(payment.id)
                                setEditingNote(payment.notes || "")
                              }}
                            >
                              {payment.notes || "Add note"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {payment.receiptUrl && (
                                <DropdownMenuItem asChild>
                                  <Link href={payment.receiptUrl} target="_blank">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Receipt
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingPaymentId(payment.id)
                                  setEditingNote(payment.notes || "")
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Notes
                              </DropdownMenuItem>
                              {payment.status === PaymentStatus.PENDING && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Implement mark as completed functionality
                                      toast({
                                        title: "Payment Completed",
                                        description: "The payment has been marked as completed",
                                      })
                                    }}
                                  >
                                    <Activity className="mr-2 h-4 w-4" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Implement mark as failed functionality
                                      toast({
                                        title: "Payment Failed",
                                        description: "The payment has been marked as failed",
                                      })
                                    }}
                                  >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Mark as Failed
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <p className="text-muted-foreground">No payment history found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how this advertiser receives notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="campaign-end">Campaign End Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications when campaigns end</p>
                </div>
                <Switch
                  id="campaign-end"
                  checked={advertiserSettings.notifyOnCampaignEnd}
                  onCheckedChange={(checked) => handleSettingsUpdate({ notifyOnCampaignEnd: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="low-budget">Low Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when campaign budget is low</p>
                </div>
                <Switch
                  id="low-budget"
                  checked={advertiserSettings.notifyOnLowBudget}
                  onCheckedChange={(checked) => handleSettingsUpdate({ notifyOnLowBudget: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-renew">Auto-renew Campaigns</Label>
                  <p className="text-sm text-muted-foreground">Automatically renew campaigns when they end</p>
                </div>
                <Switch
                  id="auto-renew"
                  checked={advertiserSettings.autoRenewCampaigns}
                  onCheckedChange={(checked) => handleSettingsUpdate({ autoRenewCampaigns: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={advertiserSettings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingsUpdate({ emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={advertiserSettings.smsNotifications}
                  onCheckedChange={(checked) => handleSettingsUpdate({ smsNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>Default settings for new campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="budget-threshold">Low Budget Threshold ($)</Label>
                  <Input
                    id="budget-threshold"
                    type="number"
                    value={advertiserSettings.lowBudgetThreshold}
                    onChange={(e) =>
                      handleSettingsUpdate({
                        lowBudgetThreshold: Number(e.target.value) || 100,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">Trigger alerts when budget falls below this amount</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget-alert">Budget Alert Percentage (%)</Label>
                  <Input
                    id="budget-alert"
                    type="number"
                    value={advertiserSettings.budgetAlertPercentage}
                    onChange={(e) =>
                      handleSettingsUpdate({
                        budgetAlertPercentage: Number(e.target.value) || 20,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">Alert when this percentage of budget remains</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-duration">Default Duration (Days)</Label>
                  <Input
                    id="default-duration"
                    type="number"
                    value={advertiserSettings.defaultCampaignDuration}
                    onChange={(e) =>
                      handleSettingsUpdate({
                        defaultCampaignDuration: Number(e.target.value) || 30,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">Default campaign duration for new campaigns</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-pricing">Default Pricing Model</Label>
                  <Select
                    value={advertiserSettings.defaultPricingModel}
                    onValueChange={(value) =>
                      handleSettingsUpdate({
                        defaultPricingModel: value as PricingModel,
                      })
                    }
                  >
                    <SelectTrigger id="default-pricing">
                      <SelectValue placeholder="Select pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PricingModel.CPM}>Cost Per Thousand Impressions (CPM)</SelectItem>
                      <SelectItem value={PricingModel.CPE}>Cost Per Engagement (CPE)</SelectItem>
                      <SelectItem value={PricingModel.CPA}>Cost Per Action (CPA)</SelectItem>
                      <SelectItem value={PricingModel.HYBRID}>Hybrid Model</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Default pricing model for new campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure reporting preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly performance reports</p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={advertiserSettings.weeklyReports}
                  onCheckedChange={(checked) => handleSettingsUpdate({ weeklyReports: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="monthly-reports">Monthly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive monthly performance reports</p>
                </div>
                <Switch
                  id="monthly-reports"
                  checked={advertiserSettings.monthlyReports}
                  onCheckedChange={(checked) => handleSettingsUpdate({ monthlyReports: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold">Delete Advertiser</h2>
            <p className="text-muted-foreground">
              Are you sure you want to delete this advertiser? This action cannot be undone.
            </p>
            <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Deleting this advertiser will remove all associated campaigns, creatives, and billing information.
                </p>
              </div>
            </div>
            {isDeleteConfirmOpen ? (
              <div className="space-y-2">
                <p className="font-medium text-red-600">Type "DELETE" to confirm:</p>
                <Input
                  id="delete-confirm"
                  className="border-red-300"
                  onChange={(e) => {
                    if (e.target.value === "DELETE") {
                      handleDelete()
                    }
                  }}
                />
              </div>
            ) : null}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setIsDeleteConfirmOpen(false)
                }}
              >
                Cancel
              </Button>
              {isDeleteConfirmOpen ? (
                <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
                  Delete Advertiser
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
