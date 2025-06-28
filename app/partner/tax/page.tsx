"use client"

import { Label } from "@/components/ui/label"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { AlertCircle, Calendar, Download, FileText, Filter, Loader2, RefreshCw, Search, Upload } from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

// Define types based on the Prisma schema
type TaxDocument = {
  id: string
  title: string
  description: string
  type: "INVOICE" | "RECEIPT" | "TAX_FORM" | "STATEMENT" | "OTHER"
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"
  fileUrl: string
  fileSize: number
  fileType: string
  year: number
  quarter?: number
  month?: number
  submissionDate?: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

export default function TaxDocumentsPage() {
  const router = useRouter()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()

  // State for tax documents data
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("all")

  // State for upload dialog
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Form state for uploading document
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "INVOICE",
    year: new Date().getFullYear(),
    quarter: null as number | null,
    month: null as number | null,
  })

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Fetch tax documents data
  useEffect(() => {
    const fetchTaxDocuments = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/partner/tax-documents")

        if (!response.ok) {
          throw new Error(`Failed to fetch tax documents: ${response.statusText}`)
        }

        const data = await response.json()
        setTaxDocuments(data)
      } catch (error) {
        console.error("Error fetching tax documents:", error)
        setError("Failed to load tax documents. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaxDocuments()
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const response = await fetch("/api/partner/tax-documents")

      if (!response.ok) {
        throw new Error(`Failed to refresh tax documents: ${response.statusText}`)
      }

      const data = await response.json()
      setTaxDocuments(data)

      toast.success("Tax documents refreshed successfully")
    } catch (error) {
      console.error("Error refreshing tax documents:", error)
      setError("Failed to refresh tax documents. Please try again later.")
      toast.error("Failed to refresh tax documents")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)

      // Auto-fill title if empty
      if (!uploadForm.title) {
        setUploadForm((prev) => ({
          ...prev,
          title: file.name.split(".")[0],
        }))
      }
    }
  }

  // Handle upload form input changes
  const handleUploadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setUploadForm((prev) => ({ ...prev, [name]: value }))
  }

  // Handle document upload
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Create form data
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("title", uploadForm.title)
      formData.append("description", uploadForm.description)
      formData.append("type", uploadForm.type)
      formData.append("year", uploadForm.year.toString())
      if (uploadForm.quarter) formData.append("quarter", uploadForm.quarter.toString())
      if (uploadForm.month) formData.append("month", uploadForm.month.toString())

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/partner/tax-documents/upload", true)

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      // Handle response
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText)

          // Add new document to state
          setTaxDocuments((prev) => [response, ...prev])

          // Reset form and close dialog
          setSelectedFile(null)
          setUploadForm({
            title: "",
            description: "",
            type: "INVOICE",
            year: new Date().getFullYear(),
            quarter: null,
            month: null,
          })
          setIsUploadDialogOpen(false)

          toast.success("Document uploaded successfully")
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`)
        }
        setIsUploading(false)
      }

      // Handle errors
      xhr.onerror = () => {
        setIsUploading(false)
        throw new Error("Upload failed")
      }

      // Send the request
      xhr.send(formData)
    } catch (error) {
      console.error("Error uploading document:", error)
      setIsUploading(false)
      toast.error("Failed to upload document")
    }
  }

  // Handle document download
  const handleDownloadDocument = async (document: TaxDocument) => {
    try {
      const response = await fetch(`/api/partner/tax-documents/${document.id}/download`)

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`)
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a link element and trigger download
      const downloadLink = document.createElement("a")
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = document.title + "." + document.fileType.split("/")[1]
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast.success("Document downloaded successfully")
    } catch (error) {
      console.error("Error downloading document:", error)
      toast.error("Failed to download document")
    }
  }

  // Filter tax documents based on search query, filters, and active tab
  const filteredDocuments = taxDocuments.filter((document) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.description.toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter
    const matchesType = typeFilter === "all" || document.type === typeFilter

    // Year filter
    const matchesYear = yearFilter === "all" || document.year.toString() === yearFilter

    // Tab filter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && document.status === "PENDING") ||
      (activeTab === "approved" && document.status === "APPROVED") ||
      (activeTab === "rejected" && document.status === "REJECTED")

    return matchesSearch && matchesType && matchesYear && matchesTab
  })

  // Get unique years for filter
  const availableYears = Array.from(new Set(taxDocuments.map((doc) => doc.year))).sort((a, b) => b - a)

  // Format file size
  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"]
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  // Get document type badge variant
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "INVOICE":
        return "default"
      case "RECEIPT":
        return "secondary"
      case "TAX_FORM":
        return "info"
      case "STATEMENT":
        return "warning"
      case "OTHER":
        return "outline"
      default:
        return "default"
    }
  }

  // Get document status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "destructive"
      case "EXPIRED":
        return "secondary"
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
              Error Loading Tax Documents
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
          <h1 className="text-2xl font-bold tracking-tight">Tax Documents</h1>
          <p className="text-muted-foreground">Manage your tax documents, invoices, and financial statements</p>
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
          <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col space-y-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search documents..."
                  className="pl-8 w-full sm:w-[200px] md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Document Type</p>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="RECEIPT">Receipt</SelectItem>
                        <SelectItem value="TAX_FORM">Tax Form</SelectItem>
                        <SelectItem value="STATEMENT">Statement</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="text-sm font-medium mt-4 mb-2">Year</p>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Tabs>

        {/* Document List */}
        <TabsContent value={activeTab} className="mt-0">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No Documents Found</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery || typeFilter !== "all" || yearFilter !== "all"
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Upload your first document to get started."}
                </p>
                <Button onClick={() => setIsUploadDialogOpen(true)} className="mt-4">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="overflow-hidden">
                  <div
                    className={`h-1 ${
                      document.status === "APPROVED"
                        ? "bg-green-500"
                        : document.status === "PENDING"
                          ? "bg-amber-500"
                          : document.status === "REJECTED"
                            ? "bg-red-500"
                            : "bg-gray-300"
                    }`}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate" title={document.title}>
                        {document.title}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Badge variant={getTypeBadge(document.type)}>{document.type.replace(/_/g, " ")}</Badge>
                        <Badge variant={getStatusBadge(document.status)}>{document.status}</Badge>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">{document.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {document.year}
                          {document.quarter && ` Q${document.quarter}`}
                          {document.month &&
                            ` ${new Date(0, document.month - 1).toLocaleString("default", { month: "short" })}`}
                        </span>
                      </div>
                      <div>{formatFileSize(document.fileSize)}</div>
                    </div>
                    {document.submissionDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Submitted: {format(parseISO(document.submissionDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => handleDownloadDocument(document)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </div>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Tax Document</DialogTitle>
            <DialogDescription>
              Upload tax documents, invoices, receipts, or financial statements for record keeping.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">Document File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
                  disabled={isUploading}
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                name="title"
                value={uploadForm.title}
                onChange={handleUploadFormChange}
                placeholder="Enter document title"
                disabled={isUploading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                value={uploadForm.description}
                onChange={handleUploadFormChange}
                placeholder="Enter document description"
                disabled={isUploading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Document Type</Label>
              <Select
                value={uploadForm.type}
                onValueChange={(value) => setUploadForm((prev) => ({ ...prev, type: value }))}
                disabled={isUploading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="RECEIPT">Receipt</SelectItem>
                  <SelectItem value="TAX_FORM">Tax Form</SelectItem>
                  <SelectItem value="STATEMENT">Statement</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Select
                  value={uploadForm.year.toString()}
                  onValueChange={(value) => setUploadForm((prev) => ({ ...prev, year: Number.parseInt(value) }))}
                  disabled={isUploading}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quarter">Quarter (Optional)</Label>
                <Select
                  value={uploadForm.quarter?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadForm((prev) => ({ ...prev, quarter: value ? Number.parseInt(value) : null }))
                  }
                  disabled={isUploading}
                >
                  <SelectTrigger id="quarter">
                    <SelectValue placeholder="Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="month">Month (Optional)</Label>
                <Select
                  value={uploadForm.month?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadForm((prev) => ({ ...prev, month: value ? Number.parseInt(value) : null }))
                  }
                  disabled={isUploading}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(0, month - 1).toLocaleString("default", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
