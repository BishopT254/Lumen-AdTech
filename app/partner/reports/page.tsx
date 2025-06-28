"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { AlertCircle, Calendar, Download, FileText, Filter, Loader2, RefreshCw, Search, Star, X } from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

// Define types based on the Prisma schema
type Report = {
  id: string
  title: string
  description: string
  type: "PERFORMANCE" | "EARNINGS" | "DEVICE_HEALTH" | "CAMPAIGN" | "TAX" | "CUSTOM"
  format: "PDF" | "CSV" | "EXCEL"
  status: "READY" | "GENERATING" | "FAILED"
  dateRange: {
    startDate: string
    endDate: string
  }
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  fileSize?: number
  deviceIds?: string[]
  parameters?: Record<string, any>
  error?: string
}

type Device = {
  id: string
  name: string
  location: string
  type: string
  status: string
}

type ReportTemplate = {
  id: string
  title: string
  description: string
  type: "PERFORMANCE" | "EARNINGS" | "DEVICE_HEALTH" | "CAMPAIGN" | "TAX" | "CUSTOM"
  format: "PDF" | "CSV" | "EXCEL"
  parameters: Record<string, any>
  isDefault: boolean
}

export default function ReportsPage() {
  const router = useRouter()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for reports data
  const [reports, setReports] = useState<Report[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("reports")

  // State for generate report dialog
  const [isGenerateReportDialogOpen, setIsGenerateReportDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for generating report
  const [reportForm, setReportForm] = useState({
    templateId: "",
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // 30 days ago
    endDate: format(new Date(), "yyyy-MM-dd"), // Today
    deviceIds: [] as string[],
    format: "PDF",
  })

  // Error states
  const [error, setError] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  // Fetch devices for dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/partner/devices")

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`)
        }

        const data = await response.json()
        setDevices(data)
      } catch (error) {
        console.error("Error fetching devices:", error)
        setDeviceError("Failed to load devices. Please try again later.")
      }
    }

    fetchDevices()
  }, [])

  // Fetch report templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/partner/reports/templates")

        if (!response.ok) {
          throw new Error(`Failed to fetch report templates: ${response.statusText}`)
        }

        const data = await response.json()
        setTemplates(data)

        // Set default template if available
        const defaultTemplate = data.find((template: ReportTemplate) => template.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate)
          setReportForm((prev) => ({ ...prev, templateId: defaultTemplate.id, format: defaultTemplate.format }))
        } else if (data.length > 0) {
          setSelectedTemplate(data[0])
          setReportForm((prev) => ({ ...prev, templateId: data[0].id, format: data[0].format }))
        }
      } catch (error) {
        console.error("Error fetching report templates:", error)
      }
    }

    fetchTemplates()
  }, [])

  // Fetch reports data
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/partner/reports")

        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.statusText}`)
        }

        const data = await response.json()
        setReports(data)
      } catch (error) {
        console.error("Error fetching reports:", error)
        setError("Failed to load reports. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchReportsData()
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const response = await fetch("/api/partner/reports")

      if (!response.ok) {
        throw new Error(`Failed to refresh reports: ${response.statusText}`)
      }

      const data = await response.json()
      setReports(data)

      toast.success("Reports refreshed successfully")
    } catch (error) {
      console.error("Error refreshing reports:", error)
      setError("Failed to refresh reports. Please try again later.")
      toast.error("Failed to refresh reports")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle report form input changes
  const handleReportFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setReportForm((prev) => ({ ...prev, [name]: value }))
  }

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setSelectedTemplate(template)
      setReportForm((prev) => ({
        ...prev,
        templateId: template.id,
        format: template.format,
      }))
    }
  }

  // Handle device selection
  const handleDeviceSelection = (deviceId: string) => {
    setReportForm((prev) => {
      const deviceIds = [...prev.deviceIds]

      if (deviceIds.includes(deviceId)) {
        // Remove device if already selected
        return { ...prev, deviceIds: deviceIds.filter((id) => id !== deviceId) }
      } else {
        // Add device if not selected
        return { ...prev, deviceIds: [...deviceIds, deviceId] }
      }
    })
  }

  // Handle select all devices
  const handleSelectAllDevices = () => {
    setReportForm((prev) => ({
      ...prev,
      deviceIds: devices.map((device) => device.id),
    }))
  }

  // Handle clear device selection
  const handleClearDeviceSelection = () => {
    setReportForm((prev) => ({
      ...prev,
      deviceIds: [],
    }))
  }

  // Handle generate report
  const handleGenerateReport = async () => {
    try {
      setIsSubmitting(true)

      // Validate required fields
      if (!reportForm.templateId || !reportForm.startDate || !reportForm.endDate) {
        toast.error("Please fill in all required fields")
        return
      }

      // Validate date range
      if (new Date(reportForm.startDate) > new Date(reportForm.endDate)) {
        toast.error("Start date must be before end date")
        return
      }

      // Prepare payload
      const payload = {
        templateId: reportForm.templateId,
        dateRange: {
          startDate: reportForm.startDate,
          endDate: reportForm.endDate,
        },
        deviceIds: reportForm.deviceIds.length > 0 ? reportForm.deviceIds : undefined,
        format: reportForm.format,
      }

      const response = await fetch("/api/partner/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`)
      }

      const newReport = await response.json()

      // Add new report to state
      setReports((prev) => [newReport, ...prev])

      toast.success("Report generation started")

      // Close dialog
      setIsGenerateReportDialogOpen(false)
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle download report
  const handleDownloadReport = async (report: Report) => {
    if (!report.downloadUrl) {
      toast.error("Download URL not available")
      return
    }

    try {
      const response = await fetch(report.downloadUrl)

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.statusText}`)
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a link element and trigger download
      const downloadLink = document.createElement("a")
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = `${report.title}.${report.format.toLowerCase()}`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } catch (error) {
      console.error("Error downloading report:", error)
      toast.error("Failed to download report")
    }
  }

  // Filter reports based on search query and filters
  const filteredReports = reports.filter((report) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter
    const matchesType = typeFilter === "all" || report.type === typeFilter

    // Status filter
    const matchesStatus = statusFilter === "all" || report.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"

    const units = ["B", "KB", "MB", "GB"]
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  // Get report type badge variant
  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case "PERFORMANCE":
        return "default"
      case "EARNINGS":
        return "success"
      case "DEVICE_HEALTH":
        return "warning"
      case "CAMPAIGN":
        return "info"
      case "TAX":
        return "secondary"
      case "CUSTOM":
        return "outline"
      default:
        return "default"
    }
  }

  // Get report status badge variant
  const getReportStatusBadge = (status: string) => {
    switch (status) {
      case "READY":
        return "success"
      case "GENERATING":
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
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and download reports for your devices and campaigns</p>
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
          <Button size="sm" onClick={() => setIsGenerateReportDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reports" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search reports..."
                className="pl-8 w-full sm:w-[200px] md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === "reports" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Report Type</p>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                        <SelectItem value="EARNINGS">Earnings</SelectItem>
                        <SelectItem value="DEVICE_HEALTH">Device Health</SelectItem>
                        <SelectItem value="CAMPAIGN">Campaign</SelectItem>
                        <SelectItem value="TAX">Tax</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="text-sm font-medium mt-4 mb-2">Status</p>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="GENERATING">Generating</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No Reports Found</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Generate your first report to get started."}
                </p>
                <Button onClick={() => setIsGenerateReportDialogOpen(true)} className="mt-4">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <div
                    className={`h-1 ${
                      report.status === "READY"
                        ? "bg-green-500"
                        : report.status === "GENERATING"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{report.title}</h3>
                          <Badge variant={getReportTypeBadge(report.type)}>{report.type.replace(/_/g, " ")}</Badge>
                          <Badge variant={getReportStatusBadge(report.status)}>{report.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(parseISO(report.dateRange.startDate), "MMM d, yyyy")} -{" "}
                              {format(parseISO(report.dateRange.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{report.format}</span>
                          </div>
                          {report.fileSize && (
                            <div className="flex items-center gap-1">
                              <span>{formatFileSize(report.fileSize)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={report.status !== "READY" || !report.downloadUrl}
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>

                        {report.status === "GENERATING" && (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm">Processing...</span>
                          </div>
                        )}

                        {report.status === "FAILED" && report.error && (
                          <div className="text-sm text-red-500">Error: {report.error}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No Templates Available</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  Report templates are not available at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      {template.isDefault && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getReportTypeBadge(template.type)}>{template.type.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">{template.format}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.type === "PERFORMANCE" && "Detailed performance metrics for your devices"}
                      {template.type === "EARNINGS" && "Financial summary of your earnings"}
                      {template.type === "DEVICE_HEALTH" && "Health status of your devices"}
                      {template.type === "CAMPAIGN" && "Campaign performance and analytics"}
                      {template.type === "TAX" && "Tax information for financial reporting"}
                      {template.type === "CUSTOM" && "Custom report with specific metrics"}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(template)
                        setReportForm((prev) => ({
                          ...prev,
                          templateId: template.id,
                          format: template.format,
                        }))
                        setIsGenerateReportDialogOpen(true)
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      {isGenerateReportDialogOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Generate Report</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsGenerateReportDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Template</label>
                  <Select value={reportForm.templateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      name="startDate"
                      value={reportForm.startDate}
                      onChange={handleReportFormChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input type="date" name="endDate" value={reportForm.endDate} onChange={handleReportFormChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select
                    value={reportForm.format}
                    onValueChange={(value) => setReportForm((prev) => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="EXCEL">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Devices</label>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSelectAllDevices}>
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearDeviceSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto">
                    {deviceError ? (
                      <p className="text-sm text-red-500 p-2">{deviceError}</p>
                    ) : devices.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No devices available</p>
                    ) : (
                      <div className="space-y-2">
                        {devices.map((device) => (
                          <div key={device.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`device-${device.id}`}
                              checked={reportForm.deviceIds.includes(device.id)}
                              onChange={() => handleDeviceSelection(device.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`device-${device.id}`} className="text-sm">
                              {device.name} ({device.location})
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportForm.deviceIds.length === 0
                      ? "No devices selected (will include all devices)"
                      : `${reportForm.deviceIds.length} device(s) selected`}
                  </p>
                </div>

                {selectedTemplate && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">{selectedTemplate.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsGenerateReportDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateReport} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
