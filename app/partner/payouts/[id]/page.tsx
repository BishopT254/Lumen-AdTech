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
import { ArrowLeft, FileText, BarChart3, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface PayoutRequest {
  id: string
  amount: number
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  requestDate: string
  processedDate?: string
  paymentMethodId: string
  paymentMethodType: string
  paymentMethodDetails: any
  notes?: string
  reference?: string
  processingTime?: number
  estimatedArrivalDate?: string
  rejectionReason?: string
}

export default function PayoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { commissionRates, loading: settingsLoading } = usePublicSettings()

  const [payout, setPayout] = useState<PayoutRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch payout details
  useEffect(() => {
    const fetchPayoutDetails = async () => {
      try {
        setLoading(true)

        const response = await fetch(`/api/partner/payouts/${params.id}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch payout details: ${response.statusText}`)
        }

        const data = await response.json()
        setPayout(data)
      } catch (error) {
        console.error("Error fetching payout details:", error)
        toast.error("Failed to load payout details")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPayoutDetails()
    }
  }, [params.id])

  // Handle export receipt
  const handleExportReceipt = async () => {
    try {
      setIsExporting(true)

      const response = await fetch(`/api/partner/payouts/${params.id}/receipt`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to export payout receipt")
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `payout-receipt-${params.id}.pdf`
      document.body.appendChild(a)
      a.click()

      // Clean up
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Payout receipt exported successfully")
    } catch (error) {
      console.error("Error exporting payout receipt:", error)
      toast.error("Failed to export payout receipt")
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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>
      case "APPROVED":
        return <Badge variant="outline">Approved</Badge>
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

  if (!payout) {
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
            <CardTitle>Payout Not Found</CardTitle>
            <CardDescription>
              The payout request you are looking for does not exist or you do not have permission to view it.
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
          <h1 className="text-2xl font-bold tracking-tight">Payout Request Details</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {payout.status === "COMPLETED" && (
            <Button
              variant="outline"
              onClick={handleExportReceipt}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Download Receipt
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => router.push("/partner/earnings")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Earnings
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Request #{payout.id.slice(-8)}</CardTitle>
          <CardDescription>Requested on {formatDate(payout.requestDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
              <p className="text-3xl font-bold">{formatCurrency(payout.amount)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <div className="flex items-center gap-2">
                {getStatusBadge(payout.status)}
                {payout.status === "COMPLETED" && payout.processedDate && (
                  <span className="text-sm text-muted-foreground">Completed on {formatDate(payout.processedDate)}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Reference</h3>
              <p className="font-medium">{payout.reference || "Not yet processed"}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            <h3 className="text-lg font-medium">Payment Method</h3>

            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{payout.paymentMethodType}</p>
              {payout.paymentMethodDetails && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {payout.paymentMethodDetails.accountNumber && (
                    <p>Account ending in ****{payout.paymentMethodDetails.accountNumber.slice(-4)}</p>
                  )}
                  {payout.paymentMethodDetails.bankName && <p>Bank: {payout.paymentMethodDetails.bankName}</p>}
                  {payout.paymentMethodDetails.email && <p>Email: {payout.paymentMethodDetails.email}</p>}
                </div>
              )}
            </div>

            <Separator className="my-6" />

            <h3 className="text-lg font-medium">Processing Details</h3>

            <div className="space-y-4">
              {payout.status === "PENDING" && (
                <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Pending Approval</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payout request is being reviewed. This typically takes 1-2 business days.
                    </p>
                    {payout.processingTime && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Estimated processing time: {payout.processingTime} business days
                      </p>
                    )}
                  </div>
                </div>
              )}

              {payout.status === "APPROVED" && (
                <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Approved</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payout request has been approved and is being processed.
                    </p>
                    {payout.estimatedArrivalDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Estimated arrival: {formatDate(payout.estimatedArrivalDate)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {payout.status === "REJECTED" && (
                <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Rejected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {payout.rejectionReason ||
                        "Your payout request was rejected. Please contact support for assistance."}
                    </p>
                  </div>
                </div>
              )}

              {payout.status === "COMPLETED" && (
                <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payout has been processed and the funds have been sent to your account.
                    </p>
                    {payout.processedDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Processed on: {formatDate(payout.processedDate)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {payout.notes && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground mt-1">{payout.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/partner/earnings?tab=payouts")}>
            Back to Payouts
          </Button>
          {payout.status === "PENDING" && (
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/partner/payouts/${payout.id}/cancel`, {
                    method: "POST",
                  })

                  if (!response.ok) {
                    throw new Error("Failed to cancel payout request")
                  }

                  toast.success("Payout request cancelled successfully")
                  router.push("/partner/earnings?tab=payouts")
                } catch (error) {
                  console.error("Error cancelling payout request:", error)
                  toast.error("Failed to cancel payout request")
                }
              }}
            >
              Cancel Request
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
