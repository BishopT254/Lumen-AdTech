"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { usePublicSettings } from "@/hooks/usePublicSettings"

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Key,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react"

// Types based on the Prisma schema
interface SecurityLog {
  id: string
  partnerId: string
  eventType: string
  description: string
  ipAddress: string
  userAgent: string
  timestamp: Date
}

interface ApiKey {
  id: string
  partnerId: string
  name: string
  key: string
  lastUsed: Date | null
  createdAt: Date
  expiresAt: Date | null
  permissions: string[]
}

interface Device {
  id: string
  name: string
  location: string
  lastActive: Date
  status: "online" | "offline" | "maintenance"
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  loginNotifications: boolean
  apiAccessEnabled: boolean
  allowedIpAddresses: string[]
  passwordLastChanged: Date | null
  securityScore: number
}

export default function SecurityPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { securitySettings: publicSecuritySettings, loading: settingsLoading } = usePublicSettings()

  // State management
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginNotifications: true,
    apiAccessEnabled: false,
    allowedIpAddresses: [],
    passwordLastChanged: null,
    securityScore: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [newApiKeyName, setNewApiKeyName] = useState("")
  const [newApiKeyDialogOpen, setNewApiKeyDialogOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<{ name: string; key: string } | null>(null)
  const [newIpAddress, setNewIpAddress] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["analytics:read"])

  // Load security data
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        setIsLoading(true)

        if (publicSecuritySettings) {
          // Use data from public settings API instead of mock data
          const settings: SecuritySettings = {
            twoFactorEnabled: publicSecuritySettings.twoFactorRequired || false,
            loginNotifications: publicSecuritySettings.loginNotifications || true,
            apiAccessEnabled: publicSecuritySettings.apiAccess?.enabled || false,
            allowedIpAddresses: publicSecuritySettings.allowedIpAddresses || [],
            passwordLastChanged: publicSecuritySettings.passwordLastChanged
              ? new Date(publicSecuritySettings.passwordLastChanged)
              : null,
            securityScore: 0,
          }

          // Calculate security score based on actual settings
          settings.securityScore = calculateSecurityScore(settings)

          setSecuritySettings(settings)

          // For API keys, devices, and logs, we would normally fetch from an API
          // For now, we'll create minimal placeholder data based on the settings
          if (publicSecuritySettings.apiAccess?.enabled) {
            setApiKeys([
              {
                id: "key_1",
                partnerId: session?.user?.id || "unknown",
                name: "Default API Key",
                key: "lmn_" + generateRandomString(32),
                lastUsed: null,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
                permissions: ["analytics:read"],
              },
            ])
          } else {
            setApiKeys([])
          }

          // Set minimal device data
          setDevices([
            {
              id: "current_device",
              name: "Current Device",
              location: "Unknown",
              lastActive: new Date(),
              status: "online",
            },
          ])

          // Set minimal security logs
          setSecurityLogs([
            {
              id: "log_current",
              partnerId: session?.user?.id || "unknown",
              eventType: "login",
              description: "Current session login",
              ipAddress: "Unknown",
              userAgent: navigator.userAgent,
              timestamp: new Date(),
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching security data:", error)
        toast({
          title: "Error",
          description: "Failed to load security data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!settingsLoading && publicSecuritySettings) {
      fetchSecurityData()
    }
  }, [toast, session, settingsLoading, publicSecuritySettings])

  // Generate random string for API keys
  const generateRandomString = (length: number) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  // Calculate security score based on settings
  const calculateSecurityScore = (settings: SecuritySettings): number => {
    let score = 0

    // Two-factor authentication
    if (settings.twoFactorEnabled) score += 40

    // Login notifications
    if (settings.loginNotifications) score += 15

    // Password age
    if (settings.passwordLastChanged) {
      const daysSinceChange = Math.floor((Date.now() - settings.passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceChange < 30) score += 20
      else if (daysSinceChange < 90) score += 10
      else score += 5
    }

    // IP restrictions
    if (settings.allowedIpAddresses.length > 0) score += 15

    // API access (slightly reduces score if enabled without other protections)
    if (settings.apiAccessEnabled && !settings.twoFactorEnabled) score -= 5

    return Math.min(Math.max(score, 0), 100)
  }

  // Toggle API key visibility
  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }))
  }

  // Copy API key to clipboard
  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    })
  }

  // Handle permission selection
  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  // Create new API key
  const handleCreateApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      })
      return
    }

    if (selectedPermissions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one permission",
        variant: "destructive",
      })
      return
    }

    const newKey = {
      name: newApiKeyName,
      key: "lmn_" + generateRandomString(32),
    }

    setNewApiKey(newKey)
    setNewApiKeyName("")

    // In a real app, you would save this to the database
    const apiKey: ApiKey = {
      id: `key_${apiKeys.length + 1}`,
      partnerId: session?.user?.id || "unknown",
      name: newKey.name,
      key: newKey.key,
      lastUsed: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
      permissions: selectedPermissions,
    }

    setApiKeys((prev) => [...prev, apiKey])

    // Reset selected permissions
    setSelectedPermissions(["analytics:read"])
  }

  // Delete API key
  const handleDeleteApiKey = (keyId: string) => {
    setApiKeys((prev) => prev.filter((key) => key.id !== keyId))
    toast({
      title: "API Key Deleted",
      description: "The API key has been successfully deleted",
    })
  }

  // Add allowed IP address
  const handleAddIpAddress = () => {
    if (!newIpAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an IP address",
        variant: "destructive",
      })
      return
    }

    // Simple IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    if (!ipRegex.test(newIpAddress)) {
      toast({
        title: "Error",
        description: "Please enter a valid IP address",
        variant: "destructive",
      })
      return
    }

    setSecuritySettings((prev) => ({
      ...prev,
      allowedIpAddresses: [...prev.allowedIpAddresses, newIpAddress],
    }))

    setNewIpAddress("")

    toast({
      title: "IP Address Added",
      description: "The IP address has been added to the allowed list",
    })
  }

  // Remove allowed IP address
  const handleRemoveIpAddress = (ip: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      allowedIpAddresses: prev.allowedIpAddresses.filter((address) => address !== ip),
    }))

    toast({
      title: "IP Address Removed",
      description: "The IP address has been removed from the allowed list",
    })
  }

  // Toggle security setting
  const toggleSecuritySetting = (setting: keyof SecuritySettings) => {
    setSecuritySettings((prev) => {
      const newSettings = {
        ...prev,
        [setting]: !prev[setting],
      }

      // Recalculate security score
      newSettings.securityScore = calculateSecurityScore(newSettings)

      return newSettings
    })
  }

  // Remove device
  const handleRemoveDevice = (deviceId: string) => {
    setDevices((prev) => prev.filter((device) => device.id !== deviceId))
    toast({
      title: "Device Removed",
      description: "The device has been removed from trusted devices",
    })
  }

  // Get security score color
  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 50) return "bg-amber-500"
    return "bg-red-500"
  }

  // Get event type badge
  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case "login":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Login
          </Badge>
        )
      case "login_failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Failed Login
          </Badge>
        )
      case "settings_change":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="h-3 w-3 mr-1" /> Settings Change
          </Badge>
        )
      case "api_key_created":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Key className="h-3 w-3 mr-1" /> API Key Created
          </Badge>
        )
      case "device_added":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Smartphone className="h-3 w-3 mr-1" /> Device Added
          </Badge>
        )
      default:
        return <Badge variant="outline">{eventType}</Badge>
    }
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
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-2xl font-bold tracking-tight">Security</h1>
          <p className="text-muted-foreground">Manage your account security and access settings</p>
        </div>

        <Button>
          <Shield className="mr-2 h-4 w-4" />
          Security Audit
        </Button>
      </div>

      {/* Security summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securitySettings.securityScore}/100</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>
                  Security Level:{" "}
                  {securitySettings.securityScore >= 80
                    ? "Strong"
                    : securitySettings.securityScore >= 50
                      ? "Medium"
                      : "Weak"}
                </span>
                <span>{securitySettings.securityScore}%</span>
              </div>
              <Progress
                value={securitySettings.securityScore}
                className="h-2"
                indicatorClassName={getSecurityScoreColor(securitySettings.securityScore)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Two-Factor Authentication</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securitySettings.twoFactorEnabled ? (
                <span className="text-green-500 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Enabled
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Disabled
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {securitySettings.twoFactorEnabled
                ? "Your account is protected with 2FA"
                : "Enable 2FA for better security"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeys.length === 1 ? "1 active API key" : `${apiKeys.length} active API keys`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trusted Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              {devices.filter((d) => d.status === "online").length} currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different security views */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure your account security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require a verification code when logging in</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={securitySettings.twoFactorEnabled}
                  onCheckedChange={() => toggleSecuritySetting("twoFactorEnabled")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="login-notifications">Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for new logins</p>
                </div>
                <Switch
                  id="login-notifications"
                  checked={securitySettings.loginNotifications}
                  onCheckedChange={() => toggleSecuritySetting("loginNotifications")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="api-access">API Access</Label>
                  <p className="text-sm text-muted-foreground">Allow access to your account via API keys</p>
                </div>
                <Switch
                  id="api-access"
                  checked={securitySettings.apiAccessEnabled}
                  onCheckedChange={() => toggleSecuritySetting("apiAccessEnabled")}
                />
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium mb-3">Password</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      Last changed:{" "}
                      {securitySettings.passwordLastChanged
                        ? format(securitySettings.passwordLastChanged, "MMM d, yyyy")
                        : "Never"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We recommend changing your password every 90 days
                    </p>
                  </div>
                  <Button variant="outline">
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>IP Address Restrictions</CardTitle>
              <CardDescription>Limit access to your account from specific IP addresses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter IP address (e.g., 192.168.1.1)"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                  />
                  <Button onClick={handleAddIpAddress}>Add</Button>
                </div>

                {securitySettings.allowedIpAddresses.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securitySettings.allowedIpAddresses.map((ip, index) => (
                          <TableRow key={index}>
                            <TableCell>{ip}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveIpAddress(ip)}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No IP restrictions configured. Your account can be accessed from any IP address.
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Adding IP restrictions will limit access to your account from only the specified IP addresses. Make
                    sure to add all necessary IP addresses to avoid being locked out of your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Recommendations</CardTitle>
              <CardDescription>Suggestions to improve your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!securitySettings.twoFactorEnabled && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium">Enable Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add an extra layer of security to your account by requiring a verification code in addition to
                        your password.
                      </p>
                      <Button size="sm" className="mt-2">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>
                )}

                {securitySettings.passwordLastChanged &&
                  (new Date().getTime() - securitySettings.passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24) >
                    90 && (
                    <div className="flex items-start gap-3 p-3 border rounded-md">
                      <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium">Update Your Password</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your password was last changed over 90 days ago. We recommend updating it regularly for better
                          security.
                        </p>
                        <Button size="sm" className="mt-2">
                          Change Password
                        </Button>
                      </div>
                    </div>
                  )}

                {securitySettings.apiAccessEnabled && !securitySettings.twoFactorEnabled && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium">Secure API Access</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have API access enabled without Two-Factor Authentication. We recommend enabling 2FA for
                        better security.
                      </p>
                      <Button size="sm" className="mt-2">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>
                )}

                {securitySettings.allowedIpAddresses.length === 0 && (
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium">Configure IP Restrictions</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Limit access to your account from specific IP addresses for enhanced security.
                      </p>
                      <Button size="sm" className="mt-2" onClick={() => setActiveTab("overview")}>
                        Add IP Restrictions
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for programmatic access to your account</CardDescription>
              </div>
              <Dialog open={newApiKeyDialogOpen} onOpenChange={setNewApiKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Key className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>Create a new API key to access your account programmatically.</DialogDescription>
                  </DialogHeader>
                  {newApiKey ? (
                    <div className="py-4 space-y-4">
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">
                          This API key will only be displayed once. Please copy it and store it securely.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>API Key Name</Label>
                        <p className="text-sm font-medium">{newApiKey.name}</p>
                      </div>

                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input value={newApiKey.key} readOnly className="font-mono text-sm" />
                          <Button size="icon" variant="outline" onClick={() => copyApiKey(newApiKey.key)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="api-key-name">API Key Name</Label>
                          <Input
                            id="api-key-name"
                            placeholder="Enter a name for this API key"
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Permissions</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="perm-analytics-read"
                                className="rounded border-gray-300"
                                checked={selectedPermissions.includes("analytics:read")}
                                onChange={() => togglePermission("analytics:read")}
                              />
                              <Label htmlFor="perm-analytics-read" className="text-sm">
                                Analytics: Read
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="perm-devices-read"
                                className="rounded border-gray-300"
                                checked={selectedPermissions.includes("devices:read")}
                                onChange={() => togglePermission("devices:read")}
                              />
                              <Label htmlFor="perm-devices-read" className="text-sm">
                                Devices: Read
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="perm-devices-write"
                                className="rounded border-gray-300"
                                checked={selectedPermissions.includes("devices:write")}
                                onChange={() => togglePermission("devices:write")}
                              />
                              <Label htmlFor="perm-devices-write" className="text-sm">
                                Devices: Write
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="perm-content-read"
                                className="rounded border-gray-300"
                                checked={selectedPermissions.includes("content:read")}
                                onChange={() => togglePermission("content:read")}
                              />
                              <Label htmlFor="perm-content-read" className="text-sm">
                                Content: Read
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    {newApiKey ? (
                      <Button
                        onClick={() => {
                          setNewApiKey(null)
                          setNewApiKeyDialogOpen(false)
                        }}
                      >
                        Done
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setNewApiKeyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateApiKey}>Create API Key</Button>
                      </>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {apiKeys.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {showApiKey[key.id] ? key.key : `${key.key.substring(0, 8)}...`}
                              </code>
                              <Button size="icon" variant="ghost" onClick={() => toggleApiKeyVisibility(key.id)}>
                                {showApiKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => copyApiKey(key.key)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(key.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {key.lastUsed ? format(new Date(key.lastUsed), "MMM d, yyyy") : "Never"}
                          </TableCell>
                          <TableCell>
                            {key.expiresAt ? format(new Date(key.expiresAt), "MMM d, yyyy") : "Never"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteApiKey(key.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium">No API Keys</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    You haven't created any API keys yet. API keys allow secure programmatic access to your account.
                  </p>
                  <Button onClick={() => setNewApiKeyDialogOpen(true)} className="mt-2">
                    <Key className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                <p>API keys provide full access to your account. Keep them secure and never share them publicly.</p>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>Resources to help you integrate with our API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Getting Started</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Learn the basics of our API and how to make your first request.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      View Guide
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">API Reference</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Complete documentation of all available API endpoints.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      View Reference
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Code Examples</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      Sample code in various languages to help you get started.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      View Examples
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trusted Devices</CardTitle>
              <CardDescription>Devices that have been used to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>{device.location}</TableCell>
                        <TableCell>
                          {device.status === "online" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              Offline
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(device.lastActive), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {device.id !== "current_device" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveDevice(device.id)}
                            >
                              Remove
                            </Button>
                          )}
                          {device.id === "current_device" && <Badge variant="outline">Current</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">We'll notify you when your account is accessed from a new device or location.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Management</CardTitle>
              <CardDescription>Control how devices can access your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-device-notifications">New Device Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications when your account is accessed from a new device
                  </p>
                </div>
                <Switch id="new-device-notifications" checked={true} disabled={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="device-verification">Device Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Require verification when logging in from a new device
                  </p>
                </div>
                <Switch
                  id="device-verification"
                  checked={securitySettings.twoFactorEnabled}
                  disabled={!securitySettings.twoFactorEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="remember-devices">Remember Devices</Label>
                  <p className="text-sm text-muted-foreground">Stay logged in on trusted devices</p>
                </div>
                <Switch id="remember-devices" checked={true} />
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full">
                  <XCircle className="mr-2 h-4 w-4" />
                  Sign Out From All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Activity Log</CardTitle>
              <CardDescription>Recent security-related activity on your account</CardDescription>
            </CardHeader>
            <CardContent>
              {securityLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{getEventTypeBadge(log.eventType)}</TableCell>
                          <TableCell>{log.description}</TableCell>
                          <TableCell>{log.ipAddress}</TableCell>
                          <TableCell>{format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Activity Logs</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No security activity has been recorded for your account yet.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <p>Security logs are retained for 90 days</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Export Logs
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>Recent login attempts to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                        </Badge>
                      </TableCell>
                      <TableCell>Unknown</TableCell>
                      <TableCell>Current Device</TableCell>
                      <TableCell>Unknown</TableCell>
                      <TableCell>{format(new Date(), "MMM d, yyyy h:mm a")}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Notifications</CardTitle>
              <CardDescription>Configure how you receive security alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive security alerts via email</p>
                </div>
                <Switch id="email-notifications" checked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="browser-notifications">Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive security alerts in your browser</p>
                </div>
                <Switch id="browser-notifications" checked={false} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="unusual-activity">Unusual Activity Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about suspicious account activity</p>
                </div>
                <Switch id="unusual-activity" checked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
