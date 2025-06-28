"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import MessagingLayout from "@/components/layouts/messaging-layout"

// Types
interface NotificationCategory {
  id: string
  name: string
  description: string
  key: string
}

interface NotificationPreference {
  id: string
  categoryId: string
  email: boolean
  push: boolean
  inApp: boolean
  sms: boolean
}

interface NotificationSchedule {
  enabled: boolean
  startTime: string
  endTime: string
  timezone: string
  quietDays: string[]
}

interface NotificationDigest {
  enabled: boolean
  frequency: "daily" | "weekly" | "monthly"
  time: string
  day?: string
  date?: string
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<NotificationCategory[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [schedule, setSchedule] = useState<NotificationSchedule | null>(null)
  const [digest, setDigest] = useState<NotificationDigest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("preferences")

  // Fetch notification settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      try {
        // Fetch categories
        const categoriesResponse = await fetch("/api/notifications/categories")
        if (!categoriesResponse.ok) {
          throw new Error(`Error fetching notification categories: ${categoriesResponse.status}`)
        }
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)

        // Fetch preferences
        const preferencesResponse = await fetch("/api/notifications/preferences")
        if (!preferencesResponse.ok) {
          throw new Error(`Error fetching notification preferences: ${preferencesResponse.status}`)
        }
        const preferencesData = await preferencesResponse.json()
        setPreferences(preferencesData)

        // Fetch schedule
        const scheduleResponse = await fetch("/api/notifications/schedule")
        if (!scheduleResponse.ok) {
          throw new Error(`Error fetching notification schedule: ${scheduleResponse.status}`)
        }
        const scheduleData = await scheduleResponse.json()
        setSchedule(scheduleData)

        // Fetch digest
        const digestResponse = await fetch("/api/notifications/digest")
        if (!digestResponse.ok) {
          throw new Error(`Error fetching notification digest: ${digestResponse.status}`)
        }
        const digestData = await digestResponse.json()
        setDigest(digestData)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching notification settings:", error)
        toast.error("Failed to load notification settings")
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Update notification preference
  const updatePreference = (categoryId: string, field: keyof NotificationPreference, value: boolean) => {
    setPreferences((prev) => prev.map((pref) => (pref.categoryId === categoryId ? { ...pref, [field]: value } : pref)))
  }

  // Save all settings
  const saveSettings = async () => {
    setIsSaving(true)
    try {
      // Save preferences
      const preferencesResponse = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })

      if (!preferencesResponse.ok) {
        throw new Error(`Error saving notification preferences: ${preferencesResponse.status}`)
      }

      // Save schedule
      if (schedule) {
        const scheduleResponse = await fetch("/api/notifications/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedule),
        })

        if (!scheduleResponse.ok) {
          throw new Error(`Error saving notification schedule: ${scheduleResponse.status}`)
        }
      }

      // Save digest
      if (digest) {
        const digestResponse = await fetch("/api/notifications/digest", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(digest),
        })

        if (!digestResponse.ok) {
          throw new Error(`Error saving notification digest: ${digestResponse.status}`)
        }
      }

      toast.success("Notification settings saved successfully")
    } catch (error) {
      console.error("Error saving notification settings:", error)
      toast.error("Failed to save notification settings")
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <MessagingLayout>
        <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/notifications")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Notification Settings</h1>
              <p className="text-muted-foreground">Customize how you receive notifications</p>
            </div>
          </div>

          <Skeleton className="h-12 w-full mb-6" />

          <div className="space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </MessagingLayout>
    )
  }

  return (
    <MessagingLayout>
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/notifications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">Customize how you receive notifications</p>
          </div>
        </div>

        <Tabs defaultValue="preferences" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-6">
            <TabsTrigger value="preferences">Notification Preferences</TabsTrigger>
            <TabsTrigger value="schedule">Quiet Hours</TabsTrigger>
            <TabsTrigger value="digest">Notification Digest</TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-6">
            {categories.map((category) => {
              const preference = preferences.find((p) => p.categoryId === category.id)
              if (!preference) return null

              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor={`${category.key}-email`} className="flex items-center space-x-2">
                          <span>Email</span>
                        </Label>
                        <Switch
                          id={`${category.key}-email`}
                          checked={preference.email}
                          onCheckedChange={(checked) => updatePreference(category.id, "email", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor={`${category.key}-push`} className="flex items-center space-x-2">
                          <span>Push</span>
                        </Label>
                        <Switch
                          id={`${category.key}-push`}
                          checked={preference.push}
                          onCheckedChange={(checked) => updatePreference(category.id, "push", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor={`${category.key}-inapp`} className="flex items-center space-x-2">
                          <span>In-App</span>
                        </Label>
                        <Switch
                          id={`${category.key}-inapp`}
                          checked={preference.inApp}
                          onCheckedChange={(checked) => updatePreference(category.id, "inApp", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor={`${category.key}-sms`} className="flex items-center space-x-2">
                          <span>SMS</span>
                        </Label>
                        <Switch
                          id={`${category.key}-sms`}
                          checked={preference.sms}
                          onCheckedChange={(checked) => updatePreference(category.id, "sms", checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>Set times when you don't want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quiet-hours-toggle" className="flex items-center space-x-2">
                    <span>Enable Quiet Hours</span>
                  </Label>
                  <Switch
                    id="quiet-hours-toggle"
                    checked={schedule?.enabled || false}
                    onCheckedChange={(checked) => setSchedule((prev) => (prev ? { ...prev, enabled: checked } : null))}
                  />
                </div>

                {schedule?.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time</Label>
                        <input
                          id="start-time"
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) =>
                            setSchedule((prev) => (prev ? { ...prev, startTime: e.target.value } : null))
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time</Label>
                        <input
                          id="end-time"
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => setSchedule((prev) => (prev ? { ...prev, endTime: e.target.value } : null))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={schedule.timezone}
                        onValueChange={(value) => setSchedule((prev) => (prev ? { ...prev, timezone: value } : null))}
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Africa/Nairobi">Nairobi (EAT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quiet Days</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`day-${day}`}
                              checked={schedule.quietDays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSchedule((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          quietDays: [...prev.quietDays, day],
                                        }
                                      : null,
                                  )
                                } else {
                                  setSchedule((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          quietDays: prev.quietDays.filter((d) => d !== day),
                                        }
                                      : null,
                                  )
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor={`day-${day}`} className="capitalize">
                              {day}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digest" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Digest</CardTitle>
                <CardDescription>Receive a summary of your notifications instead of individual alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="digest-toggle">Enable Notification Digest</Label>
                    <p className="text-sm text-muted-foreground">Combine multiple notifications into a single digest</p>
                  </div>
                  <Switch
                    id="digest-toggle"
                    checked={digest?.enabled || false}
                    onCheckedChange={(checked) => setDigest((prev) => (prev ? { ...prev, enabled: checked } : null))}
                  />
                </div>

                {digest?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="digest-frequency">Frequency</Label>
                      <Select
                        value={digest.frequency}
                        onValueChange={(value: "daily" | "weekly" | "monthly") =>
                          setDigest((prev) => (prev ? { ...prev, frequency: value } : null))
                        }
                      >
                        <SelectTrigger id="digest-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="digest-time">Time</Label>
                      <input
                        id="digest-time"
                        type="time"
                        value={digest.time}
                        onChange={(e) => setDigest((prev) => (prev ? { ...prev, time: e.target.value } : null))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    {digest.frequency === "weekly" && (
                      <div className="space-y-2">
                        <Label htmlFor="digest-day">Day of Week</Label>
                        <Select
                          value={digest.day || "monday"}
                          onValueChange={(value) => setDigest((prev) => (prev ? { ...prev, day: value } : null))}
                        >
                          <SelectTrigger id="digest-day">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {digest.frequency === "monthly" && (
                      <div className="space-y-2">
                        <Label htmlFor="digest-date">Day of Month</Label>
                        <Select
                          value={digest.date || "1"}
                          onValueChange={(value) => setDigest((prev) => (prev ? { ...prev, date: value } : null))}
                        >
                          <SelectTrigger id="digest-date">
                            <SelectValue placeholder="Select date" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <SelectItem key={date} value={date.toString()}>
                                {date}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </MessagingLayout>
  )
}
