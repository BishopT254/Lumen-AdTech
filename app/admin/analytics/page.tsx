"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Calendar,
  Download,
  FileText,
  Filter,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Save,
  Smile,
  Timer,
  Users,
  Search,
} from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE'
}

interface DeviceStatusData {
  status: DeviceStatus
  _count: {
    _all: number
  }
}

interface TopCampaign {
  id: string
  name: string
  objective: string
  budget: number
  startDate: string
  endDate: string
  advertiser: {
    companyName: string
  }
  _count: {
    adDeliveries: number
  }
}

interface HourlyImpression {
  actualDeliveryTime: string
  _sum: {
    impressions: number
  }
}

type AnalyticsData = {
  overview: {
    totalCampaigns: number
    totalBudget: number | string | { toString(): string }
    totalImpressions: number
    totalEngagements: number
    totalCompletions: number
    totalViewers: number
  }
  performance: {
    averageUptime: number | string | { toString(): string }
    averageViewerCount: number | string | { toString(): string }
    totalImpressions: number
    totalEngagements: number
    energyConsumption: number | string | { toString(): string }
  }
  audience: {
    averageJoyScore: number | string | { toString(): string }
    averageSurpriseScore: number | string | { toString(): string }
    averageNeutralScore: number | string | { toString(): string }
    averageDwellTime: number | string | { toString(): string }
    totalViewers: number
  }
  revenue: {
    totalRevenue: number | string | { toString(): string }
    totalTax: number | string | { toString(): string }
    partnerEarnings: number | string | { toString(): string }
  }
  topCampaigns: TopCampaign[]
  deviceStatus: DeviceStatusData[]
  hourlyImpressions: HourlyImpression[]
  period: string
}

function toNumber(value: number | string | { toString(): string } | undefined | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState("month")
  const [campaignSearch, setCampaignSearch] = useState("")
  const [deviceSearch, setDeviceSearch] = useState("")

  useEffect(() => {
    fetchAnalyticsData()
  }, [period, dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        period,
        ...(dateRange?.from && { startDate: dateRange.from.toISOString() }),
        ...(dateRange?.to && { endDate: dateRange.to.toISOString() }),
      })

      const response = await fetch(`/api/admin/analytics?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics data')
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/analytics/export?format=${format}`)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-export-${format}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  const handleCampaignSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCampaignSearch(event.target.value)
    // TODO: Implement campaign search functionality
  }

  const handleDeviceSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDeviceSearch(event.target.value)
    // TODO: Implement device search functionality
  }

  if (isLoading || !analyticsData) {
  return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track and analyze your advertising performance</p>
        </div>
          <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
              <SelectItem value="day">Last 24 hours</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
          <Button variant="outline" onClick={() => handleExportData('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export
              </Button>
            </div>
                              </div>

      {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalImpressions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
              +{((analyticsData.overview.totalImpressions / 1000) * 100).toFixed(2)}% from last period
                </p>
              </CardContent>
            </Card>
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalEngagements.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
              +{((analyticsData.overview.totalEngagements / 1000) * 100).toFixed(2)}% from last period
                </p>
              </CardContent>
            </Card>
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Joy Score</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">{(toNumber(analyticsData.audience.averageJoyScore) * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Based on emotion analysis</p>
              </CardContent>
            </Card>
            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">
              ${toNumber(analyticsData.revenue.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
                <p className="text-xs text-muted-foreground">
              +${toNumber(analyticsData.revenue.totalTax).toLocaleString(undefined, { minimumFractionDigits: 2 })} in taxes
                </p>
              </CardContent>
            </Card>
          </div>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Hourly Impressions</CardTitle>
                <CardDescription>24-hour impression distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.hourlyImpressions}>
                    <defs>
                      <linearGradient id="impressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="actualDeliveryTime" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="_sum.impressions"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#impressions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Campaigns</CardTitle>
                <CardDescription>Best performing campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {analyticsData.topCampaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">{campaign.advertiser.companyName}</p>
          </div>
                      <div className="ml-auto font-medium">
                        {campaign._count.adDeliveries.toLocaleString()} deliveries
                  </div>
                </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Emotion Distribution</CardTitle>
                <CardDescription>Viewer emotional responses</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Joy', value: toNumber(analyticsData.audience.averageJoyScore) },
                        { name: 'Surprise', value: toNumber(analyticsData.audience.averageSurpriseScore) },
                        { name: 'Neutral', value: toNumber(analyticsData.audience.averageNeutralScore) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0ea5e9', '#84cc16', '#6366f1'][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Viewer Metrics</CardTitle>
                <CardDescription>Key audience statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Average Dwell Time</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof analyticsData.audience.averageDwellTime === 'number' 
                          ? analyticsData.audience.averageDwellTime.toFixed(2)
                          : Number(analyticsData.audience.averageDwellTime).toFixed(2)} seconds
                      </p>
                    </div>
                <Timer className="h-4 w-4 text-muted-foreground" />
          </div>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Total Viewers</p>
                      <p className="text-sm text-muted-foreground">
                        {analyticsData.audience.totalViewers.toLocaleString()} unique views
                      </p>
                  </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Total revenue and partner earnings</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    {
                      name: 'Revenue',
                      total: toNumber(analyticsData.revenue.totalRevenue),
                      tax: toNumber(analyticsData.revenue.totalTax),
                      earnings: toNumber(analyticsData.revenue.partnerEarnings),
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#0ea5e9" name="Total Revenue" />
                    <Bar dataKey="tax" fill="#84cc16" name="Tax" />
                    <Bar dataKey="earnings" fill="#6366f1" name="Partner Earnings" />
                  </BarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Device Status</CardTitle>
                <CardDescription>Current device distribution</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  {analyticsData.deviceStatus.map((status) => (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{status.status}</p>
                        <p className="text-sm text-muted-foreground">{status._count._all} devices</p>
              </div>
                      <Badge variant={status.status === DeviceStatus.ACTIVE ? 'success' : 'secondary'}>
                        {((status._count._all / analyticsData.deviceStatus.reduce((acc, curr) => acc + curr._count._all, 0)) * 100).toFixed(1)}%
                      </Badge>
          </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
              <CardDescription>Average uptime and energy consumption</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Average Uptime</p>
                    <p className="text-2xl font-bold">{toNumber(analyticsData.performance.averageUptime).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Energy Consumption</p>
                    <p className="text-2xl font-bold">{toNumber(analyticsData.performance.energyConsumption).toFixed(2)} kWh</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Average Viewers</p>
                    <p className="text-2xl font-bold">{toNumber(analyticsData.performance.averageViewerCount).toFixed(0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">Total Impressions</p>
                    <p className="text-2xl font-bold">{analyticsData.performance.totalImpressions.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search Inputs */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search campaigns..." 
          className="w-[250px]"
          value={campaignSearch}
          onChange={handleCampaignSearch}
        />
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search devices..." 
          className="w-[250px]"
          value={deviceSearch}
          onChange={handleDeviceSearch}
        />
      </div>
    </div>
  )
}

