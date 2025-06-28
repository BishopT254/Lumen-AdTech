"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, parseISO, subDays } from "date-fns"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CreditCard,
  Download,
  History,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  AlertCircle,
} from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

// Define transaction types based on Prisma schema
type Transaction = {
  id: string
  type: "DEPOSIT" | "WITHDRAWAL" | "PAYMENT" | "REFUND" | "ADJUSTMENT"
  amount: number
  status: "COMPLETED" | "PENDING" | "FAILED" | "PROCESSING"
  date: string
  description: string
  reference?: string
  paymentMethod?: string
  fees?: number
  metadata?: Record<string, any>
}

export default function TransactionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [limit, setLimit] = useState(20)

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [currency, setCurrency] = useState<string>("USD")

  // Initialize filters from URL params
  useEffect(() => {
    const page = searchParams.get("page")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const start = searchParams.get("startDate")
    const end = searchParams.get("endDate")
    const search = searchParams.get("search")

    if (page) setPage(Number.parseInt(page))
    if (type) setTypeFilter(type)
    if (status) setStatusFilter(status)
    if (start) setStartDate(new Date(start))
    if (end) setEndDate(new Date(end))
    if (search) setSearchQuery(search)
  }, [searchParams])

  // Fetch transactions data
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Build query parameters
        const params = new URLSearchParams()
        params.append("page", page.toString())
        params.append("limit", limit.toString())

        if (typeFilter !== "all") params.append("type", typeFilter)
        if (statusFilter !== "all") params.append("status", statusFilter)
        if (startDate) params.append("startDate", startDate.toISOString().split("T")[0])
        if (endDate) params.append("endDate", endDate.toISOString().split("T")[0])
        if (searchQuery) params.append("search", searchQuery)

        // Fetch transactions
        const response = await fetch(`/api/partner/wallet/transactions?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`)
        }

        const data = await response.json()
        setTransactions(data.data)
        setTotalPages(data.pagination.pages)
        setTotalTransactions(data.pagination.total)

        // Get currency from wallet
        const walletResponse = await fetch("/api/partner/wallet")
        if (walletResponse.ok) {
          const walletData = await walletResponse.json()
          setCurrency(walletData.currency)
        }

        // Update URL with filters
        updateUrlWithFilters()
      } catch (error) {
        console.error("Error fetching transactions:", error)
        setError(error instanceof Error ? error.message : "Failed to load transactions")
        toast.error("Failed to load transactions. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [page, limit, typeFilter, statusFilter, startDate, endDate, searchQuery])

  // Update URL with current filters
  const updateUrlWithFilters = () => {
    const params = new URLSearchParams()

    params.append("page", page.toString())
    if (typeFilter !== "all") params.append("type", typeFilter)
    if (statusFilter !== "all") params.append("status", statusFilter)
    if (startDate) params.append("startDate", startDate.toISOString().split("T")[0])
    if (endDate) params.append("endDate", endDate.toISOString().split("T")[0])
    if (searchQuery) params.append("search", searchQuery)

    const url = `/partner/transactions?${params.toString()}`
    window.history.replaceState({}, "", url)
  }

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", limit.toString())

      if (typeFilter !== "all") params.append("type", typeFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (startDate) params.append("startDate", startDate.toISOString().split("T")[0])
      if (endDate) params.append("endDate", endDate.toISOString().split("T")[0])
      if (searchQuery) params.append("search", searchQuery)

      // Fetch transactions
      const response = await fetch(`/api/partner/wallet/transactions?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`Failed to refresh transactions: ${response.statusText}`)
      }

      const data = await response.json()
      setTransactions(data.data)
      setTotalPages(data.pagination.pages)
      setTotalTransactions(data.pagination.total)

      toast.success("Transactions refreshed successfully")
    } catch (error) {
      console.error("Error refreshing transactions:", error)
      setError(error instanceof Error ? error.message : "Failed to refresh transactions")
      toast.error("Failed to refresh transactions. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle export transactions
  const handleExportTransactions = async () => {
    try {
      setIsExporting(true)

      // Build query parameters for export
      const params = new URLSearchParams()

      if (typeFilter !== "all") params.append("type", typeFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (startDate) params.append("startDate", startDate.toISOString().split("T")[0])
      if (endDate) params.append("endDate", endDate.toISOString().split("T")[0])
      if (searchQuery) params.append("search", searchQuery)

      // Make API call to export transactions
      const response = await fetch(`/api/partner/wallet/transactions/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to export transactions")
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Transactions exported successfully")
    } catch (error) {
      console.error("Error exporting transactions:", error)
      toast.error("Failed to export transactions. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to first page when searching
  }

  // Handle clear filters
  const handleClearFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    setStartDate(subDays(new Date(), 30))
    setEndDate(new Date())
    setSearchQuery("")
    setPage(1)

    // Update URL
    router.push("/partner/transactions")
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return <ArrowDown className="h-4 w-4 text-green-500" />
      case "WITHDRAWAL":
        return <ArrowUp className="h-4 w-4 text-amber-500" />
      case "PAYMENT":
        return <CreditCard className="h-4 w-4 text-blue-500" />
      case "REFUND":
        return <RefreshCw className="h-4 w-4 text-purple-500" />
      case "ADJUSTMENT":
        return <Settings className="h-4 w-4 text-gray-500" />
      default:
        return <History className="h-4 w-4" />
    }
  }

  // Get transaction status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success"
      case "PENDING":
      case "PROCESSING":
        return "warning"
      case "FAILED":
        return "destructive"
      default:
        return "default"
    }
  }

  if (settingsLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} variant="outline" className="mt-4" disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Trying Again...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View and manage your complete transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTransactions}
            disabled={isExporting || transactions.length === 0}
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by reference or description..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
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
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Date Range</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker date={startDate} setDate={setStartDate} className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <DatePicker date={endDate} setDate={setEndDate} className="w-full" />
                    </div>
                    <Button className="w-full" onClick={() => updateUrlWithFilters()}>
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="sm" className="h-10" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
                <span className="sr-only md:not-sr-only md:ml-2">Clear</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all" || startDate || endDate
                  ? "Try adjusting your filters to find what you're looking for."
                  : "You don't have any transactions yet."}
              </p>
              {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || startDate || endDate) && (
                <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        transaction.type === "DEPOSIT"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : transaction.type === "WITHDRAWAL"
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : transaction.type === "PAYMENT"
                              ? "bg-blue-100 dark:bg-blue-900/30"
                              : transaction.type === "REFUND"
                                ? "bg-purple-100 dark:bg-purple-900/30"
                                : "bg-gray-100 dark:bg-gray-800",
                      )}
                    >
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {transaction.type === "DEPOSIT"
                            ? "Deposit"
                            : transaction.type === "WITHDRAWAL"
                              ? "Withdrawal"
                              : transaction.type === "PAYMENT"
                                ? "Payment"
                                : transaction.type === "REFUND"
                                  ? "Refund"
                                  : transaction.type === "ADJUSTMENT"
                                    ? "Adjustment"
                                    : "Transaction"}
                        </p>
                        <Badge variant={getStatusBadge(transaction.status)}>{transaction.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      {transaction.reference && (
                        <p className="text-xs text-muted-foreground">Ref: {transaction.reference}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-medium",
                        transaction.type === "DEPOSIT" || transaction.type === "REFUND"
                          ? "text-green-600 dark:text-green-400"
                          : transaction.type === "WITHDRAWAL"
                            ? "text-amber-600 dark:text-amber-400"
                            : "",
                      )}
                    >
                      {transaction.type === "DEPOSIT" || transaction.type === "REFUND" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(transaction.date), "MMM d, yyyy")}</p>
                    {transaction.paymentMethod && (
                      <p className="text-xs text-muted-foreground">via {transaction.paymentMethod}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalTransactions)} of{" "}
                    {totalTransactions} transactions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
