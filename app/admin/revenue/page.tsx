"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Users,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { usePublicSettings } from "@/hooks/usePublicSettings"

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Types
import type { DateRange } from "react-day-picker"
import type { PaymentStatus, TransactionType, TransactionStatus, PaymentType, PaymentMethodType } from "@prisma/client"

// Types based on Prisma schema
interface RevenueOverview {
  totalRevenue: number
  pendingRevenue: number
  totalTransactions: number
  averageTransactionValue: number
  revenueGrowth: number
  transactionGrowth: number
  pendingPayouts: number
  failedTransactions: number
  refundedAmount: number
  topPaymentMethod: PaymentMethodType
  topPaymentMethodPercentage: number
}

interface RevenueTrend {
  date: string
  revenue: number
  transactions: number
  refunds: number
}

interface RevenueBySource {
  source: string
  amount: number
  percentage: number
  growth: number
}

interface RevenueByPaymentMethod {
  method: PaymentMethodType
  amount: number
  percentage: number
  transactions: number
}

interface Transaction {
  id: string
  amount: number
  currency: string
  status: TransactionStatus
  type: TransactionType
  date: string
  processedAt: string | null
  reference: string | null
  walletId: string
  paymentMethodId: string | null
  paymentMethod?: {
    type: PaymentMethodType
    last4?: string
  }
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  type: PaymentType
  dateInitiated: string
  dateCompleted: string | null
  transactionId: string | null
  receiptUrl: string | null
  paymentMethodType: PaymentMethodType | null
  advertiserId: string | null
  partnerId: string | null
  advertiser?: {
    companyName: string
  }
  partner?: {
    companyName: string
  }
}

interface RevenueByPeriod {
  period: string
  revenue: number
  growth: number
}

interface RevenueByPartner {
  partnerId: string
  partnerName: string
  revenue: number
  percentage: number
  growth: number
}

interface RevenueByAdvertiser {
  advertiserId: string
  advertiserName: string
  revenue: number
  percentage: number
  growth: number
}

interface RevenueByGeography {
  region: string
  revenue: number
  percentage: number
  growth: number
}

interface RevenueProjection {
  month: string
  projected: number
  actual: number | null
}

interface RevenueData {
  overview: RevenueOverview
  trends: RevenueTrend[]
  bySource: RevenueBySource[]
  byPaymentMethod: RevenueByPaymentMethod[]
  transactions: Transaction[]
  payments: Payment[]
  byPeriod: RevenueByPeriod[]
  byPartner: RevenueByPartner[]
  byAdvertiser: RevenueByAdvertiser[]
  byGeography: RevenueByGeography[]
  projections: RevenueProjection[]
}

// Custom components
const LineChart = ({ data, xAxis, yAxis, strokeColor = "#10b981" }) => {
  // In a real implementation, this would use a charting library like Recharts
  // For now, we'll create a simple visualization

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full">No data available</div>
  }

  const maxValue = Math.max(...data.map((item) => item[yAxis]))

  return (
    <div className="w-full h-full flex items-end space-x-1">
      {data.map((item, index) => {
        const height = (item[yAxis] / maxValue) * 100
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: strokeColor,
                minHeight: "4px",
              }}
            />
            <div className="text-xs mt-2 text-muted-foreground truncate w-full text-center">
              {typeof item[xAxis] === "string" && item[xAxis].length > 5 ? item[xAxis].substring(5) : item[xAxis]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const BarChart = ({ data, xAxis, yAxis, theme = "green" }) => {
  // Similar to LineChart, this is a simplified version

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full">No data available</div>
  }

  const maxValue = Math.max(...data.map((item) => item[yAxis]))
  const colors = {
    green: "#10b981",
    violet: "#8b5cf6",
    blue: "#3b82f6",
    amber: "#f59e0b",
    red: "#ef4444",
  }
  const color = colors[theme] || colors.green

  return (
    <div className="w-full h-full flex items-end space-x-2">
      {data.map((item, index) => {
        const height = (item[yAxis] / maxValue) * 100
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: color,
                minHeight: "4px",
              }}
            />
            <div className="text-xs mt-2 text-muted-foreground truncate w-full text-center">{item[xAxis]}</div>
          </div>
        )
      })}
    </div>
  )
}

const CustomPieChart = ({
  data,
  valueKey,
  labelKey,
  colors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444"],
}) => {
  // Simplified pie chart visualization

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full">No data available</div>
  }

  const total = data.reduce((sum, item) => sum + item[valueKey], 0)

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          {data.map((item, index) => {
            const percentage = (item[valueKey] / total) * 100
            const startAngle =
              index === 0 ? 0 : data.slice(0, index).reduce((sum, i) => sum + (i[valueKey] / total) * 360, 0)
            const endAngle = startAngle + (percentage * 360) / 100

            return (
              <div
                key={index}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${colors[index % colors.length]} ${startAngle}deg, ${colors[index % colors.length]} ${endAngle}deg, transparent ${endAngle}deg)`,
                }}
              />
            )
          })}
          <div className="absolute inset-4 bg-background rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-xs truncate">{item[labelKey]}</span>
            <span className="text-xs ml-auto font-medium">{((item[valueKey] / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon, description, trend = null, loading = false }) => {
  const Icon = icon

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-[100px]" /> : <div className="text-2xl font-bold">{value}</div>}
        {description && !loading && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend !== null && !loading && (
          <div className={`flex items-center mt-1 text-xs ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            <span>{Math.abs(trend)}% from previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const TransactionStatusBadge = ({ status }: { status: TransactionStatus }) => {
  const statusConfig = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    PROCESSING: { color: "bg-blue-100 text-blue-800", label: "Processing" },
    COMPLETED: { color: "bg-green-100 text-green-800", label: "Completed" },
    FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
    CANCELLED: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  const statusConfig = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    COMPLETED: { color: "bg-green-100 text-green-800", label: "Completed" },
    FAILED: { color: "bg-red-100 text-red-800", label: "Failed" },
    REFUNDED: { color: "bg-purple-100 text-purple-800", label: "Refunded" },
    PROCESSED: { color: "bg-blue-100 text-blue-800", label: "Processed" },
    PAID: { color: "bg-green-100 text-green-800", label: "Paid" },
    CANCELLED: { color: "bg-gray-100 text-gray-800", label: "Cancelled" },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

const PaymentMethodBadge = ({ type }: { type: PaymentMethodType }) => {
  const methodConfig = {
    VISA: { color: "bg-blue-100 text-blue-800", label: "Visa" },
    MASTERCARD: { color: "bg-red-100 text-red-800", label: "Mastercard" },
    AMEX: { color: "bg-purple-100 text-purple-800", label: "Amex" },
    BANK_TRANSFER: { color: "bg-green-100 text-green-800", label: "Bank Transfer" },
    MPESA: { color: "bg-green-100 text-green-800", label: "M-Pesa" },
    FLUTTERWAVE: { color: "bg-orange-100 text-orange-800", label: "Flutterwave" },
    PAYPAL: { color: "bg-blue-100 text-blue-800", label: "PayPal" },
    STRIPE: { color: "bg-purple-100 text-purple-800", label: "Stripe" },
    CREDIT_CARD: { color: "bg-gray-100 text-gray-800", label: "Credit Card" },
    OTHER: { color: "bg-gray-100 text-gray-800", label: "Other" },
  }

  const config = methodConfig[type] || methodConfig.OTHER

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

const TransactionTypeLabel = ({ type }: { type: TransactionType }) => {
  const typeConfig = {
    DEPOSIT: { icon: DollarSign, label: "Deposit" },
    WITHDRAWAL: { icon: Wallet, label: "Withdrawal" },
    PAYMENT: { icon: CreditCard, label: "Payment" },
    REFUND: { icon: RefreshCw, label: "Refund" },
    ADJUSTMENT: { icon: FileText, label: "Adjustment" },
  }

  const config = typeConfig[type] || typeConfig.PAYMENT
  const Icon = config.icon

  return (
    <div className="flex items-center">
      <Icon className="h-4 w-4 mr-1 text-muted-foreground" />
      <span>{config.label}</span>
    </div>
  )
}

const PaymentTypeLabel = ({ type }: { type: PaymentType }) => {
  const typeConfig = {
    DEPOSIT: { icon: DollarSign, label: "Deposit" },
    WITHDRAWAL: { icon: Wallet, label: "Withdrawal" },
    REFUND: { icon: RefreshCw, label: "Refund" },
    TRANSFER: { icon: ArrowUpRight, label: "Transfer" },
    FEE: { icon: Receipt, label: "Fee" },
  }

  const config = typeConfig[type] || typeConfig.DEPOSIT
  const Icon = config.icon

  return (
    <div className="flex items-center">
      <Icon className="h-4 w-4 mr-1 text-muted-foreground" />
      <span>{config.label}</span>
    </div>
  )
}

const LoadingState = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-10 w-[180px]" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-4 w-[150px] mt-2" />
            </CardContent>
          </Card>
        ))}
    </div>

    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[150px]" />
      </CardHeader>
      <CardContent className="h-[400px]">
        <Skeleton className="h-full w-full" />
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(2)
        .fill(0)
        .map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent className="h-[300px]">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        ))}
    </div>
  </div>
)

export default function RevenuePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for filters
  const [timeRange, setTimeRange] = useState<string>("30d")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [transactionType, setTransactionType] = useState<string>("all")
  const [paymentMethod, setPaymentMethod] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [exportFormat, setExportFormat] = useState<string>("csv")
  const [showProjections, setShowProjections] = useState<boolean>(true)

  // Derived state
  const currency = useMemo(() => {
    return generalSettings?.defaultCurrency || generalSettings?.currency || "USD"
  }, [generalSettings])

  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [currency])

  // Update date range when time range changes
  useEffect(() => {
    const now = new Date()

    switch (timeRange) {
      case "7d":
        setDateRange({
          from: subDays(now, 7),
          to: now,
        })
        break
      case "30d":
        setDateRange({
          from: subDays(now, 30),
          to: now,
        })
        break
      case "90d":
        setDateRange({
          from: subDays(now, 90),
          to: now,
        })
        break
      case "ytd":
        setDateRange({
          from: new Date(now.getFullYear(), 0, 1),
          to: now,
        })
        break
      case "month":
        setDateRange({
          from: startOfMonth(now),
          to: endOfMonth(now),
        })
        break
      // Custom date range is handled by the date picker component
    }
  }, [timeRange])

  // Fetch revenue data
  const {
    data: revenueData,
    isLoading,
    isError,
    error,
  } = useQuery<RevenueData>({
    queryKey: ["revenue", timeRange, dateRange],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams()

      if (timeRange !== "custom") {
        params.append("range", timeRange)
      } else if (dateRange?.from && dateRange?.to) {
        params.append("startDate", dateRange.from.toISOString())
        params.append("endDate", dateRange.to.toISOString())
      }

      const res = await fetch(`/api/admin/revenue?${params.toString()}`)

      if (!res.ok) {
        throw new Error(`Failed to fetch revenue data: ${res.statusText}`)
      }

      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Mutation for exporting data
  const exportMutation = useMutation({
    mutationFn: async (format: string) => {
      const params = new URLSearchParams()
      params.append("format", format)

      if (timeRange !== "custom") {
        params.append("range", timeRange)
      } else if (dateRange?.from && dateRange?.to) {
        params.append("startDate", dateRange.from.toISOString())
        params.append("endDate", dateRange.to.toISOString())
      }

      if (activeTab !== "overview") {
        params.append("type", activeTab)
      }

      const res = await fetch(`/api/admin/revenue/export?${params.toString()}`)

      if (!res.ok) {
        throw new Error(`Failed to export data: ${res.statusText}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `revenue-${activeTab}-${format === "csv" ? "csv" : "xlsx"}-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onSuccess: () => {
      toast({
        title: "Export successful",
        description: `Revenue data has been exported successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  // Filter transactions based on search query and filters
  const filteredTransactions = useMemo(() => {
    if (!revenueData?.transactions) return []

    return revenueData.transactions.filter((transaction) => {
      // Filter by search query
      if (
        searchQuery &&
        !transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !transaction.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by transaction type
      if (transactionType !== "all" && transaction.type !== transactionType) {
        return false
      }

      // Filter by status
      if (statusFilter !== "all" && transaction.status !== statusFilter) {
        return false
      }

      // Filter by payment method
      if (paymentMethod !== "all" && transaction.paymentMethod?.type !== paymentMethod) {
        return false
      }

      return true
    })
  }, [revenueData?.transactions, searchQuery, transactionType, statusFilter, paymentMethod])

  // Filter payments based on search query and filters
  const filteredPayments = useMemo(() => {
    if (!revenueData?.payments) return []

    return revenueData.payments.filter((payment) => {
      // Filter by search query
      if (
        searchQuery &&
        !payment.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !payment.transactionId?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by payment type
      if (transactionType !== "all" && payment.type !== transactionType) {
        return false
      }

      // Filter by status
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false
      }

      // Filter by payment method
      if (paymentMethod !== "all" && payment.paymentMethodType !== paymentMethod) {
        return false
      }

      return true
    })
  }, [revenueData?.payments, searchQuery, transactionType, statusFilter, paymentMethod])

  // Handle export
  const handleExport = () => {
    exportMutation.mutate(exportFormat)
  }

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["revenue"] })
  }

  if (isLoading || settingsLoading) {
    return <LoadingState />
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load revenue data. Please try again."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Management</h1>
          <p className="text-muted-foreground">Monitor and analyze platform revenue metrics and transactions</p>
        </div>

        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                {timeRange === "custom" && dateRange?.from && dateRange?.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  <>
                    {timeRange === "7d" && "Last 7 Days"}
                    {timeRange === "30d" && "Last 30 Days"}
                    {timeRange === "90d" && "Last 90 Days"}
                    {timeRange === "ytd" && "Year to Date"}
                    {timeRange === "month" && "This Month"}
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={timeRange === "7d" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("7d")}
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant={timeRange === "30d" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("30d")}
                    >
                      Last 30 Days
                    </Button>
                    <Button
                      variant={timeRange === "90d" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("90d")}
                    >
                      Last 90 Days
                    </Button>
                    <Button
                      variant={timeRange === "ytd" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("ytd")}
                    >
                      Year to Date
                    </Button>
                    <Button
                      variant={timeRange === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("month")}
                    >
                      This Month
                    </Button>
                    <Button
                      variant={timeRange === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange("custom")}
                    >
                      Custom Range
                    </Button>
                  </div>

                  {timeRange === "custom" && (
                    <div className="pt-2">
                      <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("csv")
                  handleExport()
                }}
              >
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("xlsx")
                  handleExport()
                }}
              >
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("pdf")
                  handleExport()
                }}
              >
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="advertisers">Advertisers</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={currencyFormatter.format(revenueData?.overview.totalRevenue || 0)}
              icon={DollarSign}
              trend={revenueData?.overview.revenueGrowth}
            />

            <StatCard
              title="Pending Revenue"
              value={currencyFormatter.format(revenueData?.overview.pendingRevenue || 0)}
              icon={Clock}
              description={`${revenueData?.overview.pendingPayouts || 0} pending payouts`}
            />

            <StatCard
              title="Total Transactions"
              value={revenueData?.overview.totalTransactions.toLocaleString() || "0"}
              icon={CreditCard}
              trend={revenueData?.overview.transactionGrowth}
            />

            <StatCard
              title="Avg. Transaction Value"
              value={currencyFormatter.format(revenueData?.overview.averageTransactionValue || 0)}
              icon={TrendingUp}
              description={`${revenueData?.overview.failedTransactions || 0} failed transactions`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue for the selected period</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <LineChart data={revenueData?.trends || []} xAxis="date" yAxis="revenue" strokeColor="#10b981" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
                <CardDescription>Distribution across revenue sources</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <CustomPieChart
                  data={revenueData?.bySource || []}
                  valueKey="amount"
                  labelKey="source"
                  colors={["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444"]}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Distribution across payment methods</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart data={revenueData?.byPaymentMethod || []} xAxis="method" yAxis="amount" theme="blue" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Period</CardTitle>
                <CardDescription>Monthly revenue comparison</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart data={revenueData?.byPeriod || []} xAxis="period" yAxis="revenue" theme="green" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Partners by Revenue</CardTitle>
                <CardDescription>Partners generating the most revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData?.byPartner?.slice(0, 5).map((partner) => (
                      <TableRow key={partner.partnerId}>
                        <TableCell className="font-medium">{partner.partnerName}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(partner.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className={partner.growth >= 0 ? "text-green-500" : "text-red-500"}>
                            {partner.growth >= 0 ? "+" : ""}
                            {partner.growth}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Advertisers by Revenue</CardTitle>
                <CardDescription>Advertisers contributing the most revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Advertiser</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData?.byAdvertiser?.slice(0, 5).map((advertiser) => (
                      <TableRow key={advertiser.advertiserId}>
                        <TableCell className="font-medium">{advertiser.advertiserName}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(advertiser.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className={advertiser.growth >= 0 ? "text-green-500" : "text-red-500"}>
                            {advertiser.growth >= 0 ? "+" : ""}
                            {advertiser.growth}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage all platform transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by ID or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="DEPOSIT">Deposits</SelectItem>
                      <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                      <SelectItem value="PAYMENT">Payments</SelectItem>
                      <SelectItem value="REFUND">Refunds</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="VISA">Visa</SelectItem>
                      <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                      <SelectItem value="AMEX">Amex</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                      <SelectItem value="FLUTTERWAVE">Flutterwave</SelectItem>
                      <SelectItem value="PAYPAL">PayPal</SelectItem>
                      <SelectItem value="STRIPE">Stripe</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {transaction.id.substring(0, 8)}...
                            {transaction.reference && (
                              <div className="text-xs text-muted-foreground">Ref: {transaction.reference}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TransactionTypeLabel type={transaction.type} />
                          </TableCell>
                          <TableCell>{currencyFormatter.format(transaction.amount)}</TableCell>
                          <TableCell>
                            <TransactionStatusBadge status={transaction.status} />
                          </TableCell>
                          <TableCell>
                            {transaction.paymentMethod ? (
                              <div className="flex flex-col">
                                <PaymentMethodBadge type={transaction.paymentMethod.type} />
                                {transaction.paymentMethod.last4 && (
                                  <span className="text-xs text-muted-foreground mt-1">
                                    **** {transaction.paymentMethod.last4}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(transaction.date), "MMM d, yyyy")}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(transaction.date), "h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span className="sr-only">Open menu</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Download receipt</DropdownMenuItem>
                                {transaction.status === "PENDING" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Approve</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Reject</DropdownMenuItem>
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {revenueData?.transactions.length || 0} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View and manage all platform payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by ID or transaction ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="DEPOSIT">Deposits</SelectItem>
                      <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                      <SelectItem value="REFUND">Refunds</SelectItem>
                      <SelectItem value="TRANSFER">Transfers</SelectItem>
                      <SelectItem value="FEE">Fees</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                      <SelectItem value="PROCESSED">Processed</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="VISA">Visa</SelectItem>
                      <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                      <SelectItem value="AMEX">Amex</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                      <SelectItem value="FLUTTERWAVE">Flutterwave</SelectItem>
                      <SelectItem value="PAYPAL">PayPal</SelectItem>
                      <SelectItem value="STRIPE">Stripe</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.id.substring(0, 8)}...
                            {payment.transactionId && (
                              <div className="text-xs text-muted-foreground">
                                Trans: {payment.transactionId.substring(0, 8)}...
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <PaymentTypeLabel type={payment.type} />
                          </TableCell>
                          <TableCell>{currencyFormatter.format(payment.amount)}</TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={payment.status} />
                          </TableCell>
                          <TableCell>
                            {payment.advertiserId ? (
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-blue-500" />
                                <span>{payment.advertiser?.companyName || "Advertiser"}</span>
                              </div>
                            ) : payment.partnerId ? (
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-green-500" />
                                <span>{payment.partner?.companyName || "Partner"}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.dateInitiated), "MMM d, yyyy")}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(payment.dateInitiated), "h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span className="sr-only">Open menu</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                  >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                {payment.receiptUrl && <DropdownMenuItem>Download receipt</DropdownMenuItem>}
                                {payment.status === "PENDING" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Process payment</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Cancel payment</DropdownMenuItem>
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {revenueData?.payments.length || 0} payments
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Revenue</CardTitle>
              <CardDescription>Revenue generated by partners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share (%)</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData?.byPartner?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No partner revenue data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      revenueData?.byPartner?.map((partner) => (
                        <TableRow key={partner.partnerId}>
                          <TableCell className="font-medium">{partner.partnerName}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(partner.revenue)}</TableCell>
                          <TableCell className="text-right">{partner.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <span className={partner.growth >= 0 ? "text-green-500" : "text-red-500"}>
                              {partner.growth >= 0 ? "+" : ""}
                              {partner.growth}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Partner Revenue Distribution</CardTitle>
                <CardDescription>Revenue share across partners</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <CustomPieChart
                  data={revenueData?.byPartner || []}
                  valueKey="revenue"
                  labelKey="partnerName"
                  colors={["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Revenue by Geography</CardTitle>
                <CardDescription>Revenue distribution by region</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart data={revenueData?.byGeography || []} xAxis="region" yAxis="revenue" theme="blue" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advertisers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advertiser Revenue</CardTitle>
              <CardDescription>Revenue generated from advertisers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Advertiser</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share (%)</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData?.byAdvertiser?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No advertiser revenue data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      revenueData?.byAdvertiser?.map((advertiser) => (
                        <TableRow key={advertiser.advertiserId}>
                          <TableCell className="font-medium">{advertiser.advertiserName}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(advertiser.revenue)}</TableCell>
                          <TableCell className="text-right">{advertiser.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <span className={advertiser.growth >= 0 ? "text-green-500" : "text-red-500"}>
                              {advertiser.growth >= 0 ? "+" : ""}
                              {advertiser.growth}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Advertiser Revenue Distribution</CardTitle>
                <CardDescription>Revenue share across advertisers</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <CustomPieChart
                  data={revenueData?.byAdvertiser || []}
                  valueKey="revenue"
                  labelKey="advertiserName"
                  colors={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Revenue by campaign type</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <BarChart
                  data={[
                    { type: "Display", amount: revenueData?.bySource?.[0]?.amount || 0 },
                    { type: "Video", amount: revenueData?.bySource?.[1]?.amount || 0 },
                    { type: "Interactive", amount: revenueData?.bySource?.[2]?.amount || 0 },
                    { type: "AR/VR", amount: revenueData?.bySource?.[3]?.amount || 0 },
                  ]}
                  xAxis="type"
                  yAxis="amount"
                  theme="violet"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue Projections</CardTitle>
                <CardDescription>Forecasted revenue for the next 6 months</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowProjections(!showProjections)}>
                  {showProjections ? "Hide Confidence Bands" : "Show Confidence Bands"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-[400px]">
              <div className="h-full">
                {revenueData?.projections?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No projection data available
                  </div>
                ) : (
                  <div className="relative h-full">
                    {/* Simplified chart visualization */}
                    <div className="absolute inset-0 flex items-end space-x-1">
                      {revenueData?.projections?.map((item, index) => {
                        const projectedHeight = item.projected
                          ? (item.projected / Math.max(...revenueData.projections.map((p) => p.projected))) * 100
                          : 0
                        const actualHeight = item.actual
                          ? (item.actual /
                              Math.max(...revenueData.projections.filter((p) => p.actual).map((p) => p.actual || 0))) *
                            100
                          : 0

                        return (
                          <div key={index} className="flex flex-col items-center flex-1">
                            <div className="w-full flex items-end justify-center space-x-1">
                              {/* Projected bar */}
                              <div
                                className="w-4 rounded-t-sm bg-blue-500 opacity-70"
                                style={{
                                  height: `${projectedHeight}%`,
                                  minHeight: "4px",
                                }}
                              />

                              {/* Actual bar (if available) */}
                              {item.actual && (
                                <div
                                  className="w-4 rounded-t-sm bg-green-500"
                                  style={{
                                    height: `${actualHeight}%`,
                                    minHeight: "4px",
                                  }}
                                />
                              )}
                            </div>

                            {/* Confidence bands */}
                            {showProjections && (
                              <div
                                className="absolute w-4 rounded-sm bg-blue-200 opacity-30"
                                style={{
                                  height: `${projectedHeight * 0.3}px`,
                                  bottom: `${projectedHeight}%`,
                                  left: `${index * (100 / revenueData.projections.length) + (100 / revenueData.projections.length / 2) - 2}%`,
                                }}
                              />
                            )}

                            <div className="text-xs mt-2 text-muted-foreground truncate w-full text-center">
                              {item.month}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="absolute top-0 right-0 flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 opacity-70 mr-2" />
                        <span className="text-xs">Projected</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 mr-2" />
                        <span className="text-xs">Actual</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projection Details</CardTitle>
              <CardDescription>Monthly revenue projections with confidence levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Projected Revenue</TableHead>
                    <TableHead className="text-right">Actual Revenue</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData?.projections?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No projection data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    revenueData?.projections?.map((projection, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{projection.month}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(projection.projected)}</TableCell>
                        <TableCell className="text-right">
                          {projection.actual !== null ? currencyFormatter.format(projection.actual) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {index === 0 ? "High" : index < 2 ? "Medium" : "Low"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Projections are based on historical data and current growth trends. Confidence levels decrease for
                projections further in the future.
              </p>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Projected Annual Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currencyFormatter.format(revenueData?.projections?.reduce((sum, p) => sum + p.projected, 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Based on 12-month projection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Monthly Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{revenueData?.overview.revenueGrowth}%</div>
                <p className="text-xs text-muted-foreground mt-1">Month-over-month revenue increase</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Projection Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueData?.projections?.some((p) => p.actual !== null) ? "87%" : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Historical projection accuracy</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
