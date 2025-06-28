"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Upload,
  Download,
  AlertCircle,
  Tv,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

// Types aligned with Prisma schema
type DeviceType =
  | "ANDROID_TV"
  | "DIGITAL_SIGNAGE"
  | "INTERACTIVE_KIOSK"
  | "VEHICLE_MOUNTED"
  | "RETAIL_DISPLAY"
  | "BUS"
  | "TRAM"
  | "TRAIN"
  | "METRO"
  | "OTHER"
type DeviceStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "MAINTENANCE"
type HealthStatus = "UNKNOWN" | "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE"

interface Device {
  id: string
  partnerId: string
  name: string
  deviceIdentifier: string
  deviceType: DeviceType
  location: {
    latitude: number
    longitude: number
    address: string
    area: string
  }
  routeDetails?: {
    routeName: string
    startPoint: string
    endPoint: string
    averageDailyPassengers: number
  } | null
  status: DeviceStatus
  lastActive: string
  healthStatus: HealthStatus
  uptime?: number
  impressionsServed?: number
  engagementsCount?: number
  averageViewerCount?: number
  performanceMetrics?: {
    cpu: number
    memory: number
    network: number
  }
  energyConsumption?: number
  firmwareVersion?: string
  capabilities?: any
  configSettings?: any
  maintenanceHistory?: any
  createdAt: string
  updatedAt: string
  selected?: boolean // UI state property
}

interface DeviceAnalytics {
  id: string
  deviceId: string
  date: string
  uptime: number
  impressionsServed: number
  engagementsCount: number
  averageViewerCount?: number
  performanceMetrics?: any
  energyConsumption?: number
}

interface DeviceEvent {
  id: string
  deviceId: string
  type: string
  timestamp: string
  details: string
}

export default function DevicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { generalSettings, systemSettings, sustainabilitySettings, loading, error } = usePublicSettings()

  // State
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [deviceAnalytics, setDeviceAnalytics] = useState<DeviceAnalytics[]>([])
  const [deviceEvents, setDeviceEvents] = useState<DeviceEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDeviceType, setSelectedDeviceType] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedHealthStatus, setSelectedHealthStatus] = useState("")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isMapView, setIsMapView] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [dialogAction, setDialogAction] = useState<string | null>(null)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [showDeviceDetailsDialog, setShowDeviceDetailsDialog] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [showMapTooltip, setShowMapTooltip] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deviceConfig, setDeviceConfig] = useState<any>({
    brightness: 80,
    orientation: "landscape",
    powerSaving: "smart",
    connectionType: "wifi",
    wifiNetwork: "Office_Network",
    autoUpdate: true,
    restartSchedule: "daily",
    restartTime: "03:00",
    loggingLevel: "info",
  })

  // Device type options aligned with Prisma schema
  const deviceTypes = [
    { value: "ANDROID_TV", label: "Android TV" },
    { value: "DIGITAL_SIGNAGE", label: "Digital Signage" },
    { value: "INTERACTIVE_KIOSK", label: "Interactive Kiosk" },
    { value: "VEHICLE_MOUNTED", label: "Vehicle Mounted" },
    { value: "RETAIL_DISPLAY", label: "Retail Display" },
    { value: "BUS", label: "Bus" },
    { value: "TRAM", label: "Tram" },
    { value: "TRAIN", label: "Train" },
    { value: "METRO", label: "Metro" },
    { value: "OTHER", label: "Other" },
  ]

  // Device status options aligned with Prisma schema
  const deviceStatuses = [
    { value: "PENDING", label: "Pending" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "SUSPENDED", label: "Suspended" },
    { value: "MAINTENANCE", label: "Maintenance" },
  ]

  // Health status options aligned with Prisma schema
  const healthStatuses = [
    { value: "UNKNOWN", label: "Unknown" },
    { value: "HEALTHY", label: "Healthy" },
    { value: "WARNING", label: "Warning" },
    { value: "CRITICAL", label: "Critical" },
    { value: "OFFLINE", label: "Offline" },
  ]

  // Fetch devices from API
  const fetchDevices = async () => {
    try {
      setIsLoading(true)

      // Fetch devices from API
      const response = await fetch("/api/partner/devices")

      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.statusText}`)
      }

      const data = await response.json()
      setDevices(data.devices || [])
      setFilteredDevices(data.devices || [])

      // Fetch device analytics
      await fetchDeviceAnalytics()

      // Fetch device events
      await fetchDeviceEvents()

      setIsLoading(false)
    } catch (error) {
      console.error("Failed to fetch devices:", error)
      toast.error("Failed to fetch devices")
      setIsLoading(false)
    }
  }

  // Fetch device analytics
  const fetchDeviceAnalytics = async () => {
    try {
      const response = await fetch("/api/partner/devices/analytics")

      if (!response.ok) {
        throw new Error(`Failed to fetch device analytics: ${response.statusText}`)
      }

      const data = await response.json()
      setDeviceAnalytics(data.analytics || [])
    } catch (error) {
      console.error("Failed to fetch device analytics:", error)
      // Don't show toast for this as it's secondary data
    }
  }

  // Fetch device events
  const fetchDeviceEvents = async () => {
    try {
      const response = await fetch("/api/partner/devices/events")

      if (!response.ok) {
        throw new Error(`Failed to fetch device events: ${response.statusText}`)
      }

      const data = await response.json()
      setDeviceEvents(data.events || [])
    } catch (error) {
      console.error("Failed to fetch device events:", error)
      // Don't show toast for this as it's secondary data
    }
  }

  // Initialize data
  useEffect(() => {
    fetchDevices()
  }, [])

  // Filter devices based on search and filters
  useEffect(() => {
    if (devices.length === 0) return

    let result = [...devices]

    if (searchTerm) {
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.deviceIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (device.location.area && device.location.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.location.address && device.location.address.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (selectedDeviceType && selectedDeviceType !== "all-types") {
      result = result.filter((device) => device.deviceType === selectedDeviceType)
    }

    if (selectedStatus && selectedStatus !== "all-statuses") {
      result = result.filter((device) => device.status === selectedStatus)
    }

    if (selectedHealthStatus && selectedHealthStatus !== "all-health-statuses") {
      result = result.filter((device) => device.healthStatus === selectedHealthStatus)
    }

    setFilteredDevices(result)

    // Reset to first page when filters change
    setCurrentPage(1)
  }, [searchTerm, selectedDeviceType, selectedStatus, selectedHealthStatus, devices])

  // Calculate paginated devices
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDevices.slice(startIndex, endIndex)
  }, [filteredDevices, currentPage, itemsPerPage])

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredDevices.length / itemsPerPage)
  }, [filteredDevices, itemsPerPage])

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedDevices(filteredDevices.map((device) => device.id))
    } else if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([])
    }
  }, [selectAll, filteredDevices])

  // Handle device selection for bulk actions
  const handleDeviceSelection = (deviceId: string) => {
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter((id) => id !== deviceId))
    } else {
      setSelectedDevices([...selectedDevices, deviceId])
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDevices()
    setIsRefreshing(false)
    toast.success("Devices refreshed")
  }

  // Handle device click
  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device)
    setShowDeviceDetailsDialog(true)
  }

  // Handle device status change
  const handleStatusChange = async (deviceId: string, newStatus: DeviceStatus) => {
    try {
      const response = await fetch(`/api/partner/devices/${deviceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update device status: ${response.statusText}`)
      }

      const updatedDevice = await response.json()

      // Update local state after successful API call
      setDevices(devices.map((device) => (device.id === deviceId ? { ...device, status: newStatus } : device)))

      // Update selected device if it's the one being changed
      if (selectedDevice && selectedDevice.id === deviceId) {
        setSelectedDevice({ ...selectedDevice, status: newStatus })
      }

      toast.success(`Device status updated to ${newStatus}`)
    } catch (error) {
      console.error("Failed to update device status:", error)
      toast.error("Failed to update device status")
    }
  }

  // Handle device deletion
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return

    try {
      setIsDeleting(true)

      const response = await fetch(`/api/partner/devices/${deviceToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete device: ${response.statusText}`)
      }

      // Update local state after successful API call
      setDevices(devices.filter((d) => d.id !== deviceToDelete.id))
      setFilteredDevices(filteredDevices.filter((d) => d.id !== deviceToDelete.id))

      setShowDeleteDialog(false)
      setDeviceToDelete(null)
      setDeleteConfirmText("")
      toast.success("Device deleted successfully")
    } catch (error) {
      console.error("Failed to delete device:", error)
      toast.error("Failed to delete device")
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedDevices.length === 0) return

    try {
      const response = await fetch("/api/partner/devices/bulk-action", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceIds: selectedDevices,
          action: action,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to perform bulk action: ${response.statusText}`)
      }

      const result = await response.json()

      // Update local state after successful API call
      if (action === "delete") {
        setDevices(devices.filter((device) => !selectedDevices.includes(device.id)))
        setFilteredDevices(filteredDevices.filter((device) => !selectedDevices.includes(device.id)))
      } else {
        setDevices(
          devices.map((device) => {
            if (selectedDevices.includes(device.id)) {
              return { ...device, status: action as DeviceStatus }
            }
            return device
          }),
        )
        setFilteredDevices(
          filteredDevices.map((device) => {
            if (selectedDevices.includes(device.id)) {
              return { ...device, status: action as DeviceStatus }
            }
            return device
          }),
        )
      }

      setSelectedDevices([])
      setSelectAll(false)
      setShowBulkActionDialog(false)
      setDialogAction(null)

      toast.success(`Successfully performed ${action} on ${selectedDevices.length} devices`)
    } catch (error) {
      console.error(`Failed to perform bulk action:`, error)
      toast.error(`Failed to perform bulk action`)
    }
  }

  // Handle device configuration update
  const handleConfigUpdate = async () => {
    if (!selectedDevice) return

    try {
      const response = await fetch(`/api/partner/devices/${selectedDevice.id}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deviceConfig),
      })

      if (!response.ok) {
        throw new Error(`Failed to update device configuration: ${response.statusText}`)
      }

      // Update local state
      setDevices(
        devices.map((device) =>
          device.id === selectedDevice.id ? { ...device, configSettings: deviceConfig } : device,
        ),
      )

      setShowConfigDialog(false)
      toast.success("Device configuration updated successfully")
    } catch (error) {
      console.error("Failed to update device configuration:", error)
      toast.error("Failed to update device configuration")
    }
  }

  // Get device analytics for a specific device
  const getDeviceAnalytics = (deviceId: string) => {
    return deviceAnalytics.filter((analytics) => analytics.deviceId === deviceId)
  }

  // Get device events for a specific device
  const getDeviceEvents = (deviceId: string) => {
    return deviceEvents.filter((event) => event.deviceId === deviceId)
  }

  // Get device type icon
  const getDeviceTypeIcon = (type: DeviceType) => {
    switch (type) {
      case "ANDROID_TV":
        return <Tv className="h-5 w-5" />
      case "DIGITAL_SIGNAGE":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )
      case "INTERACTIVE_KIOSK":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        )
      case "VEHICLE_MOUNTED":
      case "BUS":
      case "TRAM":
      case "TRAIN":
      case "METRO":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        )
      case "RETAIL_DISPLAY":
        return (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        )
      default:
        return <Tv className="h-5 w-5" />
    }
  }

  // Get status badge color
  const getStatusBadgeColor = (status: DeviceStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "PENDING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "SUSPENDED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  // Get health status badge color
  const getHealthStatusBadgeColor = (status: HealthStatus) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "OFFLINE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "UNKNOWN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  // Get device name by ID
  const getDeviceNameById = (id: string): string => {
    const device = devices.find((d) => d.id === id)
    return device ? device.name : "Unknown Device"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading device data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sustainability banner - only show if enabled in admin settings */}
      {sustainabilitySettings?.carbonTrackingEnabled && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-200 dark:border-green-900">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-5 w-5 text-green-700 dark:text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Sustainability Mode Active</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Your devices have saved 238 kWh of energy this month
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
            >
              View Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Devices Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor all your connected devices across different locations
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsMapView(!isMapView)}>
            {isMapView ? (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                List View
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Map View
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowBulkActionDialog(true)}
            disabled={selectedDevices.length === 0}
            variant={selectedDevices.length > 0 ? "default" : "outline"}
            size="sm"
            className={selectedDevices.length > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            Bulk Actions ({selectedDevices.length})
          </Button>
          <Button onClick={() => router.push("/partner/devices/register")}>
            <Plus className="mr-2 h-4 w-4" />
            Register Device
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedDeviceType} onValueChange={setSelectedDeviceType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Device Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                {deviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All Statuses</SelectItem>
                {deviceStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedHealthStatus} onValueChange={setSelectedHealthStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Health Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-health-statuses">All Health Statuses</SelectItem>
                {healthStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedDeviceType("")
                setSelectedStatus("")
                setSelectedHealthStatus("")
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">{filteredDevices.length}</span> of{" "}
            <span className="font-medium">{devices.length}</span> devices
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Devices List/Map View */}
      {isMapView ? (
        <Card>
          <CardContent className="p-4">
            <div className="h-[600px] w-full bg-gray-100 dark:bg-gray-800 relative overflow-hidden rounded-md">
              <div className="grid grid-cols-10 grid-rows-10 h-full w-full absolute">
                {Array.from({ length: 10 }).map((_, rowIndex) =>
                  Array.from({ length: 10 }).map((_, colIndex) => (
                    <div key={`${rowIndex}-${colIndex}`} className="border border-gray-200 dark:border-gray-700" />
                  )),
                )}
              </div>

              {filteredDevices.map((device) => {
                // Calculate position based on latitude and longitude
                const x = ((device.location.longitude - 36.8) / 0.1) * 100
                const y = ((device.location.latitude - -1.3) / 0.1) * 100

                // Ensure position is within bounds
                const posX = Math.min(Math.max(x, 5), 95)
                const posY = Math.min(Math.max(y, 5), 95)

                return (
                  <div
                    key={device.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                    }}
                    onClick={() => handleDeviceClick(device)}
                    onMouseEnter={() => setShowMapTooltip(device.id)}
                    onMouseLeave={() => setShowMapTooltip(null)}
                  >
                    <div
                      className={`h-4 w-4 rounded-full ${
                        device.status === "ACTIVE"
                          ? "bg-green-500"
                          : device.status === "INACTIVE"
                            ? "bg-gray-500"
                            : device.status === "MAINTENANCE"
                              ? "bg-yellow-500"
                              : device.status === "SUSPENDED"
                                ? "bg-red-500"
                                : "bg-blue-500"
                      } ring-4 ring-white dark:ring-gray-800 shadow-lg transition-all duration-200 ${showMapTooltip === device.id ? "scale-150" : ""}`}
                    ></div>

                    <div
                      className={`absolute z-10 ${showMapTooltip === device.id ? "visible opacity-100" : "invisible opacity-0"} 
                      transition-all duration-200 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg -translate-x-1/2 -translate-y-full -mt-2 w-64`}
                    >
                      <div className="font-medium text-sm">{device.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{device.location.address}</div>
                      <div className="flex items-center mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(device.status)}`}
                        >
                          {device.status}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ml-2 ${getHealthStatusBadgeColor(device.healthStatus)}`}
                        >
                          {device.healthStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>{" "}
                          <span>{deviceTypes.find((t) => t.value === device.deviceType)?.label}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Active:</span>{" "}
                          <span>{new Date(device.lastActive).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/partner/devices/${device.id}`)
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeviceToDelete(device)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
                <div className="text-xs font-medium mb-2">Map Legend</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span>Active</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                    <span>Inactive</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span>Maintenance</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span>Suspended</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span>Pending</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500">Showing {filteredDevices.length} devices</div>
                </div>
              </div>

              <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
                <div className="text-xs font-medium mb-2">Map Controls</div>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs justify-start"
                    onClick={() => setIsMapView(false)}
                  >
                    <svg
                      className="mr-2 h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    Switch to List View
                  </Button>
                  <Button size="sm" variant="outline" className="w-full text-xs justify-start" onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Refresh Map
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <div className="flex items-center">
                        <Checkbox checked={selectAll} onCheckedChange={(checked) => setSelectAll(!!checked)} />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Device
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Health
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Last Active
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {paginatedDevices.length > 0 ? (
                    paginatedDevices.map((device) => (
                      <tr
                        key={device.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleDeviceClick(device)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDevices.includes(device.id)}
                            onCheckedChange={() => handleDeviceSelection(device.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                              {getDeviceTypeIcon(device.deviceType)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{device.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{device.deviceIdentifier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{device.location.area}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{device.location.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(device.status)}`}
                          >
                            {device.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getHealthStatusBadgeColor(device.healthStatus)}`}
                          >
                            {device.healthStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(device.lastActive).toLocaleString()}
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="right" className="w-56">
                              <DropdownMenuLabel>Device Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/partner/devices/${device.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/partner/devices/${device.id}/edit`)}>
                                Edit Device
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDevice(device)
                                  setDeviceConfig(
                                    device.configSettings || {
                                      brightness: 80,
                                      orientation: "landscape",
                                      powerSaving: "smart",
                                      connectionType: "wifi",
                                      wifiNetwork: "Office_Network",
                                      autoUpdate: true,
                                      restartSchedule: "daily",
                                      restartTime: "03:00",
                                      loggingLevel: "info",
                                    },
                                  )
                                  setShowConfigDialog(true)
                                }}
                              >
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Status Management</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(device.id, "ACTIVE")}
                                disabled={device.status === "ACTIVE"}
                                className={device.status === "ACTIVE" ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(device.id, "INACTIVE")}
                                disabled={device.status === "INACTIVE"}
                                className={device.status === "INACTIVE" ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(device.id, "MAINTENANCE")}
                                disabled={device.status === "MAINTENANCE"}
                                className={device.status === "MAINTENANCE" ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Set to Maintenance
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeviceToDelete(device)
                                  setShowDeleteDialog(true)
                                }}
                                className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Device
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No devices found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredDevices.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredDevices.length)}</span>{" "}
                    of <span className="font-medium">{filteredDevices.length}</span> devices
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      // Calculate page numbers to show (centered around current page)
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={i}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0 mx-1"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number.parseInt(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Device Details Modal */}
      <Dialog open={showDeviceDetailsDialog} onOpenChange={setShowDeviceDetailsDialog}>
        <DialogContent className="sm:max-w-4xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>Detailed information and management options for this device.</DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-6 flex items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    {getDeviceTypeIcon(selectedDevice.deviceType)}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{selectedDevice.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedDevice.deviceIdentifier}</p>
                  </div>
                </div>

                <Tabs defaultValue="info">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Information</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Device Type</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {deviceTypes.find((t) => t.value === selectedDevice.deviceType)?.label ||
                            selectedDevice.deviceType}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(selectedDevice.status)}`}
                        >
                          {selectedDevice.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Health Status</h4>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getHealthStatusBadgeColor(selectedDevice.healthStatus)}`}
                        >
                          {selectedDevice.healthStatus}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Active</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedDevice.lastActive).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Firmware Version</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedDevice.firmwareVersion || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedDevice.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h4>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedDevice.location.address}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedDevice.location.latitude}, {selectedDevice.location.longitude}
                      </p>
                    </div>

                    {selectedDevice.routeDetails && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Route Details</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedDevice.routeDetails.routeName}: {selectedDevice.routeDetails.startPoint} to{" "}
                          {selectedDevice.routeDetails.endPoint}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Avg. Daily Passengers: {selectedDevice.routeDetails.averageDailyPassengers}
                        </p>
                      </div>
                    )}

                    {selectedDevice.performanceMetrics && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance Metrics</h4>
                        <div className="mt-2 space-y-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">CPU</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedDevice.performanceMetrics.cpu}%
                              </span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className={`h-full rounded-full ${
                                  selectedDevice.performanceMetrics.cpu > 80
                                    ? "bg-red-600 dark:bg-red-500"
                                    : selectedDevice.performanceMetrics.cpu > 60
                                      ? "bg-yellow-600 dark:bg-yellow-500"
                                      : "bg-green-600 dark:bg-green-500"
                                }`}
                                style={{ width: `${selectedDevice.performanceMetrics.cpu}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Memory</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedDevice.performanceMetrics.memory}%
                              </span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className={`h-full rounded-full ${
                                  selectedDevice.performanceMetrics.memory > 80
                                    ? "bg-red-600 dark:bg-red-500"
                                    : selectedDevice.performanceMetrics.memory > 60
                                      ? "bg-yellow-600 dark:bg-yellow-500"
                                      : "bg-green-600 dark:bg-green-500"
                                }`}
                                style={{ width: `${selectedDevice.performanceMetrics.memory}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Network</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedDevice.performanceMetrics.network}%
                              </span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                                style={{ width: `${selectedDevice.performanceMetrics.network}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.impressionsServed?.toLocaleString() || "0"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Impressions</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.engagementsCount?.toLocaleString() || "0"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Engagements</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.averageViewerCount || "0"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Viewer Count</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.energyConsumption || "0"} kWh
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Energy Consumption</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Daily Performance</h4>
                      <div className="h-64 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md">
                        <p className="text-gray-500 dark:text-gray-400">Analytics chart will be displayed here</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Daily Analytics</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th
                                scope="col"
                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                Date
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                Impressions
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                Engagements
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                Uptime (hrs)
                              </th>
                              <th
                                scope="col"
                                className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                Avg. Viewers
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {getDeviceAnalytics(selectedDevice.id).map((analytics, index) => (
                              <tr key={index}>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {new Date(analytics.date).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {analytics.impressionsServed.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {analytics.engagementsCount.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {analytics.uptime}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {analytics.averageViewerCount || "N/A"}
                                </td>
                              </tr>
                            ))}
                            {getDeviceAnalytics(selectedDevice.id).length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400"
                                >
                                  No analytics data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      {getDeviceEvents(selectedDevice.id).map((event) => (
                        <div key={event.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  event.type === "ERROR"
                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                    : event.type === "UPDATE"
                                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                      : event.type === "RESTART"
                                        ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : event.type === "MAINTENANCE"
                                          ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                          : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                }`}
                              >
                                {event.type === "ERROR" && <AlertCircle className="h-4 w-4" />}
                                {event.type === "UPDATE" && <RefreshCw className="h-4 w-4" />}
                                {event.type === "RESTART" && (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                )}
                                {event.type === "CONFIG_CHANGE" && <Settings className="h-4 w-4" />}
                                {event.type === "MAINTENANCE" && (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426-1.756-.426-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{event.type}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(event.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{event.details}</div>
                          </div>
                        </div>
                      ))}
                      {getDeviceEvents(selectedDevice.id).length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No events recorded for this device
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="md:col-span-1 space-y-4">
                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                  <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => router.push(`/partner/devices/${selectedDevice.id}/edit`)}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Device
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setDeviceConfig(
                          selectedDevice.configSettings || {
                            brightness: 80,
                            orientation: "landscape",
                            powerSaving: "smart",
                            connectionType: "wifi",
                            wifiNetwork: "Office_Network",
                            autoUpdate: true,
                            restartSchedule: "daily",
                            restartTime: "03:00",
                            loggingLevel: "info",
                          },
                        )
                        setShowConfigDialog(true)
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configure Device
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        handleStatusChange(
                          selectedDevice.id,
                          selectedDevice.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        )
                      }
                    >
                      {selectedDevice.status === "ACTIVE" ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                          Deactivate Device
                        </>
                      ) : (
                        <>
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Activate Device
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/20"
                      onClick={() => {
                        setShowDeviceDetailsDialog(false)
                        setDeviceToDelete(selectedDevice)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Device
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                  <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Device Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">ID:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{selectedDevice.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Identifier:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{selectedDevice.deviceIdentifier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Energy Usage:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.energyConsumption || "N/A"} kWh
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Impressions:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.impressionsServed?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Engagements:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.engagementsCount?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Device Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>Device Configuration</DialogTitle>
            <DialogDescription>Configure device settings and parameters.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="display">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="display">Display</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="display" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="brightness" className="text-sm font-medium leading-none">
                  Brightness
                </label>
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <Input
                    id="brightness"
                    type="range"
                    min="0"
                    max="100"
                    value={deviceConfig.brightness || 80}
                    onChange={(e) => setDeviceConfig({ ...deviceConfig, brightness: Number.parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm">{deviceConfig.brightness || 80}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="orientation" className="text-sm font-medium leading-none">
                  Screen Orientation
                </label>
                <Select
                  value={deviceConfig.orientation || "landscape"}
                  onValueChange={(value) => setDeviceConfig({ ...deviceConfig, orientation: value })}
                >
                  <SelectTrigger id="orientation">
                    <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="auto">Auto-rotate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="power-saving" className="text-sm font-medium leading-none">
                  Power Saving Mode
                </label>
                <Select
                  value={deviceConfig.powerSaving || "smart"}
                  onValueChange={(value) => setDeviceConfig({ ...deviceConfig, powerSaving: value })}
                >
                  <SelectTrigger id="power-saving">
                    <SelectValue placeholder="Select power mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="smart">Smart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="network" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="connection-type" className="text-sm font-medium leading-none">
                  Connection Type
                </label>
                <Select
                  value={deviceConfig.connectionType || "wifi"}
                  onValueChange={(value) => setDeviceConfig({ ...deviceConfig, connectionType: value })}
                >
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">Wi-Fi</SelectItem>
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                    <SelectItem value="cellular">Cellular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="wifi-network" className="text-sm font-medium leading-none">
                  Wi-Fi Network
                </label>
                <Input
                  id="wifi-network"
                  value={deviceConfig.wifiNetwork || "Office_Network"}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, wifiNetwork: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="auto-update" className="text-sm font-medium leading-none">
                    Auto-Update
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Off</span>
                    <Switch
                      id="auto-update"
                      checked={deviceConfig.autoUpdate}
                      onCheckedChange={(checked) => setDeviceConfig({ ...deviceConfig, autoUpdate: checked })}
                    />
                    <span className="text-sm text-gray-500">On</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="restart-schedule" className="text-sm font-medium leading-none">
                  Scheduled Restart
                </label>
                <Select
                  value={deviceConfig.restartSchedule || "daily"}
                  onValueChange={(value) => setDeviceConfig({ ...deviceConfig, restartSchedule: value })}
                >
                  <SelectTrigger id="restart-schedule">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="restart-time" className="text-sm font-medium leading-none">
                  Restart Time
                </label>
                <Input
                  id="restart-time"
                  type="time"
                  value={deviceConfig.restartTime || "03:00"}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, restartTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="logging-level" className="text-sm font-medium leading-none">
                  Logging Level
                </label>
                <Select
                  value={deviceConfig.loggingLevel || "info"}
                  onValueChange={(value) => setDeviceConfig({ ...deviceConfig, loggingLevel: value })}
                >
                  <SelectTrigger id="logging-level">
                    <SelectValue placeholder="Select logging level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="verbose">Verbose</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (!selectedDevice) return

                    try {
                      const response = await fetch(`/api/partner/devices/${selectedDevice.id}/restart`, {
                        method: "POST",
                      })

                      if (!response.ok) {
                        throw new Error("Failed to restart device")
                      }

                      toast.success("Device restart command sent successfully")
                    } catch (error) {
                      console.error("Error restarting device:", error)
                      toast.error("Failed to restart device")
                    }
                  }}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Restart Device
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfigUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Apply actions to {selectedDevices.length} selected {selectedDevices.length === 1 ? "device" : "devices"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Selected Devices</h3>
                  <div className="mt-1 text-xs text-blue-700 dark:text-blue-400 max-h-24 overflow-y-auto">
                    {selectedDevices.map((id) => (
                      <div key={id} className="truncate">
                        {getDeviceNameById(id)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Status Management</h3>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleBulkAction("ACTIVE")}>
                <svg
                  className="mr-2 h-4 w-4 text-green-600 dark:text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Activate Devices
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => handleBulkAction("INACTIVE")}>
                <svg
                  className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                Deactivate Devices
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleBulkAction("MAINTENANCE")}
              >
                <svg
                  className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426-1.756-.426-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Set to Maintenance
              </Button>
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50"
                onClick={() => handleBulkAction("delete")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Devices
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600 dark:text-red-500">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Confirm Device Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete this device? This action cannot be undone.</p>

              {deviceToDelete && (
                <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      {getDeviceTypeIcon(deviceToDelete.deviceType)}
                    </div>
                    <div>
                      <div className="font-medium">{deviceToDelete.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{deviceToDelete.deviceIdentifier}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Warning</h3>
                    <div className="mt-1 text-xs text-red-700 dark:text-red-400">
                      <p>
                        Deleting this device will permanently remove all associated data, analytics, and configurations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-delete" className="text-sm font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="border-red-200 dark:border-red-900/50 focus-visible:ring-red-500"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText("")
                setDeviceToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteDevice}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Device
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
