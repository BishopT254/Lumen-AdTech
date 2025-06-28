"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  Globe,
  Info,
  Target,
  Users,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Campaign form schema based on Prisma model
const campaignFormSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  objective: z.enum([
    "AWARENESS",
    "CONSIDERATION",
    "CONVERSION",
    "TRAFFIC",
    "ENGAGEMENT",
  ]),
  status: z.enum([
    "DRAFT",
    "PENDING_APPROVAL",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ]).default("DRAFT"),
  budget: z.number().min(0),
  dailyBudget: z.number().min(0).optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  pricingModel: z.enum(["CPM", "CPE", "CPA", "HYBRID"]).default("CPM"),
  targetLocations: z.array(
    z.object({
      city: z.string(),
      country: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number(),
    })
  ).optional(),
  targetSchedule: z.object({
    daysOfWeek: z.array(z.number()),
    timeRanges: z.array(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    ),
  }).optional(),
  targetDemographics: z.object({
    ageRanges: z.array(z.string()),
    genders: z.array(z.string()),
    interests: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }).optional(),
  audienceSegmentId: z.string().optional(),
})

export default function NewCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [audienceSegments, setAudienceSegments] = useState([])

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      status: "DRAFT",
      pricingModel: "CPM",
      targetLocations: [],
      targetSchedule: {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        timeRanges: [{ start: "09:00", end: "17:00" }],
      },
      targetDemographics: {
        ageRanges: ["18-24", "25-34", "35-44"],
        genders: ["MALE", "FEMALE"],
        interests: [],
        languages: ["en"],
      },
    },
  })

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof campaignFormSchema>) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/admin/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          advertiserId: params.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create campaign")
      }

      const campaign = await response.json()

      toast({
        title: "Success",
        description: "Campaign has been created successfully",
      })

      router.push(`/admin/advertisers/${params.id}/campaigns/${campaign.id}`)
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create New Campaign</h1>
        <p className="text-muted-foreground">
          Set up a new advertising campaign with targeting and budget options
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="basics" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basics">Basic Info</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="budget">Budget & Schedule</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="basics">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                  <CardDescription>
                    Enter the basic information about your campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter campaign name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Choose a descriptive name for your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter campaign description"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide additional details about your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Objective</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an objective" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AWARENESS">Brand Awareness</SelectItem>
                            <SelectItem value="CONSIDERATION">Consideration</SelectItem>
                            <SelectItem value="CONVERSION">Conversion</SelectItem>
                            <SelectItem value="TRAFFIC">Traffic</SelectItem>
                            <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the main goal of your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Targeting Options */}
            <TabsContent value="targeting">
              <Card>
                <CardHeader>
                  <CardTitle>Targeting Settings</CardTitle>
                  <CardDescription>
                    Define your target audience and locations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="targetDemographics"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Demographics</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Age Ranges</h4>
                              <div className="flex flex-wrap gap-2">
                                {["18-24", "25-34", "35-44", "45-54", "55+"].map((range) => (
                                  <Button
                                    key={range}
                                    type="button"
                                    variant={field.value?.ageRanges?.includes(range) ? "default" : "outline"}
                                    onClick={() => {
                                      const current = field.value?.ageRanges || []
                                      field.onChange({
                                        ...field.value,
                                        ageRanges: current.includes(range)
                                          ? current.filter((r) => r !== range)
                                          : [...current, range],
                                      })
                                    }}
                                  >
                                    {range}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Gender</h4>
                              <div className="flex gap-2">
                                {["MALE", "FEMALE", "OTHER"].map((gender) => (
                                  <Button
                                    key={gender}
                                    type="button"
                                    variant={field.value?.genders?.includes(gender) ? "default" : "outline"}
                                    onClick={() => {
                                      const current = field.value?.genders || []
                                      field.onChange({
                                        ...field.value,
                                        genders: current.includes(gender)
                                          ? current.filter((g) => g !== gender)
                                          : [...current, gender],
                                      })
                                    }}
                                  >
                                    {gender}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="audienceSegmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audience Segment</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an audience segment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {audienceSegments.map((segment: any) => (
                              <SelectItem key={segment.id} value={segment.id}>
                                {segment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose a pre-defined audience segment for targeted advertising
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budget & Schedule */}
            <TabsContent value="budget">
              <Card>
                <CardHeader>
                  <CardTitle>Budget & Schedule</CardTitle>
                  <CardDescription>
                    Set your campaign budget and running schedule
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Budget</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter total budget"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Set the total budget for your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dailyBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Budget (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter daily budget"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Limit your daily spending (leave empty for no limit)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <DatePickerWithRange
                              date={field.value}
                              onSelect={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <DatePickerWithRange
                              date={field.value}
                              onSelect={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Options */}
            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Configure advanced campaign options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="pricingModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pricing Model</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pricing model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CPM">Cost Per Thousand Impressions (CPM)</SelectItem>
                            <SelectItem value="CPE">Cost Per Engagement (CPE)</SelectItem>
                            <SelectItem value="CPA">Cost Per Action (CPA)</SelectItem>
                            <SelectItem value="HYBRID">Hybrid Model</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how you want to be charged for your campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important Note</AlertTitle>
                    <AlertDescription>
                      Your campaign will be reviewed before going live. Make sure all information is accurate.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
} 