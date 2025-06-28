"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowUpDown, Calendar, Check, ChevronsUpDown, Download, Filter, Info, Loader2, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { usePublicSettings } from "@/hooks/usePublicSettings"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Define payment types based on the Prisma schema
type Payment = {
  id: string
  amount: number
  paymentMethod: string
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
  dateInitiated: string
  dateCompleted?: string
  receiptUrl?: string
  notes?: string
  transactionId?: string
}

// Define invoice types based on the Prisma schema
type Invoice = {
  id: string
  invoiceNumber: string
  amount: number
  tax: number
  total: number
  status: "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED" | "PARTIALLY_PAID"
  dueDate: string
  createdAt: string
  items: any[]
}

export default function PaymentsPage() {
  const router = useRouter()
  const { generalSettings, paymentGateway, loading } = usePublicSettings()
  
  // State for payments data
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("payments")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Payment stats
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingAmount: 0,
    thisMonth: 0,
    lastMonth: 0,
  })

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true)
        
        // In a real app, you would fetch from your API
        // const response = await fetch('/api/partner/payments')
        // const data = await response.json()
        
        // Mock data for demonstration
        const mockPayments: Payment[] = [
          {
            id: "pay_1",
            amount: 1250.00,
            paymentMethod: "BANK_TRANSFER",
            status: "COMPLETED",
            dateInitiated: "2023-05-15T10:30:00Z",
            dateCompleted: "2023-05-16T14:20:00Z",
            transactionId: "tx_abc123",
            receiptUrl: "/receipts/pay_1.pdf",
          },
          {
            id: "pay_2",
            amount: 980.50,
            paymentMethod: "MPESA",
            status: "COMPLETED",
            dateInitiated: "2023-06-01T08:15:00Z",
            dateCompleted: "2023-06-01T08:20:00Z",
            transactionId: "tx_def456",
            receiptUrl: "/receipts/pay_2.pdf",
          },
          {
            id: "pay_3",
            amount: 1500.00,
            paymentMethod: "BANK_TRANSFER",
            status: "PENDING",
            dateInitiated: "2023-06-10T16:45:00Z",
            notes: "Awaiting bank confirmation",
          },
          {
            id: "pay_4",
            amount: 750.25,
            paymentMethod: "FLUTTERWAVE",
            status: "COMPLETED",
            dateInitiated: "2023-06-20T11:30:00Z",
            dateCompleted: "2023-06-20T11:35:00Z",
            transactionId: "tx_ghi789",
            receiptUrl: "/receipts/pay_4.pdf",
          },
          {
            id: "pay_5",
            amount: 320.00,
            paymentMethod: "MPESA",
            status: "FAILED",
            dateInitiated: "2023-06-25T09:10:00Z",
            notes: "Insufficient funds",
          },
        ]
        
        const mockInvoices: Invoice[] = [
          {
            id: "inv_1",
            invoiceNumber: "INV-2023-001",
            amount: 1250.00,
            tax: 200.00,
            total: 1450.00,
            status: "PAID",
            dueDate: "2023-05-30T00:00:00Z",
            createdAt: "2023-05-15T10:30:00Z",
            items: [
              { description: "Ad delivery services - May 2023", amount: 1250.00 }
            ]
          },
          {
            id: "inv_2",
            invoiceNumber: "INV-2023-002",
            amount: 980.50,
            tax: 156.88,
            total: 1137.38,
            status: "PAID",
            dueDate: "2023-06-15T00:00:00Z",
            createdAt: "2023-06-01T08:15:00Z",
            items: [
              { description: "Ad delivery services - June 2023 (Week 1-2)", amount: 980.50 }
            ]
          },
          {
            id: "inv_3",
            invoiceNumber: "INV-2023-003",
            amount: 1500.00,
            tax: 240.00,
            total: 1740.00,
            status: "UNPAID",
            dueDate: "2023-06-30T00:00:00Z",
            createdAt: "2023-06-10T16:45:00Z",
            items: [
              { description: "Ad delivery services - June 2023 (Week 3-4)", amount: 1500.00 }
            ]
          },
          {
            id: "inv_4",
            invoiceNumber: "INV-2023-004",
            amount: 750.25,
            tax: 120.04,
            total: 870.29,
            status: "PAID",
            dueDate: "2023-07-15T00:00:00Z",
            createdAt: "2023-06-20T11:30:00Z",
            items: [
              { description: "Premium location services", amount: 500.00 },
              { description: "Analytics package", amount: 250.25 }
            ]
          },
          {
            id: "inv_5",
            invoiceNumber: "INV-2023-005",
            amount: 320.00,
            tax: 51.20,
            total: 371.20,
            status: "OVERDUE",
            dueDate: "2023-07-10T00:00:00Z",
            createdAt: "2023-06-25T09:10:00Z",
            items: [
              { description: "Maintenance services", amount: 320.00 }
            ]
          },
        ]
        
        // Calculate stats
        const totalPaid = mockPayments
          .filter(p => p.status === "COMPLETED")
          .reduce((sum, p) => sum + p.amount, 0)
          
        const pendingAmount = mockPayments
          .filter(p => p.status === "PENDING")
          .reduce((sum, p) => sum + p.amount, 0)
          
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()
        
        const thisMonth = mockPayments
          .filter(p => {
            const paymentDate = new Date(p.dateInitiated)
            return paymentDate.getMonth() === currentMonth && 
                   paymentDate.getFullYear() === currentYear &&
                   p.status === "COMPLETED"
          })
          .reduce((sum, p) => sum + p.amount, 0)
          
        const lastMonth = mockPayments
          .filter(p => {
            const paymentDate = new Date(p.dateInitiated)
            const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
            return paymentDate.getMonth() === lastMonthDate.getMonth() && 
                   paymentDate.getFullYear() === lastMonthDate.getFullYear() &&
                   p.status === "COMPLETED"
          })
          .reduce((sum, p) => sum + p.amount, 0)
        
        setPayments(mockPayments)
        setInvoices(mockInvoices)
        setStats({
          totalPaid,
          pendingAmount,
          thisMonth,
          lastMonth
        })
        setTotalPages(Math.ceil(mockPayments.length / 10))
        
      } catch (error) {
        console.error("Error fetching payments:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPayments()
  }, [])
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // In a real app, you would refetch data here
    // For demo, we'll just simulate a delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }
  
  // Filter payments based on search query and filters
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.transactionId && payment.transactionId.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Status filter
    const matchesStatus = statusFilter === "all" || payment.status.toLowerCase() === statusFilter.toLowerCase()
    
    // Date filter
    let matchesDate = true
    if (dateFilter !== "all") {
      const paymentDate = new Date(payment.dateInitiated)
      const now = new Date()
      
      if (dateFilter === "today") {
        matchesDate = paymentDate.toDateString() === now.toDateString()
      } else if (dateFilter === "this-week") {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        matchesDate = paymentDate >= startOfWeek
      } else if (dateFilter === "this-month") {
        matchesDate = 
          paymentDate.getMonth() === now.getMonth() && 
          paymentDate.getFullYear() === now.getFullYear()
      } else if (dateFilter === "this-year") {
        matchesDate = paymentDate.getFullYear() === now.getFullYear()
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })
  
  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const dateA = new Date(a.dateInitiated).getTime()
    const dateB = new Date(b.dateInitiated).getTime()
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA
  })
  
  // Paginate payments
  const paginatedPayments = sortedPayments.slice((currentPage - 1) * 10, currentPage * 10)
  
  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(invoice => {
    return searchQuery === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  })
  
  // Format currency based on settings
  const formatCurrency = (amount: number) => {
    const currency = generalSettings?.defaultCurrency || "USD"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return "success"
      case "PENDING":
        return "warning"
      case "FAILED":
      case "OVERDUE":
        return "destructive"
      case "REFUNDED":
      case "CANCELLED":
        return "outline"
      case "PARTIALLY_PAID":
        return "secondary"
      default:
        return "default"
    }
  }
  
  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "BANK_TRANSFER":
        return "Bank Transfer"
      case "MPESA":
        return "M-Pesa"
      case "FLUTTERWAVE":
        return "Flutterwave"
      case "VISA":
        return "Visa"
      case "MASTERCARD":
        return "Mastercard"
      case "PAYPAL":
        return "PayPal"
      default:
        return method
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage your payments, invoices, and transaction history
          </p>
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
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime earnings from all completed payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total amount in pending payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total earnings for the current month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.lastMonth)}</div>
            <div className="flex items-center mt-1">
              {stats.thisMonth > stats.lastMonth ? (
                <Badge variant="success" className="text-xs">
                  +{((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  {((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for Payments and Invoices */}
      <Tabs defaultValue="payments" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full md:w-[200px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {activeTab === "payments" && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : paginatedPayments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Info className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No payments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We couldn't find any payments matching your criteria.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.id}</TableCell>
                        <TableCell>
                          {format(new Date(payment.dateInitiated), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{formatPaymentMethod(payment.paymentMethod)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(payment.status)}>
                            {payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/partner/payments/${payment.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              {payment.receiptUrl && (
                                <DropdownMenuItem>
                                  Download Receipt
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Contact Support</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, filteredPayments.length)}
                    </span>{" "}
                    of <span className="font-medium">{filteredPayments.length}</span> payments
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Info className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No invoices found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We couldn't find any invoices matching your criteria.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(invoice.status)}>
                            {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/partner/invoices/${invoice.id}`)}>
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Download PDF
                              </DropdownMenuItem>
                              {invoice.status === "UNPAID" && (
                                <DropdownMenuItem>
                                  Pay Now
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Contact Support</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Payment Methods Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure your preferred payment methods for receiving earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Bank Transfer (Default)</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentGateway?.paymentTerms === "net30" ? "30-day" : 
                     paymentGateway?.paymentTerms === "net15" ? "15-day" : "7-day"} payment terms
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
            
            {paymentGateway?.mpesaEnabled && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <div className="h-5 w-5 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">M-Pesa</p>
                    <p className="text-sm text-muted-foreground">
                      Instant payments via mobile money
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            )}
            
            {paymentGateway?.flutterwaveEnabled && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <div className="h-5 w-5 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Flutterwave</p>
                    <p className="text-sm text-muted-foreground">
                      Multiple payment options across Africa
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            )}
            
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
