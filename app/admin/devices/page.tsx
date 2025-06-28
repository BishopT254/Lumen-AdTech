"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layouts/dashboard-layout"
import {
  AlertCircle,
  Check,
  Download,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Tv,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// Mock data for devices
const mockDevices = [
  {
    id: "dev1",
    name: "Digital Billboard - CBD",
    deviceIdentifier: "DEV-1234-1-1687245896",
    deviceType: "DIGITAL_SIGNAGE",
    partnerId: "partner1",
    partnerName: "Display Network Ltd.",
    location: {
      latitude: -1.2921,
      longitude: 36.8219,
      address: "100 Main Street, Nairobi",
      area: "Central Business District",
    },
    routeDetails: null,
    status: "ACTIVE",
    lastActive: "2023-06-20T14:32:45Z",
    healthStatus: "HEALTHY",
    uptime: 99.8,
    impressionsServed: 12450,
    engagementsCount: 1245,
    averageViewerCount: 15.2,
    performanceMetrics: {
      cpu: 32,
      memory: 45,
      network: 12,
    },
    energyConsumption: 2.4,
    version: "1.2.3",
    createdAt: "2023-01-15T10:00:00Z",
  },
  {
    id: "dev2",
    name: "Matatu Display - Route 23",
    deviceIdentifier: "DEV-1234-2-1687245896",
    deviceType: "VEHICLE_MOUNTED",
    partnerId: "partner1",
    partnerName: "Display Network Ltd.",
    location: {
      latitude: -1.3021,
      longitude: 36.8119,
      address: "Route 23, Nairobi",
      area: "Westlands",
    },
    routeDetails: {
      routeName: "Route 23",
      startPoint: "Westlands",
      endPoint: "CBD",
      averageDailyPassengers: 1200,
    },
    status: "ACTIVE",
    lastActive: "2023-06-20T14:30:45Z",
    healthStatus: "WARNING",
    uptime: 95.2,
    impressionsServed: 8450,
    engagementsCount: 845,
    averageViewerCount: 12.5,
    performanceMetrics: {
      cpu: 65,
      memory: 72,
      network: 45,
    },
    energyConsumption: 3.2,
    version: "1.2.3",
    createdAt: "2023-02-10T10:00:00Z",
  },
  {
    id: "dev3",
    name: "Supermarket Kiosk - Westlands",
    deviceIdentifier: "DEV-5678-1-1687245896",
    deviceType: "INTERACTIVE_KIOSK",
    partnerId: "partner2",
    partnerName: "Screen Partners Co.",
    location: {
      latitude: -1.2721,
      longitude: 36.8119,
      address: "200 Shopping Lane, Nairobi",
      area: "Westlands",
    },
    routeDetails: null,
    status: "MAINTENANCE",
    lastActive: "2023-06-19T10:32:45Z",
    healthStatus: "CRITICAL",
    uptime: 78.5,
    impressionsServed: 5450,
    engagementsCount: 1045,
    averageViewerCount: 18.7,
    performanceMetrics: {
      cpu: 88,
      memory: 92,
      network: 25,
    },
    energyConsumption: 4.1,
    version: "1.2.2",
    createdAt: "2023-03-05T10:00:00Z",
  },
  {
    id: "dev4",
    name: "Android TV - Nightclub",
    deviceIdentifier: "DEV-5678-2-1687245896",
    deviceType: "ANDROID_TV",
    partnerId: "partner2",
    partnerName: "Screen Partners Co.",
    location: {
      latitude: -1.2821,
      longitude: 36.8319,
      address: "300 Club Street, Nairobi",
      area: "Kilimani",
    },
    routeDetails: null,
    status: "INACTIVE",
    lastActive: "2023-06-15T14:32:45Z",
    healthStatus: "OFFLINE",
    uptime: 0,
    impressionsServed: 0,
    engagementsCount: 0,
    averageViewerCount: 0,
    performanceMetrics: {
      cpu: 0,
      memory: 0,
      network: 0,
    },
    energyConsumption: 0,
    version: "1.2.1",
    createdAt: "2023-04-20T10:00:00Z",
  },
  {
    id: "dev5",
    name: "Retail Display - Mall",
    deviceIdentifier: "DEV-9012-1-1687245896",
    deviceType: "RETAIL_DISPLAY",
    partnerId: "partner1",
    partnerName: "Display Network Ltd.",
    location: {
      latitude: -1.3221,
      longitude: 36.8519,
      address: "400 Mall Avenue, Nairobi",
      area: "Karen",
    },
    routeDetails: null,
    status: "ACTIVE",
    lastActive: "2023-06-20T14:32:45Z",
    healthStatus: "HEALTHY",
    uptime: 99.9,
    impressionsServed: 15450,
    engagementsCount: 2245,
    averageViewerCount: 22.3,
    performanceMetrics: {
      cpu: 28,
      memory: 35,
      network: 15,
    },
    energyConsumption: 2.1,
    version: "1.2.3",
    createdAt: "2023-05-12T10:00:00Z",
  },
]

// Mock data for device analytics
const mockDeviceAnalytics = [
  { date: "2023-06-20", impressions: 1245, engagements: 124, uptime: 23.8, viewerCount: 15.2 },
  { date: "2023-06-19", impressions: 1320, engagements: 132, uptime: 24.0, viewerCount: 16.5 },
  { date: "2023-06-18", impressions: 980, engagements: 98, uptime: 22.5, viewerCount: 14.8 },
  { date: "2023-06-17", impressions: 1150, engagements: 115, uptime: 23.2, viewerCount: 15.0 },
  { date: "2023-06-16", impressions: 1400, engagements: 140, uptime: 23.9, viewerCount: 16.2 },
  { date: "2023-06-15", impressions: 1280, engagements: 128, uptime: 23.7, viewerCount: 15.8 },
  { date: "2023-06-14", impressions: 1100, engagements: 110, uptime: 23.0, viewerCount: 14.5 },
]

// Mock data for device events
const mockDeviceEvents = [
  {
    id: "evt1",
    deviceId: "dev1",
    type: "RESTART",
    timestamp: "2023-06-20T12:32:45Z",
    details: "Device restarted automatically",
  },
  {
    id: "evt2",
    deviceId: "dev1",
    type: "UPDATE",
    timestamp: "2023-06-19T10:15:22Z",
    details: "Software updated to version 1.2.3",
  },
  {
    id: "evt3",
    deviceId: "dev1",
    type: "ERROR",
    timestamp: "2023-06-18T08:45:12Z",
    details: "Network connectivity issue detected and resolved",
  },
  {
    id: "evt4",
    deviceId: "dev1",
    type: "CONFIG_CHANGE",
    timestamp: "2023-06-17T16:22:33Z",
    details: "Display brightness adjusted to 80%",
  },
  {
    id: "evt5",
    deviceId: "dev1",
    type: "MAINTENANCE",
    timestamp: "2023-06-15T09:12:45Z",
    details: "Scheduled maintenance performed",
  },
]

// Mock data for device types
const deviceTypes = [
  { value: "ANDROID_TV", label: "Android TV" },
  { value: "DIGITAL_SIGNAGE", label: "Digital Signage" },
  { value: "INTERACTIVE_KIOSK", label: "Interactive Kiosk" },
  { value: "VEHICLE_MOUNTED", label: "Vehicle Mounted" },
  { value: "RETAIL_DISPLAY", label: "Retail Display" },
]

// Mock data for device statuses
const deviceStatuses = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "MAINTENANCE", label: "Maintenance" },
]

// Mock data for health statuses
const healthStatuses = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "HEALTHY", label: "Healthy" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
  { value: "OFFLINE", label: "Offline" },
]

// Mock data for partners
const partners = [
  { id: "partner1", name: "Display Network Ltd." },
  { id: "partner2", name: "Screen Partners Co." },
]

export default function DevicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [devices, setDevices] = useState(mockDevices)
  const [filteredDevices, setFilteredDevices] = useState(mockDevices)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDeviceType, setSelectedDeviceType] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedHealthStatus, setSelectedHealthStatus] = useState("")
  const [selectedPartner, setSelectedPartner] = useState("")
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMapView, setIsMapView] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState([])
  const [selectAll, setSelectAll] = useState(false)

  // Sidebar items (same as in the admin dashboard)
  const sidebarItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: "Campaigns",
      href: "/admin/campaigns",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
          />
        </svg>
      ),
    },
    {
      title: "Devices",
      href: "/admin/devices",
      icon: (
        <svg
          className="h-6 w-6"
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
      ),
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      title: "Payments",
      href: "/admin/payments",
      icon: (
        <svg
          className="h-6 w-6"
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
      ),
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  const userNavItems = [
    { label: "Your Profile", href: "/admin/profile" },
    { label: "Settings", href: "/admin/settings" },
  ]

  // Filter devices based on search term and filters
  useEffect(() => {
    let result = [...devices]

    if (searchTerm) {
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.deviceIdentifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.partnerName.toLowerCase().includes(searchTerm.toLowerCase()),
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

    if (selectedPartner && selectedPartner !== "all-partners") {
      result = result.filter((device) => device.partnerId === selectedPartner)
    }

    setFilteredDevices(result)
  }, [searchTerm, selectedDeviceType, selectedStatus, selectedHealthStatus, selectedPartner, devices])

  // Handle device selection for bulk actions
  useEffect(() => {
    if (selectAll) {
      setSelectedDevices(filteredDevices.map((device) => device.id))
    } else if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([])
    }
  }, [selectAll])

  // Handle device selection change
  const handleDeviceSelection = (deviceId) => {
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter((id) => id !== deviceId))
    } else {
      setSelectedDevices([...selectedDevices, deviceId])
    }
  }

  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Handle device click to view details
  const handleDeviceClick = (device) => {
    setSelectedDevice(device)
  }

  // Handle device status change
  const handleStatusChange = (deviceId, newStatus) => {
    setDevices(devices.map((device) => (device.id === deviceId ? { ...device, status: newStatus } : device)))
  }

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (action === "activate") {
      setDevices(
        devices.map((device) => (selectedDevices.includes(device.id) ? { ...device, status: "ACTIVE" } : device)),
      )
    } else if (action === "deactivate") {
      setDevices(
        devices.map((device) => (selectedDevices.includes(device.id) ? { ...device, status: "INACTIVE" } : device)),
      )
    } else if (action === "maintenance") {
      setDevices(
        devices.map((device) => (selectedDevices.includes(device.id) ? { ...device, status: "MAINTENANCE" } : device)),
      )
    } else if (action === "delete") {
      setDevices(devices.filter((device) => !selectedDevices.includes(device.id)))
    }

    setSelectedDevices([])
    setShowBulkActionDialog(false)
  }

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("")
    setSelectedDeviceType("")
    setSelectedStatus("")
    setSelectedHealthStatus("")
    setSelectedPartner("")
  }

  // Get device type icon
  const getDeviceTypeIcon = (type) => {
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
  const getStatusBadgeColor = (status) => {
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
  const getHealthStatusBadgeColor = (status) => {
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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Devices Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage and monitor all devices across the platform
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
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
            variant="outline"
            size="sm"
          >
            Bulk Actions ({selectedDevices.length})
          </Button>
          <Button onClick={() => router.push("/admin/devices/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
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
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-partners">All Partners</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
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
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="h-[600px] w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Map view will be displayed here</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <div className="flex items-center">
                      <Checkbox checked={selectAll} onCheckedChange={(checked) => setSelectAll(checked)} />
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
                    Partner
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
                {filteredDevices.length > 0 ? (
                  filteredDevices.map((device) => (
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
                        <div className="text-sm text-gray-900 dark:text-white">{device.partnerName}</div>
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/admin/devices/${device.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/devices/${device.id}/edit`)}>
                              Edit Device
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowConfigDialog(true)}>Configure</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(device.id, "ACTIVE")}>
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(device.id, "INACTIVE")}>
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(device.id, "MAINTENANCE")}>
                              Set to Maintenance
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                              Delete Device
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No devices found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDevice && (
        <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Device Details</DialogTitle>
              <DialogDescription>Detailed information and management options for this device.</DialogDescription>
            </DialogHeader>

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
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Partner</h4>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedDevice.partnerName}</p>
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
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Software Version</h4>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedDevice.version}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h4>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(selectedDevice.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Uptime</h4>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedDevice.uptime}%</p>
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
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.impressionsServed.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Impressions</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.engagementsCount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Engagements</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.averageViewerCount}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Viewer Count</div>
                      </div>
                      <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedDevice.energyConsumption} kWh
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Energy Consumption</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Daily Performance</h4>
                      <div className="h-64 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
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
                            {mockDeviceAnalytics.map((day, index) => (
                              <tr key={index}>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {new Date(day.date).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {day.impressions.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {day.engagements.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {day.uptime}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {day.viewerCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="space-y-4 pt-4">
                    <div className="space-y-4">
                      {mockDeviceEvents.map((event) => (
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
                                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
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
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{event.type}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{event.details}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Restart Device
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Update Software
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Remote View
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
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
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      Troubleshoot
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start text-red-600 dark:text-red-400">
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
                      Deactivate
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Device Location</h3>
                  <div className="h-[200px] w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">Map will be displayed here</p>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{selectedDevice.location.address}</div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Current Content</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                          <img src="/placeholder.svg" alt="Ad creative" className="h-full w-full object-cover" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Summer Sale 2023</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Currently playing</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
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
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                          <img src="/placeholder.svg" alt="Ad creative" className="h-full w-full object-cover" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">New Product Launch</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Next in queue</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
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
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" className="w-full">
                      View Content Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Close
              </Button>
              <Button onClick={() => router.push(`/admin/devices/${selectedDevice.id}/edit`)}>Edit Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Device Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Device Configuration</DialogTitle>
            <DialogDescription>Configure device settings and parameters.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brightness">Display Brightness</Label>
              <div className="flex items-center">
                <input id="brightness" type="range" min="0" max="100" defaultValue="80" className="w-full" />
                <span className="ml-2 w-8 text-sm">80%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Audio Volume</Label>
              <div className="flex items-center">
                <input id="volume" type="range" min="0" max="100" defaultValue="60" className="w-full" />
                <span className="ml-2 w-8 text-sm">60%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-schedule">Update Schedule</Label>
              <Select defaultValue="midnight">
                <SelectTrigger id="update-schedule">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midnight">Midnight (00:00)</SelectItem>
                  <SelectItem value="early-morning">Early Morning (04:00)</SelectItem>
                  <SelectItem value="noon">Noon (12:00)</SelectItem>
                  <SelectItem value="evening">Evening (20:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-caching">Content Caching</Label>
              <Select defaultValue="aggressive">
                <SelectTrigger id="content-caching">
                  <SelectValue placeholder="Select caching strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (Save space)</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive (Best performance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="power-saving">Power Saving Mode</Label>
              <Switch id="power-saving" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="analytics">Enable Analytics</Label>
              <Switch id="analytics" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="audience-measurement">Audience Measurement</Label>
              <Switch id="audience-measurement" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="remote-control">Allow Remote Control</Label>
              <Switch id="remote-control" defaultChecked />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConfigDialog(false)}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>Apply actions to {selectedDevices.length} selected devices.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Status Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")}>
                  <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  Activate Devices
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("deactivate")}>
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
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("maintenance")}>
                  <svg
                    className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
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
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Software Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Update Software
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restart Devices
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Content Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Push Content
                </Button>
                <Button variant="outline" size="sm">
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear Cache
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
              <h4 className="mb-2 text-sm font-medium text-red-800 dark:text-red-400">Danger Zone</h4>
              <Button variant="destructive" size="sm" className="w-full" onClick={() => handleBulkAction("delete")}>
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Selected Devices
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
	</div>
  )
}
