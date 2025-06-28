"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Receipt,
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
import { useToast } from "@/components/ui/use-toast"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"

// Types based on Prisma schema
interface PaymentMethod {
  id: string
  type: "VISA" | "MASTERCARD" | "AMEX" | "MPESA" | "FLUTTERWAVE" | "PAYPAL" | "BANK_TRANSFER" | "OTHER"
  last4: string
  isDefault: boolean
}

interface Payment {
  id: string
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
  dateCompleted?: string
  paymentMethod?: PaymentMethod
}

interface Campaign {
  name: string
  status: string
}

interface Billing {
  id: string
  invoiceNumber: string
  amount: number
  tax: number
  total: number
  status: "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED" | "PARTIALLY_PAID"
  dueDate: string
  items: {
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }[]
  campaign: Campaign
  payment?: Payment
  advertiser: {
    companyName: string
    user: {
      email: string
    }
  }
}

interface BillingResponse {
  billings: Billing[]
  pagination: {
    total: number
    pages: number
    page: number
    pageSize: number
  }
  summary: {
    totalBillings: number
    totalAmount: number
    totalTax: number
    totalDue: number
  }
  paymentMethods: PaymentMethod[]
}

export default function BillingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null)

  // Fetch billing data
  const {
    data: billingData,
    isLoading,
    error,
    refetch,
  } = useQuery<BillingResponse>({
    queryKey: ["billing", params.id, statusFilter, page, pageSize, dateRange],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (statusFilter !== "all") searchParams.append("status", statusFilter)
      if (dateRange.from) searchParams.append("startDate", dateRange.from.toISOString())
      if (dateRange.to) searchParams.append("endDate", dateRange.to.toISOString())
      searchParams.append("page", page.toString())
      searchParams.append("pageSize", pageSize.toString())

      const response = await fetch(`/api/admin/billing/${params.id}?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch billing data")
      }
      return response.json()
    },
  })

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Handle billing deletion
  const handleDelete = async () => {
    if (!selectedBillingId) return

    try {
      const response = await fetch(`/api/admin/billing/${selectedBillingId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete billing record")
      }

      toast({
        title: "Success",
        description: "Billing record has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setSelectedBillingId(null)
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete billing record",
        variant: "destructive",
      })
    }
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load billing data</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
      </div>
    )
  }

  const { billings = [], pagination, summary, paymentMethods = [] } = billingData || {}

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Payments</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage billing records and payment methods
            </p>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Records
            </Button>
            <Button asChild>
              <Link href={`/admin/advertisers/${params.id}/billing/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalBillings || 0}</div>
            <p className="text-xs text-muted-foreground">All time billing records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Before tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalTax || 0)}</div>
            <p className="text-xs text-muted-foreground">Collected tax amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalDue || 0)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Active payment methods for this advertiser</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/admin/advertisers/${params.id}/billing/payment-methods/new`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {method.type} ending in {method.last4}
                    </p>
                    {method.isDefault && (
                      <Badge variant="outline" className="mt-1">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Set as Default</DropdownMenuItem>
                    <DropdownMenuItem>Update Details</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative flex-grow">
            <Input
              type="search"
              placeholder="Search invoices..."
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
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Records</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("UNPAID")}>Unpaid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("PAID")}>Paid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("OVERDUE")}>Overdue</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("CANCELLED")}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DatePickerWithRange
          value={dateRange}
          onChange={setDateRange}
          align="end"
          locale="en-US"
          placeholder="Select date range"
        />
      </div>

      {/* Billing Records Table */}
      <div className="rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="flex items-center cursor-pointer">
                  Invoice
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>
                <div className="flex items-center cursor-pointer">
                  Due Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center cursor-pointer">
                  Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No billing records found.
                </TableCell>
              </TableRow>
            ) : (
              billings.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/admin/advertisers/${params.id}/billing/${billing.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {billing.invoiceNumber}
                      </Link>
                      <span className="text-xs text-gray-500">{billing.advertiser.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{billing.campaign.name}</span>
                      <Badge variant="outline">{billing.campaign.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(billing.dueDate)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatCurrency(billing.total)}</span>
                      <span className="text-xs text-gray-500">
                        Tax: {formatCurrency(billing.tax)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        billing.status === "PAID"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : billing.status === "UNPAID"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : billing.status === "OVERDUE"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }
                    >
                      {billing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {billing.payment ? (
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit">
                          {billing.payment.status}
                        </Badge>
                        {billing.payment.dateCompleted && (
                          <span className="text-xs text-gray-500">
                            {formatDate(billing.payment.dateCompleted)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="w-fit">
                        No Payment
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/advertisers/${params.id}/billing/${billing.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/advertisers/${params.id}/billing/${billing.id}/edit`}>
                            Edit Invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Receipt className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedBillingId(billing.id)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          Delete Record
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
          Showing <strong>{billings.length}</strong> of <strong>{pagination?.total || 0}</strong> records
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (pagination?.pages || 1)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Billing Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this billing record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting this record will remove all associated payment information.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 