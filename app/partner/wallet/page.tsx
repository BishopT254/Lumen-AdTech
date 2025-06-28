"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, addMonths } from "date-fns"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BanknoteIcon,
  BarChart3,
  CreditCard,
  Download,
  History,
  Loader2,
  RefreshCw,
  Send,
  Settings,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

// Define wallet type based on Prisma schema
type WalletType = {
  id: string
  balance: number
  currency: string
  pendingBalance: number
  lastUpdated: string
  payoutThreshold: number
  autoPayoutEnabled: boolean
  nextPayoutDate?: string
  paymentMethods: PaymentMethod[]
  walletStatus: "ACTIVE" | "SUSPENDED" | "LOCKED"
}

// Define payment method type
type PaymentMethod = {
  id: string
  type: "BANK_TRANSFER" | "MPESA" | "FLUTTERWAVE" | "PAYPAL" | "STRIPE"
  isDefault: boolean
  details: Record<string, any>
}

// Define withdrawal request type
type WithdrawalRequest = {
  amount: number
  method: string
  accountDetails?: Record<string, any>
}

export default function WalletPage() {
  const router = useRouter()
  const { generalSettings, commissionRates, loading: settingsLoading } = usePublicSettings()

  // State for wallet data
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawMethod, setWithdrawMethod] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch wallet data
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch wallet data
        const walletResponse = await fetch("/api/partner/wallet")

        if (!walletResponse.ok) {
          throw new Error(`Failed to fetch wallet data: ${walletResponse.statusText}`)
        }

        const walletData = await walletResponse.json()
        setWallet(walletData)

        // Set default withdrawal method if available
        if (walletData.paymentMethods && walletData.paymentMethods.length > 0) {
          const defaultMethod = walletData.paymentMethods.find((method: PaymentMethod) => method.isDefault)
          setWithdrawMethod(defaultMethod ? defaultMethod.type : walletData.paymentMethods[0].type)
        }

        // Fetch transactions
        await fetchTransactions(1)
      } catch (error) {
        console.error("Error fetching wallet data:", error)
        setError(error instanceof Error ? error.message : "Failed to load wallet data")
        toast.error("Failed to load wallet data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWalletData()
  }, [])

  // Fetch transactions with pagination
  const fetchTransactions = async (pageNumber: number) => {
    try {
      const transactionsResponse = await fetch(`/api/partner/wallet/transactions?page=${pageNumber}&limit=10`)

      if (!transactionsResponse.ok) {
        throw new Error(`Failed to fetch transactions: ${transactionsResponse.statusText}`)
      }

      const transactionsData = await transactionsResponse.json()
      setTransactions(transactionsData.data)
      setTotalPages(transactionsData.pagination.pages)
      setPage(pageNumber)

      return transactionsData
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions. Please try again.")
      return null
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      // Fetch wallet data
      const walletResponse = await fetch("/api/partner/wallet")

      if (!walletResponse.ok) {
        throw new Error(`Failed to refresh wallet data: ${walletResponse.statusText}`)
      }

      const walletData = await walletResponse.json()
      setWallet(walletData)

      // Fetch transactions for current page
      await fetchTransactions(page)

      toast.success("Wallet data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing wallet data:", error)
      setError(error instanceof Error ? error.message : "Failed to refresh wallet data")
      toast.error("Failed to refresh wallet data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle withdraw
  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true)

      // Validate amount
      const amount = Number.parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount")
        return
      }

      if (wallet && amount > wallet.balance) {
        toast.error("Insufficient balance")
        return
      }

      // Prepare withdrawal request
      const withdrawalRequest: WithdrawalRequest = {
        amount,
        method: withdrawMethod,
      }

      // Make API call to initiate withdrawal
      const response = await fetch("/api/partner/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withdrawalRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process withdrawal")
      }

      const result = await response.json()

      // Update wallet balance
      if (wallet) {
        setWallet({
          ...wallet,
          balance: wallet.balance - amount,
        })
      }

      // Refresh transactions to show the new withdrawal
      await fetchTransactions(1)

      // Close dialog and reset form
      setWithdrawDialogOpen(false)
      setWithdrawAmount("")

      toast.success("Withdrawal request submitted successfully")
    } catch (error) {
      console.error("Error processing withdrawal:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process withdrawal")
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Handle export transactions
  const handleExportTransactions = async () => {
    try {
      setIsExporting(true)

      // Make API call to export transactions
      const response = await fetch("/api/partner/wallet/transactions/export", {
        method: "GET",
      })

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

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter((transaction) => {
    if (activeTab === "all") return true
    if (activeTab === "deposits") return transaction.type === "DEPOSIT"
    if (activeTab === "withdrawals") return transaction.type === "WITHDRAWAL"
    if (activeTab === "pending") return transaction.status === "PENDING" || transaction.status === "PROCESSING"
    return true
  })

  // Format currency based on settings
  const formatCurrency = (amount: number) => {
    const currency = wallet?.currency || generalSettings?.defaultCurrency || "USD"
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

  // Calculate next auto-payout date if enabled
  const calculateNextPayoutDate = () => {
    if (!wallet) return null

    if (wallet.nextPayoutDate) {
      return format(parseISO(wallet.nextPayoutDate), "MMM d, yyyy")
    }

    if (wallet.autoPayoutEnabled) {
      // If auto-payout is enabled but no date is set, estimate based on current date
      // Typically payouts happen at the start of the month or every 15 days
      const today = new Date()
      const nextMonth = addMonths(today, 1)
      const nextPayoutDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1)
      return format(nextPayoutDate, "MMM d, yyyy")
    }

    return "Not scheduled"
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchTransactions(newPage)
  }

  // Navigate to wallet settings
  const handleWalletSettings = () => {
    router.push("/partner/settings?tab=payment")
  }

  if (settingsLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
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
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">Manage your earnings, withdrawals, and transaction history</p>
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
          <Button size="sm" onClick={handleWalletSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Wallet Settings
          </Button>
        </div>
      </div>

      {/* Wallet Status Alert */}
      {wallet && wallet.walletStatus !== "ACTIVE" && (
        <Alert variant={wallet.walletStatus === "SUSPENDED" ? "destructive" : "warning"} className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{wallet.walletStatus === "SUSPENDED" ? "Wallet Suspended" : "Wallet Locked"}</AlertTitle>
          <AlertDescription>
            {wallet.walletStatus === "SUSPENDED"
              ? "Your wallet has been suspended. Please contact support for assistance."
              : "Your wallet is temporarily locked. This may be due to security concerns or verification requirements."}
          </AlertDescription>
        </Alert>
      )}

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={cn(
            "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground",
            wallet?.walletStatus !== "ACTIVE" && "opacity-70",
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-primary-foreground/90 text-sm font-medium">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{wallet ? formatCurrency(wallet.balance) : "—"}</div>
            <p className="text-xs text-primary-foreground/80 mt-1">
              Last updated: {wallet ? format(parseISO(wallet.lastUpdated), "MMM d, yyyy h:mm a") : "—"}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={!wallet || wallet.balance <= 0 || wallet.walletStatus !== "ACTIVE"}
            >
              <Send className="mr-2 h-4 w-4" />
              Withdraw Funds
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallet ? formatCurrency(wallet.pendingBalance) : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">Earnings that are still being processed</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" className="w-full" onClick={() => router.push("/partner/earnings")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Earnings
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateNextPayoutDate()}</div>
            <div className="flex items-center mt-1">
              <Badge variant={wallet?.autoPayoutEnabled ? "outline" : "secondary"} className="text-xs">
                {wallet?.autoPayoutEnabled ? "Auto-payout enabled" : "Manual withdrawals"}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="w-full text-xs text-muted-foreground">
              <div className="flex justify-between mb-1">
                <span>Payout threshold</span>
                <span>{wallet ? formatCurrency(wallet.payoutThreshold) : "—"}</span>
              </div>
              {wallet && (
                <Progress value={(wallet.balance / wallet.payoutThreshold) * 100} className="h-1.5" max={100} />
              )}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View your recent transactions and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTransactions}
                disabled={isExporting || transactions.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <History className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We couldn't find any transactions matching your criteria.
                  </p>
                </div>
              ) : (
                <>
                  {filteredTransactions.map((transaction) => (
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
                            <Badge variant={getStatusBadge(transaction.status)}>{String(transaction.status)}</Badge>
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
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(transaction.date), "MMM d, yyyy")}
                        </p>
                        {transaction.paymentMethod && (
                          <p className="text-xs text-muted-foreground">via {transaction.paymentMethod}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
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
                </>
              )}
            </div>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Button variant="outline" onClick={() => router.push("/partner/transactions")}>
            View All Transactions
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw and select your preferred payment method.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <BanknoteIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-10"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              {wallet && (
                <p className="text-xs text-muted-foreground">Available balance: {formatCurrency(wallet.balance)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {wallet?.paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={String(method.type)}>
                      {method.type === "BANK_TRANSFER"
                        ? "Bank Transfer"
                        : method.type === "MPESA"
                          ? "M-Pesa"
                          : method.type === "FLUTTERWAVE"
                            ? "Flutterwave"
                            : method.type === "PAYPAL"
                              ? "PayPal"
                              : method.type === "STRIPE"
                                ? "Stripe"
                                : String(method.type)}
                      {method.isDefault && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can manage your payment methods in{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setWithdrawDialogOpen(false)
                    handleWalletSettings()
                  }}
                >
                  Wallet Settings
                </Button>
              </p>
            </div>

            <Separator />

            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span>Amount</span>
                <span>{withdrawAmount ? formatCurrency(Number.parseFloat(withdrawAmount)) : formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Fee</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{withdrawAmount ? formatCurrency(Number.parseFloat(withdrawAmount)) : formatCurrency(0)}</span>
              </div>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Processing Time</AlertTitle>
              <AlertDescription>
                Withdrawals typically take 1-3 business days to process, depending on your payment method.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={
                isWithdrawing ||
                !withdrawAmount ||
                Number.parseFloat(withdrawAmount) <= 0 ||
                (wallet && Number.parseFloat(withdrawAmount) > wallet.balance) ||
                !withdrawMethod
              }
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Withdraw Funds</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
