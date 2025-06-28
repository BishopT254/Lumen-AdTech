"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Shield,
  UserPlus,
  CheckCircle,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types based on Prisma schema
interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  objective: CampaignObjective
  budget: number
  dailyBudget?: number
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

enum CampaignStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

enum CampaignObjective {
  AWARENESS = "AWARENESS",
  CONSIDERATION = "CONSIDERATION",
  CONVERSION = "CONVERSION",
  TRAFFIC = "TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT"
}

enum PricingModel {
  CPM = "CPM",
  CPE = "CPE",
  CPA = "CPA",
  HYBRID = "HYBRID"
}

interface Payment {
  id: string
  amount: number
  status: PaymentStatus
  dateInitiated: string
  dateCompleted?: string
  paymentMethodId?: string
}

enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
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
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name?: string
    email: string
    emailVerified?: string
    image?: string
  }
  campaigns: Campaign[]
  payments: Payment[]
  _count?: {
    campaigns: number
    payments: number
    billings: number
  }
  status?: "ACTIVE" | "INACTIVE" | "PENDING" // Derived field
  totalSpend?: number // Derived field
}

interface AdvertiserMetrics {
  totalAdvertisers: number
  activeAdvertisers: number
  totalSpend: number
  averageCampaignsPerAdvertiser: number
  topSpenders: {
    id: string
    companyName: string
    totalSpend: number
  }[]
  recentlyJoined: {
    id: string
    companyName: string
    createdAt: string
  }[]
}

export default function AdvertisersPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("companyName")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Fetch advertisers
  const {
    data: advertisersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["advertisers", statusFilter, sortField, sortOrder, page, pageSize, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortField)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("pageSize", pageSize.toString())

      const response = await fetch(`/api/admin/advertisers?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch advertisers")
      }
      return response.json()
    },
  })

  // Fetch advertiser metrics
  const { data: metricsData } = useQuery({
    queryKey: ["advertiserMetrics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/advertisers/metrics")
      if (!response.ok) {
        throw new Error("Failed to fetch advertiser metrics")
      }
      return response.json()
    },
  })

  const advertisers: Advertiser[] = advertisersData?.advertisers || []
  const pagination = advertisersData?.pagination || { total: 0, pages: 1 }
  const metrics: AdvertiserMetrics = metricsData || {
    totalAdvertisers: 0,
    activeAdvertisers: 0,
    totalSpend: 0,
    averageCampaignsPerAdvertiser: 0,
    topSpenders: [],
    recentlyJoined: [],
  }

  // Handle advertiser selection
  const handleSelectAdvertiser = (advertiserId: string) => {
    setSelectedAdvertisers((prev) =>
      prev.includes(advertiserId) ? prev.filter((id) => id !== advertiserId) : [...prev, advertiserId],
    )
  }

  // Handle select all advertisers
  const handleSelectAllAdvertisers = (checked: boolean) => {
    if (checked) {
      setSelectedAdvertisers(advertisers.map((advertiser) => advertiser.id))
    } else {
      setSelectedAdvertisers([])
    }
  }

  // Handle sort change
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Handle advertiser deletion
  const handleDeleteAdvertiser = async () => {
    if (!selectedAdvertiserId) return

    try {
      const response = await fetch(`/api/admin/advertisers/${selectedAdvertiserId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete advertiser")
      }

      toast({
        title: "Advertiser deleted",
        description: "The advertiser has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setSelectedAdvertiserId(null)
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete advertiser",
        variant: "destructive",
      })
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedAdvertisers.length === 0) return

    try {
      const response = await fetch("/api/admin/advertisers/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedAdvertisers,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} advertisers`)
      }

      toast({
        title: "Success",
        description: `${selectedAdvertisers.length} advertisers have been ${action}d`,
      })

      setSelectedAdvertisers([])
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} advertisers`,
        variant: "destructive",
      })
    }
  }

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string) => {
    if (!name) return "AD"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-blue-500 border-gray-200"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load advertisers</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Advertisers</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage advertisers and their campaigns</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" className="inline-flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export List
          </Button>
          <Button className="inline-flex items-center" asChild>
            <Link href="/admin/advertisers/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Advertiser
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAdvertisers}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeAdvertisers} active advertisers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalSpend)}</div>
            <p className="text-xs text-muted-foreground">From all advertisers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageCampaignsPerAdvertiser.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Campaigns per advertiser</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentlyJoined?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Joined in the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="all" onClick={() => setStatusFilter("all")}>
            All Advertisers
          </TabsTrigger>
          <TabsTrigger value="active" onClick={() => setStatusFilter("active")}>
            Active
          </TabsTrigger>
          <TabsTrigger value="inactive" onClick={() => setStatusFilter("inactive")}>
            Inactive
          </TabsTrigger>
          <TabsTrigger value="pending" onClick={() => setStatusFilter("pending")}>
            Pending
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
                  placeholder="Search advertisers..."
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
                <DropdownMenuContent align="right" className="w-56">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Advertisers</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active Advertisers</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive Advertisers</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending Verification</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedAdvertisers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedAdvertisers.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="right">
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>Activate Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                      Deactivate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("verify")}>Verify Selected</DropdownMenuItem>
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

          {/* Advertisers table */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={advertisers.length > 0 && selectedAdvertisers.length === advertisers.length}
                      onCheckedChange={handleSelectAllAdvertisers}
                    />
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("companyName")}>
                      Company
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("status")}>
                      Status
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("totalSpend")}>
                      Total Spend
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("createdAt")}>
                      Joined
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No advertisers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  advertisers.map((advertiser) => (
                    <TableRow key={advertiser.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAdvertisers.includes(advertiser.id)}
                          onCheckedChange={() => handleSelectAdvertiser(advertiser.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src="" alt={advertiser.companyName} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              {advertiser.companyName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <Link
                              href={`/admin/advertisers/${advertiser.id}`}
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {advertiser.companyName}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {advertiser.city}, {advertiser.country || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{advertiser.contactPerson}</span>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="mr-1 h-3 w-3" />
                            {advertiser.user.email}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Phone className="mr-1 h-3 w-3" />
                            {advertiser.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            advertiser.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : advertiser.status === "INACTIVE"
                                ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {advertiser.status === "ACTIVE" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : advertiser.status === "INACTIVE" ? (
                            <XCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <Shield className="mr-1 h-3 w-3" />
                          )}
                          {advertiser.status && advertiser.status.charAt(0).toUpperCase() + advertiser.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/campaigns?advertiserId=${advertiser.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {advertiser._count?.campaigns || 0} campaigns
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(advertiser.totalSpend || 0)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{new Date(advertiser.createdAt).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="right">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/advertisers/${advertiser.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/advertisers/${advertiser.id}/edit`}>Edit Advertiser</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/advertisers/${advertiser.id}/campaigns`}>View Campaigns</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/advertisers/${advertiser.id}/billing`}>Billing History</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {advertiser.status !== "ACTIVE" ? (
                              <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                                Activate Advertiser
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                                Deactivate Advertiser
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setSelectedAdvertiserId(advertiser.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              Delete Advertiser
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

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <strong>{advertisers.length}</strong> of <strong>{pagination.total}</strong> advertisers
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Other tab contents would be similar but pre-filtered */}
        <TabsContent value="active" className="mt-6">
          {/* Similar content as "all" but pre-filtered for active advertisers */}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {/* Similar content as "all" but pre-filtered for inactive advertisers */}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {/* Similar content as "all" but pre-filtered for pending advertisers */}
        </TabsContent>
      </Tabs>

      {/* Top spenders and recent advertisers */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Spenders</CardTitle>
            <CardDescription>Advertisers with the highest total spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topSpenders?.map((spender, index) => (
                <div key={spender.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{index + 1}</span>
                    </div>
                    <div>
                      <Link href={`/admin/advertisers/${spender.id}`} className="font-medium hover:underline">
                        {spender.companyName}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(spender.totalSpend)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Joined</CardTitle>
            <CardDescription>New advertisers who recently joined the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentlyJoined?.map((advertiser) => (
                <div key={advertiser.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {advertiser.companyName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/admin/advertisers/${advertiser.id}`} className="font-medium hover:underline">
                        {advertiser.companyName}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {new Date(advertiser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/advertisers/${advertiser.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/advertisers/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Advertiser
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Advertiser</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this advertiser? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting this advertiser will remove all associated campaigns, creatives, and billing information.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdvertiser}>
              Delete Advertiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

