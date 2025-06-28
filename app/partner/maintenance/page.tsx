"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { AlertCircle, AlertTriangle, CheckCircle, Loader2, Plus, RefreshCw, X, Filter, Search, ArrowUpDown } from 'lucide-react'
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

// Define maintenance types based on the Prisma schema
type MaintenanceTask = {
  id: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  type: "SCHEDULED" | "EMERGENCY" | "ROUTINE"
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  scheduledDate: string
  completedDate?: string
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Define device health status type
type DeviceHealth = {
  id: string
  deviceId: string
  deviceName: string
  deviceLocation: string
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE" | "UNKNOWN"
  lastChecked: string
  uptime: number
  temperature?: number
  storageUsage?: number
  memoryUsage?: number
  networkStrength?: number
  batteryLevel?: number
  issues?: string[]
}

// Define device type for dropdown selection
type Device = {
  id: string
  name: string
  location: string
  type: string
  status: string
}

export default function MaintenancePage() {
  const router = useRouter()
  const { generalSettings, loading: settingsLoading } = usePublicSettings()
  
  // State for maintenance data
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([])
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("tasks")
  
  // State for task dialog
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state for adding/editing task
  const [taskForm, setTaskForm] = useState({
    deviceId: "",
    type: "SCHEDULED",
    priority: "MEDIUM",
    description: "",
    scheduledDate: "",
    notes: "",
  })

  // Error states
  const [error, setError] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  
  // Fetch devices for dropdown
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/partner/devices')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`)
        }
        
        const data = await response.json()
        setDevices(data)
      } catch (error) {
        console.error("Error fetching devices:", error)
        setDeviceError("Failed to load devices. Please try again later.")
      }
    }
    
    fetchDevices()
  }, [])
  
  // Fetch maintenance data
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch maintenance tasks
        const tasksResponse = await fetch('/api/partner/maintenance/tasks')
        
        if (!tasksResponse.ok) {
          throw new Error(`Failed to fetch maintenance tasks: ${tasksResponse.statusText}`)
        }
        
        const tasksData = await tasksResponse.json()
        setMaintenanceTasks(tasksData)
        
        // Fetch device health data
        const healthResponse = await fetch('/api/partner/maintenance/health')
        
        if (!healthResponse.ok) {
          throw new Error(`Failed to fetch device health: ${healthResponse.statusText}`)
        }
        
        const healthData = await healthResponse.json()
        setDeviceHealth(healthData)
        
      } catch (error) {
        console.error("Error fetching maintenance data:", error)
        setError("Failed to load maintenance data. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMaintenanceData()
  }, [])
  
  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      
      // Fetch maintenance tasks
      const tasksResponse = await fetch('/api/partner/maintenance/tasks')
      
      if (!tasksResponse.ok) {
        throw new Error(`Failed to refresh maintenance tasks: ${tasksResponse.statusText}`)
      }
      
      const tasksData = await tasksResponse.json()
      setMaintenanceTasks(tasksData)
      
      // Fetch device health data
      const healthResponse = await fetch('/api/partner/maintenance/health')
      
      if (!healthResponse.ok) {
        throw new Error(`Failed to refresh device health: ${healthResponse.statusText}`)
      }
      
      const healthData = await healthResponse.json()
      setDeviceHealth(healthData)
      
      toast.success("Data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing data:", error)
      setError("Failed to refresh data. Please try again later.")
      toast.error("Failed to refresh data")
    } finally {
      setIsRefreshing(false)
    }
  }
  
  // Filter tasks based on search query and filters
  const filteredTasks = maintenanceTasks.filter(task => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      task.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.deviceLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Status filter
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    
    // Priority filter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })
  
  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const dateA = new Date(a.scheduledDate).getTime()
    const dateB = new Date(b.scheduledDate).getTime()
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA
  })
  
  // Filter device health based on search query
  const filteredDeviceHealth = deviceHealth.filter(device => {
    return searchQuery === "" || 
      device.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceLocation.toLowerCase().includes(searchQuery.toLowerCase())
  })
  
  // Handle task form input changes
  const handleTaskFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setTaskForm(prev => ({ ...prev, [name]: value }))
  }
  
  // Open edit task dialog
  const openEditTaskDialog = (task: MaintenanceTask) => {
    setSelectedTask(task)
    setTaskForm({
      deviceId: task.deviceId,
      type: task.type,
      priority: task.priority,
      description: task.description,
      scheduledDate: new Date(task.scheduledDate).toISOString().slice(0, 16),
      notes: task.notes || "",
    })
    setIsTaskDialogOpen(true)
  }
  
  // Reset task form
  const resetTaskForm = () => {
    setTaskForm({
      deviceId: "",
      type: "SCHEDULED",
      priority: "MEDIUM",
      description: "",
      scheduledDate: "",
      notes: "",
    })
    setSelectedTask(null)
  }
  
  // Handle add/edit task submit
  const handleTaskSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      // Validate required fields
      if (!taskForm.deviceId || !taskForm.description || !taskForm.scheduledDate) {
        toast.error("Please fill in all required fields")
        return
      }
      
      const payload = {
        id: selectedTask?.id,
        ...taskForm,
      }
      
      if (selectedTask) {
        // Update existing task
        const response = await fetch(`/api/partner/maintenance/tasks/${selectedTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update task: ${response.statusText}`)
        }
        
        const updatedTask = await response.json()
        
        // Update task in state
        setMaintenanceTasks(prev => prev.map(task => 
          task.id === selectedTask.id ? updatedTask : task
        ))
        
        toast.success("Maintenance task updated successfully")
      } else {
        // Add new task
        const response = await fetch('/api/partner/maintenance/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to create task: ${response.statusText}`)
        }
        
        const newTask = await response.json()
        
        // Add new task to state
        setMaintenanceTasks(prev => [...prev, newTask])
        
        toast.success("Maintenance task added successfully")
      }
      
      // Close dialog and reset form
      setIsTaskDialogOpen(false)
      resetTaskForm()
      
    } catch (error) {
      console.error("Error saving maintenance task:", error)
      toast.error("Failed to save maintenance task")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/partner/maintenance/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update task status: ${response.statusText}`)
      }
      
      const updatedTask = await response.json()
      
      // Update task in state
      setMaintenanceTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ))
      
      toast.success(`Task status updated to ${newStatus.toLowerCase()}`)
      
    } catch (error) {
      console.error("Error updating task status:", error)
      toast.error("Failed to update task status")
    }
  }
  
  // Get task status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success"
      case "IN_PROGRESS":
        return "warning"
      case "PENDING":
        return "default"
      case "CANCELLED":
        return "secondary"
      default:
        return "default"
    }
  }
  
  // Get task priority badge variant
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "destructive"
      case "HIGH":
        return "destructive"
      case "MEDIUM":
        return "warning"
      case "LOW":
        return "secondary"
      default:
        return "default"
    }
  }
  
  // Get device health status badge variant
  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "success"
      case "WARNING":
        return "warning"
      case "CRITICAL":
        return "destructive"
      case "OFFLINE":
        return "secondary"
      default:
        return "default"
    }
  }
  
  // Get health status icon
  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "CRITICAL":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "OFFLINE":
        return <X className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy h:mm a")
  }
  
  if (settingsLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error Loading Maintenance Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="mt-4"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trying Again...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">
            Manage device maintenance tasks and monitor device health
          </p>
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
          <Button size="sm" onClick={() => {
            resetTaskForm()
            setIsTaskDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Maintenance
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deviceHealth.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total number of devices being monitored
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Healthy Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deviceHealth.filter(device => device.status === "HEALTHY").length}
            </div>
            <div className="flex items-center mt-1">
              <Badge variant="success" className="text-xs">
                {Math.round(deviceHealth.filter(device => device.status === "HEALTHY").length / deviceHealth.length * 100)}%
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">of all devices</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {maintenanceTasks.filter(task => task.status === "PENDING").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maintenance tasks awaiting action
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {deviceHealth.filter(device => device.status === "CRITICAL").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Devices requiring immediate attention
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="tasks" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="tasks">Maintenance Tasks</TabsTrigger>
            <TabsTrigger value="health">Device Health</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 w-full sm:w-[200px] md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {activeTab === "tasks" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <p className="text-sm font-medium mb-2">Status</p>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <p className="text-sm font-medium mt-4 mb-2">Priority</p>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center mt-4">
                      <p className="text-sm font-medium mr-2">Sort by date:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="h-8 px-2"
                      >
                        <ArrowUpDown className="h-4 w-4 mr-1" />
                        {sortOrder === "asc" ? "Oldest first" : "Newest first"}
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Maintenance Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {sortedTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3">
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No maintenance tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all" 
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Schedule maintenance tasks for your devices to keep them running smoothly."}
                </p>
                <Button 
                  onClick={() => {
                    resetTaskForm()
                    setIsTaskDialogOpen(true)
                  }} 
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Maintenance
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <div className={`h-1 ${
                    task.priority === "CRITICAL" ? "bg-red-500" :
                    task.priority === "HIGH" ? "bg-orange-500" :
                    task.priority === "MEDIUM" ? "bg-amber-500" :
                    "bg-blue-500"
                  }`} />
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{task.deviceName}</h3>
                          <Badge variant={getStatusBadge(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge variant={getPriorityBadge(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.deviceLocation}</p>
                        <p className="text-sm">{task.description}</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:text-right">
                        <div className="text-sm text-muted-foreground">
                          <div>Scheduled: {formatDate(task.scheduledDate)}</div>
                          {task.completedDate && (
                            <div>Completed: {formatDate(task.completedDate)}</div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditTaskDialog(task)}
                          >
                            Edit
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Status
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleTaskStatusChange(task.id, "PENDING")}
                                disabled={task.status === "PENDING"}
                              >
                                Mark as Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTaskStatusChange(task.id, "IN_PROGRESS")}
                                disabled={task.status === "IN_PROGRESS"}
                              >
                                Mark as In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTaskStatusChange(task.id, "COMPLETED")}
                                disabled={task.status === "COMPLETED"}
                              >
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTaskStatusChange(task.id, "CANCELLED")}
                                disabled={task.status === "CANCELLED"}
                              >
                                Mark as Cancelled
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Device Health Tab */}
        <TabsContent value="health" className="space-y-4">
          {filteredDeviceHealth.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No device health data found</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery 
                    ? "Try adjusting your search to find what you're looking for."
                    : "No device health data is available at this time."}
                </p>
                <Button onClick={handleRefresh} className="mt-4" disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDeviceHealth.map((device) => (
                <Card key={device.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{device.deviceName}</h3>
                          <Badge variant={getHealthStatusBadge(device.status)} className="flex items-center gap-1">
                            {getHealthStatusIcon(device.status)}
                            {device.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{device.deviceLocation}</p>
                        <p className="text-sm">Last checked: {formatDate(device.lastChecked)}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 md:text-right md:items-end">
                        <div className="text-sm">
                          <span className="font-medium">Uptime:</span> {device.uptime.toFixed(1)}%
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            resetTaskForm()
                            setTaskForm(prev => ({
                              ...prev,
                              deviceId: device.deviceId,
                              priority: device.status === "CRITICAL" ? "HIGH" : 
                                       device.status === "WARNING" ? "MEDIUM" : "LOW",
                              type: "SCHEDULED",
                              scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
                              description: `Maintenance for ${device.deviceName}`,
                            }))
                            setIsTaskDialogOpen(true)
                          }}
                        >
                          Schedule Maintenance
                        </Button>
                      </div>
                    </div>
                    
                    {/* Health metrics */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {device.temperature !== null && device.temperature !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Temperature</span>
                            <span className={`font-medium ${
                              device.temperature > 50 ? "text-red-500" : 
                              device.temperature > 45 ? "text-amber-500" : 
                              "text-green-500"
                            }`}>
                              {device.temperature.toFixed(1)}°C
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(device.temperature / 0.7, 100)} 
                            className={`h-2 ${
                              device.temperature > 50 ? "bg-red-100" : 
                              device.temperature > 45 ? "bg-amber-100" : 
                              "bg-green-100"
                            }`}
                            indicatorClassName={`${
                              device.temperature > 50 ? "bg-red-500" : 
                              device.temperature > 45 ? "bg-amber-500" : 
                              "bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                      
                      {device.storageUsage !== null && device.storageUsage !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Storage</span>
                            <span className={`font-medium ${
                              device.storageUsage > 90 ? "text-red-500" : 
                              device.storageUsage > 75 ? "text-amber-500" : 
                              "text-green-500"
                            }`}>
                              {device.storageUsage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={device.storageUsage} 
                            className={`h-2 ${
                              device.storageUsage > 90 ? "bg-red-100" : 
                              device.storageUsage > 75 ? "bg-amber-100" : 
                              "bg-green-100"
                            }`}
                            indicatorClassName={`${
                              device.storageUsage > 90 ? "bg-red-500" : 
                              device.storageUsage > 75 ? "bg-amber-500" : 
                              "bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                      
                      {device.memoryUsage !== null && device.memoryUsage !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Memory</span>
                            <span className={`font-medium ${
                              device.memoryUsage > 90 ? "text-red-500" : 
                              device.memoryUsage > 75 ? "text-amber-500" : 
                              "text-green-500"
                            }`}>
                              {device.memoryUsage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={device.memoryUsage} 
                            className={`h-2 ${
                              device.memoryUsage > 90 ? "bg-red-100" : 
                              device.memoryUsage > 75 ? "bg-amber-100" : 
                              "bg-green-100"
                            }`}
                            indicatorClassName={`${
                              device.memoryUsage > 90 ? "bg-red-500" : 
                              device.memoryUsage > 75 ? "bg-amber-500" : 
                              "bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                      
                      {device.networkStrength !== null && device.networkStrength !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Network</span>
                            <span className={`font-medium ${
                              device.networkStrength < 30 ? "text-red-500" : 
                              device.networkStrength < 60 ? "text-amber-500" : 
                              "text-green-500"
                            }`}>
                              {device.networkStrength.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={device.networkStrength} 
                            className={`h-2 ${
                              device.networkStrength < 30 ? "bg-red-100" : 
                              device.networkStrength < 60 ? "bg-amber-100" : 
                              "bg-green-100"
                            }`}
                            indicatorClassName={`${
                              device.networkStrength < 30 ? "bg-red-500" : 
                              device.networkStrength < 60 ? "bg-amber-500" : 
                              "bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                      
                      {device.batteryLevel !== null && device.batteryLevel !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Battery</span>
                            <span className={`font-medium ${
                              device.batteryLevel < 20 ? "text-red-500" : 
                              device.batteryLevel < 50 ? "text-amber-500" : 
                              "text-green-500"
                            }`}>
                              {device.batteryLevel.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={device.batteryLevel} 
                            className={`h-2 ${
                              device.batteryLevel < 20 ? "bg-red-100" : 
                              device.batteryLevel < 50 ? "bg-amber-100" : 
                              "bg-green-100"
                            }`}
                            indicatorClassName={`${
                              device.batteryLevel < 20 ? "bg-red-500" : 
                              device.batteryLevel < 50 ? "bg-amber-500" : 
                              "bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Issues list */}
                    {device.issues && device.issues.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Issues Detected:</h4>
                        <ul className="text-sm space-y-1">
                          {device.issues.map((issue, index) => (
                            <li key={index} className="flex items-center gap-2 text-red-500">
                              <AlertCircle className="h-4 w-4" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Edit Maintenance Task" : "Schedule Maintenance Task"}</DialogTitle>
            <DialogDescription>
              {selectedTask 
                ? "Update the maintenance task details below."
                : "Fill in the details to schedule a new maintenance task."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="deviceId">Device</Label>
              <Select
                value={taskForm.deviceId}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, deviceId: value }))}
              >
                <SelectTrigger id="deviceId">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {deviceError ? (
                    <div className="p-2 text-sm text-red-500">{deviceError}</div>
                  ) : devices.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No devices available</div>
                  ) : (
                    devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} ({device.location})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={taskForm.type}
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={taskForm.description}
                onChange={handleTaskFormChange}
                placeholder="Enter task description"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="scheduledDate">Scheduled Date & Time</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="datetime-local"
                value={taskForm.scheduledDate}
                onChange={handleTaskFormChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={taskForm.notes}
                onChange={handleTaskFormChange}
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTaskSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedTask ? "Updating..." : "Creating..."}
                </>
              ) : (
                selectedTask ? "Update Task" : "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
