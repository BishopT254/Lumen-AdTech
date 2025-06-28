"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Edit, Loader2, MapPin, MoreHorizontal, Plus, RefreshCw, Search, Trash, Info } from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// Define location types based on the Prisma schema
type Location = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  type: "FIXED" | "MOBILE"
  status: "ACTIVE" | "INACTIVE" | "PENDING"
  description?: string
  createdAt: string
  updatedAt: string
  deviceCount: number
}

// Define route type for mobile locations
type Route = {
  id: string
  name: string
  startPoint: string
  endPoint: string
  waypoints: {
    latitude: number
    longitude: number
    name: string
  }[]
  schedule: {
    days: string[]
    startTime: string
    endTime: string
  }
  status: "ACTIVE" | "INACTIVE"
  locationId: string
}

export default function LocationsPage() {
  const router = useRouter()
  const { generalSettings, loading } = usePublicSettings()

  // State for locations data
  const [locations, setLocations] = useState<Location[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [isAddLocationDialogOpen, setIsAddLocationDialogOpen] = useState(false)
  const [isAddRouteDialogOpen, setIsAddRouteDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for adding/editing location
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    type: "FIXED",
    description: "",
  })

  // Form state for adding/editing route
  const [routeForm, setRouteForm] = useState({
    name: "",
    startPoint: "",
    endPoint: "",
    days: [] as string[],
    startTime: "",
    endTime: "",
  })

  // Fetch locations data
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoading(true)

        // In a real app, you would fetch from your API
        // const response = await fetch('/api/partner/locations')
        // const data = await response.json()

        // Mock data for demonstration
        const mockLocations: Location[] = [
          {
            id: "loc_1",
            name: "Main Office",
            address: "123 Innovation Way, Nairobi",
            latitude: -1.286389,
            longitude: 36.817223,
            type: "FIXED",
            status: "ACTIVE",
            description: "Our main office location with 3 display screens",
            createdAt: "2023-01-15T08:30:00Z",
            updatedAt: "2023-06-10T14:20:00Z",
            deviceCount: 3,
          },
          {
            id: "loc_2",
            name: "Downtown Mall",
            address: "45 Central Avenue, Nairobi",
            latitude: -1.292066,
            longitude: 36.821945,
            type: "FIXED",
            status: "ACTIVE",
            description: "High-traffic shopping mall with premium placement",
            createdAt: "2023-02-20T10:15:00Z",
            updatedAt: "2023-05-15T11:30:00Z",
            deviceCount: 5,
          },
          {
            id: "loc_3",
            name: "Tech Hub",
            address: "78 Innovation Drive, Nairobi",
            latitude: -1.300271,
            longitude: 36.776814,
            type: "FIXED",
            status: "INACTIVE",
            description: "Co-working space with tech audience",
            createdAt: "2023-03-05T09:45:00Z",
            updatedAt: "2023-06-01T16:20:00Z",
            deviceCount: 2,
          },
          {
            id: "loc_4",
            name: "City Bus Route 1",
            address: "Mobile - Nairobi CBD",
            latitude: -1.28472,
            longitude: 36.824055,
            type: "MOBILE",
            status: "ACTIVE",
            description: "High-capacity city bus route through CBD",
            createdAt: "2023-04-10T11:20:00Z",
            updatedAt: "2023-06-15T13:10:00Z",
            deviceCount: 8,
          },
          {
            id: "loc_5",
            name: "Matatu Route 105",
            address: "Mobile - Westlands to CBD",
            latitude: -1.26958,
            longitude: 36.810657,
            type: "MOBILE",
            status: "ACTIVE",
            description: "Popular matatu route with high ridership",
            createdAt: "2023-05-05T14:30:00Z",
            updatedAt: "2023-06-20T09:45:00Z",
            deviceCount: 12,
          },
        ]

        const mockRoutes: Route[] = [
          {
            id: "route_1",
            name: "CBD to Westlands",
            startPoint: "Nairobi CBD",
            endPoint: "Westlands",
            waypoints: [
              { latitude: -1.28472, longitude: 36.824055, name: "CBD Terminal" },
              { latitude: -1.276389, longitude: 36.814722, name: "University Way" },
              { latitude: -1.26958, longitude: 36.810657, name: "Westlands Terminal" },
            ],
            schedule: {
              days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              startTime: "06:00",
              endTime: "21:00",
            },
            status: "ACTIVE",
            locationId: "loc_4",
          },
          {
            id: "route_2",
            name: "Eastlands Loop",
            startPoint: "Eastleigh",
            endPoint: "Eastleigh",
            waypoints: [
              { latitude: -1.278333, longitude: 36.850556, name: "Eastleigh Terminal" },
              { latitude: -1.291944, longitude: 36.865278, name: "Buruburu Junction" },
              { latitude: -1.293056, longitude: 36.873611, name: "Donholm Roundabout" },
              { latitude: -1.278333, longitude: 36.850556, name: "Eastleigh Terminal" },
            ],
            schedule: {
              days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              startTime: "05:30",
              endTime: "22:00",
            },
            status: "ACTIVE",
            locationId: "loc_5",
          },
        ]

        setLocations(mockLocations)
        setRoutes(mockRoutes)
      } catch (error) {
        console.error("Error fetching locations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocations()
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // In a real app, you would refetch data here
    // For demo, we'll just simulate a delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Filter locations based on search query
  const filteredLocations = locations.filter((location) => {
    return (
      searchQuery === "" ||
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Handle location form input changes
  const handleLocationFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setLocationForm((prev) => ({ ...prev, [name]: value }))
  }

  // Handle route form input changes
  const handleRouteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setRouteForm((prev) => ({ ...prev, [name]: value }))
  }

  // Handle day selection for route schedule
  const handleDaySelection = (day: string) => {
    setRouteForm((prev) => {
      const days = [...prev.days]
      if (days.includes(day)) {
        return { ...prev, days: days.filter((d) => d !== day) }
      } else {
        return { ...prev, days: [...days, day] }
      }
    })
  }

  // Open edit location dialog
  const openEditLocationDialog = (location: Location) => {
    setSelectedLocation(location)
    setLocationForm({
      name: location.name,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      type: location.type,
      description: location.description || "",
    })
    setIsAddLocationDialogOpen(true)
  }

  // Open edit route dialog
  const openEditRouteDialog = (route: Route) => {
    setSelectedRoute(route)
    setRouteForm({
      name: route.name,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      days: route.schedule.days,
      startTime: route.schedule.startTime,
      endTime: route.schedule.endTime,
    })
    setIsAddRouteDialogOpen(true)
  }

  // Reset location form
  const resetLocationForm = () => {
    setLocationForm({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      type: "FIXED",
      description: "",
    })
    setSelectedLocation(null)
  }

  // Reset route form
  const resetRouteForm = () => {
    setRouteForm({
      name: "",
      startPoint: "",
      endPoint: "",
      days: [],
      startTime: "",
      endTime: "",
    })
    setSelectedRoute(null)
  }

  // Handle add/edit location submit
  const handleLocationSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validate required fields
      if (!locationForm.name || !locationForm.address || !locationForm.latitude || !locationForm.longitude) {
        toast.error("Please fill in all required fields")
        return
      }

      // Validate latitude and longitude
      const lat = Number.parseFloat(locationForm.latitude)
      const lng = Number.parseFloat(locationForm.longitude)
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error("Please enter valid latitude and longitude values")
        return
      }

      // In a real app, you would make an API call here
      // const response = await fetch('/api/partner/locations', {
      //   method: selectedLocation ? 'PUT' : 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id: selectedLocation?.id,
      //     ...locationForm,
      //     latitude: parseFloat(locationForm.latitude),
      //     longitude: parseFloat(locationForm.longitude),
      //   }),
      // })

      // For demo, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (selectedLocation) {
        // Update existing location
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === selectedLocation.id
              ? {
                  ...loc,
                  name: locationForm.name,
                  address: locationForm.address,
                  latitude: Number.parseFloat(locationForm.latitude),
                  longitude: Number.parseFloat(locationForm.longitude),
                  type: locationForm.type as "FIXED" | "MOBILE",
                  description: locationForm.description,
                  updatedAt: new Date().toISOString(),
                }
              : loc,
          ),
        )
        toast.success("Location updated successfully")
      } else {
        // Add new location
        const newLocation: Location = {
          id: `loc_${Math.random().toString(36).substring(2, 9)}`,
          name: locationForm.name,
          address: locationForm.address,
          latitude: Number.parseFloat(locationForm.latitude),
          longitude: Number.parseFloat(locationForm.longitude),
          type: locationForm.type as "FIXED" | "MOBILE",
          status: "ACTIVE",
          description: locationForm.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deviceCount: 0,
        }
        setLocations((prev) => [...prev, newLocation])
        toast.success("Location added successfully")
      }

      // Close dialog and reset form
      setIsAddLocationDialogOpen(false)
      resetLocationForm()
    } catch (error) {
      console.error("Error saving location:", error)
      toast.error("Failed to save location")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle add/edit route submit
  const handleRouteSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validate required fields
      if (
        !routeForm.name ||
        !routeForm.startPoint ||
        !routeForm.endPoint ||
        routeForm.days.length === 0 ||
        !routeForm.startTime ||
        !routeForm.endTime
      ) {
        toast.error("Please fill in all required fields")
        return
      }

      // In a real app, you would make an API call here
      // const response = await fetch('/api/partner/routes', {
      //   method: selectedRoute ? 'PUT' : 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id: selectedRoute?.id,
      //     ...routeForm,
      //     locationId: selectedLocation?.id,
      //   }),
      // })

      // For demo, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (selectedRoute) {
        // Update existing route
        setRoutes((prev) =>
          prev.map((route) =>
            route.id === selectedRoute.id
              ? {
                  ...route,
                  name: routeForm.name,
                  startPoint: routeForm.startPoint,
                  endPoint: routeForm.endPoint,
                  schedule: {
                    days: routeForm.days,
                    startTime: routeForm.startTime,
                    endTime: routeForm.endTime,
                  },
                }
              : route,
          ),
        )
        toast.success("Route updated successfully")
      } else {
        // Add new route
        const newRoute: Route = {
          id: `route_${Math.random().toString(36).substring(2, 9)}`,
          name: routeForm.name,
          startPoint: routeForm.startPoint,
          endPoint: routeForm.endPoint,
          waypoints: [],
          schedule: {
            days: routeForm.days,
            startTime: routeForm.startTime,
            endTime: routeForm.endTime,
          },
          status: "ACTIVE",
          locationId: selectedLocation?.id || "",
        }
        setRoutes((prev) => [...prev, newRoute])
        toast.success("Route added successfully")
      }

      // Close dialog and reset form
      setIsAddRouteDialogOpen(false)
      resetRouteForm()
    } catch (error) {
      console.error("Error saving route:", error)
      toast.error("Failed to save route")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete location
  const handleDeleteLocation = async () => {
    try {
      setIsSubmitting(true)

      if (!selectedLocation) return

      // In a real app, you would make an API call here
      // await fetch(`/api/partner/locations/${selectedLocation.id}`, {
      //   method: 'DELETE',
      // })

      // For demo, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Remove location from state
      setLocations((prev) => prev.filter((loc) => loc.id !== selectedLocation.id))

      // Also remove any routes associated with this location
      setRoutes((prev) => prev.filter((route) => route.locationId !== selectedLocation.id))

      toast.success("Location deleted successfully")

      // Close dialog and reset selection
      setIsDeleteDialogOpen(false)
      setSelectedLocation(null)
    } catch (error) {
      console.error("Error deleting location:", error)
      toast.error("Failed to delete location")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get location status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success"
      case "INACTIVE":
        return "secondary"
      case "PENDING":
        return "warning"
      default:
        return "default"
    }
  }

  // Get route for a mobile location
  const getRouteForLocation = (locationId: string) => {
    return routes.find((route) => route.locationId === locationId)
  }

  if (loading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Locations</h1>
          <p className="text-muted-foreground">Manage your device locations and routes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetLocationForm()
              setIsAddLocationDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search locations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLocations.length === 0 ? (
          <div className="col-span-full p-8 text-center border rounded-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No locations found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search query" : "Add your first location to get started"}
            </p>
            {!searchQuery && (
              <Button
                className="mt-4"
                onClick={() => {
                  resetLocationForm()
                  setIsAddLocationDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            )}
          </div>
        ) : (
          filteredLocations.map((location) => (
            <Card key={location.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {location.name}
                      <Badge variant={getStatusBadge(location.status)}>{location.status}</Badge>
                    </CardTitle>
                    <CardDescription>{location.address}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="right">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditLocationDialog(location)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Location
                      </DropdownMenuItem>
                      {location.type === "MOBILE" && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLocation(location)
                            const route = getRouteForLocation(location.id)
                            if (route) {
                              openEditRouteDialog(route)
                            } else {
                              resetRouteForm()
                              setIsAddRouteDialogOpen(true)
                            }
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {getRouteForLocation(location.id) ? "Edit Route" : "Add Route"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push(`/partner/devices?locationId=${location.id}`)}>
                        <MapPin className="mr-2 h-4 w-4" />
                        View Devices
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSelectedLocation(location)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Location
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{location.type === "FIXED" ? "Fixed Location" : "Mobile Route"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Devices:</span>
                    <span>{location.deviceCount}</span>
                  </div>
                  {location.type === "MOBILE" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Route:</span>
                      <span>{getRouteForLocation(location.id)?.name || "No route configured"}</span>
                    </div>
                  )}
                  {location.description && (
                    <div className="mt-2 text-sm">
                      <p className="text-muted-foreground">{location.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="flex justify-between w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`https://maps.google.com/?q=${location.latitude},${location.longitude}`)}
                    className="text-xs"
                  >
                    <MapPin className="mr-1 h-3 w-3" />
                    View on Map
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/partner/devices?locationId=${location.id}`)}
                    className="text-xs"
                  >
                    View Devices
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Location Dialog */}
      <Dialog open={isAddLocationDialogOpen} onOpenChange={setIsAddLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
            <DialogDescription>
              {selectedLocation
                ? "Update the details for this location"
                : "Enter the details for your new device location"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Location Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={locationForm.name}
                onChange={handleLocationFormChange}
                placeholder="e.g., Main Office, Downtown Mall"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                name="address"
                value={locationForm.address}
                onChange={handleLocationFormChange}
                placeholder="Full address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">
                  Latitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={locationForm.latitude}
                  onChange={handleLocationFormChange}
                  placeholder="e.g., -1.286389"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">
                  Longitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={locationForm.longitude}
                  onChange={handleLocationFormChange}
                  placeholder="e.g., 36.817223"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Location Type <span className="text-destructive">*</span>
              </Label>
              <Select
                name="type"
                value={locationForm.type}
                onValueChange={(value) => setLocationForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Location</SelectItem>
                  <SelectItem value="MOBILE">Mobile Route</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {locationForm.type === "FIXED"
                  ? "Fixed locations are stationary installations like offices, malls, etc."
                  : "Mobile routes are for devices installed in vehicles like buses, matatus, etc."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={locationForm.description}
                onChange={handleLocationFormChange}
                placeholder="Additional details about this location"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddLocationDialogOpen(false)
                resetLocationForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleLocationSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedLocation ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>{selectedLocation ? "Update Location" : "Add Location"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Route Dialog */}
      <Dialog open={isAddRouteDialogOpen} onOpenChange={setIsAddRouteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
            <DialogDescription>
              {selectedRoute ? "Update the details for this route" : "Enter the details for your mobile device route"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">
                Route Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="routeName"
                name="name"
                value={routeForm.name}
                onChange={handleRouteFormChange}
                placeholder="e.g., CBD to Westlands"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPoint">
                  Start Point <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startPoint"
                  name="startPoint"
                  value={routeForm.startPoint}
                  onChange={handleRouteFormChange}
                  placeholder="e.g., Nairobi CBD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endPoint">
                  End Point <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endPoint"
                  name="endPoint"
                  value={routeForm.endPoint}
                  onChange={handleRouteFormChange}
                  placeholder="e.g., Westlands"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Operating Days <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={routeForm.days.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDaySelection(day)}
                  >
                    {day.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={routeForm.startTime}
                  onChange={handleRouteFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={routeForm.endTime}
                  onChange={handleRouteFormChange}
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Route Waypoints</p>
                <p className="text-muted-foreground">
                  You can add specific waypoints for this route after saving. This helps with accurate tracking and ad
                  targeting.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddRouteDialogOpen(false)
                resetRouteForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRouteSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedRoute ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>{selectedRoute ? "Update Route" : "Add Route"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this location? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedLocation && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{selectedLocation.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                </div>
              </div>

              {selectedLocation.deviceCount > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-lg">
                  <p className="text-sm font-medium">
                    Warning: This location has {selectedLocation.deviceCount} device(s) assigned to it.
                  </p>
                  <p className="text-sm">
                    Deleting this location will remove all device assignments. The devices will need to be reassigned to
                    a new location.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedLocation(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLocation} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete Location</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
