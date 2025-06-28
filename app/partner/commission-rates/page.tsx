"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format, addMonths, subMonths } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { usePublicSettings } from "@/hooks/usePublicSettings"

import { ArrowUpRight, CalendarIcon, ChevronUp, ChevronDown, Clock, DollarSign, BarChart3, TrendingUp, CheckCircle2, Info, AlertCircle, XCircle } from 'lucide-react'

// Types based on the Prisma schema
interface CommissionRate {
  id: string
  partnerId: string
  rate: number
  effectiveFrom: Date
  effectiveTo: Date | null
  tier: string
  category: string
  status: "active" | "pending" | "expired"
}

interface CommissionTier {
  name: string
  minRevenue: number
  baseRate: number
  bonusRate: number
  requirements: string[]
  benefits: string[]
  current: boolean
}

interface CommissionHistory {
  date: string
  rate: number
  earnings: number
}

interface CommissionCategory {
  name: string
  baseRate: number
  description: string
  eligibility: string[]
}

interface CommissionEarnings {
  month: string
  earnings: number
  impressions: number
  engagements: number
  rate: number
}

export default function CommissionRatesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { commissionRates, loading: settingsLoading } = usePublicSettings()

  // State management
  const [currentRates, setCurrentRates] = useState<CommissionRate[]>([])
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([])
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistory[]>([])
  const [commissionCategories, setCommissionCategories] = useState<CommissionCategory[]>([])
  const [commissionEarnings, setCommissionEarnings] = useState<CommissionEarnings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("current")
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestDetails, setRequestDetails] = useState({
    category: "",
    justification: "",
    proposedRate: 0
  })
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  })

  // Load commission data
  useEffect(() => {
    const fetchCommissionData = async () => {
      try {
        setIsLoading(true)
        
        // In a real implementation, this would fetch data from your API
        // For now, we'll use the data from the public settings
        
        if (commissionRates) {
          // Transform the data from public settings to match our component's expected format
          const rates: CommissionRate[] = [
            {
              id: "rate_standard",
              partnerId: session?.user?.id || "unknown",
              rate: commissionRates.standardRate || commissionRates.default || 70,
              effectiveFrom: subMonths(new Date(), 3),
              effectiveTo: null,
              tier: "Standard",
              category: "Standard Display",
              status: "active"
            },
            {
              id: "rate_premium",
              partnerId: session?.user?.id || "unknown",
              rate: commissionRates.premiumRate || commissionRates.premium || 80,
              effectiveFrom: subMonths(new Date(), 2),
              effectiveTo: null,
              tier: "Premium",
              category: "Premium Display",
              status: "active"
            },
            {
              id: "rate_enterprise",
              partnerId: session?.user?.id || "unknown",
              rate: commissionRates.enterpriseRate || commissionRates.enterprise || 85,
              effectiveFrom: subMonths(new Date(), 1),
              effectiveTo: null,
              tier: "Enterprise",
              category: "Enterprise Solutions",
              status: "active"
            }
          ]
          
          // Create tiers based on the commission rates
          const tiers: CommissionTier[] = [
            {
              name: "Standard",
              minRevenue: 0,
              baseRate: commissionRates.standardRate || commissionRates.default || 70,
              bonusRate: commissionRates.performanceBonuses?.enabled ? 
                commissionRates.performanceBonuses.engagementBonus || 2 : 0,
              requirements: [
                "Minimum 1 active device",
                "Complete partner profile",
                "Monthly revenue reporting"
              ],
              benefits: [
                `${commissionRates.standardRate || commissionRates.default || 70}% base commission rate`,
                "Basic analytics access",
                "Standard support"
              ],
              current: true
            },
            {
              name: "Premium",
              minRevenue: 5000,
              baseRate: commissionRates.premiumRate || commissionRates.premium || 80,
              bonusRate: commissionRates.performanceBonuses?.enabled ? 
                commissionRates.performanceBonuses.retentionBonus || 3 : 0,
              requirements: [
                "Minimum 3 active devices",
                "Minimum $5,000 quarterly revenue",
                "90% device uptime"
              ],
              benefits: [
                `${commissionRates.premiumRate || commissionRates.premium || 80}% base commission rate`,
                `${commissionRates.performanceBonuses?.retentionBonus || 3}% performance bonus potential`,
                "Advanced analytics access",
                "Priority support"
              ],
              current: false
            },
            {
              name: "Enterprise",
              minRevenue: 15000,
              baseRate: commissionRates.enterpriseRate || commissionRates.enterprise || 85,
              bonusRate: commissionRates.performanceBonuses?.enabled ? 5 : 0,
              requirements: [
                "Minimum 10 active devices",
                "Minimum $15,000 quarterly revenue",
                "95% device uptime",
                "Strategic location placement"
              ],
              benefits: [
                `${commissionRates.enterpriseRate || commissionRates.enterprise || 85}% base commission rate`,
                "5% performance bonus potential",
                "Premium analytics access",
                "Dedicated account manager",
                "Early access to new features"
              ],
              current: false
            }
          ]
          
          // Create categories based on the commission rates
          const categories: CommissionCategory[] = [
            {
              name: "Standard Display",
              baseRate: commissionRates.standardRate || commissionRates.default || 70,
              description: "Basic advertising display with standard content rotation",
              eligibility: [
                "All partner tiers eligible",
                "No special requirements"
              ]
            },
            {
              name: "Premium Display",
              baseRate: commissionRates.premiumRate || commissionRates.premium || 80,
              description: "Interactive content that allows viewer engagement and interaction",
              eligibility: [
                "Premium tier and above",
                "Device must support touch or gesture controls",
                "Minimum 90% uptime required"
              ]
            },
            {
              name: "Enterprise Solutions",
              baseRate: commissionRates.enterpriseRate || commissionRates.enterprise || 85,
              description: "Custom enterprise solutions with advanced targeting and analytics",
              eligibility: [
                "Enterprise tier only",
                "Minimum 10 active devices",
                "Dedicated technical support contact"
              ]
            }
          ]
          
          // Generate historical data based on the current rates
          const history: CommissionHistory[] = []
          const earnings: CommissionEarnings[] = []
          
          for (let i = 0; i < 12; i++) {
            const date = subMonths(new Date(), 11 - i)
            const monthStr = format(date, 'yyyy-MM')
            
            // Simulate rate changes over time
            let rate = commissionRates.standardRate || commissionRates.default || 70
            if (i > 6) rate = commissionRates.premiumRate || commissionRates.premium || 80
            if (i > 9) rate = commissionRates.enterpriseRate || commissionRates.enterprise || 85
            
            // Simulate earnings based on rate
            const baseEarnings = 2000 + (i * 300)
            const earningsValue = baseEarnings * (rate / 100)
            
            history.push({
              date: monthStr,
              rate,
              earnings: earningsValue
            })
            
            // Only add the last 6 months to earnings data
            if (i >= 6) {
              earnings.push({
                month: format(date, 'MMM yyyy'),
                earnings: earningsValue,
                impressions: 10000 + (i * 1000),
                engagements: 1000 + (i * 100),
                rate
              })
            }
          }
          
          setCurrentRates(rates)
          setCommissionTiers(tiers)
          setCommissionHistory(history)
          setCommissionCategories(categories)
          setCommissionEarnings(earnings)
        }
      } catch (error) {
        console.error("Error fetching commission data:", error)
        toast({
          title: "Error",
          description: "Failed to load commission data. Please try again later.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!settingsLoading && commissionRates) {
      fetchCommissionData()
    }
  }, [toast, commissionRates, settingsLoading, session])

  // Format currency
  const formatCurrency = (amount: number) => {
    const currency = commissionRates?.currency || "USD"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // Calculate progress to next tier
  const calculateNextTierProgress = () => {
    const currentTier = commissionTiers.find(tier => tier.current)
    if (!currentTier) return 0
    
    const nextTierIndex = commissionTiers.findIndex(tier => tier.current) + 1
    if (nextTierIndex >= commissionTiers.length) return 100
    
    const nextTier = commissionTiers[nextTierIndex]
    const currentRevenue = commissionEarnings.reduce((sum, month) => sum + month.earnings, 0)
    
    const progress = (currentRevenue / nextTier.minRevenue) * 100
    return Math.min(progress, 100)
  }

  // Handle date range selection
  const handleDateRangeChange = (range: { from: Date, to: Date }) => {
    setDateRange(range)
    // In a real app, this would trigger a data refetch
  }

  // Handle rate increase request submission
  const handleRequestSubmit = () => {
    toast({
      title: "Request Submitted",
      description: "Your commission rate increase request has been submitted for review.",
    })
    setRequestDialogOpen(false)
  }

  // Generate custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-sm">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`tooltip-${index}`} className="text-sm flex items-center gap-2">
              <span 
                className="inline-block w-3 w-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              ></span>
              <span>
                {entry.name}: {entry.name.includes("Rate") ? `${entry.value}%` : formatCurrency(entry.value)}
              </span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Return loading skeleton if data is being fetched
  if (isLoading || settingsLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commission Rates</h1>
          <p className="text-muted-foreground">
            Manage your commission rates and earnings
          </p>
        </div>
        
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <TrendingUp className="mr-2 h-4 w-4" />
              Request Rate Increase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Commission Rate Increase</DialogTitle>
              <DialogDescription>
                Submit a request to increase your commission rate. Our team will review your request and respond within 3-5 business days.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <select 
                  id="category"
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={requestDetails.category}
                  onChange={(e) => setRequestDetails({...requestDetails, category: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {commissionCategories.map((category, index) => (
                    <option key={index} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="proposedRate" className="text-right">
                  Proposed Rate
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="proposedRate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={requestDetails.proposedRate}
                    onChange={(e) => setRequestDetails({...requestDetails, proposedRate: Number.parseFloat(e.target.value)})}
                    className="w-24"
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="justification" className="text-right">
                  Justification
                </Label>
                <textarea
                  id="justification"
                  className="col-span-3 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Explain why you're requesting a rate increase..."
                  value={requestDetails.justification}
                  onChange={(e) => setRequestDetails({...requestDetails, justification: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRequestSubmit}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Commission summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Current Tier
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionTiers.find(tier => tier.current)?.name || "None"}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to {commissionTiers[commissionTiers.findIndex(tier => tier.current) + 1]?.name || "Max"}</span>
                <span>{Math.round(calculateNextTierProgress())}%</span>
              </div>
              <Progress value={calculateNextTierProgress()} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Base Commission Rate
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionTiers.find(tier => tier.current)?.baseRate.toFixed(1)}%
            </div>
            <div className="flex items-center mt-1">
              <span className="text-xs text-green-500 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {((commissionTiers[1]?.baseRate || 0) - (commissionTiers[0]?.baseRate || 0)).toFixed(1)}% to next tier
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Potential Bonus
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{commissionTiers.find(tier => tier.current)?.bonusRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Performance-based bonus rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Last Month Earnings
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(commissionEarnings[commissionEarnings.length - 1]?.earnings || 0)}
            </div>
            <div className="flex items-center mt-1">
              {commissionEarnings[commissionEarnings.length - 1]?.earnings > 
               (commissionEarnings[commissionEarnings.length - 2]?.earnings || 0) ? (
                <span className="text-xs text-green-500 flex items-center">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  {formatCurrency(commissionEarnings[commissionEarnings.length - 1]?.earnings - 
                                 (commissionEarnings[commissionEarnings.length - 2]?.earnings || 0))} from previous month
                </span>
              ) : (
                <span className="text-xs text-red-500 flex items-center">
                  <ChevronDown className="h-3 w-3 mr-1" />
                  {formatCurrency((commissionEarnings[commissionEarnings.length - 2]?.earnings || 0) - 
                                 commissionEarnings[commissionEarnings.length - 1]?.earnings)} from previous month
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different commission views */}
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="current">Current Rates</TabsTrigger>
          <TabsTrigger value="tiers">Commission Tiers</TabsTrigger>
          <TabsTrigger value="history">Rate History</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>
        
        {/* Current Rates Tab */}
        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Commission Rates</CardTitle>
              <CardDescription>
                Your current commission rates by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRates.filter(rate => rate.status === "active").map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{rate.category}</TableCell>
                        <TableCell>{rate.rate.toFixed(1)}%</TableCell>
                        <TableCell>{rate.tier}</TableCell>
                        <TableCell>{format(new Date(rate.effectiveFrom), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Commission Categories</CardTitle>
              <CardDescription>
                Available commission categories and eligibility requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {commissionCategories.map((category, index) => (
                  <Card key={index} className="border shadow-sm">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <Badge variant="secondary">{category.baseRate.toFixed(1)}% Base Rate</Badge>
                      </div>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Eligibility Requirements:</h4>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          {category.eligibility.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Info className="h-4 w-4 mr-1" />
                        {currentRates.some(rate => rate.category === category.name && rate.status === "active") 
                          ? "Currently active" 
                          : "Not currently active"}
                      </div>
                      <Button variant="outline" size="sm">
                        Apply
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Commission Tiers Tab */}
        <TabsContent value="tiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Tier Structure</CardTitle>
              <CardDescription>
                Available tiers and requirements for advancement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {commissionTiers.map((tier, index) => (
                  <div key={index} className="relative">
                    {/* Vertical connector line */}
                    {index < commissionTiers.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Tier indicator */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        tier.current ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* Tier content */}
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{tier.name}</h3>
                          {tier.current && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Current Tier
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Requirements:</h4>
                            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                              <li>Minimum quarterly revenue: {formatCurrency(tier.minRevenue)}</li>
                              {tier.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">Benefits:</h4>
                            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                              {tier.benefits.map((benefit, i) => (
                                <li key={i}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        {tier.current && index < commissionTiers.length - 1 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Progress to {commissionTiers[index + 1].name}:</h4>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Current Revenue: {formatCurrency(commissionEarnings.reduce((sum, month) => sum + month.earnings, 0))}</span>
                              <span>Target: {formatCurrency(commissionTiers[index + 1].minRevenue)}</span>
                            </div>
                            <Progress value={calculateNextTierProgress()} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Rate History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Commission Rate History</CardTitle>
                <CardDescription>
                  Historical commission rates and earnings
                </CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => range && handleDateRangeChange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commissionHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => {
                      const [year, month] = date.split('-')
                      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number.parseInt(month) - 1]} ${year}`
                    }}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="earnings" 
                    name="Earnings" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="rate" 
                    name="Commission Rate" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Rate Change History</CardTitle>
              <CardDescription>
                Historical changes to your commission rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...currentRates].sort((a, b) => 
                      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
                    ).map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{rate.category}</TableCell>
                        <TableCell>{rate.rate.toFixed(1)}%</TableCell>
                        <TableCell>{rate.tier}</TableCell>
                        <TableCell>{format(new Date(rate.effectiveFrom), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{rate.effectiveTo ? format(new Date(rate.effectiveTo), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell>
                          {rate.status === 'active' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : rate.status === 'pending' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              <XCircle className="h-3 w-3 mr-1" /> Expired
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Earnings</CardTitle>
              <CardDescription>
                Your earnings and commission rates over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={commissionEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="earnings" 
                    name="Earnings" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="rate" 
                    name="Commission Rate" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Earnings Breakdown</CardTitle>
              <CardDescription>
                Detailed monthly earnings and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Engagements</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...commissionEarnings].reverse().map((earning, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{earning.month}</TableCell>
                        <TableCell>{formatNumber(earning.impressions)}</TableCell>
                        <TableCell>{formatNumber(earning.engagements)}</TableCell>
                        <TableCell>{earning.rate.toFixed(1)}%</TableCell>
                        <TableCell>{formatCurrency(earning.earnings)}</TableCell>
                        <TableCell>
                          {index === 0 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Key metrics affecting your commission rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Engagement Rate</span>
                      <span className="text-sm font-medium">
                        {(commissionEarnings.reduce((sum, item) => sum + item.engagements, 0) / 
                         commissionEarnings.reduce((sum, item) => sum + item.impressions, 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(commissionEarnings.reduce((sum, item) => sum + item.engagements, 0) / 
                             commissionEarnings.reduce((sum, item) => sum + item.impressions, 0) * 100) * 5} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ratio of engagements to impressions
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Revenue Growth</span>
                      <span className="text-sm font-medium">
                        {commissionEarnings.length > 1 ? 
                          ((commissionEarnings[commissionEarnings.length - 1].earnings / 
                            commissionEarnings[commissionEarnings.length - 2].earnings - 1) * 100).toFixed(1) : 
                          "0.0"}%
                      </span>
                    </div>
                    <Progress 
                      value={commissionEarnings.length > 1 ? 
                        Math.min(((commissionEarnings[commissionEarnings.length - 1].earnings / 
                                  commissionEarnings[commissionEarnings.length - 2].earnings - 1) * 100) * 2, 100) : 
                        0} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Month-over-month earnings growth
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Tier Progress</span>
                      <span className="text-sm font-medium">
                        {Math.round(calculateNextTierProgress())}%
                      </span>
                    </div>
                    <Progress value={calculateNextTierProgress()} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Progress toward next commission tier
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <h3 className="text-sm font-medium mb-2">Performance Bonuses</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Additional commission bonuses based on performance metrics
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Engagement Bonus</span>
                        <Badge variant={commissionRates?.performanceBonuses?.enabled ? "default" : "outline"}>
                          {commissionRates?.performanceBonuses?.enabled ? 
                            `+${commissionRates?.performanceBonuses?.engagementBonus || 2}%` : 
                            "Not Available"}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Retention Bonus</span>
                        <Badge variant={commissionRates?.performanceBonuses?.enabled ? "default" : "outline"}>
                          {commissionRates?.performanceBonuses?.enabled ? 
                            `+${commissionRates?.performanceBonuses?.retentionBonus || 3}%` : 
                            "Not Available"}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Location Quality Bonus</span>
                        <Badge variant={commissionRates?.performanceBonuses?.enabled ? "default" : "outline"}>
                          {commissionRates?.performanceBonuses?.enabled ? 
                            "+2%" : 
                            "Not Available"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <h3 className="text-sm font-medium mb-2">Next Steps to Increase Your Rate</h3>
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
                      <li>Increase your device count to qualify for the next tier</li>
                      <li>Improve engagement rates by optimizing device placement</li>
                      <li>Maintain consistent uptime across all devices</li>
                      <li>Consider premium locations for higher commission rates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
