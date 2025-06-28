"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import type { Device, DeviceStatus, HealthStatus } from "@prisma/client"
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Info,
  Tv,
  Trash2,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DeviceWithPartner extends Device {
  partner: {
    companyName: string
  }
}

export default function DeviceDetailsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [device, setDevice] = useState<DeviceWithPartner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [registrationCode, setRegistrationCode] = useState<string | null>(null)
  const [registrationExpiry, setRegistrationExpiry] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch device details
  useEffect(() => {
    const fetchDevice = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/partner/devices/${params.id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch device details")
        }

        const data = await response.json()
        setDevice(data)
      } catch (error) {
        console.error("Error fetching device:", error)
        toast({
          title: "Error",
          description: "Failed to load device details",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchDevice()
    }
  }, [params.id, toast])

  // Generate a new registration code
  const handleRegenerateCode = async () => {
    try {
      setIsRegenerating(true)

      const response = await fetch(`/api/partner/devices/${params.id}/registration-code`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to generate registration code")
      }

      const result = await response.json()
      setRegistrationCode(result.code)
      setRegistrationExpiry(new Date(result.expiresAt))

      toast({
        title: "Code Generated",
        description: "A new registration code has been generated",
      })
    } catch (error) {
      console.error("Error generating code:", error)
      toast({
        title: "Error",
        description: "Failed to generate registration code",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
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

  // Handle device refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)

      const response = await fetch(`/api/partner/devices/${params.id}/refresh`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to refresh device status")
      }

      const updatedDevice = await response.json()
      setDevice(updatedDevice)

      toast({
        title: "Device Refreshed",
        description: "Device status has been updated",
      })
    } catch (error) {
      console.error("Error refreshing device:", error)
      toast({
        title: "Error",
        description: "Failed to refresh device status",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle device deletion
  const handleDeleteDevice = async () => {
    try {
      const response = await fetch(`/api/partner/devices/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete device")
      }

      toast({
        title: "Device Deleted",
        description: "The device has been successfully deleted",
      })

      router.push("/partner/devices")
    } catch (error) {
      console.error("Error deleting device:", error)
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive",
      })
    } finally {
      setShowDeleteDialog(false)
    }
  }

  // Get status badge color
  const getStatusBadgeColor = (status: DeviceStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "INACTIVE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "PENDING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "SUSPENDED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  // Get health status badge color
  const getHealthStatusBadgeColor = (status: HealthStatus) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "OFFLINE":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "UNKNOWN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading device details...</div>
  }

  if (!device) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Device not found or you don't have permission to view it.</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/partner/devices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </Button>
        </div>
      </div>
    )
  }

  // Parse location data
  const location = typeof device.location === "string" ? JSON.parse(device.location) : device.location

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/partner/devices")} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Devices
        </Button>
        <h1 className="text-2xl font-bold">{device.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/partner/devices/${params.id}/edit`)}>
            <Settings className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {device.status === "ACTIVE" ? (
                <Power className="h-5 w-5 text-green-500 mr-2" />
              ) : device.status === "INACTIVE" || device.status === "SUSPENDED" ? (
                <PowerOff className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
              )}
              <Badge variant="outline" className={`${getStatusBadgeColor(device.status)}`}>
                {device.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {device.healthStatus === "HEALTHY" ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : device.healthStatus === "WARNING" ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              ) : device.healthStatus === "CRITICAL" ? (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <Info className="h-5 w-5 text-gray-500 mr-2" />
              )}
              <Badge variant="outline" className={`${getHealthStatusBadgeColor(device.healthStatus)}`}>
                {device.healthStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <span>{device.lastActive ? new Date(device.lastActive).toLocaleString() : "Never"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Device Details</TabsTrigger>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
              <CardDescription>Basic information about this device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Device ID</h3>
                  <p className="font-mono">{device.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Device Identifier</h3>
                  <p className="font-mono">{device.deviceIdentifier}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Device Type</h3>
                  <div className="flex items-center">
                    <Tv className="h-4 w-4 mr-2" />
                    <span>{device.deviceType.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p>{new Date(device.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Location</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground">Area:</span> {location.area}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span> {location.address}
                  </div>
                  {location.coordinates && (location.coordinates.latitude || location.coordinates.longitude) && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>
                        {location.coordinates.latitude}, {location.coordinates.longitude}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {device.routeDetails && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</h3>
                    <p className="text-sm">
                      {JSON.parse(device.routeDetails as string).notes || "No additional notes"}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete the device and remove all associated
                    data.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteDevice}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="registration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Registration</CardTitle>
              <CardDescription>Manage device registration and pairing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {device.status === "PENDING" ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Device Not Registered</AlertTitle>
                  <AlertDescription>
                    This device has not been registered yet. Generate a registration code to pair it with the TV app.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Device Registered</AlertTitle>
                  <AlertDescription>
                    This device has been successfully registered and is connected to your account.
                  </AlertDescription>
                </Alert>
              )}

              {registrationCode && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-medium">Registration Code</h3>
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-3xl font-mono tracking-wider bg-muted p-4 rounded-lg w-full text-center">
                      {registrationCode.match(/.{1,4}/g)?.join("-")}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {registrationExpiry && (
                        <span>
                          Code expires in: <span className="font-medium">{timeRemaining}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>How to use this code</AlertTitle>
                    <AlertDescription>
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>Open the Lumen TV app on your Android TV device</li>
                        <li>Navigate to the "Register Device" section</li>
                        <li>Enter this registration code when prompted</li>
                        <li>The device will automatically connect to your partner account</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <Button onClick={handleRegenerateCode} disabled={isRegenerating}>
                  {isRegenerating ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : registrationCode ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Code
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Registration Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Analytics</CardTitle>
              <CardDescription>Performance metrics and usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Analytics data will appear here once the device is active
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
