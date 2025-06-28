"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
  AlertCircle,
  Key,
  Lock,
  Shield,
  UserCheck,
  Users,
  RefreshCw,
  Fingerprint,
  Globe,
  Server,
  Activity,
  Save,
} from "lucide-react"

// Types from admin settings
interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expiryDays: number
}

interface SecuritySettings {
  mfaRequired: boolean
  passwordPolicy: PasswordPolicy
  sessionTimeout: number
  ipWhitelist: string[]
  apiRateLimiting: boolean
  rateLimit: number
  apiKeyExpiration: boolean
  keyExpiryDays: number
  ipWhitelistEnabled: boolean
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  twoFactorEnabled: boolean
}

interface SecurityAuditLog {
  id: string
  configKey: string
  previousValue: any
  newValue: any
  changedBy: string
  changeDate: string
  ipAddress: string | null
  userAgent: string | null
  changeReason: string | null
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

const defaultSecuritySettings: SecuritySettings = {
  mfaRequired: false,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expiryDays: 90
  },
  sessionTimeout: 30,
  ipWhitelist: [],
  apiRateLimiting: true,
  rateLimit: 100,
  apiKeyExpiration: true,
  keyExpiryDays: 90,
  ipWhitelistEnabled: false,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  twoFactorEnabled: false
}

export default function SecurityPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [auditLog, setAuditLog] = useState<SecurityAuditLog[]>([])
  const [activeUsers, setActiveUsers] = useState<number>(0)
  const [failedAttempts, setFailedAttempts] = useState<number>(0)
  const [apiUsage, setApiUsage] = useState<number>(0)
  const [securityScore, setSecurityScore] = useState<number>(0)

  useEffect(() => {
    fetchSecurityData()
  }, [])

  const fetchSecurityData = async () => {
    try {
      setIsLoading(true)
      const [settingsRes, auditRes, statsRes] = await Promise.all([
        fetch('/api/admin/security/settings'),
        fetch('/api/admin/security/audit-log'),
        fetch('/api/admin/security/stats')
      ])

      // Handle settings response
      const settings = settingsRes.ok ? await settingsRes.json() : null
      const securitySettings = settings?.data || defaultSecuritySettings

      // Handle audit log response
      const audit = auditRes.ok ? await auditRes.json() : null
      const auditLogs = audit?.data || []

      // Handle stats response
      const stats = statsRes.ok ? await statsRes.json() : null
      
      setSecuritySettings(securitySettings)
      setAuditLog(auditLogs)
      
      // Set stats with actual values
      setActiveUsers(stats?.activeUsers || 0)
      setFailedAttempts(stats?.failedAttempts || 0)
      setApiUsage(stats?.apiUsage || 0)
      setSecurityScore(stats?.securityScore || 0)

      if (!settingsRes.ok) {
        console.warn('Failed to load security settings, using defaults')
        toast.warning('Using default security settings')
      }
    } catch (error) {
      console.error('Error fetching security data:', error)
      setSecuritySettings(defaultSecuritySettings)
      setAuditLog([])
      setActiveUsers(0)
      setFailedAttempts(0)
      setApiUsage(0)
      setSecurityScore(0)
      toast.warning('Using default security settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = (field: string, value: any) => {
    if (!securitySettings) return

    try {
      if (field.includes('.')) {
        const [section, key] = field.split('.')
        setSecuritySettings(prev => ({
          ...prev,
          [section]: {
            ...(prev?.[section as keyof SecuritySettings] || {}),
            [key]: value
          }
        }))
      } else {
        setSecuritySettings(prev => ({
          ...prev,
          [field]: value
        }))
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    }
  }

  const handleSaveSettings = async () => {
    if (!securitySettings) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }
      
      // Update local state with returned data to ensure sync
      if (result.data) {
        setSecuritySettings(result.data)
      }

      toast.success('Security settings saved successfully')
      await fetchSecurityData() // Refresh all data
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !securitySettings) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage platform security and access controls</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently logged in users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedAttempts}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Requests in last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityScore}%</div>
            <p className="text-xs text-muted-foreground">Based on enabled security features</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="api">API Security</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Security Settings</CardTitle>
              <CardDescription>Configure basic security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all admin accounts
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) => handleSettingChange('twoFactorEnabled', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically log out inactive users
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maximum Login Attempts</Label>
                    <p className="text-sm text-muted-foreground">
                      Number of failed attempts before account lockout
                    </p>
                  </div>
                  <Input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Set password requirements and expiration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Length</Label>
                    <Input
                      type="number"
                      value={securitySettings.passwordPolicy.minLength}
                      onChange={(e) => handleSettingChange('passwordPolicy.minLength', parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Uppercase</Label>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => handleSettingChange('passwordPolicy.requireUppercase', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Numbers</Label>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => handleSettingChange('passwordPolicy.requireNumbers', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require Special Characters</Label>
                    <Switch
                      checked={securitySettings.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => handleSettingChange('passwordPolicy.requireSpecialChars', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Password Expiry (Days)</Label>
                    <Input
                      type="number"
                      value={securitySettings.passwordPolicy.expiryDays}
                      onChange={(e) => handleSettingChange('passwordPolicy.expiryDays', parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Security</CardTitle>
              <CardDescription>Configure API access and rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">
                      Limit the number of API requests per minute
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.apiRateLimiting}
                    onCheckedChange={(checked) => handleSettingChange('apiRateLimiting', checked)}
                  />
                </div>
                {securitySettings.apiRateLimiting && (
                  <div className="flex items-center justify-between">
                    <Label>Rate Limit (requests/minute)</Label>
                    <Input
                      type="number"
                      value={securitySettings.rateLimit}
                      onChange={(e) => handleSettingChange('rateLimit', parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Key Expiration</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically expire API keys after a set period
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.apiKeyExpiration}
                    onCheckedChange={(checked) => handleSettingChange('apiKeyExpiration', checked)}
                  />
                </div>
                {securitySettings.apiKeyExpiration && (
                  <div className="flex items-center justify-between">
                    <Label>Key Expiry (days)</Label>
                    <Input
                      type="number"
                      value={securitySettings.keyExpiryDays}
                      onChange={(e) => handleSettingChange('keyExpiryDays', parseInt(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict API access to specific IP addresses
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.ipWhitelistEnabled}
                    onCheckedChange={(checked) => handleSettingChange('ipWhitelistEnabled', checked)}
                  />
                </div>
                {securitySettings.ipWhitelistEnabled && (
                  <div className="space-y-2">
                    <Label>Whitelisted IPs (one per line)</Label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
                      value={securitySettings.ipWhitelist.join('\n')}
                      onChange={(e) => handleSettingChange('ipWhitelist', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Enter IP addresses..."
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Security Audit Log</CardTitle>
              <CardDescription>Recent security-related activities and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                      <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                    {auditLog.length > 0 ? (
                      auditLog.map((log) => (
                  <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.changeDate).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.user.name}</span>
                              <span className="text-xs text-muted-foreground">{log.user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{log.changeReason}</TableCell>
                          <TableCell>{log.ipAddress}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{log.changeReason}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No audit log entries found
                        </TableCell>
                  </TableRow>
                    )}
              </TableBody>
            </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}