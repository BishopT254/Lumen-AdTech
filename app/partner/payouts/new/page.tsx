"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { ArrowLeft, Wallet, DollarSign, Loader2 } from "lucide-react"

export default function NewPayoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const earningId = searchParams.get("earningId")
  const { commissionRates, loading: settingsLoading } = usePublicSettings()

  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [amount, setAmount] = useState<number>(0)
  const [maxAmount, setMaxAmount] = useState<number>(0)
  const [minPayoutAmount, setMinPayoutAmount] = useState<number>(50)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load commission rates and minimum payout from settings
  useEffect(() => {
    if (commissionRates) {
      setMinPayoutAmount(commissionRates.minimumPayout || commissionRates.minimum_payout || 50)
    }
  }, [commissionRates])

  // Fetch payment methods and available balance
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch payment methods
        const paymentMethodsResponse = await fetch("/api/partner/wallet/payment-methods")

        if (!paymentMethodsResponse.ok) {
          throw new Error(`Failed to fetch payment methods: ${paymentMethodsResponse.statusText}`)
        }

        const paymentMethodsData = await paymentMethodsResponse.json()
        setPaymentMethods(paymentMethodsData)

        // Set default payment method if available
        if (paymentMethodsData.length > 0) {
          const defaultMethod = paymentMethodsData.find((method: any) => method.isDefault)
          setSelectedPaymentMethod(defaultMethod ? defaultMethod.id : paymentMethodsData[0].id)
        }

        // If earningId is provided, fetch the earning details
        if (earningId) {
          const earningResponse = await fetch(`/api/partner/earnings/${earningId}`)

          if (!earningResponse.ok) {
            throw new Error(`Failed to fetch earning details: ${earningResponse.statusText}`)
          }

          const earningData = await earningResponse.json()

          if (earningData.status === "PENDING") {
            setAmount(earningData.amount)
            setMaxAmount(earningData.amount)
          } else {
            toast.error("This earning is not available for payout")
            router.push("/partner/earnings")
          }
        } else {
          // Fetch available balance
          const summaryResponse = await fetch("/api/partner/earnings/summary")

          if (!summaryResponse.ok) {
            throw new Error(`Failed to fetch summary: ${summaryResponse.statusText}`)
          }

          const summaryData = await summaryResponse.json()
          setMaxAmount(summaryData.pendingPayments || 0)
          setAmount(summaryData.pendingPayments || 0)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load payment methods or available balance")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [earningId, router])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      if (amount < minPayoutAmount) {
        toast.error(`Minimum payout amount is ${formatCurrency(minPayoutAmount)}`)
        return
      }

      if (amount > maxAmount) {
        toast.error(`Maximum payout amount is ${formatCurrency(maxAmount)}`)
        return
      }

      if (!selectedPaymentMethod) {
        toast.error("Please select a payment method")
        return
      }

      // Prepare request payload
      const payload: any = {
        amount,
        paymentMethodId: selectedPaymentMethod,
      }

      // Add earningId if provided
      if (earningId) {
        payload.earningId = earningId
      }

      // Make API call to request payout
      const response = await fetch("/api/partner/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit payout request")
      }

      const result = await response.json()

      toast.success("Payout request submitted successfully")
      router.push(`/partner/payouts/${result.id}`)
    } catch (error) {
      console.error("Error submitting payout request:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit payout request")
    } finally {
      setSubmitting(false)
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

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Request Payout</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Payout Request</CardTitle>
            <CardDescription>
              Request a payout of your available earnings. Minimum payout amount is {formatCurrency(minPayoutAmount)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={minPayoutAmount}
                  max={maxAmount}
                  step="0.01"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">Available: {formatCurrency(maxAmount)}</p>
              {amount < minPayoutAmount && (
                <p className="text-sm text-red-500">Minimum payout amount is {formatCurrency(minPayoutAmount)}</p>
              )}
              {amount > maxAmount && (
                <p className="text-sm text-red-500">Maximum payout amount is {formatCurrency(maxAmount)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              {paymentMethods.length > 0 ? (
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} required>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.type} {method.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No payment methods configured. Please add a payment method to request a payout.
                  </p>
                  <Button
                    variant="link"
                    className="px-0 h-8 mt-1"
                    onClick={() => router.push("/partner/wallet?tab=payment")}
                  >
                    Add Payment Method
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium mb-2">Payout Information</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  • Payouts are processed within {commissionRates?.payoutSchedule?.processingTime || "1-3"} business
                  days.
                </p>
                <p>• Minimum payout amount is {formatCurrency(minPayoutAmount)}.</p>
                <p>• Payout requests cannot be modified after submission, but can be cancelled if still pending.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/partner/earnings?tab=payouts")}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                amount < minPayoutAmount ||
                amount > maxAmount ||
                !selectedPaymentMethod ||
                paymentMethods.length === 0
              }
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
