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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"

// Types based on Prisma schema
interface Partner {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string
  city?: string
  country?: string
  commissionRate: number
  paymentDetails?: any
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name?: string
    email: string
    emailVerified?: string
    image?: string
  }
  devices: {
    id: string
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'MAINTENANCE'
  }[]
  _count?: {
    devices: number
    earnings: number
  }
  totalEarnings?: number
  status: 'active' | 'inactive' | 'pending'
}

interface PartnerMetrics {
  totalPartners: number
  activePartners: number
  totalDevices: number
  totalEarnings: number
  averageCommissionRate: number
  topEarners: {
    id: string
    companyName: string
    totalEarnings: number
  }[]
  recentlyJoined: {
    id: string
    companyName: string
    createdAt: string
  }[]
  devicesByPartner: {
    partnerId: string
    partnerName: string
    deviceCount: number
  }[]
}

export default function PartnersPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("companyName")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedPartners, setSelectedPartners] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Fetch partners
  const {
    data: partnersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["partners", statusFilter, sortField, sortOrder, page, pageSize, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortField)
      params.append("sortOrder", sortOrder)
      params.append("page", page.toString())
      params.append("pageSize", pageSize.toString())

      const response = await fetch(`/api/admin/partners?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch partners")
      }
      const data = await response.json()
      
      // Transform the data to include device status
      return {
        ...data,
        partners: data.partners.map((partner: any) => ({
          ...partner,
          devices: partner.devices || [],
          status: partner.devices?.some((d: any) => d.status === 'ACTIVE')
            ? 'active'
            : partner.devices?.some((d: any) => d.status === 'INACTIVE')
              ? 'inactive'
              : 'pending'
        }))
      }
    },
  })

  // Fetch partner metrics
  const { data: metricsData } = useQuery({
    queryKey: ["partnerMetrics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/partners/metrics")
      if (!response.ok) {
        throw new Error("Failed to fetch partner metrics")
      }
      return response.json()
    },
  })

  const partners: Partner[] = partnersData?.partners || []
  const pagination = partnersData?.pagination || { total: 0, pages: 1 }
  const metrics: PartnerMetrics = metricsData || {
    totalPartners: 0,
    activePartners: 0,
    totalDevices: 0,
    totalEarnings: 0,
    averageCommissionRate: 0,
    topEarners: [],
    recentlyJoined: [],
    devicesByPartner: [],
  }

  // Handle partner selection
  const handleSelectPartner = (partnerId: string) => {
    setSelectedPartners((prev) =>
      prev.includes(partnerId) ? prev.filter((id) => id !== partnerId) : [...prev, partnerId],
    )
  }

  // Handle select all partners
  const handleSelectAllPartners = (checked: boolean) => {
    if (checked) {
      setSelectedPartners(partners.map((partner) => partner.id))
    } else {
      setSelectedPartners([])
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

  // Handle partner deletion
  const handleDeletePartner = async () => {
    if (!selectedPartnerId) return

    try {
      const response = await fetch(`/api/admin/partners/${selectedPartnerId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete partner")
      }

      toast({
        title: "Partner deleted",
        description: "The partner has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setSelectedPartnerId(null)
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete partner",
        variant: "destructive",
      })
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedPartners.length === 0) return

    try {
      const response = await fetch("/api/admin/partners/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedPartners,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} partners`)
      }

      toast({
        title: "Success",
        description: `${selectedPartners.length} partners have been ${action}d`,
      })

      setSelectedPartners([])
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} partners`,
        variant: "destructive",
      })
    }
  }

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string) => {
    if (!name) return "PA"
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

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load partners</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Partners</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage partners and their devices</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" className="inline-flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export List
          </Button>
          <Button className="inline-flex items-center" asChild>
            <Link href="/admin/partners/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Partner
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPartners}</div>
            <p className="text-xs text-muted-foreground">{metrics.activePartners} active partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDevices}</div>
            <p className="text-xs text-muted-foreground">Across all partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">Partner commissions paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics.averageCommissionRate)}</div>
            <p className="text-xs text-muted-foreground">Average commission rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="all" onClick={() => setStatusFilter("all")}>
            All Partners
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
                  placeholder="Search partners..."
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
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Partners</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active Partners</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive Partners</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending Verification</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedPartners.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedPartners.length} selected</span>
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

          {/* Partners table */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={partners.length > 0 && selectedPartners.length === partners.length}
                      onCheckedChange={handleSelectAllPartners}
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
                  <TableHead>Devices</TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("commissionRate")}>
                      Commission Rate
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort("totalEarnings")}>
                      Total Earnings
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No partners found.
                    </TableCell>
                  </TableRow>
                ) : (
                  partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPartners.includes(partner.id)}
                          onCheckedChange={() => handleSelectPartner(partner.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src="" alt={partner.companyName} />
                            <AvatarFallback className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                              {partner.companyName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <Link
                              href={`/admin/partners/${partner.id}`}
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {partner.companyName}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {partner.city}, {partner.country || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{partner.contactPerson}</span>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="mr-1 h-3 w-3" />
                            {partner.user.email}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Phone className="mr-1 h-3 w-3" />
                            {partner.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            partner.devices.some(d => d.status === 'ACTIVE')
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : partner.devices.some(d => d.status === 'INACTIVE')
                                ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          {partner.devices.some(d => d.status === 'ACTIVE') ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : partner.devices.some(d => d.status === 'INACTIVE') ? (
                            <XCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <Shield className="mr-1 h-3 w-3" />
                          )}
                          {partner.devices.some(d => d.status === 'ACTIVE')
                            ? 'Active'
                            : partner.devices.some(d => d.status === 'INACTIVE')
                              ? 'Inactive'
                              : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/devices?partnerId=${partner.id}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {partner._count?.devices || 0} devices
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatPercentage(partner.commissionRate)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(partner.totalEarnings || 0)}</span>
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
                              <Link href={`/admin/partners/${partner.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/partners/${partner.id}/edit`}>Edit Partner</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/devices?partnerId=${partner.id}`}>View Devices</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/partners/${partner.id}/earnings`}>Earnings History</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {partner.devices.some(d => d.status !== 'ACTIVE') ? (
                              <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                                Activate Partner
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                                Deactivate Partner
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setSelectedPartnerId(partner.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              Delete Partner
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
              Showing <strong>{partners.length}</strong> of <strong>{pagination.total}</strong> partners
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
          {/* Similar content as "all" but pre-filtered for active partners */}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {/* Similar content as "all" but pre-filtered for inactive partners */}
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          {/* Similar content as "all" but pre-filtered for pending partners */}
        </TabsContent>
      </Tabs>

      {/* Device distribution and top earners */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>Number of devices by partner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.devicesByPartner?.map((item) => (
                <div key={item.partnerId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link href={`/admin/partners/${item.partnerId}`} className="font-medium hover:underline">
                      {item.partnerName}
                    </Link>
                    <span className="text-sm">{item.deviceCount} devices</span>
                  </div>
                  <Progress value={(item.deviceCount / metrics.totalDevices) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Earning Partners</CardTitle>
            <CardDescription>Partners with the highest earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topEarners?.map((earner, index) => (
                <div key={earner.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{earner.companyName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(earner.totalEarnings)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{formatPercentage(earner.totalEarnings / metrics.totalEarnings)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this partner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePartner}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

