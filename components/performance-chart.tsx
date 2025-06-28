"use client"

import type React from "react"

import { useState, useMemo, useCallback } from "react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Scatter,
  ScatterChart,
  Pie,
  PieChart,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Activity, Download, Maximize2, Filter, RefreshCw, Zap, TrendingUp, TrendingDown, Layers } from "lucide-react"

// Define chart data types to match the Prisma schema
interface MetricPoint {
  timestamp: string
  value: number
  category?: string
  label?: string
}

interface ChartDataSeries {
  name: string
  data: MetricPoint[]
  color?: string
  type?: "line" | "bar" | "area" | "scatter"
}

interface PerformanceData {
  // Main metrics
  impressions?: MetricPoint[]
  engagements?: MetricPoint[]
  conversions?: MetricPoint[]
  ctr?: MetricPoint[]
  conversionRate?: MetricPoint[]

  // Device metrics
  devicePerformance?: {
    deviceType: string
    impressions: number
    engagements: number
    conversions: number
    ctr: number
  }[]

  // Location metrics
  locationPerformance?: {
    location: string
    impressions: number
    engagements: number
    conversions: number
  }[]

  // Time-based metrics
  hourlyPerformance?: {
    hour: number
    impressions: number
    engagements: number
  }[]

  // Audience metrics
  audienceMetrics?: {
    ageGroup: string
    percentage: number
  }[]

  // Emotion metrics
  emotionMetrics?: {
    emotion: string
    score: number
  }[]

  // Cost metrics
  costMetrics?: {
    date: string
    spend: number
    cpm: number
    cpe: number
    cpa: number
  }[]

  // System performance
  systemMetrics?: {
    timestamp: string
    cpu: number
    memory: number
    network: number
    responseTime: number
  }[]

  // Custom series for flexible data
  series?: ChartDataSeries[]
}

// Define chart configuration types
interface ChartConfig {
  type: "line" | "bar" | "area" | "scatter" | "pie" | "radar" | "composed"
  stacked: boolean
  showGrid: boolean
  showLegend: boolean
  showTooltip: boolean
  showDataLabels: boolean
  animate: boolean
  syncId?: string
  aspectRatio: number
  colorScheme: "default" | "categorical" | "sequential" | "diverging" | "monochrome"
}

// Define props for the component
interface PerformanceChartProps {
  data?: PerformanceData
  title?: string
  description?: string
  height?: number | string
  width?: number | string
  defaultConfig?: Partial<ChartConfig>
  syncWithCharts?: boolean
  allowDownload?: boolean
  allowFullscreen?: boolean
  allowConfiguration?: boolean
  emptyStateMessage?: string
  loadingStateMessage?: string
  isLoading?: boolean
}

// Color schemes
const COLOR_SCHEMES = {
  default: ["#2563eb", "#16a34a", "#ea580c", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"],
  categorical: ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"],
  sequential: ["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"],
  diverging: ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#0ea5e9"],
  monochrome: ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155"],
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title = "Performance Metrics",
  description,
  height = 400,
  width = "100%",
  defaultConfig,
  syncWithCharts = false,
  allowDownload = true,
  allowFullscreen = true,
  allowConfiguration = true,
  emptyStateMessage = "No data available for the selected time period",
  loadingStateMessage = "Loading chart data...",
  isLoading = false,
}) => {
  // Get system settings
  const { generalSettings, systemSettings, loading: settingsLoading } = usePublicSettings()

  // Default chart configuration
  const defaultChartConfig: ChartConfig = {
    type: "line",
    stacked: false,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showDataLabels: false,
    animate: true,
    syncId: syncWithCharts ? "performance-sync" : undefined,
    aspectRatio: 16 / 9,
    colorScheme: "default",
  }

  // Merge default config with provided config
  const initialConfig = { ...defaultChartConfig, ...defaultConfig }

  // State for chart configuration
  const [chartConfig, setChartConfig] = useState<ChartConfig>(initialConfig)
  const [activeMetric, setActiveMetric] = useState<string>("impressions")
  const [secondaryMetric, setSecondaryMetric] = useState<string | null>("engagements")
  const [showConfiguration, setShowConfiguration] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Get color scheme based on settings and configuration
  const colorScheme = useMemo(() => {
    // Use system settings if available
    if (!settingsLoading && generalSettings?.interfaceAnimations !== undefined) {
      // Respect system settings for animations
      if (chartConfig.animate !== generalSettings.interfaceAnimations) {
        setChartConfig((prev) => ({ ...prev, animate: !!generalSettings.interfaceAnimations }))
      }
    }

    return COLOR_SCHEMES[chartConfig.colorScheme] || COLOR_SCHEMES.default
  }, [chartConfig.colorScheme, generalSettings, settingsLoading])

  // Format date based on system settings
  const formatDate = useCallback(
    (dateString: string) => {
      try {
        const date = new Date(dateString)
        const format = generalSettings?.dateFormat || "MM/dd/yyyy"

        // Simple formatting based on format string
        // In a real implementation, you would use a library like date-fns
        return date.toLocaleDateString()
      } catch (e) {
        return dateString
      }
    },
    [generalSettings],
  )

  // Format currency based on system settings
  const formatCurrency = useCallback(
    (value: number) => {
      try {
        const currency = generalSettings?.defaultCurrency || "USD"
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      } catch (e) {
        return `$${value.toFixed(2)}`
      }
    },
    [generalSettings],
  )

  // Prepare chart data based on the active metrics
  const chartData = useMemo(() => {
    if (!data) return []

    // Handle series data if provided directly
    if (data.series && data.series.length > 0) {
      return data.series
        .flatMap((series) =>
          series.data.map((point) => ({
            timestamp: point.timestamp,
            [series.name]: point.value,
            category: point.category || series.name,
            label: point.label,
          })),
        )
        .reduce((acc, item) => {
          const existingItem = acc.find((i) => i.timestamp === item.timestamp)
          if (existingItem) {
            return acc.map((i) =>
              i.timestamp === item.timestamp ? { ...i, [item.category]: item[item.category], label: item.label } : i,
            )
          }
          return [...acc, item]
        }, [] as any[])
    }

    // Handle primary metric data
    const primaryData = data[activeMetric as keyof PerformanceData] as MetricPoint[] | undefined

    // Handle secondary metric data if selected
    const secondaryData = secondaryMetric
      ? (data[secondaryMetric as keyof PerformanceData] as MetricPoint[] | undefined)
      : null

    if (!primaryData) return []

    // Combine primary and secondary data
    return primaryData.map((point) => {
      const secondaryPoint = secondaryData?.find((p) => p.timestamp === point.timestamp)
      return {
        timestamp: point.timestamp,
        [activeMetric]: point.value,
        ...(secondaryPoint ? { [secondaryMetric as string]: secondaryPoint.value } : {}),
      }
    })
  }, [data, activeMetric, secondaryMetric])

  // Handle chart download
  const handleDownload = useCallback(() => {
    if (!data) return

    try {
      // Get SVG element
      const svgElement = document.querySelector(".recharts-wrapper svg")
      if (!svgElement) return

      // Create a canvas element
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas dimensions
      const svgRect = svgElement.getBoundingClientRect()
      canvas.width = svgRect.width
      canvas.height = svgRect.height

      // Create an image from the SVG
      const img = new Image()
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      img.onload = () => {
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0)

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) return

          // Create download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Clean up
          URL.revokeObjectURL(url)
          URL.revokeObjectURL(svgUrl)
        }, "image/png")
      }

      img.crossOrigin = "anonymous"
      img.src = svgUrl
    } catch (error) {
      console.error("Error downloading chart:", error)
    }
  }, [data, title])

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // Render the appropriate chart based on configuration
  const renderChart = useCallback(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{loadingStateMessage}</p>
          </div>
        </div>
      )
    }

    if (!data || chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="text-center">
            <Layers className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        </div>
      )
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 50 },
      syncId: chartConfig.syncId,
    }

    const renderXAxis = () => (
      <XAxis
        dataKey="timestamp"
        tickFormatter={formatDate}
        tick={{ fontSize: 12 }}
        tickLine={chartConfig.showGrid}
        axisLine={chartConfig.showGrid}
      />
    )

    const renderYAxis = () => (
      <YAxis tick={{ fontSize: 12 }} tickLine={chartConfig.showGrid} axisLine={chartConfig.showGrid} />
    )

    const renderCartesianElements = () => (
      <>
        {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        {renderXAxis()}
        {renderYAxis()}
        {chartConfig.showTooltip && (
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === "spend" || name.includes("cost") || name.includes("revenue")) {
                return [formatCurrency(value), name]
              }
              return [value, name]
            }}
          />
        )}
        {chartConfig.showLegend && <Legend />}
      </>
    )

    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              {renderCartesianElements()}
              <Bar
                dataKey={activeMetric}
                fill={colorScheme[0]}
                name={activeMetric}
                isAnimationActive={chartConfig.animate}
                stackId={chartConfig.stacked ? "stack" : undefined}
              />
              {secondaryMetric && (
                <Bar
                  dataKey={secondaryMetric}
                  fill={colorScheme[1]}
                  name={secondaryMetric}
                  isAnimationActive={chartConfig.animate}
                  stackId={chartConfig.stacked ? "stack" : undefined}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )

      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...commonProps}>
              {renderCartesianElements()}
              <Area
                type="monotone"
                dataKey={activeMetric}
                fill={colorScheme[0]}
                stroke={colorScheme[0]}
                fillOpacity={0.6}
                name={activeMetric}
                isAnimationActive={chartConfig.animate}
                stackId={chartConfig.stacked ? "stack" : undefined}
              />
              {secondaryMetric && (
                <Area
                  type="monotone"
                  dataKey={secondaryMetric}
                  fill={colorScheme[1]}
                  stroke={colorScheme[1]}
                  fillOpacity={0.6}
                  name={secondaryMetric}
                  isAnimationActive={chartConfig.animate}
                  stackId={chartConfig.stacked ? "stack" : undefined}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              {renderCartesianElements()}
              <Scatter
                name={activeMetric}
                data={chartData.map((item) => ({ x: item.timestamp, y: item[activeMetric], z: 10 }))}
                fill={colorScheme[0]}
                isAnimationActive={chartConfig.animate}
              />
              {secondaryMetric && (
                <Scatter
                  name={secondaryMetric}
                  data={chartData.map((item) => ({ x: item.timestamp, y: item[secondaryMetric as string], z: 10 }))}
                  fill={colorScheme[1]}
                  isAnimationActive={chartConfig.animate}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        )

      case "pie":
        // For pie charts, we need to transform the data
        const pieData = Object.keys(chartData[0] || {})
          .filter((key) => key !== "timestamp" && key !== "category" && key !== "label")
          .map((key, index) => ({
            name: key,
            value: chartData.reduce((sum, item) => sum + (item[key] || 0), 0),
            fill: colorScheme[index % colorScheme.length],
          }))

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={chartConfig.showDataLabels}
                label={
                  chartConfig.showDataLabels
                    ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                    : undefined
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                isAnimationActive={chartConfig.animate}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              {chartConfig.showLegend && <Legend />}
              {chartConfig.showTooltip && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
        )

      case "radar":
        // For radar charts, we need to transform the data
        const radarData = chartData.map((item) => {
          const { timestamp, ...metrics } = item
          return {
            subject: formatDate(timestamp),
            ...metrics,
          }
        })

        const radarKeys = Object.keys(radarData[0] || {}).filter((key) => key !== "subject")

        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              {radarKeys.map((key, index) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={colorScheme[index % colorScheme.length]}
                  fill={colorScheme[index % colorScheme.length]}
                  fillOpacity={0.6}
                  isAnimationActive={chartConfig.animate}
                />
              ))}
              {chartConfig.showLegend && <Legend />}
              {chartConfig.showTooltip && <Tooltip />}
            </RadarChart>
          </ResponsiveContainer>
        )

      case "composed":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...commonProps}>
              {renderCartesianElements()}
              <Bar
                dataKey={activeMetric}
                fill={colorScheme[0]}
                name={activeMetric}
                isAnimationActive={chartConfig.animate}
                stackId={chartConfig.stacked ? "stack" : undefined}
              />
              {secondaryMetric && (
                <Line
                  type="monotone"
                  dataKey={secondaryMetric}
                  stroke={colorScheme[1]}
                  name={secondaryMetric}
                  isAnimationActive={chartConfig.animate}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )

      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              {renderCartesianElements()}
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={colorScheme[0]}
                name={activeMetric}
                isAnimationActive={chartConfig.animate}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              {secondaryMetric && (
                <Line
                  type="monotone"
                  dataKey={secondaryMetric}
                  stroke={colorScheme[1]}
                  name={secondaryMetric}
                  isAnimationActive={chartConfig.animate}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }, [
    chartConfig,
    chartData,
    activeMetric,
    secondaryMetric,
    colorScheme,
    data,
    isLoading,
    formatDate,
    formatCurrency,
    emptyStateMessage,
    loadingStateMessage,
  ])

  // Get available metrics from data
  const availableMetrics = useMemo(() => {
    if (!data) return []

    const metrics = []

    // Check for direct metric data
    if (data.impressions) metrics.push({ id: "impressions", name: "Impressions" })
    if (data.engagements) metrics.push({ id: "engagements", name: "Engagements" })
    if (data.conversions) metrics.push({ id: "conversions", name: "Conversions" })
    if (data.ctr) metrics.push({ id: "ctr", name: "Click-Through Rate" })
    if (data.conversionRate) metrics.push({ id: "conversionRate", name: "Conversion Rate" })

    // Check for series data
    if (data.series) {
      data.series.forEach((series) => {
        if (!metrics.find((m) => m.id === series.name)) {
          metrics.push({ id: series.name, name: series.name })
        }
      })
    }

    return metrics
  }, [data])

  // Calculate chart insights
  const chartInsights = useMemo(() => {
    if (!chartData || chartData.length < 2) return null

    try {
      // Calculate trend for primary metric
      const firstValue = chartData[0][activeMetric] || 0
      const lastValue = chartData[chartData.length - 1][activeMetric] || 0
      const change = lastValue - firstValue
      const percentChange = firstValue !== 0 ? (change / firstValue) * 100 : 0

      // Calculate average
      const sum = chartData.reduce((acc, point) => acc + (point[activeMetric] || 0), 0)
      const average = sum / chartData.length

      // Find min and max
      const values = chartData.map((point) => point[activeMetric] || 0)
      const min = Math.min(...values)
      const max = Math.max(...values)

      // Calculate trend direction
      const trendDirection = percentChange > 0 ? "up" : percentChange < 0 ? "down" : "neutral"

      return {
        change,
        percentChange,
        average,
        min,
        max,
        trendDirection,
      }
    } catch (e) {
      return null
    }
  }, [chartData, activeMetric])

  // Render the component
  return (
    <Card className={`overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 m-0 rounded-none" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center space-x-2">
          {allowConfiguration && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfiguration(!showConfiguration)}
              aria-label="Configure chart"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          {allowDownload && (
            <Button variant="ghost" size="sm" onClick={handleDownload} aria-label="Download chart">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {allowFullscreen && (
            <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {showConfiguration && (
        <div className="px-6 pb-2">
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chartType">Chart Type</Label>
                <Select
                  value={chartConfig.type}
                  onValueChange={(value) => setChartConfig((prev) => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger id="chartType">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="scatter">Scatter Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="radar">Radar Chart</SelectItem>
                    <SelectItem value="composed">Composed Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="colorScheme">Color Scheme</Label>
                <Select
                  value={chartConfig.colorScheme}
                  onValueChange={(value) => setChartConfig((prev) => ({ ...prev, colorScheme: value as any }))}
                >
                  <SelectTrigger id="colorScheme">
                    <SelectValue placeholder="Select color scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="categorical">Categorical</SelectItem>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="diverging">Diverging</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryMetric">Primary Metric</Label>
                <Select value={activeMetric} onValueChange={setActiveMetric}>
                  <SelectTrigger id="primaryMetric">
                    <SelectValue placeholder="Select primary metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMetrics.map((metric) => (
                      <SelectItem key={metric.id} value={metric.id}>
                        {metric.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="secondaryMetric">Secondary Metric</Label>
                <Select value={secondaryMetric || ""} onValueChange={(value) => setSecondaryMetric(value || null)}>
                  <SelectTrigger id="secondaryMetric">
                    <SelectValue placeholder="Select secondary metric (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableMetrics
                      .filter((metric) => metric.id !== activeMetric)
                      .map((metric) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          {metric.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showGrid"
                  checked={chartConfig.showGrid}
                  onCheckedChange={(checked) => setChartConfig((prev) => ({ ...prev, showGrid: checked }))}
                />
                <Label htmlFor="showGrid">Show Grid</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showLegend"
                  checked={chartConfig.showLegend}
                  onCheckedChange={(checked) => setChartConfig((prev) => ({ ...prev, showLegend: checked }))}
                />
                <Label htmlFor="showLegend">Show Legend</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="stacked"
                  checked={chartConfig.stacked}
                  onCheckedChange={(checked) => setChartConfig((prev) => ({ ...prev, stacked: checked }))}
                />
                <Label htmlFor="stacked">Stacked</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="animate"
                  checked={chartConfig.animate}
                  onCheckedChange={(checked) => setChartConfig((prev) => ({ ...prev, animate: checked }))}
                />
                <Label htmlFor="animate">Animate</Label>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-6">
        {chartInsights && (
          <div className="mb-4 flex flex-wrap gap-4">
            <Badge variant="outline" className="flex items-center gap-1 text-sm py-1.5">
              <Activity className="h-3.5 w-3.5" />
              Average:{" "}
              {activeMetric.includes("rate")
                ? `${chartInsights.average.toFixed(2)}%`
                : chartInsights.average.toFixed(0)}
            </Badge>

            <Badge
              variant="outline"
              className={`flex items-center gap-1 text-sm py-1.5 ${
                chartInsights.trendDirection === "up"
                  ? "text-green-600"
                  : chartInsights.trendDirection === "down"
                    ? "text-red-600"
                    : ""
              }`}
            >
              {chartInsights.trendDirection === "up" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : chartInsights.trendDirection === "down" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              Change: {chartInsights.percentChange.toFixed(2)}%
            </Badge>

            <Badge variant="outline" className="flex items-center gap-1 text-sm py-1.5">
              <Zap className="h-3.5 w-3.5" />
              Max: {chartInsights.max.toFixed(0)}
            </Badge>
          </div>
        )}

        <div style={{ height: typeof height === "number" ? `${height}px` : height, width }}>{renderChart()}</div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2 pb-4 px-6">
        <div className="text-xs text-muted-foreground">
          {!isLoading && chartData.length > 0 && (
            <>
              <span>Data range: </span>
              <span className="font-medium">
                {formatDate(chartData[0].timestamp)} - {formatDate(chartData[chartData.length - 1].timestamp)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default PerformanceChart
