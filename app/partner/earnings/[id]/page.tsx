"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { ArrowLeft, FileText, Wallet, Loader2 } from "lucide-react"

// Types based on the Prisma schema
type EarningStatus = "PENDING" | "PROCESSED" | "PAID" | "CANCELLED"

interface PartnerEarning {
  id: string
  partnerId: string
  periodStart: string
  periodEnd: string
  totalImpressions: number
  totalEngagements: number
  amount: number
  status: EarningStatus
  paidDate?: string
  transactionId?: string
  createdAt: string
  updatedAt: string
  // Additional details for the detail page
  impressionsByDevice?: Record<string, number>
  engagementsByDevice?: Record<string, number>
  dailyImpressions?: Array<{ date: string; count: number }>
  dailyEngagements?: Array<{ date: string; count: number }>
  adRevenue?: number
  commissionRate?: number
  performanceBonus?: number
}

export default function EarningDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { commissionRates, loading: settingsLoading } = usePublicSettings()

  const [earning, setEarning] = useState<PartnerEarning | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch earning details
  useEffect(() => {
    const fetchEarningDetails = async () => {
      try {
        setLoading(true)

        const response = await fetch(`/api/partner/earnings/${params.id}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch earning details: ${response.statusText}`)
        }

        const data = await response.json()
        setEarning(data)
      } catch (error) {
        console.error("Error fetching earning details:", error)
        toast.error("Failed to load earning details")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchEarningDetails()
    }
  }, [params.id])

  // Handle export
  const handleExport = async (format: string) => {
    try {
      setIsExporting(true)

      const response = await fetch(`/api/partner/earnings/${params.id}/export?format=${format}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to export earning statement")
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `earning-statement-${params.id}.${format}`
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Earning statement exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error("Error exporting earning:", error)
      toast.error("Failed to export earning statement")
    } finally {
      setIsExporting(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    const currency = commissionRates?.currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)
    return format(date, "MMM d, yyyy")
  }

  // Get status badge
  const getStatusBadge = (status: EarningStatus) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">Paid</Badge>
      case "PROCESSED":
        return <Badge variant="outline">Processed</Badge>
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Handle request payout
  const handleRequestPayout = async () => {
    try {
      router.push(`/partner/payouts/new?earningId=${params.id}`)
    } catch (error) {
      console.error("Error navigating to payout request:", error)
      toast.error("Failed to navigate to payout request page")
    }
  }

  if (loading || settingsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!earning) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Earning Not Found</CardTitle>
            <CardDescription>
              The earning you are looking for does not exist or you do not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/partner/earnings")}>Return to Earnings</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Earning Details</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Export as PDF
          </Button>

          {earning.status === "PENDING" && (
            <Button onClick={handleRequestPayout} className="flex items-center gap-2">
              <Wallet className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Earning Period: {formatDate(earning.periodStart)} - {formatDate(earning.periodEnd)}
          </CardTitle>
          <CardDescription>Detailed breakdown of your earnings for this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Amount</h3>
              <p className="text-3xl font-bold">{formatCurrency(earning.amount)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <div className="flex items-center gap-2">
                {getStatusBadge(earning.status)}
                {earning.status === "PAID" && earning.paidDate && (
                  <span className="text-sm text-muted-foreground">Paid on {formatDate(earning.paidDate)}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Transaction Reference</h3>
              <p className="font-medium">{earning.transactionId || "Not yet processed"}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            <h3 className="text-lg font-medium">Performance Metrics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Impressions</span>
                  <span className="font-medium">{earning.totalImpressions.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Engagements</span>
                  <span className="font-medium">{earning.totalEngagements.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Engagement Rate</span>
                  <span className="font-medium">
                    {((earning.totalEngagements / earning.totalImpressions) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Ad Revenue</span>
                  <span className="font-medium">{formatCurrency(earning.adRevenue || 0)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Commission Rate</span>
                  <span className="font-medium">{earning.commissionRate || commissionRates?.standardRate || 70}%</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Performance Bonus</span>
                  <span className="font-medium">{formatCurrency(earning.performanceBonus || 0)}</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <h3 className="text-lg font-medium">Breakdown by Device</h3>

            {earning.impressionsByDevice && Object.keys(earning.impressionsByDevice).length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium">Device</th>
                      <th className="p-3 text-right font-medium">Impressions</th>
                      <th className="p-3 text-right font-medium">Engagements</th>
                      <th className="p-3 text-right font-medium">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(earning.impressionsByDevice).map(([deviceId, impressions]) => {
                      const engagements = earning.engagementsByDevice?.[deviceId] || 0
                      const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0

                      return (
                        <tr key={deviceId} className="border-b">
                          <td className="p-3">{deviceId}</td>
                          <td className="p-3 text-right">{impressions.toLocaleString()}</td>
                          <td className="p-3 text-right">{engagements.toLocaleString()}</td>
                          <td className="p-3 text-right">{engagementRate.toFixed(2)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No device breakdown available for this period.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Back to Earnings
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport("csv")}>
              Export as CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")}>
              Export as Excel
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
