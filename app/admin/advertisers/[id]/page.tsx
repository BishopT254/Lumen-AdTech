import { Suspense } from "react"
import { headers } from "next/headers"
import AdvertiserDetailsClient from "./advertiser-details-client"
import { Building2, Mail, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface PageProps {
  params: { id: string }
}

// Define types based on the Prisma schema
interface Payment {
  id: string
  advertiserId: string
  amount: number
  paymentMethod: PaymentMethodType
  paymentMethodId?: string
  transactionId?: string
  status: PaymentStatus
  dateInitiated: string
  dateCompleted?: string
  receiptUrl?: string
  notes?: string
}

enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

enum PaymentMethodType {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
  AMEX = "AMEX",
  MPESA = "MPESA",
  FLUTTERWAVE = "FLUTTERWAVE",
  PAYPAL = "PAYPAL",
  BANK_TRANSFER = "BANK_TRANSFER",
  OTHER = "OTHER",
}

interface CampaignMetrics {
  impressions: number
  engagements: number
  clicks: number
  conversions: number
  ctr: number
  conversionRate: number
  averageDwellTime?: number
  audienceMetrics?: any
  emotionMetrics?: any
  costData: any
}

enum CampaignStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

enum CampaignObjective {
  AWARENESS = "AWARENESS",
  CONSIDERATION = "CONSIDERATION",
  CONVERSION = "CONVERSION",
  TRAFFIC = "TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT",
}

enum PricingModel {
  CPM = "CPM",
  CPE = "CPE",
  CPA = "CPA",
  HYBRID = "HYBRID",
}

interface Campaign {
  id: string
  advertiserId: string
  name: string
  description?: string
  status: CampaignStatus
  objective: CampaignObjective
  pricingModel: PricingModel
  budget: number
  dailyBudget?: number
  startDate: string
  endDate?: string
  targetLocations?: any
  targetSchedule?: any
  targetDemographics?: any
  createdAt: string
  updatedAt: string
  metrics?: CampaignMetrics
  _count?: {
    impressions: number
    engagements: number
    adCreatives: number
    adDeliveries: number
  }
}

interface PaymentMethod {
  id: string
  advertiserId: string
  type: PaymentMethodType
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface Advertiser {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string
  city?: string
  country?: string
  status?: string
  email: string
  campaigns: Campaign[]
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  totalSpend: number
  createdAt: string
  updatedAt: string
}

export default async function AdvertiserDetailsPage({ params }: PageProps) {
  // Fetch advertiser data server-side
  const getAdvertiser = async () => {
    try {
      const headersList = headers()
      const cookies = headersList.get("cookie")
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000"

      const response = await fetch(`${baseUrl}/api/admin/advertisers/${params.id}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Cookie: cookies || "", // Forward the cookies for authentication
        },
        credentials: "include", // Include credentials in the request
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Authentication failed when fetching advertiser")
        }
        return null
      }

      return response.json()
    } catch (error) {
      console.error("Error fetching advertiser:", error)
      return null
    }
  }

  const advertiserPromise = getAdvertiser()

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<AdvertiserDetailsSkeleton />}>
        <AdvertiserDetailsContent advertiserPromise={advertiserPromise} advertiserId={params.id} />
      </Suspense>
    </div>
  )
}

// Skeleton loader for better UX during loading
function AdvertiserDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-[120px] mb-4" />
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-4 w-[150px] mt-2" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div>
        <Skeleton className="h-10 w-[300px] mb-6" />
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    </div>
  )
}

// Content component that awaits the advertiser data
async function AdvertiserDetailsContent({
  advertiserPromise,
  advertiserId,
}: { advertiserPromise: Promise<Advertiser | null>; advertiserId: string }) {
  const advertiser = await advertiserPromise

  if (!advertiser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 border rounded-lg p-8 bg-muted/10">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Advertiser not found</h2>
        <p className="text-gray-500 text-center max-w-md">
          The advertiser you're looking for doesn't exist or you may not have permission to view it. Please check the ID
          and your access rights.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <div className="flex items-center">
          <Building2 className="h-4 w-4 mr-1" />
          {advertiser.companyName}
        </div>
        <div className="flex items-center">
          <Mail className="h-4 w-4 mr-1" />
          {advertiser.email}
        </div>
      </div>
      <AdvertiserDetailsClient advertiser={advertiser} advertiserId={advertiserId} />
    </>
  )
}
