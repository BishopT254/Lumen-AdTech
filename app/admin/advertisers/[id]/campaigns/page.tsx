"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Decimal } from "@prisma/client/runtime/library"
import {
  ChevronLeft,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

// Campaign status badge variants
const statusVariants = {
  ACTIVE: "success",
  PAUSED: "warning",
  PENDING: "default",
  REJECTED: "destructive",
  COMPLETED: "secondary",
} as const

export default function AdvertiserCampaignsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")

  // Add formatCurrency function
  const formatCurrency = (amount: number | string | Decimal) => {
    // Convert to number if it's a Decimal or string
    const numericAmount = typeof amount === 'object' ? Number(amount.toString()) : Number(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount)
  }

  // Fetch advertiser details and campaigns
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["advertiser-campaigns", params.id],
    queryFn: async () => {
      // First fetch advertiser details
      const advertiserResponse = await fetch(`/api/admin/advertisers/${params.id}`)
      if (!advertiserResponse.ok) {
        throw new Error("Failed to fetch advertiser details")
      }
      const advertiserData = await advertiserResponse.json()

      // Then fetch campaigns for this advertiser
      const campaignsResponse = await fetch(`/api/admin/campaigns?advertiserId=${params.id}`)
      if (!campaignsResponse.ok) {
        throw new Error("Failed to fetch campaigns")
      }
      const campaignsData = await campaignsResponse.json()

      return {
        advertiser: advertiserData,
        campaigns: campaignsData.campaigns || []
      }
    },
  })

  // Handle campaign status update
  const handleStatusUpdate = async (campaignId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update campaign status")
      }

      toast({
        title: "Success",
        description: "Campaign status has been updated successfully",
      })

      refetch()
    } catch (error) {
      console.error("Error updating campaign status:", error)
      toast({
        title: "Error",
        description: "Failed to update campaign status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Filter campaigns based on search query
  const filteredCampaigns = data?.campaigns?.filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="rounded-md border">
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-400">Error</h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-500">Failed to load campaigns.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Add null check for data
  if (!data || !data.advertiser) {
    return null
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Advertiser
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{data.advertiser.companyName} - Campaigns</h1>
        <p className="text-muted-foreground">Manage campaigns for this advertiser</p>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => router.push(`/admin/advertisers/${params.id}/campaigns/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </div>

            {/* Campaigns Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns?.map((campaign: any) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{campaign.objective}</TableCell>
                        <TableCell>{formatCurrency(campaign.budget)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[campaign.status as keyof typeof statusVariants]}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(campaign.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="right">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/admin/advertisers/${params.id}/campaigns/${campaign.id}`)
                                }
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/admin/advertisers/${params.id}/campaigns/${campaign.id}/edit`)
                                }
                              >
                                Edit Campaign
                              </DropdownMenuItem>
                              {campaign.status === "PAUSED" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}
                                >
                                  Activate Campaign
                                </DropdownMenuItem>
                              )}
                              {campaign.status === "ACTIVE" && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(campaign.id, "PAUSED")}
                                >
                                  Pause Campaign
                                </DropdownMenuItem>
                              )}
                              {campaign.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}
                                  >
                                    Approve Campaign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStatusUpdate(campaign.id, "REJECTED")}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    Reject Campaign
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 