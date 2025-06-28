"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, parseISO, addDays, isBefore } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import type { DateRange } from "react-day-picker"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import {
  ArrowUpDown,
  CalendarIcon,
  CreditCard,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarRange,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LineChart,
  Wallet,
  FileSpreadsheet,
  FileIcon as FilePdf,
  Settings,
  CircleDollarSign,
  CreditCardIcon,
  BanknoteIcon as BankIcon,
  Smartphone,
  Eye,
  ArrowUpToLine,
  Pencil,
  Copy,
  Printer,
  Mail,
  CheckCheck,
  Undo2,
  Save,
} from "lucide-react"
import { CircleAlert } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// Types
type BillingStatus = "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED" | "PARTIALLY_PAID"
type PaymentMethodType =
  | "VISA"
  | "MASTERCARD"
  | "AMEX"
  | "OTHER"
  | "BANK_TRANSFER"
  | "MPESA"
  | "FLUTTERWAVE"
  | "PAYPAL"
  | "STRIPE"
  | "CREDIT_CARD"
type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PROCESSED" | "PAID" | "CANCELLED"
type PaymentType = "DEPOSIT" | "WITHDRAWAL" | "REFUND" | "TRANSFER" | "FEE"

interface Advertiser {
  id: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string
  city?: string
  country?: string
  state?: string
  postalCode?: string
  email?: string
}

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  startDate: string
  endDate?: string
  budget: number
}

interface Payment {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  type: PaymentType
  description?: string
  dateInitiated?: string
  dateCompleted?: string
  transactionId?: string
  receiptUrl?: string
  paymentMethodType?: PaymentMethodType
  paymentMethodId?: string
}

interface BillingItem {
  description: string
  amount: number
  quantity?: number
  unitPrice?: number
}

interface Billing {
  id: string
  invoiceNumber: string
  advertiser: {
    id: string
    name: string
    contactPerson: string
    email?: string
  }
  campaign: {
    id: string
    name: string
  }
  amount: number
  tax: number
  total: number
  status: BillingStatus
  dueDate: string
  createdAt: string
  payment: {
    id: string
    status: string
    dateCompleted: string | null
    method: string
  } | null
  items: BillingItem[]
  isOverdue: boolean
}

interface BillingDetail {
  id: string
  invoiceNumber: string
  advertiserId: string
  campaignId: string
  paymentId?: string
  amount: number
  tax: number
  total: number
  status: BillingStatus
  dueDate: string
  items: BillingItem[]
  createdAt: string
  updatedAt: string
  advertiser: Advertiser
  campaign: Campaign
  payment?: Payment
}

interface BillingResponse {
  billings: Billing[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  summary: {
    totalOutstanding: number
    totalPaid: number
    totalOverdue: number
    dueThisWeek: number
    totalPartiallyPaid: number
    totalCancelled: number
  }
  filters: {
    paymentMethods: string[]
    advertisers: { id: string; companyName: string }[]
    campaigns: { id: string; name: string }[]
  }
}

interface BillingStats {
  summary: {
    totalBillings: number
    totalAmount: number
    paidBillings: number
    paidAmount: number
    unpaidBillings: number
    unpaidAmount: number
    overdueBillings: number
    overdueAmount: number
    collectionRate: number
    averageDaysToPayment: number
    partiallyPaidBillings: number
    partiallyPaidAmount: number
    cancelledBillings: number
    cancelledAmount: number
  }
  trends: {
    monthly: {
      month: string
      total: number
      paid: number
      unpaid: number
      overdue: number
    }[]
    weekly: {
      week: string
      total: number
      paid: number
      unpaid: number
    }[]
    daily: {
      date: string
      invoicesCreated: number
      paymentsMade: number
    }[]
  }
  topAdvertisers: {
    id: string
    name: string
    total: number
    paid: number
    unpaid: number
  }[]
  paymentMethods: {
    method: string
    count: number
    amount: number
  }[]
  agingReport: {
    range: string
    count: number
    amount: number
    percentage: number
  }[]
}

interface ReminderResponse {
  upcoming: {
    id: string
    invoiceNumber: string
    advertiser: string
    contactPerson: string
    email: string
    amount: number
    dueDate: string
    daysUntilDue: number
  }[]
  overdue: {
    id: string
    invoiceNumber: string
    advertiser: string
    contactPerson: string
    email: string
    amount: number
    dueDate: string
    daysOverdue: number
    lastReminderSent?: string
    reminderCount?: number
  }[]
}

interface PaymentMethod {
  id: string
  type: PaymentMethodType
  last4?: string
  expiryDate?: string
  isDefault: boolean
  status: string
}

interface AdvertiserCampaign {
  id: string
  name: string
  status: string
  startDate: string
  endDate?: string
  budget: number
}

interface InvoiceTemplate {
  id: string
  name: string
  content: string
  isDefault: boolean
}

interface BulkActionResult {
  success: number
  failed: number
  errors?: string[]
}

// Helper functions
const formatCurrency = (amount: number, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

const getStatusColor = (status: BillingStatus, isOverdue = false) => {
  if (isOverdue) return "destructive"

  switch (status) {
    case "PAID":
      return "success"
    case "PARTIALLY_PAID":
      return "warning"
    case "OVERDUE":
      return "destructive"
    case "CANCELLED":
      return "secondary"
    case "UNPAID":
    default:
      return "default"
  }
}

const getPaymentStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "success"
    case "PENDING":
    case "PROCESSING":
      return "warning"
    case "FAILED":
    case "CANCELLED":
      return "destructive"
    case "REFUNDED":
      return "info"
    default:
      return "default"
  }
}

const getPaymentMethodIcon = (type: PaymentMethodType) => {
  switch (type) {
    case "VISA":
    case "MASTERCARD":
    case "AMEX":
    case "CREDIT_CARD":
      return <CreditCardIcon className="h-4 w-4" />
    case "BANK_TRANSFER":
      return <BankIcon className="h-4 w-4" />
    case "MPESA":
    case "FLUTTERWAVE":
      return <Smartphone className="h-4 w-4" />
    case "PAYPAL":
    case "STRIPE":
      return <Wallet className="h-4 w-4" />
    default:
      return <CircleDollarSign className="h-4 w-4" />
  }
}

const calculateDueStatus = (dueDate: string, status: BillingStatus) => {
  if (status === "PAID" || status === "CANCELLED") return { isOverdue: false, isDueSoon: false }

  const today = new Date()
  const dueDateObj = new Date(dueDate)
  const isOverdue = isBefore(dueDateObj, today) && status !== "PAID"
  const isDueSoon = !isOverdue && isBefore(dueDateObj, addDays(today, 7))

  return { isOverdue, isDueSoon }
}

const calculateAgingPeriod = (dueDate: string) => {
  const today = new Date()
  const dueDateObj = new Date(dueDate)
  const daysDiff = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 0) return "Current"
  if (daysDiff <= 30) return "1-30 days"
  if (daysDiff <= 60) return "31-60 days"
  if (daysDiff <= 90) return "61-90 days"
  return "90+ days"
}

export default function BillingPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { paymentGateway, generalSettings } = usePublicSettings()

  // State
  const [activeTab, setActiveTab] = useState("invoices")
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sortBy, setSortBy] = useState("dueDate")
  const [sortOrder, setSortOrder] = useState("desc")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | undefined>(undefined)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined)
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null)
  const [selectedBillings, setSelectedBillings] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [reminderType, setReminderType] = useState<"upcoming" | "overdue">("upcoming")
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkExportDialogOpen, setIsBulkExportDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState("pdf")
  const [showPaidInvoices, setShowPaidInvoices] = useState(true)
  const [showCancelledInvoices, setShowCancelledInvoices] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<"dueDate" | "createdAt">("dueDate")
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [activeAnalyticsView, setActiveAnalyticsView] = useState<"overview" | "trends" | "aging" | "methods">(
    "overview",
  )
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"monthly" | "weekly" | "daily">("monthly")
  const [reminderTemplates, setReminderTemplates] = useState<
    { id: string; name: string; content: string; type: string }[]
  >([
    { id: "1", name: "Standard Reminder", content: "", type: "upcoming" },
    { id: "2", name: "First Overdue Notice", content: "", type: "overdue" },
    { id: "3", name: "Final Notice", content: "", type: "overdue" },
  ])

  // Form state for creating new invoice
  const [newInvoice, setNewInvoice] = useState({
    advertiserId: "",
    campaignId: "",
    amount: 0,
    tax: 0,
    dueDate: new Date(),
    items: [{ description: "", amount: 0, quantity: 1, unitPrice: 0 }],
    notes: "",
    currency: "USD",
    invoicePrefix: "",
    invoiceNumber: "",
  })

  // Form state for recording payment
  const [payment, setPayment] = useState({
    billingId: "",
    paymentMethodId: "",
    amount: 0,
    description: "",
    paymentDate: new Date(),
    transactionId: "",
    sendReceipt: true,
  })

  // Form state for editing invoice
  const [editedBilling, setEditedBilling] = useState<Partial<BillingDetail> | null>(null)

  // Form state for sending reminders
  const [reminderMessage, setReminderMessage] = useState("")
  const [selectedReminderTemplate, setSelectedReminderTemplate] = useState<string>("1")
  const [customizeReminderTemplate, setCustomizeReminderTemplate] = useState(false)

  // Form state for bulk actions
  const [bulkActionStatus, setBulkActionStatus] = useState<BulkActionResult | null>(null)

  // Form state for import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importMappings, setImportMappings] = useState<Record<string, string>>({})
  const [importStep, setImportStep] = useState(1)

  // Form state for settings
  const [billingSettings, setBillingSettings] = useState({
    defaultDueDays: 30,
    defaultTaxRate: paymentGateway?.taxRate || 0,
    invoicePrefix: paymentGateway?.invoicePrefix || "INV-",
    defaultCurrency: paymentGateway?.supportedCurrencies?.[0] || "USD",
    sendAutomaticReminders: paymentGateway?.sendReminders || false,
    reminderDays: paymentGateway?.reminderDays || [3, 7, 14],
    overdueReminderDays: [3, 7, 14, 30],
    enableLateFees: false,
    lateFeePercentage: 5,
    lateFeeGracePeriod: 3,
    defaultPaymentTerms: paymentGateway?.paymentTerms || "Net 30",
    defaultNotes: "Thank you for your business. Please make payment by the due date.",
    enablePartialPayments: true,
  })

  // Queries
  const {
    data: billingData,
    isLoading: isLoadingBillings,
    refetch: refetchBillings,
  } = useQuery<BillingResponse>({
    queryKey: [
      "billing",
      filterStatus,
      searchQuery,
      page,
      limit,
      sortBy,
      sortOrder,
      dateRange,
      selectedAdvertiserId,
      selectedCampaignId,
      showPaidInvoices,
      showCancelledInvoices,
      dateFilterType,
      amountRange,
    ],
    queryFn: async () => {
      let url = `/api/admin/billing?status=${filterStatus}&page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }

      if (dateRange?.from && dateRange?.to) {
        url += `&${dateFilterType}Start=${format(dateRange.from, "yyyy-MM-dd")}&${dateFilterType}End=${format(dateRange.to, "yyyy-MM-dd")}`
      }

      if (selectedAdvertiserId) {
        url += `&advertiserId=${selectedAdvertiserId}`
      }

      if (selectedCampaignId) {
        url += `&campaignId=${selectedCampaignId}`
      }

      if (!showPaidInvoices) {
        url += "&excludePaid=true"
      }

      if (!showCancelledInvoices) {
        url += "&excludeCancelled=true"
      }

      if (amountRange.min !== undefined) {
        url += `&minAmount=${amountRange.min}`
      }

      if (amountRange.max !== undefined) {
        url += `&maxAmount=${amountRange.max}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error("Failed to fetch billing data")
      }
      return res.json()
    },
    enabled: !!session,
  })

  const { data: billingStats, isLoading: isLoadingStats } = useQuery<BillingStats>({
    queryKey: ["billing-stats", analyticsTimeframe],
    queryFn: async () => {
      const res = await fetch(`/api/admin/billing/stats?timeframe=${analyticsTimeframe}`)
      if (!res.ok) {
        throw new Error("Failed to fetch billing stats")
      }
      return res.json()
    },
    enabled: !!session && activeTab === "analytics",
  })

  const { data: reminderData, isLoading: isLoadingReminders } = useQuery<ReminderResponse>({
    queryKey: ["billing-reminders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/billing/reminders")
      if (!res.ok) {
        throw new Error("Failed to fetch reminders")
      }
      return res.json()
    },
    enabled: !!session && activeTab === "reminders",
  })

  const { data: billingDetail, isLoading: isLoadingBillingDetail } = useQuery<BillingDetail>({
    queryKey: ["billing-detail", selectedBillingId],
    queryFn: async () => {
      if (!selectedBillingId) return null
      const res = await fetch(`/api/admin/billing/${selectedBillingId}`)
      if (!res.ok) {
        throw new Error("Failed to fetch billing details")
      }
      return res.json()
    },
    enabled: !!selectedBillingId,
  })

  // Fetch campaigns for selected advertiser
  const { data: advertiserCampaigns, isLoading: isLoadingCampaigns } = useQuery<AdvertiserCampaign[]>({
    queryKey: ["advertiser-campaigns", newInvoice.advertiserId],
    queryFn: async () => {
      if (!newInvoice.advertiserId) return []
      const res = await fetch(`/api/admin/campaigns?advertiserId=${newInvoice.advertiserId}`)
      if (!res.ok) {
        throw new Error("Failed to fetch campaigns")
      }
      return res.json()
    },
    enabled: !!newInvoice.advertiserId,
  })

  // Fetch payment methods
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-methods")
      if (!res.ok) {
        throw new Error("Failed to fetch payment methods")
      }
      return res.json()
    },
    enabled: !!session && isPaymentDialogOpen,
  })

  // Fetch invoice templates
  const { data: invoiceTemplates, isLoading: isLoadingTemplates } = useQuery<InvoiceTemplate[]>({
    queryKey: ["invoice-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/billing/templates")
      if (!res.ok) {
        throw new Error("Failed to fetch invoice templates")
      }
      return res.json()
    },
    enabled: !!session && isTemplateDialogOpen,
  })

  // Mutations
  const createBillingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create invoice")
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success("Invoice created successfully")
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
    },
    onError: (error) => {
      toast.error(`Error creating invoice: ${error.message}`)
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/billing/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to record payment")
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully")
      setIsPaymentDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
      queryClient.invalidateQueries({ queryKey: ["billing-detail", payment.billingId] })
    },
    onError: (error) => {
      toast.error(`Error recording payment: ${error.message}`)
    },
  })

  const updateBillingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/billing/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update invoice")
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success("Invoice updated successfully")
      setIsEditMode(false)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
      queryClient.invalidateQueries({ queryKey: ["billing-detail", selectedBillingId] })
    },
    onError: (error) => {
      toast.error(`Error updating invoice: ${error.message}`)
    },
  })

  const deleteBillingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/billing/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete invoice")
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success("Invoice deleted successfully")
      setIsDeleteDialogOpen(false)
      setSelectedBillingId(null)
      setIsDetailsSheetOpen(false)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
    },
    onError: (error) => {
      toast.error(`Error deleting invoice: ${error.message}`)
    },
  })

  const bulkDeleteBillingsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/admin/billing/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete invoices")
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Successfully deleted ${data.success} invoices`)
      setIsBulkDeleteDialogOpen(false)
      setSelectedBillings([])
      setBulkActionStatus(data)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
    },
    onError: (error) => {
      toast.error(`Error deleting invoices: ${error.message}`)
    },
  })

  const sendRemindersMutation = useMutation({
    mutationFn: async ({
      billingIds,
      reminderType,
      message,
      templateId,
    }: { billingIds: string[]; reminderType: string; message?: string; templateId?: string }) => {
      const res = await fetch("/api/admin/billing/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billingIds, reminderType, message, templateId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to send reminders")
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.remindersSent} reminders sent successfully`)
      setIsReminderDialogOpen(false)
      setSelectedBillings([])
      setReminderMessage("")
    },
    onError: (error) => {
      toast.error(`Error sending reminders: ${error.message}`)
    },
  })

  const updateBillingSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/billing/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update billing settings")
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success("Billing settings updated successfully")
      setIsSettingsDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["public-settings"] })
    },
    onError: (error) => {
      toast.error(`Error updating settings: ${error.message}`)
    },
  })

  const importInvoicesMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/billing/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to import invoices")
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.success} invoices`)
      setIsImportDialogOpen(false)
      setImportFile(null)
      setImportPreview([])
      setImportErrors([])
      setImportMappings({})
      setImportStep(1)
      queryClient.invalidateQueries({ queryKey: ["billing"] })
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] })
    },
    onError: (error) => {
      toast.error(`Error importing invoices: ${error.message}`)
      setImportErrors([error.message])
    },
  })

  // Derived state
  const invoiceSubtotal = useMemo(() => {
    return newInvoice.items.reduce((sum, item) => sum + Number(item.amount), 0)
  }, [newInvoice.items])

  const invoiceTotal = useMemo(() => {
    return invoiceSubtotal + (invoiceSubtotal * Number(newInvoice.tax)) / 100
  }, [invoiceSubtotal, newInvoice.tax])

  // Initialize edit form when billing detail is loaded
  useEffect(() => {
    if (billingDetail && isEditMode) {
      setEditedBilling({
        ...billingDetail,
        dueDate: billingDetail.dueDate,
        items: billingDetail.items || [],
        tax: billingDetail.tax,
      })
    }
  }, [billingDetail, isEditMode])

  // Event handlers
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleCreateInvoice = () => {
    // Calculate total from line items
    const itemsTotal = newInvoice.items.reduce((sum, item) => sum + Number(item.amount), 0)

    createBillingMutation.mutate({
      advertiserId: newInvoice.advertiserId,
      campaignId: newInvoice.campaignId,
      amount: itemsTotal,
      tax: newInvoice.tax,
      dueDate: format(newInvoice.dueDate, "yyyy-MM-dd"),
      items: newInvoice.items,
      notes: newInvoice.notes,
      currency: newInvoice.currency,
      invoicePrefix: newInvoice.invoicePrefix,
      invoiceNumber: newInvoice.invoiceNumber,
    })
  }

  const handleRecordPayment = () => {
    recordPaymentMutation.mutate({
      billingId: payment.billingId,
      paymentMethodId: payment.paymentMethodId,
      amount: payment.amount,
      description: payment.description,
      paymentDate: format(payment.paymentDate, "yyyy-MM-dd"),
      transactionId: payment.transactionId,
      sendReceipt: payment.sendReceipt,
    })
  }

  const handleUpdateInvoice = () => {
    if (selectedBillingId && editedBilling) {
      updateBillingMutation.mutate({
        id: selectedBillingId,
        data: {
          dueDate: editedBilling.dueDate,
          tax: editedBilling.tax,
          items: editedBilling.items,
          // Recalculate amount based on items
          amount: editedBilling.items?.reduce((sum, item) => sum + Number(item.amount), 0) || 0,
        },
      })
    }
  }

  const handleDeleteInvoice = () => {
    if (selectedBillingId) {
      deleteBillingMutation.mutate(selectedBillingId)
    }
  }

  const handleBulkDeleteInvoices = () => {
    if (selectedBillings.length > 0) {
      bulkDeleteBillingsMutation.mutate(selectedBillings)
    }
  }

  const handleSendReminders = () => {
    if (selectedBillings.length > 0) {
      sendRemindersMutation.mutate({
        billingIds: selectedBillings,
        reminderType,
        message: customizeReminderTemplate ? reminderMessage : undefined,
        templateId: !customizeReminderTemplate ? selectedReminderTemplate : undefined,
      })
    }
  }

  const handleUpdateBillingSettings = () => {
    updateBillingSettingsMutation.mutate(billingSettings)
  }

  const handleImportInvoices = () => {
    if (importPreview.length > 0 && Object.keys(importMappings).length > 0) {
      importInvoicesMutation.mutate({
        invoices: importPreview,
        mappings: importMappings,
      })
    }
  }

  const handleExport = (format: string) => {
    setIsLoading(true)
    let url = `/api/admin/billing/export?format=${format}&status=${filterStatus}`

    if (dateRange?.from && dateRange?.to) {
      url += `&startDate=${format(dateRange.from, "yyyy-MM-dd")}&endDate=${format(dateRange.to, "yyyy-MM-dd")}`
    }

    if (selectedAdvertiserId) {
      url += `&advertiserId=${selectedAdvertiserId}`
    }

    if (selectedCampaignId) {
      url += `&campaignId=${selectedCampaignId}`
    }

    if (selectedBillings.length > 0) {
      url += `&ids=${selectedBillings.join(",")}`
    }

    // Simulate a delay for better UX
    setTimeout(() => {
      window.open(url, "_blank")
      setIsLoading(false)
      setIsBulkExportDialogOpen(false)
    }, 1000)
  }

  const handleSelectAllBillings = (checked: boolean) => {
    if (checked) {
      const allIds = billingData?.billings.map((billing) => billing.id) || []
      setSelectedBillings(allIds)
    } else {
      setSelectedBillings([])
    }
  }

  const handleSelectBilling = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedBillings([...selectedBillings, id])
    } else {
      setSelectedBillings(selectedBillings.filter((billingId) => billingId !== id))
    }
  }

  const handleViewBillingDetails = (id: string) => {
    setSelectedBillingId(id)
    setIsDetailsSheetOpen(true)
  }

  const handleOpenPaymentDialog = (billing: Billing) => {
    setPayment({
      billingId: billing.id,
      paymentMethodId: "",
      amount: billing.total,
      description: `Payment for invoice ${billing.invoiceNumber}`,
      paymentDate: new Date(),
      transactionId: "",
      sendReceipt: true,
    })
    setIsPaymentDialogOpen(true)
  }

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    if (!editedBilling) return

    const updatedItems = [...(editedBilling.items || [])]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }

    // If updating quantity or unitPrice, recalculate amount
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? value : updatedItems[index].quantity || 1
      const unitPrice = field === "unitPrice" ? value : updatedItems[index].unitPrice || 0
      updatedItems[index].amount = quantity * unitPrice
    }

    setEditedBilling({
      ...editedBilling,
      items: updatedItems,
    })
  }

  const handleAddLineItem = () => {
    if (!editedBilling) return

    setEditedBilling({
      ...editedBilling,
      items: [...(editedBilling.items || []), { description: "", amount: 0, quantity: 1, unitPrice: 0 }],
    })
  }

  const handleRemoveLineItem = (index: number) => {
    if (!editedBilling) return

    const updatedItems = [...(editedBilling.items || [])]
    updatedItems.splice(index, 1)

    setEditedBilling({
      ...editedBilling,
      items: updatedItems,
    })
  }

  const handlePrintInvoice = () => {
    if (!billingDetail) return

    // In a real implementation, this would open a print-friendly version
    // For now, we'll just show a toast
    toast.info("Printing invoice...")
    window.print()
  }

  const handleEmailInvoice = () => {
    if (!billingDetail) return

    // In a real implementation, this would send the invoice via email
    // For now, we'll just show a toast
    toast.success("Invoice sent via email")
  }

  const handleNewInvoiceLineItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }

    // If updating quantity or unitPrice, recalculate amount
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? value : updatedItems[index].quantity || 1
      const unitPrice = field === "unitPrice" ? value : updatedItems[index].unitPrice || 0
      updatedItems[index].amount = quantity * unitPrice
    }

    setNewInvoice({
      ...newInvoice,
      items: updatedItems,
    })
  }

  const handleAddNewInvoiceLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: "", amount: 0, quantity: 1, unitPrice: 0 }],
    })
  }

  const handleRemoveNewInvoiceLineItem = (index: number) => {
    const updatedItems = [...newInvoice.items]
    updatedItems.splice(index, 1)

    setNewInvoice({
      ...newInvoice,
      items: updatedItems,
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      // In a real implementation, we would parse the file and show a preview
      // For now, we'll just simulate it
      setTimeout(() => {
        setImportPreview([
          { advertiser: "Acme Inc", campaign: "Summer Campaign", amount: 1000, tax: 100, dueDate: "2023-06-30" },
          { advertiser: "XYZ Corp", campaign: "Product Launch", amount: 2500, tax: 250, dueDate: "2023-07-15" },
          { advertiser: "ABC Ltd", campaign: "Brand Awareness", amount: 1500, tax: 150, dueDate: "2023-07-01" },
        ])
        setImportStep(2)
      }, 1000)
    }
  }

  const handleImportMapping = (field: string, value: string) => {
    setImportMappings({
      ...importMappings,
      [field]: value,
    })
  }

  const handleCopyInvoiceNumber = () => {
    if (billingDetail?.invoiceNumber) {
      navigator.clipboard.writeText(billingDetail.invoiceNumber)
      toast.success("Invoice number copied to clipboard")
    }
  }

  const handleCancelInvoice = () => {
    if (selectedBillingId) {
      updateBillingMutation.mutate({
        id: selectedBillingId,
        data: {
          status: "CANCELLED",
        },
      })
    }
  }

  const handleMarkAsPaid = () => {
    if (selectedBillingId && billingDetail) {
      recordPaymentMutation.mutate({
        billingId: selectedBillingId,
        amount: billingDetail.total,
        description: "Manual payment entry",
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        sendReceipt: false,
      })
    }
  }

  const handleMarkAsUnpaid = () => {
    if (selectedBillingId) {
      updateBillingMutation.mutate({
        id: selectedBillingId,
        data: {
          status: "UNPAID",
          paymentId: null,
        },
      })
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setNewInvoice({
        advertiserId: "",
        campaignId: "",
        amount: 0,
        tax: paymentGateway?.taxRate || 0,
        dueDate: new Date(Date.now() + billingSettings.defaultDueDays * 24 * 60 * 60 * 1000),
        items: [{ description: "", amount: 0, quantity: 1, unitPrice: 0 }],
        notes: billingSettings.defaultNotes,
        currency: billingSettings.defaultCurrency,
        invoicePrefix: billingSettings.invoicePrefix,
        invoiceNumber: "",
      })
    }
  }, [isCreateDialogOpen, paymentGateway?.taxRate, billingSettings])

  useEffect(() => {
    if (!isPaymentDialogOpen) {
      setPayment({
        billingId: "",
        paymentMethodId: "",
        amount: 0,
        description: "",
        paymentDate: new Date(),
        transactionId: "",
        sendReceipt: true,
      })
    }
  }, [isPaymentDialogOpen])

  useEffect(() => {
    if (!isDetailsSheetOpen) {
      setIsEditMode(false)
      setEditedBilling(null)
    }
  }, [isDetailsSheetOpen])

  // Calculate default tax rate from settings
  useEffect(() => {
    if (paymentGateway?.taxRate && !newInvoice.tax) {
      setNewInvoice((prev) => ({
        ...prev,
        tax: paymentGateway.taxRate || 0,
      }))
    }
  }, [paymentGateway, newInvoice.tax])

  // Status badge component
  const StatusBadge = ({ status, isOverdue }: { status: BillingStatus; isOverdue?: boolean }) => {
    const variant = getStatusColor(status, isOverdue)

    return <Badge variant={variant}>{isOverdue && status === "UNPAID" ? "OVERDUE" : status.replace("_", " ")}</Badge>
  }

  // Payment status badge component
  const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
    const variant = getPaymentStatusColor(status)

    return <Badge variant={variant}>{status.replace("_", " ")}</Badge>
  }

  // Calculate edited invoice totals
  const editedSubtotal = useMemo(() => {
    if (!editedBilling?.items) return 0
    return editedBilling.items.reduce((sum, item) => sum + Number(item.amount), 0)
  }, [editedBilling?.items])

  const editedTotal = useMemo(() => {
    if (!editedBilling) return 0
    return editedSubtotal + (editedSubtotal * Number(editedBilling.tax || 0)) / 100
  }, [editedBilling, editedSubtotal])

  // Default reminder messages
  const defaultUpcomingMessage = useMemo(() => {
    return `Dear Customer,\n\nThis is a friendly reminder that invoice {invoiceNumber} for {amount} is due on {dueDate}.\n\nPlease make payment before the due date to avoid late fees.\n\nThank you for your business.\n\nBest regards,\n${generalSettings?.platformName || "Lumen Advertising"}`
  }, [generalSettings?.platformName])

  const defaultOverdueMessage = useMemo(() => {
    return `Dear Customer,\n\nThis is to inform you that invoice {invoiceNumber} for {amount} was due on {dueDate} and is now overdue.\n\nPlease make payment as soon as possible to avoid further late fees and service interruptions.\n\nIf you have already made the payment, please disregard this notice.\n\nBest regards,\n${generalSettings?.platformName || "Lumen Advertising"}`
  }, [generalSettings?.platformName])

  useEffect(() => {
    setReminderMessage(reminderType === "upcoming" ? defaultUpcomingMessage : defaultOverdueMessage)
  }, [reminderType, defaultUpcomingMessage, defaultOverdueMessage])

  // Chart colors
  const CHART_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  // Generate invoice number
  useEffect(() => {
    if (isCreateDialogOpen && !newInvoice.invoiceNumber) {
      const prefix = newInvoice.invoicePrefix || billingSettings.invoicePrefix || "INV-"
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const year = new Date().getFullYear()
      setNewInvoice((prev) => ({
        ...prev,
        invoiceNumber: `${prefix}${year}-${randomNum}`,
      }))
    }
  }, [isCreateDialogOpen, newInvoice.invoicePrefix, newInvoice.invoiceNumber, billingSettings.invoicePrefix])

  // Update reminder templates when reminder type changes
  useEffect(() => {
    // Update the content of the templates based on the type
    setReminderTemplates((prev) =>
      prev.map((template) => {
        if (template.type === reminderType) {
          return {
            ...template,
            content: reminderType === "upcoming" ? defaultUpcomingMessage : defaultOverdueMessage,
          }
        }
        return template
      }),
    )
  }, [reminderType, defaultUpcomingMessage, defaultOverdueMessage])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing Management</h1>
          <p className="text-muted-foreground">Manage invoices, payments, and billing analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FilePdf className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsBulkExportDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Advanced Export Options
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Additional Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                Import Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Invoice Templates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Billing Settings
              </DropdownMenuItem>
              {selectedBillings.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsBulkDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">Delete Selected ({selectedBillings.length})</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingBillings ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    formatCurrency(billingData?.summary.totalOutstanding || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingBillings ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    `${billingData?.billings.filter((b) => b.status !== "PAID" && b.status !== "CANCELLED").length || 0} unpaid invoices`
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingBillings ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    formatCurrency(billingData?.summary.totalOverdue || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingBillings ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    `${billingData?.billings.filter((b) => b.isOverdue || b.status === "OVERDUE").length || 0} overdue invoices`
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingBillings ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    formatCurrency(billingData?.summary.dueThisWeek || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingBillings ? <Skeleton className="h-4 w-20 mt-1" /> : `Due in the next 7 days`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Collected</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingBillings ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    formatCurrency(billingData?.summary.totalPaid || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoadingBillings ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    `${billingData?.billings.filter((b) => b.status === "PAID").length || 0} paid invoices`
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-[300px]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                      <CalendarRange className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="flex items-center gap-2">
                        <Label>Filter by:</Label>
                        <Select
                          value={dateFilterType}
                          onValueChange={(value) => setDateFilterType(value as "dueDate" | "createdAt")}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dueDate">Due Date</SelectItem>
                            <SelectItem value="createdAt">Created Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                    <div className="flex items-center justify-between p-3 border-t">
                      <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={() => document.body.click()}>
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {billingData?.filters.advertisers && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select
                    value={selectedAdvertiserId}
                    onValueChange={(value) => setSelectedAdvertiserId(value || undefined)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Advertisers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Advertisers</SelectItem>
                      {billingData.filters.advertisers.map((advertiser) => (
                        <SelectItem key={advertiser.id} value={advertiser.id}>
                          {advertiser.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                className={cn(isAdvancedFilterOpen && "border-primary")}
              >
                <Filter className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => refetchBillings()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {isAdvancedFilterOpen && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {billingData?.filters.campaigns && (
                      <div className="space-y-2">
                        <Label>Campaign</Label>
                        <Select
                          value={selectedCampaignId}
                          onValueChange={(value) => setSelectedCampaignId(value || undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Campaigns" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Campaigns</SelectItem>
                            {billingData.filters.campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Amount Range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={amountRange.min || ""}
                          onChange={(e) =>
                            setAmountRange({ ...amountRange, min: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                        <span>to</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={amountRange.max || ""}
                          onChange={(e) =>
                            setAmountRange({ ...amountRange, max: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Include Status</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="showPaid"
                            checked={showPaidInvoices}
                            onCheckedChange={(checked) => setShowPaidInvoices(!!checked)}
                          />
                          <Label htmlFor="showPaid" className="cursor-pointer">
                            Show Paid Invoices
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="showCancelled"
                            checked={showCancelledInvoices}
                            onCheckedChange={(checked) => setShowCancelledInvoices(!!checked)}
                          />
                          <Label htmlFor="showCancelled" className="cursor-pointer">
                            Show Cancelled Invoices
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaignId(undefined)
                        setAmountRange({})
                        setShowPaidInvoices(true)
                        setShowCancelledInvoices(true)
                        setDateFilterType("dueDate")
                        setDateRange(undefined)
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button onClick={() => setIsAdvancedFilterOpen(false)}>Apply Filters</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedBillings.length > 0 && (
            <div className="bg-muted p-2 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedBillings.length > 0 && selectedBillings.length === billingData?.billings.length}
                  onCheckedChange={handleSelectAllBillings}
                />
                <span>{selectedBillings.length} invoices selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReminderType("upcoming")
                    setIsReminderDialogOpen(true)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminders
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsBulkExportDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          selectedBillings.length > 0 && selectedBillings.length === billingData?.billings.length
                        }
                        onCheckedChange={handleSelectAllBillings}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("invoiceNumber")}>
                      Invoice
                      {sortBy === "invoiceNumber" && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("dueDate")}>
                      Due Date
                      {sortBy === "dueDate" && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("total")}>
                      Amount
                      {sortBy === "total" && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                      Status
                      {sortBy === "status" && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 inline ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBillings ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : billingData?.billings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No invoices found. Try adjusting your filters or create a new invoice.
                      </TableCell>
                    </TableRow>
                  ) : (
                    billingData?.billings.map((billing) => {
                      const { isOverdue, isDueSoon } = calculateDueStatus(billing.dueDate, billing.status)

                      return (
                        <TableRow
                          key={billing.id}
                          className={cn(
                            isOverdue && "bg-destructive/5",
                            isDueSoon && "bg-amber-50/50 dark:bg-amber-950/10",
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedBillings.includes(billing.id)}
                              onCheckedChange={(checked) => handleSelectBilling(billing.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{billing.invoiceNumber}</TableCell>
                          <TableCell>{billing.advertiser.name}</TableCell>
                          <TableCell>
                            {format(parseISO(billing.dueDate), "MMM d, yyyy")}
                            {isOverdue && (
                              <Badge variant="outline" className="ml-2 text-destructive border-destructive">
                                Overdue
                              </Badge>
                            )}
                            {isDueSoon && !isOverdue && (
                              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                                Due Soon
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(billing.total)}</TableCell>
                          <TableCell>
                            <StatusBadge status={billing.status} isOverdue={isOverdue} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleViewBillingDetails(billing.id)}>
                                <FileText className="h-4 w-4" />
                              </Button>

                              {billing.status !== "PAID" && billing.status !== "CANCELLED" && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenPaymentDialog(billing)}>
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleViewBillingDetails(billing.id)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {billing.status !== "PAID" && billing.status !== "CANCELLED" && (
                                    <DropdownMenuItem onClick={() => handleOpenPaymentDialog(billing)}>
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      Record Payment
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedBillings([billing.id])
                                      setReminderType(isOverdue ? "overdue" : "upcoming")
                                      setIsReminderDialogOpen(true)
                                    }}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedBillingId(billing.id)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {billingData?.billings.length || 0} of {billingData?.pagination.total || 0} invoices
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoadingBillings}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {page} of {billingData?.pagination.pages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === (billingData?.pagination.pages || 1) || isLoadingBillings}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(Number(value))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-amber-500" />
                  Upcoming Payments
                </CardTitle>
                <CardDescription>Invoices due in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReminders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : reminderData?.upcoming.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming payments due in the next 7 days
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminderData?.upcoming.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.advertiser} - {formatCurrency(invoice.amount)}
                          </div>
                          <div className="text-xs">
                            Due: {format(parseISO(invoice.dueDate), "MMM d, yyyy")}
                            <Badge variant="outline" className="ml-2">
                              {invoice.daysUntilDue} {invoice.daysUntilDue === 1 ? "day" : "days"} left
                            </Badge>
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedBillings.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectBilling(invoice.id, !!checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={!reminderData?.upcoming.length || !selectedBillings.length}
                  onClick={() => {
                    setReminderType("upcoming")
                    setIsReminderDialogOpen(true)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Payment Reminders
                </Button>
              </CardFooter>
            </Card>

            {/* Overdue Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                  Overdue Payments
                </CardTitle>
                <CardDescription>Invoices past their due date</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReminders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : reminderData?.overdue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No overdue payments</div>
                ) : (
                  <div className="space-y-2">
                    {reminderData?.overdue.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.advertiser} - {formatCurrency(invoice.amount)}
                          </div>
                          <div className="text-xs">
                            Due: {format(parseISO(invoice.dueDate), "MMM d, yyyy")}
                            <Badge variant="destructive" className="ml-2">
                              {invoice.daysOverdue} {invoice.daysOverdue === 1 ? "day" : "days"} overdue
                            </Badge>
                          </div>
                          {invoice.lastReminderSent && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Last reminder: {format(parseISO(invoice.lastReminderSent), "MMM d, yyyy")}
                              {invoice.reminderCount && <span className="ml-1">({invoice.reminderCount} sent)</span>}
                            </div>
                          )}
                        </div>
                        <Checkbox
                          checked={selectedBillings.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectBilling(invoice.id, !!checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={!reminderData?.overdue.length || !selectedBillings.length}
                  onClick={() => {
                    setReminderType("overdue")
                    setIsReminderDialogOpen(true)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Overdue Notices
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Reminder Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder Templates</CardTitle>
              <CardDescription>Manage your reminder message templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reminderTemplates.map((template) => (
                    <Card key={template.id} className="overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>
                          {template.type === "upcoming" ? "For upcoming payments" : "For overdue payments"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {template.content ||
                            (template.type === "upcoming" ? defaultUpcomingMessage : defaultOverdueMessage)}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reminder Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Reminder Settings</CardTitle>
              <CardDescription>Configure automatic reminder schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Automatic Reminders</div>
                    <div className="text-sm text-muted-foreground">Send reminders automatically based on due dates</div>
                  </div>
                  <Switch
                    checked={billingSettings.sendAutomaticReminders}
                    onCheckedChange={(checked) =>
                      setBillingSettings({
                        ...billingSettings,
                        sendAutomaticReminders: checked,
                      })
                    }
                  />
                </div>

                {billingSettings.sendAutomaticReminders && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <Label>Upcoming Payment Reminders (days before due date)</Label>
                      <div className="flex flex-wrap gap-2">
                        {billingSettings.reminderDays.map((day, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            {day} days
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0"
                              onClick={() => {
                                const newDays = [...billingSettings.reminderDays]
                                newDays.splice(index, 1)
                                setBillingSettings({
                                  ...billingSettings,
                                  reminderDays: newDays,
                                })
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            const day = window.prompt("Enter days before due date")
                            if (day && !isNaN(Number(day))) {
                              setBillingSettings({
                                ...billingSettings,
                                reminderDays: [...billingSettings.reminderDays, Number(day)].sort((a, b) => a - b),
                              })
                            }
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Overdue Payment Reminders (days after due date)</Label>
                      <div className="flex flex-wrap gap-2">
                        {billingSettings.overdueReminderDays.map((day, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            {day} days
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0"
                              onClick={() => {
                                const newDays = [...billingSettings.overdueReminderDays]
                                newDays.splice(index, 1)
                                setBillingSettings({
                                  ...billingSettings,
                                  overdueReminderDays: [...billingSettings.overdueReminderDays, Number(day)].sort(
                                    (a, b) => a - b,
                                  ),
                                })
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            const day = window.prompt("Enter days after due date")
                            if (day && !isNaN(Number(day))) {
                              setBillingSettings({
                                ...billingSettings,
                                overdueReminderDays: [...billingSettings.overdueReminderDays, Number(day)].sort(
                                  (a, b) => a - b,
                                ),
                              })
                            }
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateBillingSettings}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={activeAnalyticsView === "overview" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAnalyticsView("overview")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={activeAnalyticsView === "trends" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAnalyticsView("trends")}
              >
                <LineChart className="h-4 w-4 mr-2" />
                Trends
              </Button>
              <Button
                variant={activeAnalyticsView === "aging" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAnalyticsView("aging")}
              >
                <Clock className="h-4 w-4 mr-2" />
                Aging Report
              </Button>
              <Button
                variant={activeAnalyticsView === "methods" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAnalyticsView("methods")}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Payment Methods
              </Button>
            </div>

            {activeAnalyticsView === "trends" && (
              <Select value={analyticsTimeframe} onValueChange={(value) => setAnalyticsTimeframe(value as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {activeAnalyticsView === "overview" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        formatCurrency(billingStats?.summary.totalAmount || 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? (
                        <Skeleton className="h-4 w-20 mt-1" />
                      ) : (
                        `${billingStats?.summary.totalBillings || 0} total invoices`
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        `${(billingStats?.summary.collectionRate || 0).toFixed(1)}%`
                      )}
                    </div>
                    <Progress value={billingStats?.summary.collectionRate || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        formatCurrency(billingStats?.summary.paidAmount || 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? (
                        <Skeleton className="h-4 w-20 mt-1" />
                      ) : (
                        `${billingStats?.summary.paidBillings || 0} paid invoices`
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        formatCurrency(billingStats?.summary.overdueAmount || 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? (
                        <Skeleton className="h-4 w-20 mt-1" />
                      ) : (
                        `${billingStats?.summary.overdueBillings || 0} overdue invoices`
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Billing Trends</CardTitle>
                  <CardDescription>Revenue collection over the past 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={billingStats?.trends.monthly}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]} />
                          <Legend />
                          <Bar dataKey="paid" name="Paid" fill={CHART_COLORS[1]} />
                          <Bar dataKey="unpaid" name="Unpaid" fill={CHART_COLORS[2]} />
                          <Bar dataKey="overdue" name="Overdue" fill={CHART_COLORS[3]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Advertisers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Advertisers by Billing</CardTitle>
                  <CardDescription>Advertisers with the highest billing amounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : billingStats?.topAdvertisers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No billing data available</div>
                  ) : (
                    <div className="space-y-4">
                      {billingStats?.topAdvertisers.map((advertiser, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              {i + 1}
                            </div>
                            <span>{advertiser.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(advertiser.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Status Distribution</CardTitle>
                    <CardDescription>Breakdown of invoice payment statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={[
                                { name: "Paid", value: billingStats?.summary.paidBillings || 0 },
                                { name: "Unpaid", value: billingStats?.summary.unpaidBillings || 0 },
                                { name: "Overdue", value: billingStats?.summary.overdueBillings || 0 },
                                { name: "Partially Paid", value: billingStats?.summary.partiallyPaidBillings || 0 },
                                { name: "Cancelled", value: billingStats?.summary.cancelledBillings || 0 },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {[
                                { name: "Paid", value: billingStats?.summary.paidBillings || 0 },
                                { name: "Unpaid", value: billingStats?.summary.unpaidBillings || 0 },
                                { name: "Overdue", value: billingStats?.summary.overdueBillings || 0 },
                                { name: "Partially Paid", value: billingStats?.summary.partiallyPaidBillings || 0 },
                                { name: "Cancelled", value: billingStats?.summary.cancelledBillings || 0 },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, "Invoices"]} />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Collection Efficiency</CardTitle>
                    <CardDescription>Payment collection trends over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <Skeleton className="h-[250px] w-full" />
                    ) : (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={billingStats?.trends.monthly}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `${value}%`} />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === "efficiency") {
                                  return [`${value.toFixed(1)}%`, "Collection Rate"]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey={(data) => (data.total > 0 ? (data.paid / data.total) * 100 : 0)}
                              name="efficiency"
                              stroke={CHART_COLORS[0]}
                              activeDot={{ r: 8 }}
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeAnalyticsView === "trends" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {analyticsTimeframe === "monthly" && "Monthly Billing Trends"}
                    {analyticsTimeframe === "weekly" && "Weekly Billing Trends"}
                    {analyticsTimeframe === "daily" && "Daily Billing Activity"}
                  </CardTitle>
                  <CardDescription>
                    {analyticsTimeframe === "monthly" && "Revenue collection over the past 12 months"}
                    {analyticsTimeframe === "weekly" && "Revenue collection over the past 12 weeks"}
                    {analyticsTimeframe === "daily" && "Invoice and payment activity over the past 30 days"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {analyticsTimeframe === "daily" ? (
                          <ComposedChart
                            data={billingStats?.trends.daily}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="invoicesCreated" name="Invoices Created" fill={CHART_COLORS[0]} />
                            <Line
                              type="monotone"
                              dataKey="paymentsMade"
                              name="Payments Made"
                              stroke={CHART_COLORS[1]}
                            />
                          </ComposedChart>
                        ) : (
                          <AreaChart
                            data={
                              analyticsTimeframe === "monthly"
                                ? billingStats?.trends.monthly
                                : billingStats?.trends.weekly
                            }
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={analyticsTimeframe === "monthly" ? "month" : "week"} />
                            <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                            <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]} />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="total"
                              name="Total Billed"
                              stroke={CHART_COLORS[0]}
                              fill={CHART_COLORS[0]}
                              fillOpacity={0.2}
                            />
                            <Area
                              type="monotone"
                              dataKey="paid"
                              name="Paid"
                              stroke={CHART_COLORS[1]}
                              fill={CHART_COLORS[1]}
                              fillOpacity={0.2}
                            />
                            <Area
                              type="monotone"
                              dataKey="unpaid"
                              name="Unpaid"
                              stroke={CHART_COLORS[2]}
                              fill={CHART_COLORS[2]}
                              fillOpacity={0.2}
                            />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Days to Payment</CardTitle>
                  <CardDescription>How quickly invoices are being paid</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="text-6xl font-bold text-primary">
                      {isLoadingStats ? (
                        <Skeleton className="h-16 w-16" />
                      ) : (
                        Math.round(billingStats?.summary.averageDaysToPayment || 0)
                      )}
                    </div>
                    <div className="text-muted-foreground mt-2">Average days to payment</div>

                    <div className="w-full mt-8">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Payment Speed</span>
                        <span className="text-sm text-muted-foreground">
                          {isLoadingStats ? (
                            <Skeleton className="h-4 w-16 inline-block" />
                          ) : billingStats?.summary.averageDaysToPayment ? (
                            billingStats.summary.averageDaysToPayment <= 15 ? (
                              "Fast"
                            ) : billingStats.summary.averageDaysToPayment <= 30 ? (
                              "Average"
                            ) : (
                              "Slow"
                            )
                          ) : (
                            "N/A"
                          )}
                        </span>
                      </div>
                      <Progress
                        value={
                          isLoadingStats
                            ? 0
                            : billingStats?.summary.averageDaysToPayment
                              ? Math.max(0, 100 - (billingStats.summary.averageDaysToPayment / 45) * 100)
                              : 0
                        }
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeAnalyticsView === "aging" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Accounts Receivable Aging</CardTitle>
                  <CardDescription>Outstanding invoices by age</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={billingStats?.agingReport}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                          <YAxis type="category" dataKey="range" width={100} />
                          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Amount"]} />
                          <Legend />
                          <Bar dataKey="amount" name="Outstanding Amount" fill={CHART_COLORS[0]}>
                            {billingStats?.agingReport.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.range === "Current"
                                    ? CHART_COLORS[1]
                                    : entry.range === "1-30 days"
                                      ? CHART_COLORS[2]
                                      : entry.range === "31-60 days"
                                        ? CHART_COLORS[3]
                                        : entry.range === "61-90 days"
                                          ? CHART_COLORS[4]
                                          : CHART_COLORS[5]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aging Details</CardTitle>
                  <CardDescription>Detailed breakdown of outstanding invoices by age</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Age</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingStats
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-12" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                            </TableRow>
                          ))
                        : billingStats?.agingReport.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.range}</TableCell>
                              <TableCell>{item.count}</TableCell>
                              <TableCell>{formatCurrency(item.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{item.percentage.toFixed(1)}%</span>
                                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full",
                                        item.range === "Current"
                                          ? "bg-green-500"
                                          : item.range === "1-30 days"
                                            ? "bg-amber-500"
                                            : item.range === "31-60 days"
                                              ? "bg-orange-500"
                                              : item.range === "61-90 days"
                                                ? "bg-red-500"
                                                : "bg-red-700",
                                      )}
                                      style={{ width: `${item.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {activeAnalyticsView === "methods" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Distribution</CardTitle>
                  <CardDescription>Breakdown of payments by method</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={billingStats?.paymentMethods}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="amount"
                            nameKey="method"
                            label={({ method, percent }) => `${method}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {billingStats?.paymentMethods.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Amount"]} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Details</CardTitle>
                  <CardDescription>Detailed breakdown of payments by method</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Average</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingStats
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-12" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                            </TableRow>
                          ))
                        : billingStats?.paymentMethods.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getPaymentMethodIcon(item.method as PaymentMethodType)}
                                  <span className="font-medium">{item.method}</span>
                                </div>
                              </TableCell>
                              <TableCell>{item.count}</TableCell>
                              <TableCell>{formatCurrency(item.amount)}</TableCell>
                              <TableCell>{formatCurrency(item.amount / item.count)}</TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs and Sheets */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>Create a new invoice for an advertiser</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="advertiserId">Advertiser</Label>
                <Select
                  value={newInvoice.advertiserId}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, advertiserId: value })}
                >
                  <SelectTrigger id="advertiserId">
                    <SelectValue placeholder="Select advertiser" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingData?.filters.advertisers.map((advertiser) => (
                      <SelectItem key={advertiser.id} value={advertiser.id}>
                        {advertiser.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaignId">Campaign</Label>
                <Select
                  value={newInvoice.campaignId}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, campaignId: value })}
                  disabled={!newInvoice.advertiserId || isLoadingCampaigns}
                >
                  <SelectTrigger id="campaignId">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {advertiserCampaigns?.map((campaign: any) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={newInvoice.invoicePrefix}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoicePrefix: e.target.value })}
                  placeholder={billingSettings.invoicePrefix}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={newInvoice.invoiceNumber}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                  placeholder="Auto-generated"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Line Items</Label>
              {newInvoice.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleNewInvoiceLineItemChange(index, "description", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) => handleNewInvoiceLineItemChange(index, "quantity", Number(e.target.value))}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleNewInvoiceLineItemChange(index, "unitPrice", Number(e.target.value))}
                    className="w-32"
                  />
                  <div className="w-24 text-right">{formatCurrency(item.amount)}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveNewInvoiceLineItem(index)}
                    disabled={newInvoice.items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={handleAddNewInvoiceLineItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Rate (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  value={newInvoice.tax}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" id="dueDate">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newInvoice.dueDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newInvoice.dueDate}
                      onSelect={(date) => setNewInvoice({ ...newInvoice, dueDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                placeholder="Additional notes or payment instructions"
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div className="text-sm">Subtotal</div>
              <div>{formatCurrency(invoiceSubtotal)}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm">Tax ({newInvoice.tax}%)</div>
              <div>{formatCurrency(invoiceSubtotal * (newInvoice.tax / 100))}</div>
            </div>
            <div className="flex justify-between items-center font-bold">
              <div>Total</div>
              <div>{formatCurrency(invoiceTotal)}</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={!newInvoice.advertiserId || !newInvoice.campaignId || invoiceTotal <= 0}
            >
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment for this invoice</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={payment.paymentMethodId}
                onValueChange={(value) => setPayment({ ...payment, paymentMethodId: value })}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" id="paymentDate">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(payment.paymentDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={payment.paymentDate}
                    onSelect={(date) => setPayment({ ...payment, paymentDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
              <Input
                id="transactionId"
                value={payment.transactionId}
                onChange={(e) => setPayment({ ...payment, transactionId: e.target.value })}
                placeholder="External transaction reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={payment.description}
                onChange={(e) => setPayment({ ...payment, description: e.target.value })}
                placeholder="Payment description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendReceipt"
                checked={payment.sendReceipt}
                onCheckedChange={(checked) => setPayment({ ...payment, sendReceipt: !!checked })}
              />
              <Label htmlFor="sendReceipt">Send receipt to advertiser</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={payment.amount <= 0}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>Deleting this invoice will permanently remove it from the system.</AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvoice}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Invoices</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedBillings.length} invoices? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive">
              <CircleAlert className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>Deleting these invoices will permanently remove them from the system.</AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteInvoices}>
              Delete {selectedBillings.length} Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reminderType === "upcoming" ? "Send Payment Reminder" : "Send Overdue Notice"}</DialogTitle>
            <DialogDescription>
              {reminderType === "upcoming"
                ? "Send a reminder for upcoming payments"
                : "Send a notice for overdue payments"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Selected Invoices</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {selectedBillings.map((id) => {
                    const billing = billingData?.billings.find((b) => b.id === id)
                    return billing ? (
                      <li key={id} className="flex items-center justify-between text-sm">
                        <span>
                          {billing.invoiceNumber} - {billing.advertiser.name}
                        </span>
                        <span>{formatCurrency(billing.total)}</span>
                      </li>
                    ) : null
                  })}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Template</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="customizeTemplate" className="text-sm">
                    Customize message
                  </Label>
                  <Switch
                    id="customizeTemplate"
                    checked={customizeReminderTemplate}
                    onCheckedChange={setCustomizeReminderTemplate}
                  />
                </div>
              </div>

              {!customizeReminderTemplate && (
                <Select value={selectedReminderTemplate} onValueChange={setSelectedReminderTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderTemplates
                      .filter((template) => template.type === reminderType)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {customizeReminderTemplate && (
              <div className="space-y-2">
                <Label htmlFor="reminderMessage">Message</Label>
                <Textarea
                  id="reminderMessage"
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Enter reminder message"
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  You can use the following placeholders: {"{invoiceNumber}"}, {"{amount}"}, {"{dueDate}"},{" "}
                  {"{advertiser}"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminders} variant={reminderType === "overdue" ? "destructive" : "default"}>
              Send {reminderType === "upcoming" ? "Reminders" : "Notices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isLoadingBillingDetail ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <div className="flex items-center gap-2">
                  <span>Invoice {billingDetail?.invoiceNumber}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyInvoiceNumber}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </SheetTitle>
            <SheetDescription>
              {isLoadingBillingDetail ? (
                <Skeleton className="h-4 w-60" />
              ) : (
                `Created on ${billingDetail ? format(new Date(billingDetail.createdAt), "MMMM d, yyyy") : ""}`
              )}
            </SheetDescription>
          </SheetHeader>

          {isLoadingBillingDetail ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={billingDetail?.status || "UNPAID"}
                    isOverdue={
                      new Date(billingDetail?.dueDate || "") < new Date() && billingDetail?.status === "UNPAID"
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  {!isEditMode && (
                    <>
                      <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleEmailInvoice}>
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {billingDetail?.status !== "PAID" && billingDetail?.status !== "CANCELLED" && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (billingDetail) {
                                  handleOpenPaymentDialog({
                                    id: billingDetail.id,
                                    invoiceNumber: billingDetail.invoiceNumber,
                                    advertiser: {
                                      id: billingDetail.advertiser.id,
                                      name: billingDetail.advertiser.companyName,
                                      contactPerson: billingDetail.advertiser.contactPerson,
                                    },
                                    campaign: {
                                      id: billingDetail.campaign.id,
                                      name: billingDetail.campaign.name,
                                    },
                                    amount: Number(billingDetail.amount),
                                    tax: Number(billingDetail.tax),
                                    total: Number(billingDetail.total),
                                    status: billingDetail.status,
                                    dueDate: billingDetail.dueDate,
                                    createdAt: billingDetail.createdAt,
                                    payment: billingDetail.payment
                                      ? {
                                          id: billingDetail.payment.id,
                                          status: billingDetail.payment.status,
                                          dateCompleted: billingDetail.payment.dateCompleted || null,
                                          method: billingDetail.payment.paymentMethodType || "",
                                        }
                                      : null,
                                    items: billingDetail.items,
                                    isOverdue:
                                      new Date(billingDetail.dueDate) < new Date() && billingDetail.status === "UNPAID",
                                  })
                                }
                              }}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                          {billingDetail?.status !== "PAID" && (
                            <DropdownMenuItem onClick={handleMarkAsPaid}>
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {billingDetail?.status === "PAID" && (
                            <DropdownMenuItem onClick={handleMarkAsUnpaid}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              Mark as Unpaid
                            </DropdownMenuItem>
                          )}
                          {billingDetail?.status !== "CANCELLED" && (
                            <DropdownMenuItem onClick={handleCancelInvoice}>
                              <X className="mr-2 h-4 w-4" />
                              Cancel Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}

                  {isEditMode && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleUpdateInvoice}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Billed To</h3>
                  <div className="mt-1">
                    <div className="font-medium">{billingDetail?.advertiser.companyName}</div>
                    <div>{billingDetail?.advertiser.contactPerson}</div>
                    <div>{billingDetail?.advertiser.address}</div>
                    {billingDetail?.advertiser.city && (
                      <div>
                        {billingDetail.advertiser.city}, {billingDetail.advertiser.state}{" "}
                        {billingDetail.advertiser.postalCode}
                      </div>
                    )}
                    <div>{billingDetail?.advertiser.country}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex justify-end">
                      <div className="text-sm font-medium text-muted-foreground w-32">Invoice Number:</div>
                      <div className="w-40">{billingDetail?.invoiceNumber}</div>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-sm font-medium text-muted-foreground w-32">Issue Date:</div>
                      <div className="w-40">
                        {billingDetail ? format(new Date(billingDetail.createdAt), "MMMM d, yyyy") : ""}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-sm font-medium text-muted-foreground w-32">Due Date:</div>
                      <div className="w-40">
                        {isEditMode ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editedBilling?.dueDate
                                  ? format(new Date(editedBilling.dueDate), "PPP")
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editedBilling?.dueDate ? new Date(editedBilling.dueDate) : undefined}
                                onSelect={(date) =>
                                  setEditedBilling({
                                    ...editedBilling,
                                    dueDate: date ? format(date, "yyyy-MM-dd") : "",
                                  })
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : billingDetail ? (
                          format(new Date(billingDetail.dueDate), "MMMM d, yyyy")
                        ) : (
                          ""
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-sm font-medium text-muted-foreground w-32">Campaign:</div>
                      <div className="w-40">{billingDetail?.campaign.name}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Invoice Items</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        {isEditMode && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isEditMode
                        ? editedBilling?.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  value={item.description}
                                  onChange={(e) => handleUpdateLineItem(index, "description", e.target.value)}
                                  className="border-none p-0 h-auto"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateLineItem(index, "quantity", Number(e.target.value))}
                                  className="border-none p-0 h-auto text-right w-16 ml-auto"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateLineItem(index, "unitPrice", Number(e.target.value))}
                                  className="border-none p-0 h-auto text-right w-24 ml-auto"
                                />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveLineItem(index)}
                                  disabled={(editedBilling?.items?.length || 0) <= 1}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        : billingDetail?.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity || 1}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unitPrice || item.amount / (item.quantity || 1))}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                          ))}

                      {isEditMode && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Button variant="ghost" size="sm" className="w-full" onClick={handleAddLineItem}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Item
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="border rounded-md p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div>Subtotal</div>
                    <div>
                      {isEditMode ? formatCurrency(editedSubtotal) : formatCurrency(Number(billingDetail?.amount || 0))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      Tax
                      {isEditMode && (
                        <Input
                          type="number"
                          value={editedBilling?.tax || 0}
                          onChange={(e) => setEditedBilling({ ...editedBilling, tax: Number(e.target.value) })}
                          className="w-16 h-8"
                        />
                      )}
                      {!isEditMode && `(${billingDetail?.tax || 0}%)`}
                    </div>
                    <div>
                      {isEditMode
                        ? formatCurrency(editedSubtotal * (Number(editedBilling?.tax || 0) / 100))
                        : formatCurrency((Number(billingDetail?.tax || 0) * Number(billingDetail?.amount || 0)) / 100)}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <div>Total</div>
                    <div>
                      {isEditMode ? formatCurrency(editedTotal) : formatCurrency(Number(billingDetail?.total || 0))}
                    </div>
                  </div>

                  {billingDetail?.payment && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <div>Paid</div>
                        <div>{formatCurrency(Number(billingDetail.payment.amount || 0))}</div>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <div>Balance</div>
                        <div>
                          {formatCurrency(
                            Math.max(0, Number(billingDetail.total) - Number(billingDetail.payment.amount || 0)),
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              {billingDetail?.payment && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Information</h3>
                  <div className="border rounded-md p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-muted-foreground">Payment Date</div>
                        <div>
                          {billingDetail.payment.dateCompleted
                            ? format(new Date(billingDetail.payment.dateCompleted), "MMMM d, yyyy")
                            : "N/A"}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-muted-foreground">Payment Method</div>
                        <div>{billingDetail.payment.paymentMethodType || "N/A"}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-muted-foreground">Transaction ID</div>
                        <div>{billingDetail.payment.transactionId || "N/A"}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-muted-foreground">Status</div>
                        <div>
                          <PaymentStatusBadge status={billingDetail.payment.status} />
                        </div>
                      </div>
                      {billingDetail.payment.receiptUrl && (
                        <div className="flex justify-between">
                          <div className="text-sm font-medium text-muted-foreground">Receipt</div>
                          <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                            <a href={billingDetail.payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                              View Receipt
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={isBulkExportDialogOpen} onOpenChange={setIsBulkExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Invoices</DialogTitle>
            <DialogDescription>Choose export format and options</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="formatPdf"
                    checked={exportFormat === "pdf"}
                    onCheckedChange={() => setExportFormat("pdf")}
                  />
                  <Label htmlFor="formatPdf" className="cursor-pointer">
                    PDF
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="formatCsv"
                    checked={exportFormat === "csv"}
                    onCheckedChange={() => setExportFormat("csv")}
                  />
                  <Label htmlFor="formatCsv" className="cursor-pointer">
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="formatXlsx"
                    checked={exportFormat === "xlsx"}
                    onCheckedChange={() => setExportFormat("xlsx")}
                  />
                  <Label htmlFor="formatXlsx" className="cursor-pointer">
                    Excel (XLSX)
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Export Options</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="includeDetails" defaultChecked />
                  <Label htmlFor="includeDetails" className="cursor-pointer">
                    Include line item details
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="includePayments" defaultChecked />
                  <Label htmlFor="includePayments" className="cursor-pointer">
                    Include payment information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="includeNotes" defaultChecked />
                  <Label htmlFor="includeNotes" className="cursor-pointer">
                    Include notes and additional information
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleExport(exportFormat)} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {selectedBillings.length > 0 ? `(${selectedBillings.length})` : "All"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Invoices</DialogTitle>
            <DialogDescription>Import invoices from CSV or Excel file</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {importStep === 1 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <h3 className="font-medium">Upload a file</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload a CSV or Excel file
                    </p>
                    <Input type="file" accept=".csv,.xlsx,.xls" className="max-w-xs" onChange={handleFileUpload} />
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">File requirements:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>CSV or Excel format</li>
                    <li>Headers in the first row</li>
                    <li>Required columns: Advertiser, Campaign, Amount, Due Date</li>
                    <li>Optional columns: Tax, Description, Notes</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => window.open("/templates/invoice-import-template.xlsx")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Map Columns</h3>
                  <Button variant="outline" size="sm" onClick={() => setImportStep(1)}>
                    Change File
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Advertiser</Label>
                      <Select
                        value={importMappings.advertiser || ""}
                        onValueChange={(value) => handleImportMapping("advertiser", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advertiser">Advertiser</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Campaign</Label>
                      <Select
                        value={importMappings.campaign || ""}
                        onValueChange={(value) => handleImportMapping("campaign", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="campaign">Campaign</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Select
                        value={importMappings.amount || ""}
                        onValueChange={(value) => handleImportMapping("amount", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="total">Total</SelectItem>
                          <SelectItem value="subtotal">Subtotal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Select
                        value={importMappings.dueDate || ""}
                        onValueChange={(value) => handleImportMapping("dueDate", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dueDate">Due Date</SelectItem>
                          <SelectItem value="due_date">Due Date</SelectItem>
                          <SelectItem value="payment_date">Payment Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Advertiser</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.advertiser}</TableCell>
                          <TableCell>{item.campaign}</TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatCurrency(item.tax)}</TableCell>
                          <TableCell>{item.dueDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {importErrors.length > 0 && (
                  <Alert variant="destructive">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Import Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        {importErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            {importStep === 2 && (
              <Button onClick={handleImportInvoices} disabled={!importFile || Object.keys(importMappings).length < 4}>
                Import {importPreview.length} Invoices
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Templates</DialogTitle>
            <DialogDescription>Manage your invoice templates</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Available Templates</h3>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTemplates
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    : invoiceTemplates?.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTemplate === template.id}
                              onCheckedChange={() => setSelectedTemplate(template.id)}
                            />
                          </TableCell>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>{template.isDefault && <Badge variant="outline">Default</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedTemplate}
                onClick={() => {
                  toast.success("Template applied successfully")
                  setIsTemplateDialogOpen(false)
                }}
              >
                Apply Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Billing Settings</DialogTitle>
            <DialogDescription>Configure default billing settings</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultDueDays">Default Due Days</Label>
                <Input
                  id="defaultDueDays"
                  type="number"
                  value={billingSettings.defaultDueDays}
                  onChange={(e) => setBillingSettings({ ...billingSettings, defaultDueDays: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  value={billingSettings.defaultTaxRate}
                  onChange={(e) => setBillingSettings({ ...billingSettings, defaultTaxRate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={billingSettings.invoicePrefix}
                  onChange={(e) => setBillingSettings({ ...billingSettings, invoicePrefix: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select
                  value={billingSettings.defaultCurrency}
                  onValueChange={(value) => setBillingSettings({ ...billingSettings, defaultCurrency: value })}
                >
                  <SelectTrigger id="defaultCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
              <Select
                value={billingSettings.defaultPaymentTerms}
                onValueChange={(value) => setBillingSettings({ ...billingSettings, defaultPaymentTerms: value })}
              >
                <SelectTrigger id="defaultPaymentTerms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultNotes">Default Invoice Notes</Label>
              <Textarea
                id="defaultNotes"
                value={billingSettings.defaultNotes}
                onChange={(e) => setBillingSettings({ ...billingSettings, defaultNotes: e.target.value })}
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enablePartialPayments">Allow Partial Payments</Label>
                <p className="text-sm text-muted-foreground">Allow advertisers to make partial payments on invoices</p>
              </div>
              <Switch
                id="enablePartialPayments"
                checked={billingSettings.enablePartialPayments}
                onCheckedChange={(checked) =>
                  setBillingSettings({ ...billingSettings, enablePartialPayments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableLateFees">Enable Late Fees</Label>
                <p className="text-sm text-muted-foreground">Automatically add late fees to overdue invoices</p>
              </div>
              <Switch
                id="enableLateFees"
                checked={billingSettings.enableLateFees}
                onCheckedChange={(checked) => setBillingSettings({ ...billingSettings, enableLateFees: checked })}
              />
            </div>

            {billingSettings.enableLateFees && (
              <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="lateFeePercentage">Late Fee Percentage (%)</Label>
                  <Input
                    id="lateFeePercentage"
                    type="number"
                    value={billingSettings.lateFeePercentage}
                    onChange={(e) =>
                      setBillingSettings({ ...billingSettings, lateFeePercentage: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateFeeGracePeriod">Grace Period (days)</Label>
                  <Input
                    id="lateFeeGracePeriod"
                    type="number"
                    value={billingSettings.lateFeeGracePeriod}
                    onChange={(e) =>
                      setBillingSettings({ ...billingSettings, lateFeeGracePeriod: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBillingSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
