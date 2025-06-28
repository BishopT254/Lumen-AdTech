"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { FileText, Plus, Download, Filter, CalendarIcon, Search, RefreshCw, BarChart3, Activity, Trash2, Clock, Share2, AlertTriangle, CheckCircle2, Leaf, Smartphone, Users, DollarSign, Repeat, X } from 'lucide-react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { usePublicSettings } from "@/hooks/usePublicSettings"

// Report generation form schema
const reportFormSchema = z.object({
  name: z.string().min(3, { message: "Report name must be at least 3 characters" }),
  type: z.enum(["campaign", "financial", "device", "audience", "sustainability", "emotion"]),
  format: z.enum(["pdf", "csv", "excel", "json"]),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  includeCharts: z.boolean().default(true),
  schedule: z.enum(["once", "daily", "weekly", "monthly"]).default("once"),
  filters: z
    .object({
      campaigns: z.array(z.string()).optional(),
      devices: z.array(z.string()).optional(),
      partners: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(),
    })
    .optional(),
  recipients: z.array(z.string()).optional(),
  description: z.string().optional(),
})

type ReportFormValues = z.infer<typeof reportFormSchema>

// Report type definitions based on Prisma schema
type Report = {
  id: string
  name: string
  type: "campaign" | "financial" | "device" | "audience" | "sustainability" | "emotion"
  format: "pdf" | "csv" | "excel" | "json"
  dateRange: string
  status: "pending" | "processing" | "ready" | "failed"
  createdAt: string
  createdBy: string
  createdById: string
  schedule?: string
  lastRun?: string
  nextRun?: string
  downloadUrl?: string
  size?: string
  filters?: any
  description?: string
}

// Campaign data type for filters
type Campaign = {
  id: string
  name: string
  advertiserId: string
  status: string
}

// Device data type for filters
type Device = {
  id: string
  name: string
  deviceType: string
  partnerId: string
}

// Partner data type for filters
type Partner = {
  id: string
  companyName: string
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { generalSettings, systemSettings } = usePublicSettings()

  // State management
  const [newReportOpen, setNewReportOpen] = useState(false)
  const [reportType, setReportType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [viewReportOpen, setViewReportOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState("all")

  // Form setup
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      name: "",
      type: "campaign",
      format: "pdf",
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      includeCharts: true,
      schedule: "once",
      filters: {
        campaigns: [],
        devices: [],
        partners: [],
        metrics: [],
      },
      recipients: [],
      description: "",
    },
  })

  // Fetch reports data
  const {
    data: reports,
    isLoading: isLoadingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["reports", reportType, searchQuery, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (reportType !== "all") params.append("type", reportType)
      if (searchQuery) params.append("search", searchQuery)
      params.append("from", dateFilter.from.toISOString())
      params.append("to", dateFilter.to.toISOString())

      const res = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch reports")
      return res.json()
    },
  })

  // Fetch campaigns for filters
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/admin/campaigns?limit=100")
      if (!res.ok) throw new Error("Failed to fetch campaigns")
      return res.json()
    },
  })

  // Fetch devices for filters
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await fetch("/api/admin/devices?limit=100")
      if (!res.ok) throw new Error("Failed to fetch devices")
      return res.json()
    },
  })

  // Fetch partners for filters
  const { data: partners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const res = await fetch("/api/admin/partners?limit=100")
      if (!res.ok) throw new Error("Failed to fetch partners")
      return res.json()
    },
  })

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: ReportFormValues) => {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to create report")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast({
        title: "Report created",
        description: "Your report is being generated and will be available shortly.",
      })
      setNewReportOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast({
        title: "Error creating report",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to delete report")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast({
        title: "Report deleted",
        description: "The report has been permanently deleted.",
      })
      setDeleteConfirmOpen(false)
      setSelectedReport(null)
    },
    onError: (error) => {
      toast({
        title: "Error deleting report",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Download report function
  const downloadReport = async (report: Report) => {
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/download`)
      if (!res.ok) throw new Error("Failed to download report")

      // Get filename from content-disposition header or use default
      const contentDisposition = res.headers.get("content-disposition")
      let filename = `report-${report.id}.${report.format}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) filename = filenameMatch[1]
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Create a link and trigger download
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  // Form submission handler
  const onSubmit = (data: ReportFormValues) => {
    createReportMutation.mutate(data)
  }

  // Filter reports based on current tab
  const filteredReports = reports?.filter((report: Report) => {
    if (currentTab === "all") return true
    if (currentTab === "scheduled") return report.schedule && report.schedule !== "once"
    if (currentTab === "recent") {
      const createdDate = new Date(report.createdAt)
      return new Date().getTime() - createdDate.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
    }
    return report.status === currentTab
  })

  // Get report type badge variant
  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case "campaign":
        return "default"
      case "financial":
        return "secondary"
      case "device":
        return "outline"
      case "audience":
        return "destructive"
      case "sustainability":
        return "success"
      case "emotion":
        return "warning"
      default:
        return "default"
    }
  }

  // Get report status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return "success"
      case "pending":
        return "secondary"
      case "processing":
        return "warning"
      case "failed":
        return "destructive"
      default:
        return "default"
    }
  }

  // Get report type icon
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "campaign":
        return <BarChart3 className="h-4 w-4" />
      case "financial":
        return <DollarSign className="h-4 w-4" />
      case "device":
        return <Smartphone className="h-4 w-4" />
      case "audience":
        return <Users className="h-4 w-4" />
      case "sustainability":
        return <Leaf className="h-4 w-4" />
      case "emotion":
        return <Activity className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Format date range for display
  const formatDateRange = (dateRangeStr: string) => {
    try {
      const dates = JSON.parse(dateRangeStr)
      return `${format(new Date(dates.from), "MMM d, yyyy")} - ${format(new Date(dates.to), "MMM d, yyyy")}`
    } catch (e) {
      return dateRangeStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Reports</h1>
          <p className="text-muted-foreground">
            Generate, manage, and schedule reports for your advertising campaigns and devices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchReports()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setNewReportOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="ready">Ready</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="device">Device</SelectItem>
                <SelectItem value="audience">Audience</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
                <SelectItem value="emotion">Emotion</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateFilter.from, "MMM d")} - {format(dateFilter.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateFilter.from,
                    to: dateFilter.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateFilter({ from: range.from, to: range.to })
                      setShowDatePicker(false)
                    }
                  }}
                  initialFocus
                />
                <div className="flex items-center justify-between p-3 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        setDateFilter({
                          from: subDays(today, 7),
                          to: today,
                        })
                        setShowDatePicker(false)
                      }}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        setDateFilter({
                          from: subDays(today, 30),
                          to: today,
                        })
                        setShowDatePicker(false)
                      }}
                    >
                      Last 30 days
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      setDateFilter({
                        from: startOfMonth(today),
                        to: endOfMonth(today),
                      })
                      setShowDatePicker(false)
                    }}
                  >
                    This Month
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Date Range</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Schedule</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReports ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-6 w-[180px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[100px]" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-6 w-[150px]" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-6 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[80px]" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-6 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-[100px] ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredReports?.length > 0 ? (
                    filteredReports.map((report: Report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(report.type)}
                            <span>{report.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getReportTypeBadge(report.type)}>
                            {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatDateRange(report.dateRange)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(report.status)}>
                            {report.status === "ready" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : report.status === "processing" ? (
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            ) : report.status === "failed" ? (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {report.schedule && report.schedule !== "once" ? (
                            <Badge variant="outline">
                              <Repeat className="mr-1 h-3 w-3" />
                              {report.schedule.charAt(0).toUpperCase() + report.schedule.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">One-time</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {report.status === "ready" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadReport(report)}
                                title="Download report"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report)
                                setViewReportOpen(true)
                              }}
                              title="View details"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report)
                                setDeleteConfirmOpen(true)
                              }}
                              title="Delete report"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <FileText className="h-12 w-12 mb-2 opacity-20" />
                          <h3 className="font-medium">No reports found</h3>
                          <p className="text-sm">
                            {searchQuery || reportType !== "all"
                              ? "Try adjusting your filters"
                              : "Generate your first report to get started"}
                          </p>
                          {!searchQuery && reportType === "all" && (
                            <Button variant="outline" className="mt-4" onClick={() => setNewReportOpen(true)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Generate Report
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs have the same content structure */}
        <TabsContent value="ready" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                {/* Same table structure as "all" tab */}
                {/* ... */}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                {/* Same table structure as "all" tab */}
                {/* ... */}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                {/* Same table structure as "all" tab */}
                {/* ... */}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                {/* Same table structure as "all" tab */}
                {/* ... */}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate New Report Dialog */}
      <Dialog open={newReportOpen} onOpenChange={setNewReportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate New Report</DialogTitle>
            <DialogDescription>
              Create a custom report based on your analytics data. Configure the report parameters below.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Q2 Campaign Performance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="campaign">
                              <div className="flex items-center">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Campaign Performance
                              </div>
                            </SelectItem>
                            <SelectItem value="financial">
                              <div className="flex items-center">
                                <DollarSign className="mr-2 h-4 w-4" />
                                Financial Analysis
                              </div>
                            </SelectItem>
                            <SelectItem value="device">
                              <div className="flex items-center">
                                <Smartphone className="mr-2 h-4 w-4" />
                                Device Analytics
                              </div>
                            </SelectItem>
                            <SelectItem value="audience">
                              <div className="flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                Audience Insights
                              </div>
                            </SelectItem>
                            <SelectItem value="sustainability">
                              <div className="flex items-center">
                                <Leaf className="mr-2 h-4 w-4" />
                                Sustainability Metrics
                              </div>
                            </SelectItem>
                            <SelectItem value="emotion">
                              <div className="flex items-center">
                                <Activity className="mr-2 h-4 w-4" />
                                Emotion Analysis
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Select the type of data to include in your report</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF Document</SelectItem>
                            <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                            <SelectItem value="excel">Excel Workbook</SelectItem>
                            <SelectItem value="json">JSON Data</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateRange"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Range</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value.from ? (
                                  field.value.to ? (
                                    <>
                                      {format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}
                                    </>
                                  ) : (
                                    format(field.value.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date range</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="range" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="includeCharts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Include Visualizations</FormLabel>
                          <FormDescription>
                            Add charts and graphs to visualize the data (PDF format only)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schedule"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Report Schedule</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="once" />
                              </FormControl>
                              <FormLabel className="font-normal">One-time report</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="daily" />
                              </FormControl>
                              <FormLabel className="font-normal">Daily report</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="weekly" />
                              </FormControl>
                              <FormLabel className="font-normal">Weekly report</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="monthly" />
                              </FormControl>
                              <FormLabel className="font-normal">Monthly report</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of this report" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Advanced Filters</h3>
                <p className="text-sm text-muted-foreground">Narrow down the data included in your report</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {form.watch("type") === "campaign" && (
                    <FormField
                      control={form.control}
                      name="filters.campaigns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaigns</FormLabel>
                          <Select onValueChange={(value) => field.onChange([...(field.value || []), value])}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select campaigns" />
                            </SelectTrigger>
                            <SelectContent>
                              {campaigns?.map((campaign: Campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  {campaign.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((campaignId: string) => {
                                const campaign = campaigns?.find((c: Campaign) => c.id === campaignId)
                                return campaign ? (
                                  <Badge key={campaignId} variant="secondary" className="flex items-center gap-1">
                                    {campaign.name}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() =>
                                        field.onChange(field.value.filter((id: string) => id !== campaignId))
                                      }
                                    />
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          )}
                          <FormDescription>Leave empty to include all campaigns</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(form.watch("type") === "device" || form.watch("type") === "sustainability") && (
                    <FormField
                      control={form.control}
                      name="filters.devices"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Devices</FormLabel>
                          <Select onValueChange={(value) => field.onChange([...(field.value || []), value])}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select devices" />
                            </SelectTrigger>
                            <SelectContent>
                              {devices?.map((device: Device) => (
                                <SelectItem key={device.id} value={device.id}>
                                  {device.name} ({device.deviceType})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((deviceId: string) => {
                                const device = devices?.find((d: Device) => d.id === deviceId)
                                return device ? (
                                  <Badge key={deviceId} variant="secondary" className="flex items-center gap-1">
                                    {device.name}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() =>
                                        field.onChange(field.value.filter((id: string) => id !== deviceId))
                                      }
                                    />
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(form.watch("type") === "financial" || form.watch("type") === "device") && (
                    <FormField
                      control={form.control}
                      name="filters.partners"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partners</FormLabel>
                          <Select onValueChange={(value) => field.onChange([...(field.value || []), value])}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select partners" />
                            </SelectTrigger>
                            <SelectContent>
                              {partners?.map((partner: Partner) => (
                                <SelectItem key={partner.id} value={partner.id}>
                                  {partner.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((partnerId: string) => {
                                const partner = partners?.find((p: Partner) => p.id === partnerId)
                                return partner ? (
                                  <Badge key={partnerId} variant="secondary" className="flex items-center gap-1">
                                    {partner.companyName}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() =>
                                        field.onChange(field.value.filter((id: string) => id !== partnerId))
                                      }
                                    />
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewReportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createReportMutation.isPending}>
                  {createReportMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Report Details Dialog */}
      <Dialog open={viewReportOpen} onOpenChange={setViewReportOpen}>
        <DialogContent className="max-w-3xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getReportTypeIcon(selectedReport.type)}
                  {selectedReport.name}
                </DialogTitle>
                <DialogDescription>Report details and metadata</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Report Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={getReportTypeBadge(selectedReport.type)}>
                        {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium uppercase">{selectedReport.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusBadge(selectedReport.status)}>
                        {selectedReport.status === "ready" ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : selectedReport.status === "processing" ? (
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                        ) : selectedReport.status === "failed" ? (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        ) : (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{format(new Date(selectedReport.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created By:</span>
                      <span>{selectedReport.createdBy}</span>
                    </div>
                    {selectedReport.size && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Size:</span>
                        <span>{selectedReport.size}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule & Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date Range:</span>
                      <span>{formatDateRange(selectedReport.dateRange)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule:</span>
                      {selectedReport.schedule && selectedReport.schedule !== "once" ? (
                        <Badge variant="outline">
                          <Repeat className="mr-1 h-3 w-3" />
                          {selectedReport.schedule.charAt(0).toUpperCase() + selectedReport.schedule.slice(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">One-time</span>
                      )}
                    </div>
                    {selectedReport.lastRun && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Generated:</span>
                        <span>{format(new Date(selectedReport.lastRun), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    )}
                    {selectedReport.nextRun && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next Run:</span>
                        <span>{format(new Date(selectedReport.nextRun), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    )}
                    {selectedReport.description && (
                      <div className="pt-2">
                        <span className="text-muted-foreground">Description:</span>
                        <p className="mt-1">{selectedReport.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between mt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReport(null)
                      setViewReportOpen(false)
                      setDeleteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  {selectedReport.status === "ready" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Implement share functionality
                        toast({
                          title: "Share link copied",
                          description: "Report share link has been copied to clipboard",
                        })
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  )}
                </div>

                {selectedReport.status === "ready" && (
                  <Button onClick={() => downloadReport(selectedReport)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/50">
              {getReportTypeIcon(selectedReport.type)}
              <div>
                <p className="font-medium">{selectedReport.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)} • Created{" "}
                  {format(new Date(selectedReport.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReport && deleteReportMutation.mutate(selectedReport.id)}
              disabled={deleteReportMutation.isPending}
            >
              {deleteReportMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
