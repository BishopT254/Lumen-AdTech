"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  ChevronDown,
  Clock,
  Download,
  Filter,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  TrendingUp,
  CheckCircle,
  XCircle,
  Pause,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

// Types based on Prisma schema
type ABTestStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED"

interface ABTest {
  id: string
  campaignId: string
  name: string
  description?: string
  status: ABTestStatus
  startDate: string
  endDate?: string
  winningVariantId?: string
  createdAt: string
  updatedAt: string
  campaign: {
    name: string
    advertiser: {
      companyName: string
    }
  }
  variants: ABTestVariant[]
  _count?: {
    variants: number
  }
}

interface ABTestVariant {
  id: string
  abTestId: string
  adCreativeId: string
  name: string
  trafficAllocation: number
  impressions: number
  engagements: number
  conversions: number
  createdAt: string
  updatedAt: string
  adCreative: {
    name: string
    type: string
    previewImage?: string
  }
}

interface ABTestMetrics {
  totalTests: number
  activeTests: number
  completedTests: number
  totalImpressions: number
  totalEngagements: number
  averageConversionRate: number
  testsByStatus: Record<string, number>
}

export default function ABTestsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  // Fetch AB tests
  const {
    data: abTestsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["abTests", statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/admin/ab-tests?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch AB tests")
      }
      return response.json()
    },
  })

  // Fetch AB test metrics
  const { data: metricsData } = useQuery({
    queryKey: ["abTestMetrics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ab-tests/metrics")
      if (!response.ok) {
        throw new Error("Failed to fetch AB test metrics")
      }
      return response.json()
    },
  })

  const abTests: ABTest[] = abTestsData?.abTests || []
  const metrics: ABTestMetrics = metricsData || {
    totalTests: 0,
    activeTests: 0,
    completedTests: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    averageConversionRate: 0,
    testsByStatus: {},
  }

  // Filter tests based on search term and status
  const filteredTests = abTests.filter((test) => {
    const matchesSearch =
      searchTerm === "" ||
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.campaign.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || test.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Handle test selection
  const handleSelectTest = (testId: string) => {
    setSelectedTests((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  // Handle select all tests
  const handleSelectAllTests = (checked: boolean) => {
    if (checked) {
      setSelectedTests(filteredTests.map((test) => test.id))
    } else {
      setSelectedTests([])
    }
  }

  // Handle test status change
  const handleStatusChange = async (testId: string, newStatus: ABTestStatus) => {
    try {
      const response = await fetch(`/api/admin/ab-tests/${testId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update test status")
      }

      toast({
        title: "Status updated",
        description: `Test status changed to ${newStatus.toLowerCase()}`,
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update test status",
        variant: "destructive",
      })
    }
  }

  // Handle test deletion
  const handleDeleteTest = async () => {
    if (!selectedTestId) return

    try {
      const response = await fetch(`/api/admin/ab-tests/${selectedTestId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete test")
      }

      toast({
        title: "Test deleted",
        description: "The AB test has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setSelectedTestId(null)
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive",
      })
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedTests.length === 0) return

    try {
      const response = await fetch("/api/admin/ab-tests/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedTests,
          action,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} tests`)
      }

      toast({
        title: "Success",
        description: `${selectedTests.length} tests have been ${action}d`,
      })

      setSelectedTests([])
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} tests`,
        variant: "destructive",
      })
    }
  }

  // Calculate engagement rate
  const calculateEngagementRate = (impressions: number, engagements: number) => {
    if (impressions === 0) return 0
    return (engagements / impressions) * 100
  }

  // Calculate conversion rate
  const calculateConversionRate = (impressions: number, conversions: number) => {
    if (impressions === 0) return 0
    return (conversions / impressions) * 100
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: ABTestStatus }) => {
    const statusConfig = {
      ACTIVE: {
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: <Play className="h-3 w-3 mr-1" />,
      },
      PAUSED: {
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: <Pause className="h-3 w-3 mr-1" />,
      },
      DRAFT: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      COMPLETED: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    }

    const config = statusConfig[status] || statusConfig["DRAFT"]

    return (
      <Badge variant="outline" className={`flex items-center ${config.color}`}>
        {config.icon}
        {status}
      </Badge>
    )
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load AB tests</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">AB Tests</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage and analyze AB tests across campaigns</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" className="inline-flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
          <Button className="inline-flex items-center" asChild>
            <Link href="/admin/ab-tests/new">
              <Plus className="mr-2 h-4 w-4" />
              New AB Test
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTests}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeTests} active tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalImpressions?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all AB tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalImpressions > 0
                ? ((metrics.totalEngagements / metrics.totalImpressions) * 100).toFixed(2)
                : "0.00"}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalEngagements?.toLocaleString()} total engagements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageConversionRate?.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.completedTests} completed tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="all" onClick={() => setStatusFilter("all")}>
            All ({abTests.length})
          </TabsTrigger>
          <TabsTrigger value="active" onClick={() => setStatusFilter("ACTIVE")}>
            Active ({metrics.testsByStatus?.ACTIVE || 0})
          </TabsTrigger>
          <TabsTrigger value="draft" onClick={() => setStatusFilter("DRAFT")}>
            Draft ({metrics.testsByStatus?.DRAFT || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" onClick={() => setStatusFilter("COMPLETED")}>
            Completed ({metrics.testsByStatus?.COMPLETED || 0})
          </TabsTrigger>
          <TabsTrigger value="paused" onClick={() => setStatusFilter("PAUSED")}>
            Paused ({metrics.testsByStatus?.PAUSED || 0})
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
                  placeholder="Search tests..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {selectedTests.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedTests.length} selected</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="right">
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>Activate Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("pause")}>Pause Selected</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("complete")}>Mark as Completed</DropdownMenuItem>
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

          {/* AB Tests table */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredTests.length > 0 && selectedTests.length === filteredTests.length}
                      onCheckedChange={handleSelectAllTests}
                    />
                  </TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No AB tests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test) => {
                    // Calculate test metrics
                    const totalImpressions = test.variants.reduce((sum, variant) => sum + variant.impressions, 0)
                    const totalEngagements = test.variants.reduce((sum, variant) => sum + variant.engagements, 0)
                    const totalConversions = test.variants.reduce((sum, variant) => sum + variant.conversions, 0)
                    const engagementRate = calculateEngagementRate(totalImpressions, totalEngagements)
                    const conversionRate = calculateConversionRate(totalImpressions, totalConversions)

                    // Find winning variant if test is completed
                    const winningVariant =
                      test.status === "COMPLETED" && test.winningVariantId
                        ? test.variants.find((v) => v.id === test.winningVariantId)
                        : null

                    // Calculate test duration
                    const startDate = new Date(test.startDate)
                    const endDate = test.endDate ? new Date(test.endDate) : new Date()
                    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

                    return (
                      <TableRow key={test.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTests.includes(test.id)}
                            onCheckedChange={() => handleSelectTest(test.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/admin/ab-tests/${test.id}`}
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {test.name}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Created {new Date(test.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/admin/campaigns/${test.campaignId}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {test.campaign.name}
                            </Link>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {test.campaign.advertiser.companyName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={test.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium">{test.variants.length}</span>
                            {winningVariant && (
                              <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Winner: {winningVariant.name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Engagement: {engagementRate.toFixed(2)}%</span>
                              <span>
                                {totalEngagements}/{totalImpressions}
                              </span>
                            </div>
                            <Progress value={engagementRate} className="h-1" />
                            <div className="flex items-center justify-between text-xs">
                              <span>Conversion: {conversionRate.toFixed(2)}%</span>
                              <span>
                                {totalConversions}/{totalImpressions}
                              </span>
                            </div>
                            <Progress value={conversionRate} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {test.status === "COMPLETED" ? (
                              <span>{durationDays} days</span>
                            ) : test.status === "ACTIVE" ? (
                              <span>Running for {durationDays} days</span>
                            ) : (
                              <span>Scheduled for {durationDays} days</span>
                            )}
                          </div>
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
                                <Link href={`/admin/ab-tests/${test.id}`}>View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/ab-tests/${test.id}/edit`}>Edit Test</Link>
                              </DropdownMenuItem>
                              {test.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(test.id, "ACTIVE")}>
                                  Activate Test
                                </DropdownMenuItem>
                              )}
                              {test.status === "ACTIVE" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(test.id, "PAUSED")}>
                                    Pause Test
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(test.id, "COMPLETED")}>
                                    Complete Test
                                  </DropdownMenuItem>
                                </>
                              )}
                              {test.status === "PAUSED" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(test.id, "ACTIVE")}>
                                  Resume Test
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => {
                                  setSelectedTestId(test.id)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                Delete Test
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Other tab contents would be similar but pre-filtered */}
        <TabsContent value="active" className="mt-6">
          {/* Similar content as "all" but pre-filtered for active tests */}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {/* Similar content as "all" but pre-filtered for draft tests */}
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          {/* Similar content as "all" but pre-filtered for completed tests */}
        </TabsContent>
        <TabsContent value="paused" className="mt-6">
          {/* Similar content as "all" but pre-filtered for paused tests */}
        </TabsContent>
      </Tabs>

      {/* Recent insights */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Variants</CardTitle>
            <CardDescription>Variants with the highest engagement rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {abTests
                .flatMap((test) => test.variants)
                .sort((a, b) => {
                  const aRate = a.impressions > 0 ? a.engagements / a.impressions : 0
                  const bRate = b.impressions > 0 ? b.engagements / b.impressions : 0
                  return bRate - aRate
                })
                .slice(0, 5)
                .map((variant, index) => {
                  const engagementRate = variant.impressions > 0 ? (variant.engagements / variant.impressions) * 100 : 0

                  return (
                    <div key={variant.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{variant.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {variant.impressions.toLocaleString()} impressions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{engagementRate.toFixed(2)}%</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Engagement rate</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Test Completions</CardTitle>
            <CardDescription>Recently completed AB tests and their results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {abTests
                .filter((test) => test.status === "COMPLETED")
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map((test) => {
                  const winningVariant = test.winningVariantId
                    ? test.variants.find((v) => v.id === test.winningVariantId)
                    : null

                  return (
                    <div key={test.id} className="flex items-start space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">{test.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {winningVariant ? (
                            <>
                              Winning variant: <span className="font-medium">{winningVariant.name}</span>
                            </>
                          ) : (
                            "No clear winner determined"
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Completed on {new Date(test.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/ab-tests?status=COMPLETED">View All Completed Tests</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete AB Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this AB test? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting this test will remove all associated data, including variant performance metrics.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTest}>
              Delete Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

