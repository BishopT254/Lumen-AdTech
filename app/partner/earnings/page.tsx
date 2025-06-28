"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format, parseISO, isValid, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import {
  Download,
  FileText,
  MoreHorizontal,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react"

// Types based on the Prisma schema
type EarningStatus = "PENDING" | "PROCESSED" | "PAID" | "CANCELLED"

interface PartnerEarning {
  id: string
  partnerId: string
  periodStart: string
  periodEnd: string
  totalImpressions: number
  totalEngagements: number
  amount: number
  status: EarningStatus
  paidDate?: string
  transactionId?: string
  createdAt: string
  updatedAt: string
}

interface EarningsSummary {
  totalEarnings: number
  pendingPayments: number
  lastPaymentAmount: number
  lastPaymentDate: string | null
  currentMonthEarnings: number
  previousMonthEarnings: number
  percentageChange: number
  yearToDateEarnings: number
  projectedEarnings: number
  totalImpressions: number
  totalEngagements: number
  averageEngagementRate: number
}

interface PayoutRequest {
  id: string
  amount: number
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  requestDate: string
  processedDate?: string
  paymentMethodId?: string
  paymentMethodType?: string
}

export default function EarningsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { commissionRates, loading: settingsLoading } = usePublicSettings()

  // State for earnings data
  const [earnings, setEarnings] = useState<PartnerEarning[]>([])
  const [filteredEarnings, setFilteredEarnings] = useState<PartnerEarning[]>([])
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // State for filters
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  })
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // State for payout requests
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState<number>(0)
  const [minPayoutAmount, setMinPayoutAmount] = useState<number>(50) // Default, will be updated from settings
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false)

  // State for export options
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<string>("csv")
  const [exportPeriod, setExportPeriod] = useState<string>("current")
  const [isExporting, setIsExporting] = useState(false)

  // Load commission rates and minimum payout from settings
  useEffect(() => {
    if (commissionRates) {
      // Set minimum payout from settings
      setMinPayoutAmount(commissionRates.minimumPayout || commissionRates.minimum_payout || 50)
    }
  }, [commissionRates])

  // Fetch earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      if (sessionStatus !== "authenticated") return

      try {
        setLoading(true)

        // Fetch earnings data
        const earningsResponse = await fetch("/api/partner/earnings")

        if (!earningsResponse.ok) {
          throw new Error(`Failed to fetch earnings: ${earningsResponse.statusText}`)
        }

        const earningsData = await earningsResponse.json()
        // Ensure earningsData is an array
        const earningsArray = Array.isArray(earningsData) ? earningsData : []
        setEarnings(earningsArray)
        setFilteredEarnings(earningsArray)

        // Fetch earnings summary
        const summaryResponse = await fetch("/api/partner/earnings/summary")

        if (!summaryResponse.ok) {
          throw new Error(`Failed to fetch summary: ${summaryResponse.statusText}`)
        }

        const summaryData = await summaryResponse.json()
        setSummary(summaryData)

        // Fetch payout requests
        const payoutResponse = await fetch("/api/partner/payouts")

        if (!payoutResponse.ok) {
          throw new Error(`Failed to fetch payout requests: ${payoutResponse.statusText}`)
        }

        const payoutData = await payoutResponse.json()
        setPayoutRequests(payoutData)

        // Fetch payment methods
        const paymentMethodsResponse = await fetch("/api/partner/wallet/payment-methods")

        if (!paymentMethodsResponse.ok) {
          throw new Error(`Failed to fetch payment methods: ${paymentMethodsResponse.statusText}`)
        }

        const paymentMethodsData = await paymentMethodsResponse.json()
        setPaymentMethods(paymentMethodsData)

        // Set default payment method if available
        if (paymentMethodsData.length > 0) {
          const defaultMethod = paymentMethodsData.find((method: any) => method.isDefault)
          setSelectedPaymentMethod(defaultMethod ? defaultMethod.id : paymentMethodsData[0].id)
        }

        // Set initial payout amount to pending payments
        if (summaryData && summaryData.pendingPayments > 0) {
          setPayoutAmount(summaryData.pendingPayments)
        }
      } catch (error) {
        console.error("Error fetching earnings data:", error)
        toast.error("Failed to load earnings data")
        // Set empty arrays on error
        setEarnings([])
        setFilteredEarnings([])
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [sessionStatus])

  // Apply filters when date range or status filter changes
  // Find the useEffect that applies filters
  useEffect(() => {
    // Ensure earnings is an array before filtering
    if (!Array.isArray(earnings) || earnings.length === 0) {
      setFilteredEarnings([])
      return
    }

    const filtered = earnings.filter((earning) => {
      // Apply date filter
      const earningStart = new Date(earning.periodStart)
      const earningEnd = new Date(earning.periodEnd)
      const filterStart = new Date(dateRange.start)
      const filterEnd = new Date(dateRange.end)

      const dateMatch =
        (earningStart >= filterStart && earningStart <= filterEnd) ||
        (earningEnd >= filterStart && earningEnd <= filterEnd)

      // Apply status filter
      const statusMatch = statusFilter === "all" || earning.status === statusFilter

      return dateMatch && statusMatch
    })

    setFilteredEarnings(filtered)
  }, [earnings, dateRange, statusFilter])

  // Handle payout request
  const handlePayoutRequest = async () => {
    try {
      setIsSubmittingPayout(true)

      if (payoutAmount < minPayoutAmount) {
        toast.error(`Minimum payout amount is $${minPayoutAmount}`)
        return
      }

      if (!selectedPaymentMethod) {
        toast.error("Please select a payment method")
        return
      }

      // Make API call to request payout
      const response = await fetch("/api/partner/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: payoutAmount,
          paymentMethodId: selectedPaymentMethod,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit payout request")
      }

      const result = await response.json()

      // Refresh payout requests
      const payoutResponse = await fetch("/api/partner/payouts")
      const payoutData = await payoutResponse.json()
      setPayoutRequests(payoutData)

      // Refresh summary to update pending payments
      const summaryResponse = await fetch("/api/partner/earnings/summary")
      const summaryData = await summaryResponse.json()
      setSummary(summaryData)

      setShowPayoutDialog(false)
      toast.success("Payout request submitted successfully")
    } catch (error) {
      console.error("Error submitting payout request:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit payout request")
    } finally {
      setIsSubmittingPayout(false)
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true)

      // Prepare export parameters
      let startDate = dateRange.start
      let endDate = dateRange.end

      // Adjust date range based on selected period
      if (exportPeriod === "current") {
        startDate = format(startOfMonth(new Date()), "yyyy-MM-dd")
        endDate = format(endOfMonth(new Date()), "yyyy-MM-dd")
      } else if (exportPeriod === "previous") {
        const prevMonth = subMonths(new Date(), 1)
        startDate = format(startOfMonth(prevMonth), "yyyy-MM-dd")
        endDate = format(endOfMonth(prevMonth), "yyyy-MM-dd")
      } else if (exportPeriod === "quarter") {
        const threeMonthsAgo = subMonths(new Date(), 3)
        startDate = format(threeMonthsAgo, "yyyy-MM-dd")
        endDate = format(new Date(), "yyyy-MM-dd")
      } else if (exportPeriod === "year") {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1)
        startDate = format(startOfYear, "yyyy-MM-dd")
        endDate = format(new Date(), "yyyy-MM-dd")
      }

      // Make API call to export earnings
      const response = await fetch(
        `/api/partner/earnings/export?format=${exportFormat}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to export earnings statement")
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `earnings-statement-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setShowExportDialog(false)
      toast.success(`Earnings statement exported as ${exportFormat.toUpperCase()}`)
    } catch (error) {
      console.error("Error exporting earnings:", error)
      toast.error("Failed to export earnings statement")
    } finally {
      setIsExporting(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    const currency = commissionRates?.currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return isValid(date) ? format(date, "MMM d, yyyy") : "Invalid date"
  }

  // Get status badge
  const getStatusBadge = (status: EarningStatus) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">Paid</Badge>
      case "PROCESSED":
        return <Badge variant="outline">Processed</Badge>
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get payout request status badge
  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>
      case "APPROVED":
        return <Badge variant="outline">Approved</Badge>
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setLoading(true)

      // Fetch earnings data
      const earningsResponse = await fetch("/api/partner/earnings")
      const earningsData = await earningsResponse.json()
      setEarnings(earningsData)
      setFilteredEarnings(earningsData)

      // Fetch earnings summary
      const summaryResponse = await fetch("/api/partner/earnings/summary")
      const summaryData = await summaryResponse.json()
      setSummary(summaryData)

      // Fetch payout requests
      const payoutResponse = await fetch("/api/partner/payouts")
      const payoutData = await payoutResponse.json()
      setPayoutRequests(payoutData)

      toast.success("Earnings data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing earnings data:", error)
      toast.error("Failed to refresh earnings data")
    } finally {
      setLoading(false)
    }
  }

  if (sessionStatus === "loading" || loading || settingsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sessionStatus === "unauthenticated") {
    router.push("/login")
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="text-muted-foreground">Track your earnings, request payouts, and view payment history</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Statement
          </Button>

          <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4" />
            Refresh
          </Button>

          <Button
            onClick={() => setShowPayoutDialog(true)}
            disabled={(summary?.pendingPayments || 0) < minPayoutAmount || paymentMethods.length === 0}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Request Payout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Earnings History</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {summary && (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings (YTD)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(summary.yearToDateEarnings)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Projected Annual: {formatCurrency(summary.projectedEarnings)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Current Month Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(summary.currentMonthEarnings)}</div>
                    <div className="flex items-center mt-1">
                      {summary.percentageChange >= 0 ? (
                        <div className="flex items-center text-green-500 text-xs">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          {summary.percentageChange.toFixed(1)}% from last month
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500 text-xs">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          {Math.abs(summary.percentageChange).toFixed(1)}% from last month
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(summary.pendingPayments)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last Payment: {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : "None"} (
                      {formatCurrency(summary.lastPaymentAmount)})
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Key metrics affecting your earnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">Total Impressions</p>
                          <p className="text-sm text-muted-foreground">Across all devices</p>
                        </div>
                        <div className="font-medium">{summary.totalImpressions.toLocaleString()}</div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">Total Engagements</p>
                          <p className="text-sm text-muted-foreground">User interactions with ads</p>
                        </div>
                        <div className="font-medium">{summary.totalEngagements.toLocaleString()}</div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">Engagement Rate</p>
                          <p className="text-sm text-muted-foreground">Percentage of impressions with engagement</p>
                        </div>
                        <div className="font-medium">{summary.averageEngagementRate.toFixed(2)}%</div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">Commission Rate</p>
                          <p className="text-sm text-muted-foreground">Your current rate</p>
                        </div>
                        <div className="font-medium">
                          {commissionRates?.standardRate || commissionRates?.default || 70}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Earnings</CardTitle>
                    <CardDescription>Your most recent earnings periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {earnings.slice(0, 4).map((earning) => (
                        <div key={earning.id} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {formatDate(earning.periodStart)} - {formatDate(earning.periodEnd)}
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {formatCurrency(earning.amount)}
                            </div>
                          </div>
                          {getStatusBadge(earning.status)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full" onClick={() => setActiveTab("history")}>
                      View All Earnings
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Earnings Breakdown</CardTitle>
                  <CardDescription>How your earnings are calculated</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <h3 className="font-medium mb-2">Base Commission</h3>
                        <p className="text-sm text-muted-foreground">
                          Your standard commission rate is{" "}
                          {commissionRates?.standardRate || commissionRates?.default || 70}% of ad revenue generated by
                          your devices.
                        </p>
                      </div>

                      <div className="bg-muted rounded-lg p-4">
                        <h3 className="font-medium mb-2">Performance Bonuses</h3>
                        <p className="text-sm text-muted-foreground">
                          Earn up to {commissionRates?.performanceBonuses?.engagementBonus || 5}% additional commission
                          for high engagement rates.
                        </p>
                      </div>

                      <div className="bg-muted rounded-lg p-4">
                        <h3 className="font-medium mb-2">Payout Schedule</h3>
                        <p className="text-sm text-muted-foreground">
                          Payments are processed {commissionRates?.payoutSchedule?.frequency || "monthly"} with a
                          minimum payout of {formatCurrency(minPayoutAmount)}.
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="font-medium mb-2">Calculation Formula</h3>
                      <p className="text-sm text-muted-foreground">
                        Your earnings are calculated based on the following formula:
                      </p>
                      <div className="mt-2 p-3 bg-background rounded border text-sm font-mono">
                        Earnings = (Ad Revenue × Base Commission) + Performance Bonuses
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Ad revenue is determined by impressions, engagement rates, and advertiser bids.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Earnings History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Earnings History</CardTitle>
              <CardDescription>View and filter your historical earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date-range">Date Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="date-start"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full"
                    />
                    <span>to</span>
                    <Input
                      id="date-end"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-full md:w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PROCESSED">Processed</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Engagements</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEarnings.length > 0 ? (
                      filteredEarnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell>
                            <div className="font-medium">
                              {formatDate(earning.periodStart)} - {formatDate(earning.periodEnd)}
                            </div>
                          </TableCell>
                          <TableCell>{earning.totalImpressions.toLocaleString()}</TableCell>
                          <TableCell>{earning.totalEngagements.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(earning.amount)}</TableCell>
                          <TableCell>{getStatusBadge(earning.status)}</TableCell>
                          <TableCell>{earning.paidDate ? formatDate(earning.paidDate) : "-"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/partner/earnings/${earning.id}`)}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                                  Export Statement
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={earning.status !== "PENDING"}
                                  onClick={() => {
                                    if (earning.status === "PENDING") {
                                      setPayoutAmount(earning.amount)
                                      setShowPayoutDialog(true)
                                    }
                                  }}
                                >
                                  Request Payout
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No earnings found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Requests Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>Track the status of your payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium">Available for Payout</h3>
                  <p className="text-2xl font-bold">{formatCurrency(summary?.pendingPayments || 0)}</p>
                </div>
                <Button
                  onClick={() => setShowPayoutDialog(true)}
                  disabled={(summary?.pendingPayments || 0) < minPayoutAmount || paymentMethods.length === 0}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Request Payout
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Processed Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutRequests.length > 0 ? (
                      payoutRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="font-medium">{formatDate(request.requestDate)}</div>
                          </TableCell>
                          <TableCell>{formatCurrency(request.amount)}</TableCell>
                          <TableCell>{getPayoutStatusBadge(request.status)}</TableCell>
                          <TableCell>{request.paymentMethodType || "Bank Transfer"}</TableCell>
                          <TableCell>{request.processedDate ? formatDate(request.processedDate) : "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/partner/payouts/${request.id}`)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No payout requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout Information</CardTitle>
              <CardDescription>Your payment details and payout schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Payment Methods</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      {paymentMethods.length > 0 ? (
                        <>
                          {paymentMethods.map((method, index) => (
                            <div key={method.id} className={index > 0 ? "mt-3 pt-3 border-t" : ""}>
                              <p className="font-medium">{method.type}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {method.isDefault && "(Default) "}
                                {method.details?.accountNumber
                                  ? `Account ending in ****${method.details.accountNumber.slice(-4)}`
                                  : method.details?.email || "No details available"}
                              </p>
                            </div>
                          ))}
                          <Button
                            variant="link"
                            className="px-0 h-8 mt-2"
                            onClick={() => router.push("/partner/wallet?tab=payment")}
                          >
                            Manage Payment Methods
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">No payment methods configured.</p>
                          <Button
                            variant="link"
                            className="px-0 h-8 mt-1"
                            onClick={() => router.push("/partner/wallet?tab=payment")}
                          >
                            Add Payment Method
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Payout Schedule</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="font-medium">{commissionRates?.payoutSchedule?.frequency || "Monthly"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Processed on the {commissionRates?.payoutSchedule?.payoutDay || "15th"} of each month
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Minimum payout amount: {formatCurrency(minPayoutAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Tax Information</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Tax Documents</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your tax information is complete and up to date.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => router.push("/partner/settings?tab=tax")}>
                        View Tax Documents
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Request a payout of your available earnings. Minimum payout amount is {formatCurrency(minPayoutAmount)}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payout-amount">Payout Amount</Label>
              <Input
                id="payout-amount"
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                min={minPayoutAmount}
                max={summary?.pendingPayments || 0}
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Available: {formatCurrency(summary?.pendingPayments || 0)}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payout-method">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger id="payout-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.type} {method.isDefault && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                You can manage your payment methods in{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setShowPayoutDialog(false)
                    router.push("/partner/wallet?tab=payment")
                  }}
                >
                  Wallet Settings
                </Button>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayoutRequest}
              disabled={
                isSubmittingPayout ||
                payoutAmount < minPayoutAmount ||
                payoutAmount > (summary?.pendingPayments || 0) ||
                !selectedPaymentMethod
              }
            >
              {isSubmittingPayout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Earnings Statement</DialogTitle>
            <DialogDescription>Export your earnings data in your preferred format.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="export-format">Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger id="export-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="export-period">Period</Label>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger id="export-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="previous">Previous Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportPeriod === "custom" && (
              <div className="grid gap-2">
                <Label>Custom Date Range</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <span>to</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
