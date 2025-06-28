"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { 
  Loader2, ArrowLeft, RefreshCw, Copy, Check, Info, 
  MapPin, Building, AlertTriangle, Smartphone, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define device types with more descriptive information
const DEVICE_TYPES = {
  ANDROID_TV: {
    label: "Android TV",
    description: "TV devices running Android TV OS"
  },
  DIGITAL_SIGNAGE: {
    label: "Digital Signage",
    description: "Non-interactive displays for signage"
  },
  INTERACTIVE_KIOSK: {
    label: "Interactive Kiosk",
    description: "Touch-enabled interactive displays"
  },
  VEHICLE_MOUNTED: {
    label: "Vehicle Mounted",
    description: "Displays mounted in vehicles"
  },
  RETAIL_DISPLAY: {
    label: "Retail Display",
    description: "Displays for retail environments"
  }
}

// Define the form schema for device registration
const deviceSchema = z.object({
  name: z.string().min(3, { message: "Device name must be at least 3 characters" }),
  deviceType: z.enum(["ANDROID_TV", "DIGITAL_SIGNAGE", "INTERACTIVE_KIOSK", "VEHICLE_MOUNTED", "RETAIL_DISPLAY"]),
  location: z.object({
    area: z.string().min(3, { message: "Area name must be at least 3 characters" }),
    address: z.string().min(5, { message: "Address must be at least 5 characters" }),
    coordinates: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .optional(),
  }),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  autoActivate: z.boolean().default(true)
})

type DeviceFormValues = z.infer<typeof deviceSchema>

// Registration code generation and validation
const REGISTRATION_CODE_LENGTH = 8
const REGISTRATION_CODE_EXPIRY = 15 * 60 * 1000 // 15 minutes in milliseconds

export default function RegisterDevicePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationStep, setRegistrationStep] = useState<"form" | "code" | "success">("form")
  const [registrationCode, setRegistrationCode] = useState<string>("")
  const [registrationExpiry, setRegistrationExpiry] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [isCodeCopied, setIsCodeCopied] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [deviceId, setDeviceId] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [customTag, setCustomTag] = useState<string>("")
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [registrationProgress, setRegistrationProgress] = useState<number | null>(null)
  const [devicePollingCount, setDevicePollingCount] = useState(0)
  const [showRegCodeHelpDetails, setShowRegCodeHelpDetails] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/partner/devices/register")
    }
  }, [sessionStatus, router])

  // Initialize form with default values
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      deviceType: "ANDROID_TV",
      location: {
        area: "",
        address: "",
        coordinates: {
          latitude: undefined,
          longitude: undefined,
        },
      },
      tags: [],
      notes: "",
      autoActivate: true
    },
  })

  // Handle form submission
  const onSubmit = async (data: DeviceFormValues) => {
    try {
      setIsSubmitting(true)

      // Create the device in the database
      const response = await fetch("/api/partner/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create device")
      }

      const result = await response.json()
      setDeviceId(result.id)

      // Generate registration code
      await generateRegistrationCode(result.id)

      // Move to the code display step
      setRegistrationStep("code")

      toast({
        title: "Device created successfully",
        description: "Now you can register this device using the generated code",
      })
    } catch (error) {
      console.error("Error creating device:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create device",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate a unique registration code for the device
  const generateRegistrationCode = async (deviceId: string) => {
    try {
      setIsGeneratingCode(true)

      const response = await fetch(`/api/partner/devices/${deviceId}/registration-code`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to generate registration code")
      }

      const result = await response.json()
      setRegistrationCode(result.code)

      // Set expiry time
      const expiryTime = new Date(Date.now() + REGISTRATION_CODE_EXPIRY)
      setRegistrationExpiry(expiryTime)

      // Generate QR code URL
      setQrCodeUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          JSON.stringify({
            code: result.code,
            deviceId: deviceId,
            timestamp: Date.now(),
          }),
        )}`,
      )
    } catch (error) {
      console.error("Error generating registration code:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate registration code",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingCode(false)
    }
  }

  // Regenerate the registration code
  const handleRegenerateCode = async () => {
    if (deviceId) {
      await generateRegistrationCode(deviceId)
      toast({
        title: "Registration code regenerated",
        description: "A new registration code has been generated",
      })
    }
  }

  // Copy registration code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(registrationCode)
    setIsCodeCopied(true)
    setTimeout(() => setIsCodeCopied(false), 2000)
    toast({
      title: "Code copied",
      description: "Registration code copied to clipboard",
    })
  }

  // Complete the registration process
  const handleCompleteRegistration = async () => {
    const isRegistered = await checkDeviceRegistration()
    if (isRegistered) {
      setRegistrationProgress(100)
      setRegistrationStep("success")
    } else {
      toast({
        title: "Device not ready",
        description: "Please complete the registration process on your device first.",
        variant: "destructive",
      })
    }
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocationLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("location.coordinates.latitude", position.coords.latitude)
          form.setValue("location.coordinates.longitude", position.coords.longitude)

          // Try to get address from coordinates using reverse geocoding
          fetchAddressFromCoordinates(position.coords.latitude, position.coords.longitude);

          toast({
            title: "Location detected",
            description: `Latitude: ${position.coords.latitude.toFixed(6)}, Longitude: ${position.coords.longitude.toFixed(6)}`,
          })
          setIsLocationLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          toast({
            title: "Location error",
            description: getGeolocationErrorMessage(error),
            variant: "destructive",
          })
          setIsLocationLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation",
        variant: "destructive",
      })
    }
  }

  // Get appropriate error message for geolocation errors
  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location permission denied. Please enable location services in your browser settings."
      case error.POSITION_UNAVAILABLE:
        return "Location information is unavailable. Please try again later."
      case error.TIMEOUT:
        return "Location request timed out. Please try again."
      default:
        return "Unable to get your current location"
    }
  }

  // Fetch address from coordinates using reverse geocoding
  const fetchAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      // Use Nominatim OpenStreetMap API for reverse geocoding (free and no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      
      if (!response.ok) throw new Error("Failed to fetch address")
      
      const data = await response.json()
      
      if (data && data.display_name) {
        // Format the address as needed
        const formattedAddress = data.display_name
        form.setValue("location.address", formattedAddress)
        
        // Try to set a reasonable area name
        if (data.address) {
          const area = data.address.suburb || data.address.neighbourhood || data.address.building || 
                       data.address.amenity || data.address.road || "Unknown Area"
          form.setValue("location.area", area)
        }
      }
    } catch (error) {
      console.error("Error fetching address:", error)
      // Don't show error toast as this is a secondary feature
    }
  }

  // Add custom tag
  const addCustomTag = () => {
    if (customTag.trim() && !form.getValues().tags?.includes(customTag.trim())) {
      const currentTags = form.getValues().tags || []
      form.setValue("tags", [...currentTags, customTag.trim()])
      setCustomTag("")
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues().tags || []
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove))
  }

  // Update time remaining for code expiry
  useEffect(() => {
    if (!registrationExpiry) return

    const updateTimeRemaining = () => {
      const now = new Date()
      const timeDiff = registrationExpiry.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeRemaining("Expired")
        return
      }

      const minutes = Math.floor(timeDiff / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [registrationExpiry])

  // Check if device is registered
  const checkDeviceRegistration = useCallback(async () => {
    if (!deviceId) return

    try {
      const response = await fetch(`/api/partner/devices/${deviceId}`)

      if (!response.ok) {
        throw new Error("Failed to check device status")
      }

      const device = await response.json()

      if (device.status === "PENDING_REGISTRATION") {
        // Update progress based on polling count
        setDevicePollingCount(prev => prev + 1)
        const progress = Math.min(90, devicePollingCount * 5) // Cap at 90% until confirmed
        setRegistrationProgress(progress)
        return false
      }
      return device.status === "ACTIVE"
    } catch (error) {
      console.error("Error checking device status:", error)
      return false
    }
  }, [deviceId, devicePollingCount])

  // Poll for device registration status
  useEffect(() => {
    if (registrationStep !== "code" || !deviceId) return

    // Initial progress
    setRegistrationProgress(10)
    
    const interval = setInterval(async () => {
      const isRegistered = await checkDeviceRegistration()
      if (isRegistered) {
        setRegistrationProgress(100)
        clearInterval(interval)
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [registrationStep, deviceId, checkDeviceRegistration])

  // Handle going back to the devices list
  const handleBackToDevices = () => {
    router.push("/partner/devices")
  }

  // Handle going back to the form
  const handleBackToForm = () => {
    setRegistrationStep("form")
    setRegistrationProgress(null)
    setDevicePollingCount(0)
  }

  // Format QR code data securely
  const getFormattedQrData = (code: string, id: string) => {
    return JSON.stringify({
      code,
      deviceId: id,
      timestamp: Date.now(),
      version: "1.0"
    })
  }

  // If session is loading, show loading state
  if (sessionStatus === "loading") {
    return (
      <div className="container max-w-4xl mx-auto py-20 flex justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-lg">Loading device registration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={handleBackToDevices} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Devices
        </Button>
        <h1 className="text-2xl font-bold">Register New Device</h1>
      </div>

      {registrationStep === "form" && (
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
            <CardDescription>Enter the details of the device you want to register on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Lobby Display" {...field} />
                        </FormControl>
                        <FormDescription>A descriptive name to identify this device</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(DEVICE_TYPES).map(([value, { label, description }]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center">
                                  <span>{label}</span>
                                  <span className="text-xs text-muted-foreground ml-2">- {description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>The type of device being registered</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-lg font-medium">Location Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location.area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Main Lobby" {...field} />
                          </FormControl>
                          <FormDescription>The specific area where the device is located</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, Nairobi" {...field} />
                          </FormControl>
                          <FormDescription>The physical address of the device</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      GPS Coordinates (optional)
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={getCurrentLocation}
                      disabled={isLocationLoading}
                    >
                      {isLocationLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Get Current Location
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location.coordinates.latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="0.000000"
                              {...field}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location.coordinates.longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="0.000000"
                              {...field}
                              onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Smartphone className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-lg font-medium">Device Tags & Settings</h3>
                  </div>

                  <div>
                    <FormLabel>Tags (Optional)</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2 mb-3">
                      {form.getValues().tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button 
                            type="button" 
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-xs rounded-full hover:bg-muted w-4 h-4 inline-flex items-center justify-center"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add a tag..." 
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomTag();
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" onClick={addCustomTag}>Add</Button>
                    </div>
                    <FormDescription className="mt-2">
                      Tags help you organize and filter your devices
                    </FormDescription>
                  </div>

                  <FormField
                    control={form.control}
                    name="autoActivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-activate device upon registration</FormLabel>
                          <FormDescription>
                            When enabled, devices will be automatically set to active status once registered
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information about this device..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Add any special instructions or details about this device</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Register Device
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {registrationStep === "code" && (
        <Card>
          <CardHeader>
            <CardTitle>Device Registration Code</CardTitle>
            <CardDescription>Use this code to register your device in the TV app</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">Registration Code</TabsTrigger>
                <TabsTrigger value="qr">QR Code</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="space-y-6">
                <div className="mt-6 space-y-6">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-4xl font-mono tracking-wider bg-muted p-6 rounded-lg w-full text-center">
                      {registrationCode.match(/.{1,4}/g)?.join("-") || "Generating..."}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground flex items-center">
                      {registrationExpiry ? (
                        <>
                          <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                          Code expires in: <span className="font-medium ml-1">{timeRemaining}</span>
                        </>
                      ) : (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating code...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Registration progress indicator */}
                    {registrationProgress !== null && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Registration progress</span>
                          <span>{registrationProgress}%</span>
                        </div>
                        <Progress value={registrationProgress} className="h-2" />
                      </div>
                    )}
                  </div>

                  <Collapsible 
                    open={showRegCodeHelpDetails} 
                    onOpenChange={setShowRegCodeHelpDetails}
                    className="border rounded-lg"
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        <h4 className="text-sm font-medium">How to use this code</h4>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                          <ChevronDown className={`h-4 w-4 transition-transform ${showRegCodeHelpDetails ? "transform rotate-180" : ""}`} />
                          <span className="sr-only">Toggle help details</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="px-4 pb-3">
                      <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                        <li>Open the Lumen TV app on your Android TV device</li>
                        <li>Navigate to the "Register Device" section</li>
                        <li>Enter this registration code when prompted</li>
                        <li>The device will automatically connect to your partner account</li>
                      </ol>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={handleCopyCode} className="flex-1">
                            {isCodeCopied ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Code
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy registration code to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={handleRegenerateCode}
                            disabled={isGeneratingCode}
                            className="flex-1"
                          >
                            {isGeneratingCode ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Regenerate Code
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate a new registration code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </TabsContent>
			  <TabsContent value="qr" className="space-y-6">
                <div className="mt-6 space-y-6">
                  <div className="flex flex-col items-center justify-center">
                    {qrCodeUrl ? (
                      <div className="bg-white p-4 rounded-lg">
                        <img src={qrCodeUrl} alt="Registration QR Code" className="w-64 h-64" />
                      </div>
                    ) : (
                      <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground text-center">
                      Scan this QR code using the Lumen TV app to register your device
                    </p>
                  </div>

                  <Alert variant="info" className="bg-muted/50">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Using the QR code</AlertTitle>
                    <AlertDescription>
                      Open the Lumen TV app on your device and navigate to the QR code scanner in the registration section.
                      Point your camera at this QR code to automatically register the device.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {registrationProgress !== null && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Registration progress</span>
                          <span>{registrationProgress}%</span>
                        </div>
                        <Progress value={registrationProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between gap-3">
            <Button variant="outline" onClick={handleBackToForm}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Form
            </Button>
            <Button onClick={handleCompleteRegistration}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {registrationStep === "success" && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-green-100 p-3 w-fit">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="mt-4">Device Registered Successfully</CardTitle>
            <CardDescription>
              Your device has been registered and is ready to use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Make sure to complete the setup process on your device by logging into the Lumen TV app.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Device Name</p>
                  <p className="text-lg font-medium">{form.getValues().name}</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Device Type</p>
                  <p className="text-lg font-medium">
                    {DEVICE_TYPES[form.getValues().deviceType as keyof typeof DEVICE_TYPES]?.label || form.getValues().deviceType}
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-lg font-medium">{form.getValues().location.area}</p>
                <p className="text-sm text-muted-foreground">{form.getValues().location.address}</p>
                {form.getValues().location.coordinates?.latitude && form.getValues().location.coordinates?.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    GPS: {form.getValues().location.coordinates.latitude.toFixed(6)}, {form.getValues().location.coordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {form.getValues().tags && form.getValues().tags.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {form.getValues().tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/partner/devices")}>
              Back to Device List
            </Button>
            <Button onClick={() => router.push("/partner/devices/register")}>
              Register Another Device
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}