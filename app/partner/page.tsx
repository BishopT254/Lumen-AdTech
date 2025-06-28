"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import {
  BarChart,
  DollarSign,
  Loader2,
  AlertTriangle,
  Activity,
  Calendar,
  TrendingUp,
  RefreshCw,
  Bell,
  Zap,
  Shield,
  Settings,
  HelpCircle,
  ExternalLink,
  Download,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format, subDays, isAfter } from "date-fns"
import { Chart } from "@/components/ui/chart"
import { ErrorBoundary } from "react-error-boundary"

// Types based on Prisma schema
type Partner = {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  commissionRate: number
  paymentDetails?: any
  businessType?: string
  taxInformation?: any
  status?: string
  verificationStatus?: string
  createdAt: string
  updatedAt: string
}

type Wallet = {
  id: string
  partnerId: string
  balance: number
  pendingBalance: number
  currency: string
  walletStatus: "ACTIVE" | "SUSPENDED" | "LOCKED"
  autoPayoutEnabled: boolean
  payoutThreshold: number
  nextPayoutDate?: string
  lastUpdated: string
  createdAt: string
  recentTransactions?: any[]
}

type Device = {
  id: string
  partnerId: string
  name: string
  deviceIdentifier: string
  deviceType: string
  location: any
  routeDetails?: any
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "MAINTENANCE"
  lastActive?: string
  healthStatus: "UNKNOWN" | "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE"
  firmwareVersion?: string
  capabilities?: any
  configSettings?: any
  maintenanceHistory?: any[]
  createdAt: string
  updatedAt: string
  impressions?: number
  revenue?: number
  uptime?: number
  engagementsCount?: number
  averageViewerCount?: number
  performanceMetrics?: any
  energyConsumption?: number
}

type PartnerEarning = {
  id: string
  partnerId: string
  periodStart: string
  periodEnd: string
  totalImpressions: number
  totalEngagements: number
  amount: number
  status: "PENDING" | "PROCESSED" | "PAID" | "CANCELLED"
  paidDate?: string
  transactionId?: string
  currency?: string
  details?: any
  createdAt: string
  updatedAt: string
}

type PerformanceData = {
  totalDevices: number
  activeDevices: number
  totalImpressions: number
  totalRevenue: number
  averageCTR: number
  totalConversions: number
  totalViewers?: number
  engagementRate?: number
  averageDwellTime?: number
  wallet?: {
    balance: number
    pendingBalance: number
    currency: string
  }
  recentEarnings?: any[]
  trends?: {
    impressions: number
    engagements: number
  }
  devicePerformance?: any[]
  period?: {
    name: string
    startDate: string
    endDate: string
  }
}

type Notification = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{error.message || "An error occurred while loading this component"}</AlertDescription>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="mt-2">
        Try again
      </Button>
    </Alert>
  )
}

export default function PartnerDashboard() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { generalSettings, systemSettings, loading: settingsLoading } = usePublicSettings()

  const [partner, setPartner] = useState<Partner | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [earnings, setEarnings] = useState<PartnerEarning[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30days")
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({
    partner: false,
    wallet: false,
    devices: false,
    earnings: false,
    performance: false,
    notifications: false,
  })
  const [loading, setLoading] = useState({
    partner: true,
    wallet: true,
    devices: true,
    earnings: true,
    performance: true,
    notifications: true,
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch partner data
  useEffect(() => {
    if (sessionStatus === "loading" || !session?.user?.email) return

    const fetchPartnerData = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, partner: true }))
        const response = await fetch("/api/partner/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch partner data")
        }
        const data = await response.json()
        setPartner(data.profile || data)
      } catch (err: any) {
        console.error("Error fetching partner data:", err)
        setError("Failed to load partner profile. Please try again later.")
      } finally {
        setLoading((prev) => ({ ...prev, partner: false }))
        setRefreshing((prev) => ({ ...prev, partner: false }))
      }
    }

    fetchPartnerData()
  }, [session, sessionStatus])

  // Fetch wallet data
  useEffect(() => {
    if (!partner?.id) return

    const fetchWalletData = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, wallet: true }))
        const response = await fetch(`/api/partner/wallet`)
        if (!response.ok) {
          throw new Error("Failed to fetch wallet data")
        }
        const data = await response.json()
        setWallet(data)
      } catch (err: any) {
        console.error("Error fetching wallet data:", err)
        // Don't set error for wallet - non-critical
      } finally {
        setLoading((prev) => ({ ...prev, wallet: false }))
        setRefreshing((prev) => ({ ...prev, wallet: false }))
      }
    }

    fetchWalletData()
  }, [partner])

  // Fetch devices
  useEffect(() => {
    if (!partner?.id) return

    const fetchDevices = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, devices: true }))
        const response = await fetch(`/api/partner/devices?limit=4`)
        if (!response.ok) {
          throw new Error("Failed to fetch devices")
        }
        const data = await response.json()

        // Enhanced response handling to support both formats
        if (Array.isArray(data)) {
          // New format: API returns array directly
          setDevices(data)
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.devices)) {
            // Old format: API returns { devices: [...] }
            setDevices(data.devices)
          } else {
            // Handle unexpected format but don't break
            console.warn("Unexpected devices data format:", data)
            // Try to extract any device-like objects from the response
            const possibleDevices = Object.values(data).find((val) => Array.isArray(val))
            if (possibleDevices) {
              setDevices(possibleDevices as Device[])
            } else {
              setDevices([])
            }
          }
        } else {
          console.error("Invalid devices data format:", data)
          setDevices([])
        }
      } catch (err: any) {
        console.error("Error fetching devices:", err)
        // Don't set error for devices - we'll show empty state
        setDevices([])
      } finally {
        setLoading((prev) => ({ ...prev, devices: false }))
        setRefreshing((prev) => ({ ...prev, devices: false }))
      }
    }

    fetchDevices()
  }, [partner])

  // Fetch earnings
  useEffect(() => {
    if (!partner?.id) return

    const fetchEarnings = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, earnings: true }))
        const response = await fetch(`/api/partner/earnings?limit=5`)
        if (!response.ok) {
          throw new Error("Failed to fetch earnings")
        }
        const data = await response.json()

        // Check if the response is an array or has a data property
        if (Array.isArray(data)) {
          setEarnings(data)
        } else if (data.data && Array.isArray(data.data)) {
          setEarnings(data.data)
        } else {
          console.error("Unexpected earnings data format:", data)
          setEarnings([])
        }
      } catch (err: any) {
        console.error("Error fetching earnings:", err)
        setEarnings([])
      } finally {
        setLoading((prev) => ({ ...prev, earnings: false }))
        setRefreshing((prev) => ({ ...prev, earnings: false }))
      }
    }

    fetchEarnings()
  }, [partner])

  // Fetch performance data
  useEffect(() => {
    if (!partner?.id) return

    const fetchPerformanceData = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, performance: true }))
        const response = await fetch(`/api/partner/analytics/summary?period=${selectedPeriod}`)
        if (!response.ok) {
          throw new Error("Failed to fetch performance data")
        }
        const data = await response.json()
        setPerformanceData(data)
      } catch (err: any) {
        console.error("Error fetching performance data:", err)
        // Try to fetch summary data from a different endpoint as fallback
        try {
          const fallbackResponse = await fetch(`/api/partner/analytics/basic-summary`)
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            setPerformanceData(fallbackData)
          } else {
            // If both endpoints fail, set minimal data from devices
            if (!loading.devices && devices.length > 0) {
              const activeDevices = devices.filter((d) => d.status === "ACTIVE").length
              setPerformanceData({
                totalDevices: devices.length,
                activeDevices,
                totalImpressions: 0,
                totalRevenue: 0,
                averageCTR: 0,
                totalConversions: 0,
              })
            }
          }
        } catch (fallbackErr: any) {
          console.error("Error fetching fallback performance data:", fallbackErr)
        }
      } finally {
        setLoading((prev) => ({ ...prev, performance: false }))
        setRefreshing((prev) => ({ ...prev, performance: false }))
      }
    }

    fetchPerformanceData()
  }, [partner, devices, loading.devices, selectedPeriod])

  // Fetch notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchNotifications = async () => {
      try {
        setRefreshing((prev) => ({ ...prev, notifications: true }))
        const response = await fetch("/api/notifications?limit=5")
        if (response.ok) {
          const data = await response.json()
          setNotifications(Array.isArray(data) ? data : data.notifications || [])
        }
      } catch (err: any) {
        console.error("Error fetching notifications:", err)
        setNotifications([])
      } finally {
        setLoading((prev) => ({ ...prev, notifications: false }))
        setRefreshing((prev) => ({ ...prev, notifications: false }))
      }
    }

    fetchNotifications()
  }, [session])

  // Redirect if not authenticated or not a partner
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/partner")
    } else if (session?.user?.role && session.user.role !== "PARTNER") {
      router.push("/")
    }
  }, [session, sessionStatus, router])

  // Get health metrics from API
  const [healthMetricsState, setHealthMetricsState] = useState({
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0,
    unknown: 0,
  })

  useEffect(() => {
    const fetchHealthMetrics = async () => {
      if (!partner?.id) return

      try {
        const response = await fetch("/api/partner/devices/health-metrics")
        if (response.ok) {
          const data = await response.json()
          setHealthMetricsState(data)
        } else {
          // Fallback to calculated metrics if API fails
          if (devices.length) {
            const calculatedMetrics = devices.reduce(
              (acc, device) => {
                const status = device.healthStatus?.toLowerCase() || "unknown"
                if (status in acc) {
                  acc[status]++
                } else {
                  acc.unknown++
                }
                return acc
              },
              { healthy: 0, warning: 0, critical: 0, offline: 0, unknown: 0 },
            )
            setHealthMetricsState(calculatedMetrics)
          }
        }
      } catch (err: any) {
        console.error("Error fetching health metrics:", err)
        // Fallback to calculated metrics if API fails
        if (devices.length) {
          const calculatedMetrics = devices.reduce(
            (acc, device) => {
              const status = device.healthStatus?.toLowerCase() || "unknown"
              if (status in acc) {
                acc[status]++
              } else {
                acc.unknown++
              }
              return acc
            },
            { healthy: 0, warning: 0, critical: 0, offline: 0, unknown: 0 },
          )
          setHealthMetricsState(calculatedMetrics)
        }
      }
    }

    fetchHealthMetrics()
  }, [partner, devices])

  // Get device status metrics from API
  const [deviceStatusMetricsState, setDeviceStatusMetricsState] = useState({
    active: 0,
    pending: 0,
    inactive: 0,
    suspended: 0,
    maintenance: 0,
  })

  useEffect(() => {
    const fetchDeviceStatusMetrics = async () => {
      if (!partner?.id) return

      try {
        const response = await fetch("/api/partner/devices/status-metrics")
        if (response.ok) {
          const data = await response.json()
          setDeviceStatusMetricsState(data)
        } else {
          // Fallback to calculated metrics if API fails
          if (devices.length) {
            const calculatedMetrics = devices.reduce(
              (acc, device) => {
                const status = device.status?.toLowerCase() || "inactive"
                if (status in acc) {
                  acc[status]++
                } else {
                  acc.inactive++
                }
                return acc
              },
              { active: 0, pending: 0, inactive: 0, suspended: 0, maintenance: 0 },
            )
            setDeviceStatusMetricsState(calculatedMetrics)
          }
        }
      } catch (err: any) {
        console.error("Error fetching device status metrics:", err)
        // Fallback to calculated metrics if API fails
        if (devices.length) {
          const calculatedMetrics = devices.reduce(
            (acc, device) => {
              const status = device.status?.toLowerCase() || "inactive"
              if (status in acc) {
                acc[status]++
              } else {
                acc.inactive++
              }
              return acc
            },
            { active: 0, pending: 0, inactive: 0, suspended: 0, maintenance: 0 },
          )
          setDeviceStatusMetricsState(calculatedMetrics)
        }
      }
    }

    fetchDeviceStatusMetrics()
  }, [partner, devices])

  // Get earnings metrics from API
  const [earningsMetricsState, setEarningsMetricsState] = useState({ total: 0, pending: 0, paid: 0 })

  useEffect(() => {
    const fetchEarningsMetrics = async () => {
      if (!partner?.id) return

      try {
        const response = await fetch("/api/partner/earnings/metrics")
        if (response.ok) {
          const data = await response.json()
          setEarningsMetricsState(data)
        } else {
          // Fallback to calculated metrics if API fails
          if (earnings.length) {
            const calculatedMetrics = earnings.reduce(
              (acc, earning) => {
                acc.total += earning.amount
                if (earning.status === "PENDING" || earning.status === "PROCESSED") {
                  acc.pending += earning.amount
                } else if (earning.status === "PAID") {
                  acc.paid += earning.amount
                }
                return acc
              },
              { total: 0, pending: 0, paid: 0 },
            )
            setEarningsMetricsState(calculatedMetrics)
          }
        }
      } catch (err: any) {
        console.error("Error fetching earnings metrics:", err)
        // Fallback to calculated metrics if API fails
        if (earnings.length) {
          const calculatedMetrics = earnings.reduce(
            (acc, earning) => {
              acc.total += earning.amount
              if (earning.status === "PENDING" || earning.status === "PROCESSED") {
                acc.pending += earning.amount
              } else if (earning.status === "PAID") {
                acc.paid += earning.amount
              }
              return acc
            },
            { total: 0, pending: 0, paid: 0 },
          )
          setEarningsMetricsState(calculatedMetrics)
        }
      }
    }

    fetchEarningsMetrics()
  }, [partner, earnings])

  const [impressionsChartDataState, setImpressionsChartDataState] = useState({
    labels: Array(7)
      .fill("")
      .map((_, i) => format(subDays(new Date(), 6 - i), "MMM dd")),
    datasets: [
      {
        label: "Impressions",
        data: Array(7).fill(0),
        borderColor: "rgba(59, 130, 246, 0.8)",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
      },
    ],
  })

  const [revenueChartDataState, setRevenueChartDataState] = useState({
    labels: Array(6)
      .fill("")
      .map((_, i) => format(subDays(new Date(), 5 - i), "MMM dd")),
    datasets: [
      {
        label: "Revenue",
        data: Array(6).fill(0),
        borderColor: "rgba(16, 185, 129, 0.8)",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        tension: 0.4,
      },
    ],
  })

  const fetchImpressionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/partner/analytics/device-impressions?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.devices && data.devices.length > 0) {
          // Sort devices by impressions
          const sortedDevices = [...data.devices].sort((a, b) => b.impressions - a.impressions)
          // Take top 5 devices
          const topDevices = sortedDevices.slice(0, 5)

          setImpressionsChartDataState({
            labels: topDevices.map((device) => device.name || device.id.substring(0, 8) + "..."),
            datasets: [
              {
                label: "Impressions",
                data: topDevices.map((device) => device.impressions),
                backgroundColor: [
                  "rgba(59, 130, 246, 0.7)",
                  "rgba(16, 185, 129, 0.7)",
                  "rgba(245, 158, 11, 0.7)",
                  "rgba(99, 102, 241, 0.7)",
                  "rgba(236, 72, 153, 0.7)",
                ],
                borderWidth: 1,
              },
            ],
          })
        }
      }
    } catch (err: any) {
      console.error("Error fetching device impressions data:", err)
    }
  }, [selectedPeriod])

  const fetchRevenueData = useCallback(async () => {
    try {
      const response = await fetch(`/api/partner/analytics/revenue-trend?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.revenueData && data.revenueData.length > 0) {
          setRevenueChartDataState({
            labels: data.revenueData.map((item) => format(new Date(item.date), "MMM dd")),
            datasets: [
              {
                label: "Revenue",
                data: data.revenueData.map((item) => item.amount),
                borderColor: "rgba(16, 185, 129, 0.8)",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                tension: 0.4,
                fill: true,
              },
            ],
          })
        }
      }
    } catch (err: any) {
      console.error("Error fetching revenue trend data:", err)
    }
  }, [selectedPeriod])

  // Fix the impressionsChartData useMemo to handle undefined devicePerformance
  // Replace the existing impressionsChartData useMemo with this safer implementation
  const impressionsChartData = useMemo(() => {
    // Default chart data when no performance data is available
    const defaultChartData = {
      labels: Array(7)
        .fill("")
        .map((_, i) => format(subDays(new Date(), 6 - i), "MMM dd")),
      datasets: [
        {
          label: "Impressions",
          data: Array(7).fill(0),
          borderColor: "rgba(59, 130, 246, 0.8)",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
        },
      ],
    }

    // Return default data if performanceData is null or devicePerformance is undefined/empty
    if (
      !performanceData ||
      !performanceData.devicePerformance ||
      !Array.isArray(performanceData.devicePerformance) ||
      performanceData.devicePerformance.length === 0
    ) {
      return defaultChartData
    }

    // Sort devices by impressions
    const sortedDevices = [...performanceData.devicePerformance].sort((a, b) => b.impressions - a.impressions)

    // Take top 5 devices
    const topDevices = sortedDevices.slice(0, 5)

    return {
      labels: topDevices.map((device) => device.id.substring(0, 8) + "..."),
      datasets: [
        {
          label: "Impressions",
          data: topDevices.map((device) => device.impressions),
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(245, 158, 11, 0.7)",
            "rgba(99, 102, 241, 0.7)",
            "rgba(236, 72, 153, 0.7)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }, [performanceData])

  // Fix the revenueChartData useMemo to handle undefined earnings
  // Replace the existing revenueChartData useMemo with this safer implementation
  const revenueChartData = useMemo(() => {
    // Default chart data when no earnings data is available
    const defaultChartData = {
      labels: Array(6)
        .fill("")
        .map((_, i) => format(subDays(new Date(), 5 - i), "MMM dd")),
      datasets: [
        {
          label: "Revenue",
          data: Array(6).fill(0),
          borderColor: "rgba(16, 185, 129, 0.8)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.4,
        },
      ],
    }

    // Return default data if earnings is undefined/empty
    if (!earnings || !Array.isArray(earnings) || earnings.length === 0) {
      return defaultChartData
    }

    // Sort earnings by date
    const sortedEarnings = [...earnings].sort(
      (a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime(),
    )

    return {
      labels: sortedEarnings.map((earning) => format(new Date(earning.periodEnd), "MMM dd")),
      datasets: [
        {
          label: "Revenue",
          data: sortedEarnings.map((earning) => earning.amount),
          borderColor: "rgba(16, 185, 129, 0.8)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }, [earnings])

  // Fix the healthMetrics useMemo to handle undefined devices
  // Replace the existing healthMetrics useMemo with this safer implementation
  const healthMetrics = useMemo(() => {
    const defaultMetrics = { healthy: 0, warning: 0, critical: 0, offline: 0, unknown: 0 }

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return defaultMetrics
    }

    return devices.reduce(
      (acc, device) => {
        const status = (device.healthStatus?.toLowerCase() || "unknown") as keyof typeof defaultMetrics
        if (status in acc) {
          acc[status]++
        } else {
          acc.unknown++
        }
        return acc
      },
      { ...defaultMetrics },
    )
  }, [devices])

  // Fix the deviceStatusMetrics useMemo to handle undefined devices
  // Replace the existing deviceStatusMetrics useMemo with this safer implementation
  const deviceStatusMetrics = useMemo(() => {
    const defaultMetrics = { active: 0, pending: 0, inactive: 0, suspended: 0, maintenance: 0 }

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return defaultMetrics
    }

    return devices.reduce(
      (acc, device) => {
        const status = (device.status?.toLowerCase() || "inactive") as keyof typeof defaultMetrics
        if (status in acc) {
          acc[status]++
        } else {
          acc.inactive++
        }
        return acc
      },
      { ...defaultMetrics },
    )
  }, [devices])

  // Fix the earningsMetrics useMemo to handle undefined earnings
  // Replace the existing earningsMetrics useMemo with this safer implementation
  const earningsMetrics = useMemo(() => {
    const defaultMetrics = { total: 0, pending: 0, paid: 0 }

    if (!earnings || !Array.isArray(earnings) || earnings.length === 0) {
      return defaultMetrics
    }

    return earnings.reduce(
      (acc, earning) => {
        acc.total += earning.amount
        if (earning.status === "PENDING" || earning.status === "PROCESSED") {
          acc.pending += earning.amount
        } else if (earning.status === "PAID") {
          acc.paid += earning.amount
        }
        return acc
      },
      { ...defaultMetrics },
    )
  }, [earnings])

  const impressionsChartDataMemo = useMemo(() => {
    if (!performanceData?.devicePerformance?.length && !loading.performance) {
      fetchImpressionData()
      return impressionsChartDataState
    }

    if (!performanceData?.devicePerformance?.length) {
      return impressionsChartDataState
    }

    // Sort devices by impressions
    const sortedDevices = [...performanceData.devicePerformance].sort((a, b) => b.impressions - a.impressions)

    // Take top 5 devices
    const topDevices = sortedDevices.slice(0, 5)

    return {
      labels: topDevices.map((device) => device.id.substring(0, 8) + "..."),
      datasets: [
        {
          label: "Impressions",
          data: topDevices.map((device) => device.impressions),
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(245, 158, 11, 0.7)",
            "rgba(99, 102, 241, 0.7)",
            "rgba(236, 72, 153, 0.7)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }, [performanceData, loading.performance, selectedPeriod, fetchImpressionData, impressionsChartDataState])

  const revenueChartDataMemo = useMemo(() => {
    if (!earnings.length && !loading.earnings) {
      fetchRevenueData()
      return revenueChartDataState
    }

    if (!earnings.length) {
      return revenueChartDataState
    }

    // Sort earnings by date
    const sortedEarnings = [...earnings].sort(
      (a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime(),
    )

    return {
      labels: sortedEarnings.map((earning) => format(new Date(earning.periodEnd), "MMM dd")),
      datasets: [
        {
          label: "Revenue",
          data: sortedEarnings.map((earning) => earning.amount),
          borderColor: "rgba(16, 185, 129, 0.8)",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }, [earnings, loading.earnings, selectedPeriod, fetchRevenueData, revenueChartDataState])

  // Loading state while checking authentication
  if (sessionStatus === "loading" || settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If there's a critical error, show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg dark:bg-gray-800">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Platform name from settings
  const platformName = generalSettings?.platformName || generalSettings?.platform_name || "Lumen"

  // Use actual performance data or loading placeholders
  const displayPerformanceData = performanceData || {
    totalDevices: loading.performance ? "-" : 0,
    activeDevices: loading.performance ? "-" : 0,
    totalImpressions: loading.performance ? "-" : 0,
    totalRevenue: loading.performance ? "-" : 0,
    averageCTR: loading.performance ? "-" : 0,
    totalConversions: loading.performance ? "-" : 0,
  }

  // Format currency based on wallet or default
  const formatCurrency = (amount: number) => {
    const currency = wallet?.currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Get device type icon
  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case "ANDROID_TV":
      case "DIGITAL_SIGNAGE":
        return (
          <svg
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
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
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
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
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
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
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
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
        return (
          <svg
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
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
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid date"
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? "s" : ""} ago`
    } else {
      return format(date, "MMM d, yyyy")
    }
  }

  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "MAINTENANCE":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "INACTIVE":
      case "SUSPENDED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  // Get health status color class
  const getHealthStatusColorClass = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "text-green-500"
      case "WARNING":
        return "text-yellow-500"
      case "CRITICAL":
        return "text-red-500"
      case "OFFLINE":
        return "text-gray-500"
      default:
        return "text-gray-400"
    }
  }

  // Get notification type color class
  const getNotificationTypeColorClass = (type: string) => {
    switch (type.toUpperCase()) {
      case "SUCCESS":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "ERROR":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "INFO":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    }
  }

  // Check if device is recently active (within last 24 hours)
  const isRecentlyActive = (lastActiveDate?: string) => {
    if (!lastActiveDate) return false
    const lastActive = new Date(lastActiveDate)
    const oneDayAgo = subDays(new Date(), 1)
    return isAfter(lastActive, oneDayAgo)
  }

  // Handle refresh for a specific section
  const handleRefresh = async (section: string) => {
    switch (section) {
      case "partner":
        setRefreshing((prev) => ({ ...prev, partner: true }))
        try {
          const response = await fetch("/api/partner/profile")
          if (response.ok) {
            const data = await response.json()
            setPartner(data.profile || data)
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, partner: false }))
        }
        break
      case "wallet":
        setRefreshing((prev) => ({ ...prev, wallet: true }))
        try {
          const response = await fetch(`/api/partner/wallet`)
          if (response.ok) {
            const data = await response.json()
            setWallet(data)
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, wallet: false }))
        }
        break
      case "devices":
        setRefreshing((prev) => ({ ...prev, devices: true }))
        try {
          const response = await fetch(`/api/partner/devices?limit=4`)
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              setDevices(data)
            } else if (data && typeof data === "object") {
              if (Array.isArray(data.devices)) {
                setDevices(data.devices)
              } else {
                const possibleDevices = Object.values(data).find((val) => Array.isArray(val))
                if (possibleDevices) {
                  setDevices(possibleDevices as Device[])
                }
              }
            }
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, devices: false }))
        }
        break
      case "earnings":
        setRefreshing((prev) => ({ ...prev, earnings: true }))
        try {
          const response = await fetch(`/api/partner/earnings?limit=5`)
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              setEarnings(data)
            } else if (data.data && Array.isArray(data.data)) {
              setEarnings(data.data)
            }
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, earnings: false }))
        }
        break
      case "performance":
        setRefreshing((prev) => ({ ...prev, performance: true }))
        try {
          const response = await fetch(`/api/partner/analytics/summary?period=${selectedPeriod}`)
          if (response.ok) {
            const data = await response.json()
            setPerformanceData(data)
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, performance: false }))
        }
        break
      case "notifications":
        setRefreshing((prev) => ({ ...prev, notifications: true }))
        try {
          const response = await fetch("/api/notifications?limit=5")
          if (response.ok) {
            const data = await response.json()
            setNotifications(Array.isArray(data) ? data : data.notifications || [])
          }
        } catch (err: any) {
          console.error(`Error refreshing ${section}:`, err)
        } finally {
          setRefreshing((prev) => ({ ...prev, notifications: false }))
        }
        break
      default:
        break
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header with notifications */}
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Partner Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {partner?.contactPerson || session?.user?.name || "Partner"}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-4 sm:mt-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  onClick={() => handleRefresh("notifications")}
                >
                  <Bell className="h-5 w-5" />
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Link
            href="/partner/devices/register"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register New Device
          </Link>
        </div>
      </div>

      {/* Notifications panel */}
      {notifications.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleRefresh("notifications")}>
                  <RefreshCw className={`h-4 w-4 ${refreshing.notifications ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-4 rounded-lg border p-3">
                    <div className={`mt-0.5 rounded-full p-1.5 ${getNotificationTypeColorClass(notification.type)}`}>
                      {notification.type.toUpperCase() === "SUCCESS" ? (
                        <Zap className="h-4 w-4" />
                      ) : notification.type.toUpperCase() === "WARNING" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : notification.type.toUpperCase() === "ERROR" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{notification.title}</p>
                        <Badge variant={notification.isRead ? "outline" : "default"} className="ml-2">
                          {notification.isRead ? "Read" : "New"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(notification.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {notifications.length > 3 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/partner/notifications"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet summary card - if wallet exists */}
      {wallet && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Wallet Balance</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleRefresh("wallet")}>
                  <RefreshCw className={`h-4 w-4 ${refreshing.wallet ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(wallet.balance)}
                    {wallet.pendingBalance > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        + {formatCurrency(wallet.pendingBalance)} pending
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Next payout:{" "}
                    {wallet.nextPayoutDate ? new Date(wallet.nextPayoutDate).toLocaleDateString() : "Not scheduled"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/partner/wallet/withdraw"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Withdraw Funds
                  </Link>
                  <Link
                    href="/partner/wallet"
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Manage Wallet
                  </Link>
                </div>
              </div>

              {/* Recent transactions */}
              {wallet.recentTransactions && wallet.recentTransactions.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Recent Transactions</h3>
                  <div className="space-y-2">
                    {wallet.recentTransactions.slice(0, 3).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center">
                          <div
                            className={`mr-3 rounded-full p-1.5 ${
                              transaction.type === "DEPOSIT"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {transaction.type === "DEPOSIT" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{transaction.description || transaction.type}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              transaction.type === "WITHDRAWAL"
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {transaction.type === "WITHDRAWAL" ? "-" : "+"}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link
                href="/partner/wallet/transactions"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all transactions
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Time period selector for analytics */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
        <div className="flex items-center gap-2">
          <Tabs defaultValue="30days" value={selectedPeriod} onValueChange={setSelectedPeriod} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="7days">7 Days</TabsTrigger>
              <TabsTrigger value="30days">30 Days</TabsTrigger>
              <TabsTrigger value="90days">90 Days</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" onClick={() => handleRefresh("performance")}>
            <RefreshCw className={`h-4 w-4 ${refreshing.performance ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Performance overview cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Devices Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Devices</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.devices ? <Skeleton className="h-6 w-12" /> : displayPerformanceData.totalDevices}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Devices Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
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
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Devices</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.devices ? <Skeleton className="h-6 w-12" /> : displayPerformanceData.activeDevices}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impressions Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <svg
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
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
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Impressions</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.performance ? (
                    <Skeleton className="h-6 w-16" />
                  ) : typeof displayPerformanceData.totalImpressions === "number" ? (
                    displayPerformanceData.totalImpressions.toLocaleString()
                  ) : (
                    displayPerformanceData.totalImpressions
                  )}
                </p>
                {performanceData?.trends?.impressions && (
                  <Badge
                    className={
                      performanceData.trends.impressions >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }
                  >
                    {performanceData.trends.impressions >= 0 ? "+" : ""}
                    {performanceData.trends.impressions.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversions Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <svg
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.performance ? (
                    <Skeleton className="h-6 w-16" />
                  ) : typeof displayPerformanceData.totalConversions === "number" ? (
                    displayPerformanceData.totalConversions.toLocaleString()
                  ) : (
                    displayPerformanceData.totalConversions
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTR Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <svg
                  className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
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
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. CTR</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.performance ? (
                    <Skeleton className="h-6 w-12" />
                  ) : typeof displayPerformanceData.averageCTR === "number" ? (
                    `${displayPerformanceData.averageCTR}%`
                  ) : (
                    displayPerformanceData.averageCTR
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
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
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading.performance ? (
                    <Skeleton className="h-6 w-16" />
                  ) : typeof displayPerformanceData.totalRevenue === "number" ? (
                    formatCurrency(displayPerformanceData.totalRevenue)
                  ) : (
                    displayPerformanceData.totalRevenue
                  )}
                </p>
                {performanceData?.trends?.engagements && (
                  <Badge
                    className={
                      performanceData.trends.engagements >= 0
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }
                  >
                    {performanceData.trends.engagements >= 0 ? "+" : ""}
                    {performanceData.trends.engagements.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card>
            <CardHeader>
              <CardTitle>Impressions by Device</CardTitle>
              <CardDescription>Top performing devices based on impressions for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {loading.performance || loading.devices ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <Chart
                    type="bar"
                    data={impressionsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Impressions: ${context.raw.toLocaleString()}`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => value.toLocaleString(),
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href="/partner/devices">View All Devices</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/partner/analytics/devices">
                  Detailed Analytics <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Revenue trend over time for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {loading.earnings ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <Chart
                    type="line"
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Revenue: ${formatCurrency(context.raw as number)}`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => formatCurrency(value as number),
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href="/partner/earnings">View All Earnings</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/partner/analytics/revenue">
                  Detailed Analytics <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </ErrorBoundary>
      </div>

      {/* Device health overview */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Device Health Overview</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => handleRefresh("devices")}>
                <RefreshCw className={`h-4 w-4 ${refreshing.devices ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <CardDescription>Current status of all your registered devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium">Health Status Distribution</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm">Healthy</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{healthMetrics.healthy}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((healthMetrics.healthy / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (healthMetrics.healthy / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-green-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-sm">Warning</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{healthMetrics.warning}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((healthMetrics.warning / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (healthMetrics.warning / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-yellow-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-sm">Critical</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{healthMetrics.critical}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((healthMetrics.critical / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (healthMetrics.critical / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-red-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-gray-500 mr-2"></div>
                      <span className="text-sm">Offline</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{healthMetrics.offline}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((healthMetrics.offline / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (healthMetrics.offline / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-gray-500"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Device Status Distribution</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm">Active</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{deviceStatusMetrics.active}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((deviceStatusMetrics.active / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (deviceStatusMetrics.active / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-green-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{deviceStatusMetrics.pending}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((deviceStatusMetrics.pending / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (deviceStatusMetrics.pending / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-yellow-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-orange-500 mr-2"></div>
                      <span className="text-sm">Maintenance</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{deviceStatusMetrics.maintenance}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({devices.length ? Math.round((deviceStatusMetrics.maintenance / devices.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={devices.length ? (deviceStatusMetrics.maintenance / devices.length) * 100 : 0}
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-orange-500"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-gray-500 mr-2"></div>
                      <span className="text-sm">Inactive/Suspended</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        {deviceStatusMetrics.inactive + deviceStatusMetrics.suspended}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        (
                        {devices.length
                          ? Math.round(
                              ((deviceStatusMetrics.inactive + deviceStatusMetrics.suspended) / devices.length) * 100,
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={
                      devices.length
                        ? ((deviceStatusMetrics.inactive + deviceStatusMetrics.suspended) / devices.length) * 100
                        : 0
                    }
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    indicatorClassName="bg-gray-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild>
              <Link href="/partner/devices/health">View Detailed Health Report</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Device status section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Registered Devices</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleRefresh("devices")}>
                  <RefreshCw className={`h-4 w-4 ${refreshing.devices ? "animate-spin" : ""}`} />
                </Button>
                <Link
                  href="/partner/devices"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all
                </Link>
              </div>
            </div>
            <CardDescription>Overview of your registered devices and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.devices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading devices...</span>
              </div>
            ) : devices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
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
                        Location
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Impressions
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Revenue
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Last Active
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {devices.map((device) => (
                      <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              {getDeviceTypeIcon(device.deviceType)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {device.name}
                                {isRecentlyActive(device.lastActive) && (
                                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{device.deviceType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColorClass(device.status)}`}
                          >
                            {device.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`flex items-center text-sm ${getHealthStatusColorClass(device.healthStatus)}`}
                          >
                            <span
                              className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
                                device.healthStatus === "HEALTHY"
                                  ? "bg-green-500"
                                  : device.healthStatus === "WARNING"
                                    ? "bg-yellow-500"
                                    : device.healthStatus === "CRITICAL"
                                      ? "bg-red-500"
                                      : device.healthStatus === "OFFLINE"
                                        ? "bg-gray-500"
                                        : "bg-gray-400"
                              }`}
                            ></span>
                            {device.healthStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {typeof device.location === "object" && device.location.address
                            ? device.location.address
                            : JSON.stringify(device.location).includes("lat")
                              ? "GPS Location"
                              : "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {device.impressions?.toLocaleString() || "0"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {device.revenue ? formatCurrency(device.revenue) : "$0.00"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {device.lastActive ? formatDate(device.lastActive) : "Never"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <Link
                            href={`/partner/devices/${device.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No devices registered</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Get started by registering your first device to start earning revenue.
                </p>
                <div className="mt-6">
                  <Link
                    href="/partner/devices/register"
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Register New Device
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent earnings section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Earnings</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleRefresh("earnings")}>
                  <RefreshCw className={`h-4 w-4 ${refreshing.earnings ? "animate-spin" : ""}`} />
                </Button>
                <Link
                  href="/partner/earnings"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all
                </Link>
              </div>
            </div>
            <CardDescription>Your most recent earnings from ad displays</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.earnings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading earnings...</span>
              </div>
            ) : earnings.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Period
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Impressions
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Engagements
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        Status
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {earnings.map((earning) => (
                      <tr key={earning.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(earning.periodStart).toLocaleDateString()} -{" "}
                          {new Date(earning.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {earning.totalImpressions.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {earning.totalEngagements.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(earning.amount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              earning.status === "PAID"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : earning.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : earning.status === "PROCESSED"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {earning.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <Link
                            href={`/partner/earnings/${earning.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No earnings yet</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your earnings will appear here once your devices start displaying ads.
                </p>
                <div className="mt-6">
                  <Link
                    href="/partner/devices"
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Manage Devices
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions and resources */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/devices/register">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Register New Device
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/wallet/withdraw">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Withdraw Funds
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/devices/health">
                  <Activity className="mr-2 h-4 w-4" />
                  Check Device Health
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/analytics">
                  <BarChart className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {wallet?.nextPayoutDate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Next Payout</p>
                    <p className="text-lg font-bold">{formatCurrency(wallet.pendingBalance || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Scheduled for</p>
                    <p className="text-sm font-medium">{new Date(wallet.nextPayoutDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payout Method</p>
                  <p className="text-sm font-medium">
                    {wallet.autoPayoutEnabled ? "Automatic" : "Manual"} ({wallet.currency})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Threshold</p>
                  <p className="text-sm font-medium">{formatCurrency(wallet.payoutThreshold)}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/partner/wallet/settings">Manage Payout Settings</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No upcoming payouts scheduled</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/partner/wallet/settings">Set Up Automatic Payouts</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources & Help</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/help/getting-started">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Getting Started Guide
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/help/faq">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  FAQ
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/help/device-setup">
                  <Shield className="mr-2 h-4 w-4" />
                  Device Setup Guide
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/partner/help/contact">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`${platformName.toLowerCase()}-partner-resources.pdf`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Resources
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
