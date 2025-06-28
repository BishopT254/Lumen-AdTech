"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Download } from "lucide-react"

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case "credit_card":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <rect width="20" height="12" x="2" y="6" rx="3" />
          <path d="M2 10h20" />
        </svg>
      )
    case "paypal":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <path d="M6 6h12l-1 6H7z" />
          <path d="M6 12H18" />
          <path d="M6 18H18" />
        </svg>
      )
    case "bank_transfer":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <path d="M2 14h20" />
          <path d="M6 10V6" />
          <path d="M18 10V6" />
        </svg>
      )
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <div className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">Pending</div>
    case "completed":
      return <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Completed</div>
    case "failed":
      return <div className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Failed</div>
    case "refunded":
      return <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">Refunded</div>
    case "processing":
      return <div className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">Processing</div>
    default:
      return <div className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">Unknown</div>
  }
}

export default function PaymentsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)

  const [payments, setPayments] = useState([
    {
      id: "1",
      advertiser: "Acme Corp",
      amount: 1000,
      method: "credit_card",
      status: "completed",
      date: new Date(),
    },
    {
      id: "2",
      advertiser: "Beta Co",
      amount: 500,
      method: "paypal",
      status: "pending",
      date: new Date(),
    },
    {
      id: "3",
      advertiser: "Gamma Inc",
      amount: 750,
      method: "bank_transfer",
      status: "failed",
      date: new Date(),
    },
  ])
  const [paymentsPagination, setPaymentsPagination] = useState({
    page: 1,
    limit: 10,
    total: 100,
    pages: 10,
  })

  const [payouts, setPayouts] = useState([
    {
      id: "1",
      partner: "Partner A",
      amount: 500,
      status: "completed",
      periodStart: new Date(),
      periodEnd: new Date(),
      impressions: 10000,
    },
    {
      id: "2",
      partner: "Partner B",
      amount: 250,
      status: "pending",
      periodStart: new Date(),
      periodEnd: new Date(),
      impressions: 5000,
    },
  ])
  const [payoutsPagination, setPayoutsPagination] = useState({
    page: 1,
    limit: 10,
    total: 50,
    pages: 5,
  })

  const [invoices, setInvoices] = useState([
    {
      id: "1",
      invoiceNumber: "INV-2024-001",
      advertiser: "Acme Corp",
      campaignName: "Summer Campaign",
      total: 1200,
      status: "completed",
      dueDate: new Date(),
    },
    {
      id: "2",
      invoiceNumber: "INV-2024-002",
      advertiser: "Beta Co",
      campaignName: "Winter Promotion",
      total: 800,
      status: "pending",
      dueDate: new Date(),
    },
  ])
  const [invoicesPagination, setInvoicesPagination] = useState({
    page: 1,
    limit: 10,
    total: 20,
    pages: 2,
  })

  const [paymentSettings, setPaymentSettings] = useState({
    paymentGateway: {
      provider: "Stripe",
      apiKey: "sk_test_...",
      supportedCurrencies: ["USD", "EUR", "GBP"],
    },
    commissionRates: {
      default: 0.3,
      premium: 0.35,
      minimumPayout: 100,
    },
    taxSettings: {
      defaultRate: 0.16,
      taxId: "VAT123456789",
    },
  })

  const [reportType, setReportType] = useState("revenue")
  const [reportGroupBy, setReportGroupBy] = useState("month")
  const [reportDateRange, setReportDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()),
    to: new Date(),
  })
  const [reportData, setReportData] = useState([])

  const [overviewData, setOverviewData] = useState({
    totalRevenue: 1234567,
    totalPartnerPayouts: 123456,
    outstandingInvoices: 12345,
    avgTransaction: 123.45,
    changes: {
      revenueChange: 12.34,
      payoutsChange: -12.34,
      outstandingChange: -12.34,
      avgTransactionChange: 12.34,
    },
    revenueData: [
      {
        date: "2021-01-01",
        revenue: 1000,
      },
      {
        date: "2021-01-02",
        revenue: 2000,
      },
    ],
    paymentMethodDistribution: [
      {
        method: "credit_card",
        amount: 1000,
      },
      {
        method: "paypal",
        amount: 500,
      },
    ],
  })

  const [selectedPayment, setSelectedPayment] = useState(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  const [selectedPayout, setSelectedPayout] = useState(null)
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false)

  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)

  const [isGenerateEarningsDialogOpen, setIsGenerateEarningsDialogOpen] = useState(false)
  const [isGenerateInvoicesDialogOpen, setIsGenerateInvoicesDialogOpen] = useState(false)

  const handleSaveSettings = async (type: string, data: any) => {
    setIsSavingSettings(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (type === "payment_gateway") {
      setPaymentSettings({
        ...paymentSettings,
        paymentGateway: data,
      })
    } else if (type === "commission_rates") {
      setPaymentSettings({
        ...paymentSettings,
        commissionRates: data,
      })
    } else if (type === "tax_settings") {
      setPaymentSettings({
        ...paymentSettings,
        taxSettings: data,
      })
    }
    setIsSavingSettings(false)
  }

  const fetchReportData = async () => {
    setIsReportLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const mockData = [
      {
        period: "January 2024",
        revenue: 10000,
        transactions: 100,
      },
      {
        period: "February 2024",
        revenue: 12000,
        transactions: 120,
      },
    ]
    setReportData(mockData)
    setIsReportLoading(false)
  }

  const handleExportData = async (format: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    alert(`Exporting data in ${format} format`)
  }

  return (
    <div className="space-y-6">
        <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Manage payments, payouts, and financial settings.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advertiser-payments">Advertiser Payments</TabsTrigger>
          <TabsTrigger value="partner-payouts">Partner Payouts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {/* Skeleton loading state for KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Skeleton loading state for charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${overviewData?.totalRevenue.toLocaleString() || "0"}</div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={`flex items-center ${overviewData?.changes.revenueChange && overviewData.changes.revenueChange >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {overviewData?.changes.revenueChange && overviewData.changes.revenueChange >= 0 ? (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        )}
                        {overviewData?.changes.revenueChange ? `${overviewData.changes.revenueChange}%` : "0%"}
                      </span>{" "}
                      from previous period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Partner Payouts</CardTitle>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${overviewData?.totalPartnerPayouts.toLocaleString() || "0"}
        </div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={`flex items-center ${overviewData?.changes.payoutsChange && overviewData.changes.payoutsChange >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {overviewData?.changes.payoutsChange && overviewData.changes.payoutsChange >= 0 ? (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        )}
                        {overviewData?.changes.payoutsChange ? `${overviewData.changes.payoutsChange}%` : "0%"}
                      </span>{" "}
                      from previous period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${overviewData?.outstandingInvoices.toLocaleString() || "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={`flex items-center ${overviewData?.changes.outstandingChange && overviewData.changes.outstandingChange <= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {overviewData?.changes.outstandingChange && overviewData.changes.outstandingChange <= 0 ? (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        )}
                        {overviewData?.changes.outstandingChange
                          ? `${Math.abs(overviewData.changes.outstandingChange)}%`
                          : "0%"}
                      </span>{" "}
                      from previous period
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      $
                      {overviewData?.avgTransaction.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={`flex items-center ${overviewData?.changes.avgTransactionChange && overviewData.changes.avgTransactionChange >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {overviewData?.changes.avgTransactionChange &&
                        overviewData.changes.avgTransactionChange >= 0 ? (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        )}
                        {overviewData?.changes.avgTransactionChange
                          ? `${overviewData.changes.avgTransactionChange}%`
                          : "0%"}
                      </span>{" "}
                      from previous period
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue & Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {overviewData?.revenueData ? (
                      <div className="h-full">
                        {/* Revenue chart would be rendered here */}
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-muted-foreground">Revenue chart visualization</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">No revenue data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {overviewData?.paymentMethodDistribution && overviewData.paymentMethodDistribution.length > 0 ? (
                      <div className="h-full">
                        {/* Payment method distribution chart would be rendered here */}
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-muted-foreground">Payment method distribution chart</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">No payment method data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Advertiser Payments Tab */}
        <TabsContent value="advertiser-payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Advertiser Payments</CardTitle>
            <Button 
                  onClick={() => {
                    /* Handle create payment */
                  }}
                >
                  Create Payment
            </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Advertiser
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Amount
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Method
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {payments.length > 0 ? (
                            payments.map((payment) => (
                              <tr
                                key={payment.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              >
                                <td className="p-4 align-middle">{payment.advertiser}</td>
                                <td className="p-4 align-middle">${payment.amount.toLocaleString()}</td>
                                <td className="p-4 align-middle">
                                  <div className="flex items-center">
                                    {getPaymentMethodIcon(payment.method)}
                                    {payment.method}
                                  </div>
                                </td>
                                <td className="p-4 align-middle">{getStatusBadge(payment.status)}</td>
                                <td className="p-4 align-middle">{new Date(payment.date).toLocaleDateString()}</td>
                                <td className="p-4 align-middle">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment)
                                      setIsPaymentDialogOpen(true)
                                    }}
                                  >
                                    View
                </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                No payments found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {paymentsPagination.total > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(paymentsPagination.page - 1) * paymentsPagination.limit + 1} to{" "}
                        {Math.min(paymentsPagination.page * paymentsPagination.limit, paymentsPagination.total)} of{" "}
                        {paymentsPagination.total} payments
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (paymentsPagination.page > 1) {
                              setPaymentsPagination({
                                ...paymentsPagination,
                                page: paymentsPagination.page - 1,
                              })
                            }
                          }}
                          disabled={paymentsPagination.page === 1}
                        >
                          Previous
                  </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (paymentsPagination.page < paymentsPagination.pages) {
                              setPaymentsPagination({
                                ...paymentsPagination,
                                page: paymentsPagination.page + 1,
                              })
                            }
                          }}
                          disabled={paymentsPagination.page === paymentsPagination.pages}
                        >
                          Next
                  </Button>
                </div>
          </div>
                  )}
        </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partner Payouts Tab */}
        <TabsContent value="partner-payouts" className="space-y-4">
          <Card>
            <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>Partner Payouts</CardTitle>
                <Button onClick={() => setIsGenerateEarningsDialogOpen(true)}>Generate Earnings</Button>
            </div>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Partner
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Amount
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Period
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Impressions
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {payouts.length > 0 ? (
                            payouts.map((payout) => (
                              <tr
                                key={payout.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              >
                                <td className="p-4 align-middle">{payout.partner}</td>
                                <td className="p-4 align-middle">${payout.amount.toLocaleString()}</td>
                                <td className="p-4 align-middle">{getStatusBadge(payout.status)}</td>
                                <td className="p-4 align-middle">
                                  {new Date(payout.periodStart).toLocaleDateString()} -{" "}
                                  {new Date(payout.periodEnd).toLocaleDateString()}
                                </td>
                                <td className="p-4 align-middle">{payout.impressions.toLocaleString()}</td>
                                <td className="p-4 align-middle">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayout(payout)
                                      setIsPayoutDialogOpen(true)
                                    }}
                                  >
                                    View
                    </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                No payouts found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {payoutsPagination.total > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(payoutsPagination.page - 1) * payoutsPagination.limit + 1} to{" "}
                        {Math.min(payoutsPagination.page * payoutsPagination.limit, payoutsPagination.total)} of{" "}
                        {payoutsPagination.total} payouts
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (payoutsPagination.page > 1) {
                              setPayoutsPagination({
                                ...payoutsPagination,
                                page: payoutsPagination.page - 1,
                              })
                            }
                          }}
                          disabled={payoutsPagination.page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (payoutsPagination.page < payoutsPagination.pages) {
                              setPayoutsPagination({
                                ...payoutsPagination,
                                page: payoutsPagination.page + 1,
                              })
                            }
                          }}
                          disabled={payoutsPagination.page === payoutsPagination.pages}
                        >
                          Next
                        </Button>
                            </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoices</CardTitle>
                <Button onClick={() => setIsGenerateInvoicesDialogOpen(true)}>Generate Invoices</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Invoice #
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Advertiser
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Campaign
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Amount
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Due Date
                            </th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {invoices.length > 0 ? (
                            invoices.map((invoice) => (
                              <tr
                                key={invoice.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              >
                                <td className="p-4 align-middle">{invoice.invoiceNumber}</td>
                                <td className="p-4 align-middle">{invoice.advertiser}</td>
                                <td className="p-4 align-middle">{invoice.campaignName}</td>
                                <td className="p-4 align-middle">${invoice.total.toLocaleString()}</td>
                                <td className="p-4 align-middle">{getStatusBadge(invoice.status)}</td>
                                <td className="p-4 align-middle">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                                <td className="p-4 align-middle">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvoice(invoice)
                                      setIsInvoiceDialogOpen(true)
                                    }}
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                No invoices found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                              </div>
              </div>

                  {/* Pagination */}
                  {invoicesPagination.total > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(invoicesPagination.page - 1) * invoicesPagination.limit + 1} to{" "}
                        {Math.min(invoicesPagination.page * invoicesPagination.limit, invoicesPagination.total)} of{" "}
                        {invoicesPagination.total} invoices
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (invoicesPagination.page > 1) {
                              setInvoicesPagination({
                                ...invoicesPagination,
                                page: invoicesPagination.page - 1,
                              })
                            }
                          }}
                          disabled={invoicesPagination.page === 1}
                        >
                          Previous
                    </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (invoicesPagination.page < invoicesPagination.pages) {
                              setInvoicesPagination({
                                ...invoicesPagination,
                                page: invoicesPagination.page + 1,
                              })
                            }
                          }}
                          disabled={invoicesPagination.page === invoicesPagination.pages}
                        >
                          Next
                        </Button>
                            </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {isSettingsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Payment Gateway</h3>
                    <p className="text-sm text-muted-foreground mb-4">Configure your payment gateway settings</p>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="gateway-provider">Provider</Label>
                          <Input
                            id="gateway-provider"
                            defaultValue={paymentSettings?.paymentGateway?.provider || ""}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gateway-api-key">API Key</Label>
                          <Input
                            id="gateway-api-key"
                            type="password"
                            defaultValue={paymentSettings?.paymentGateway?.apiKey || ""}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="supported-currencies">Supported Currencies</Label>
                        <Input
                          id="supported-currencies"
                          defaultValue={
                            paymentSettings?.paymentGateway?.supportedCurrencies
                              ? paymentSettings.paymentGateway.supportedCurrencies.join(", ")
                              : "USD"
                          }
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Comma-separated list of currency codes</p>
                      </div>
                      <Button
                        onClick={() =>
                          handleSaveSettings("payment_gateway", {
                            provider: (document.getElementById("gateway-provider") as HTMLInputElement).value,
                            apiKey: (document.getElementById("gateway-api-key") as HTMLInputElement).value,
                            supportedCurrencies: (
                              document.getElementById("supported-currencies") as HTMLInputElement
                            ).value
                              .split(",")
                              .map((c) => c.trim()),
                          })
                        }
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          "Save Payment Gateway Settings"
                        )}
                      </Button>
                              </div>
              </div>

              <div>
                    <h3 className="text-lg font-medium">Commission Rates</h3>
                    <p className="text-sm text-muted-foreground mb-4">Configure partner commission rates</p>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="default-commission">Default Rate</Label>
                          <Input
                            id="default-commission"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            defaultValue={paymentSettings?.commissionRates?.default || 0.3}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">e.g. 0.3 for 30%</p>
                </div>
                        <div>
                          <Label htmlFor="premium-commission">Premium Rate</Label>
                          <Input
                            id="premium-commission"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            defaultValue={paymentSettings?.commissionRates?.premium || 0.35}
                            className="mt-1"
                          />
              </div>
                        <div>
                          <Label htmlFor="minimum-payout">Minimum Payout</Label>
                          <Input
                            id="minimum-payout"
                            type="number"
                            step="1"
                            min="0"
                            defaultValue={paymentSettings?.commissionRates?.minimumPayout || 100}
                            className="mt-1"
                          />
            </div>
                      </div>
                      <Button
                        onClick={() =>
                          handleSaveSettings("commission_rates", {
                            default: Number.parseFloat(
                              (document.getElementById("default-commission") as HTMLInputElement).value,
                            ),
                            premium: Number.parseFloat(
                              (document.getElementById("premium-commission") as HTMLInputElement).value,
                            ),
                            minimumPayout: Number.parseFloat(
                              (document.getElementById("minimum-payout") as HTMLInputElement).value,
                            ),
                          })
                        }
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? "Saving..." : "Save Commission Settings"}
              </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Tax Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">Configure tax rates and settings</p>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="default-tax-rate">Default Tax Rate</Label>
                          <Input
                            id="default-tax-rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            defaultValue={paymentSettings?.taxSettings?.defaultRate || 0.16}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">e.g. 0.16 for 16%</p>
                        </div>
                        <div>
                          <Label htmlFor="tax-id">Tax ID / VAT Number</Label>
                          <Input
                            id="tax-id"
                            defaultValue={paymentSettings?.taxSettings?.taxId || ""}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() =>
                          handleSaveSettings("tax_settings", {
                            defaultRate: Number.parseFloat(
                              (document.getElementById("default-tax-rate") as HTMLInputElement).value,
                            ),
                            taxId: (document.getElementById("tax-id") as HTMLInputElement).value,
                          })
                        }
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? "Saving..." : "Save Tax Settings"}
              </Button>
            </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
            <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="report-type">Report Type</Label>
                    <select
                      id="report-type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      <option value="revenue">Revenue Report</option>
                      <option value="payouts">Partner Payouts Report</option>
                      <option value="invoices">Invoices Report</option>
                      <option value="payment-methods">Payment Methods Report</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="report-group-by">Group By</Label>
                    <select
                      id="report-group-by"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={reportGroupBy}
                      onChange={(e) => setReportGroupBy(e.target.value)}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="quarter">Quarter</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2 block">Date Range</Label>
                    <DatePickerWithRange dateRange={reportDateRange} onDateRangeChange={setReportDateRange} />
                  </div>
                </div>
                <Button onClick={fetchReportData} disabled={isReportLoading}>
                  {isReportLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                </svg>
                      Generating Report...
                    </>
                  ) : (
                    "Generate Report"
                  )}
                </Button>

                {/* Report Results */}
                {!isReportLoading && reportData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">
                      {reportType === "revenue"
                        ? "Revenue Report"
                        : reportType === "payouts"
                          ? "Partner Payouts Report"
                          : reportType === "invoices"
                            ? "Invoices Report"
                            : "Payment Methods Report"}
                    </h3>
                    <div className="rounded-md border">
                      <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                          <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                              {reportType === "revenue" && (
                                <>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Period
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Revenue
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Transactions
                                  </th>
                                </>
                              )}
                              {reportType === "payouts" && (
                                <>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Period
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Amount
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Count
                                  </th>
                                </>
                              )}
                              {reportType === "invoices" && (
                                <>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Period
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Status
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Amount
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Count
                                  </th>
                                </>
                              )}
                              {reportType === "payment-methods" && (
                                <>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Method
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Amount
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Count
                                  </th>
                                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Percentage
                                  </th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="[&_tr:last-child]:border-0">
                            {reportData.map((item, index) => (
                              <tr
                                key={index}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                              >
                                {reportType === "revenue" && (
                                  <>
                                    <td className="p-4 align-middle">{item.period}</td>
                                    <td className="p-4 align-middle">${item.revenue.toLocaleString()}</td>
                                    <td className="p-4 align-middle">{item.transactions}</td>
                                  </>
                                )}
                                {reportType === "payouts" && (
                                  <>
                                    <td className="p-4 align-middle">{item.period}</td>
                                    <td className="p-4 align-middle">${item.amount.toLocaleString()}</td>
                                    <td className="p-4 align-middle">{item.count}</td>
                                  </>
                                )}
                                {reportType === "invoices" && (
                                  <>
                                    <td className="p-4 align-middle">{item.period}</td>
                                    <td className="p-4 align-middle">{getStatusBadge(item.status)}</td>
                                    <td className="p-4 align-middle">${item.amount.toLocaleString()}</td>
                                    <td className="p-4 align-middle">{item.count}</td>
                                  </>
                                )}
                                {reportType === "payment-methods" && (
                                  <>
                                    <td className="p-4 align-middle">
                                      <div className="flex items-center">
                                        {getPaymentMethodIcon(item.method)}
                                        {item.method}
                                      </div>
                                    </td>
                                    <td className="p-4 align-middle">${item.amount.toLocaleString()}</td>
                                    <td className="p-4 align-middle">{item.count}</td>
                                    <td className="p-4 align-middle">{item.percentage.toFixed(1)}%</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" onClick={() => handleExportData("csv")}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

