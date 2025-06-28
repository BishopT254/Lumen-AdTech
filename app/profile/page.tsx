"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import {
  Settings,
  Monitor,
  MapPin,
  LogIn,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Award,
  Calendar,
  Shield,
  Users,
  Bell,
  Building,
  DollarSign,
  ArrowLeft,
  Download,
  ChevronRight,
  Edit,
  Save,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { JSX } from "react"

// Types based on Prisma schema
interface UserProfile {
  id: string
  name: string
  email: string
  image: string
  role: "ADMIN" | "ADVERTISER" | "PARTNER"
  bio: string
  company: string
  position: string
  location: string
  phone: string
  website: string
  createdAt: string
  updatedAt: string
  lastActive: string
  preferences: {
    theme: "light" | "dark" | "system"
    notifications: boolean
    newsletter: boolean
    marketingEmails: boolean
  }
  stats: {
    campaignsCreated?: number
    totalImpressions?: number
    totalClicks?: number
    totalConversions?: number
    averageCTR?: number
    totalSpend?: number
    totalDevices?: number
    totalEngagements?: number
    totalEarnings?: number
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
  }>
  certifications: Array<{
    id: string
    name: string
    issuer: string
    date: string
    expiryDate: string | null
  }>
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [editableProfile, setEditableProfile] = useState<Partial<UserProfile> | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchUserProfile()
    }
  }, [status, router])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/profile")

      if (!response.ok) {
        throw new Error("Failed to fetch profile data")
      }

      const data = await response.json()
      setProfile(data)
      setEditableProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Failed to load profile data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!editableProfile) return

    setLoading(true)

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editableProfile),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setIsEditing(false)

      toast.success("Your profile has been updated successfully.")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!editableProfile) return

    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setEditableProfile({
        ...editableProfile,
        [parent]: {
          ...editableProfile[parent as keyof UserProfile],
          [child]: value,
        },
      })
    } else {
      setEditableProfile({
        ...editableProfile,
        [field]: value,
      })
    }
  }

  const handleCancel = () => {
    setEditableProfile(profile)
    setIsEditing(false)
  }

  const getDashboardUrl = () => {
    if (!session?.user?.role) return "/dashboard"

    switch (session.user.role) {
      case "ADMIN":
        return "/admin"
      case "ADVERTISER":
        return "/advertiser"
      case "PARTNER":
        return "/partner"
      default:
        return "/dashboard"
    }
  }

  if (status === "loading" || loading) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We couldn't load your profile information. Please try again later or contact support.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.refresh()} variant="outline" className="mr-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button asChild>
              <Link href="/support">
                <MessageSquare className="mr-2 h-4 w-4" />
                Contact Support
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 mt-16 pb-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(getDashboardUrl())} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">My Profile</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your personal information and account settings
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left sidebar */}
        <div className="md:col-span-1">
          <ProfileSidebar profile={profile} />
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Statistics
              </TabsTrigger>
              <TabsTrigger
                value="certifications"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Certifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="hidden md:block data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Security
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="hidden lg:block data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
              >
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ProfileOverview
                profile={profile}
                editableProfile={editableProfile}
                isEditing={isEditing}
                handleInputChange={handleInputChange}
              />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTab activities={profile.recentActivity} />
            </TabsContent>

            <TabsContent value="stats">
              <StatsTab stats={profile.stats} role={profile.role} />
            </TabsContent>

            <TabsContent value="certifications">
              <CertificationsTab certifications={profile.certifications} />
            </TabsContent>

            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="preferences">
              <PreferencesTab
                preferences={profile.preferences}
                editablePreferences={editableProfile?.preferences}
                isEditing={isEditing}
                handleInputChange={handleInputChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ProfileSidebar({ profile }: { profile: UserProfile }) {
  const roleColors = {
    ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    ADVERTISER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    PARTNER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  }

  const roleIcons = {
    ADMIN: <Shield className="h-4 w-4 mr-1" />,
    ADVERTISER: <BarChart3 className="h-4 w-4 mr-1" />,
    PARTNER: <Users className="h-4 w-4 mr-1" />,
  }

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 pb-0">
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            <Image
              src={profile.image || "/placeholder.svg?height=128&width=128"}
              alt={profile.name}
              className="rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md"
              fill
              priority
            />
          </div>
        </div>
        <CardTitle className="text-2xl">{profile.name}</CardTitle>
        <CardDescription className="text-md">{profile.email}</CardDescription>
        <div className="mt-2">
          <Badge className={cn("text-xs py-1 px-2", roleColors[profile.role])}>
            <span className="flex items-center">
              {roleIcons[profile.role]}
              {profile.role}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {profile.company && (
            <div className="flex items-center text-sm">
              <Building className="h-4 w-4 mr-2 text-gray-500" />
              <span>{profile.company}</span>
              {profile.position && <span className="ml-1">• {profile.position}</span>}
            </div>
          )}

          {profile.location && (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span>{profile.location}</span>
            </div>
          )}

          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center text-sm">
            <LogIn className="h-4 w-4 mr-2 text-gray-500" />
            <span>Last active {new Date(profile.lastActive).toLocaleDateString()}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <Link
            href="/account-settings"
            className="flex items-center justify-between text-sm py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center">
              <Settings className="h-4 w-4 mr-2 text-gray-500" />
              <span>Account Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          <Link
            href="/notifications"
            className="flex items-center justify-between text-sm py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center">
              <Bell className="h-4 w-4 mr-2 text-gray-500" />
              <span>Notifications</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          <Link
            href={`/download-data?userId=${profile.id}`}
            className="flex items-center justify-between text-sm py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center">
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              <span>Download Data</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileOverview({
  profile,
  editableProfile,
  isEditing,
  handleInputChange,
}: {
  profile: UserProfile
  editableProfile: Partial<UserProfile> | null
  isEditing: boolean
  handleInputChange: (field: string, value: any) => void
}) {
  if (!editableProfile) return null

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableProfile.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">{profile.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">{profile.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={editableProfile.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full"
                  placeholder="Enter your phone number"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {profile.phone || "Not provided"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableProfile.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="w-full"
                  placeholder="City, Country"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {profile.location || "Not provided"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableProfile.company || ""}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="w-full"
                  placeholder="Enter your company name"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {profile.company || "Not provided"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableProfile.position || ""}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  className="w-full"
                  placeholder="Enter your job title"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {profile.position || "Not provided"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
              {isEditing ? (
                <Input
                  type="url"
                  value={editableProfile.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="w-full"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                  {profile.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Bio</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <Textarea
              value={editableProfile.bio || ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              className="w-full min-h-[150px]"
              placeholder="Tell us about yourself..."
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <p className="whitespace-pre-wrap text-base">{profile.bio || "No bio provided."}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityTab({ activities }: { activities: UserProfile["recentActivity"] }) {
  if (!activities || activities.length === 0) {
    return (
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardContent className="py-10 text-center">
          <p className="text-gray-500">No recent activity found.</p>
        </CardContent>
      </Card>
    )
  }

  const activityTypeIcons: Record<string, JSX.Element> = {
    login: <LogIn className="h-4 w-4" />,
    campaign: <BarChart3 className="h-4 w-4" />,
    settings: <Settings className="h-4 w-4" />,
    message: <MessageSquare className="h-4 w-4" />,
    certification: <Award className="h-4 w-4" />,
    payment: <DollarSign className="h-4 w-4" />,
    device: <Monitor className="h-4 w-4" />,
    earning: <DollarSign className="h-4 w-4" />,
    config: <Settings className="h-4 w-4" />,
    notification: <Bell className="h-4 w-4" />,
  }

  const getActivityIcon = (type: string) => {
    const baseType = type.split(".")[0].toLowerCase()
    return activityTypeIcons[baseType] || <Bell className="h-4 w-4" />
  }

  const getActivityColor = (type: string) => {
    const baseType = type.split(".")[0].toLowerCase()
    switch (baseType) {
      case "login":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      case "campaign":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      case "payment":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      case "device":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
      case "earning":
        return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.map((activity) => (
          <div key={activity.id} className="flex py-4 first:pt-6 last:pb-0">
            <div
              className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${getActivityColor(activity.type)}`}
            >
              {getActivityIcon(activity.type)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{activity.description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-center">
        <Button variant="outline" size="sm">
          View All Activity
        </Button>
      </CardFooter>
    </Card>
  )
}

function StatsTab({ stats, role }: { stats: UserProfile["stats"]; role: UserProfile["role"] }) {
  // Different stats visualization based on user role
  const renderRoleSpecificStats = () => {
    switch (role) {
      case "ADVERTISER":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Campaigns Created"
              value={stats.campaignsCreated || 0}
              icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
              color="bg-blue-50 dark:bg-blue-900/10"
            />
            <StatCard
              title="Total Impressions"
              value={(stats.totalImpressions || 0).toLocaleString()}
              icon={<Users className="h-5 w-5 text-green-600" />}
              color="bg-green-50 dark:bg-green-900/10"
            />
            <StatCard
              title="Total Clicks"
              value={(stats.totalClicks || 0).toLocaleString()}
              icon={<LogIn className="h-5 w-5 text-purple-600" />}
              color="bg-purple-50 dark:bg-purple-900/10"
            />
            <StatCard
              title="Total Conversions"
              value={(stats.totalConversions || 0).toLocaleString()}
              icon={<Award className="h-5 w-5 text-yellow-600" />}
              color="bg-yellow-50 dark:bg-yellow-900/10"
            />
            <StatCard
              title="Average CTR"
              value={`${(stats.averageCTR || 0).toFixed(2)}%`}
              icon={<BarChart3 className="h-5 w-5 text-red-600" />}
              color="bg-red-50 dark:bg-red-900/10"
            />
            <StatCard
              title="Total Spend"
              value={`$${(stats.totalSpend || 0).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5 text-gray-600" />}
              color="bg-gray-50 dark:bg-gray-900/10"
            />
          </div>
        )
      case "PARTNER":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Devices"
              value={(stats.totalDevices || 0).toLocaleString()}
              icon={<Monitor className="h-5 w-5 text-blue-600" />}
              color="bg-blue-50 dark:bg-blue-900/10"
            />
            <StatCard
              title="Total Impressions"
              value={(stats.totalImpressions || 0).toLocaleString()}
              icon={<Users className="h-5 w-5 text-green-600" />}
              color="bg-green-50 dark:bg-green-900/10"
            />
            <StatCard
              title="Total Engagements"
              value={(stats.totalEngagements || 0).toLocaleString()}
              icon={<LogIn className="h-5 w-5 text-purple-600" />}
              color="bg-purple-50 dark:bg-purple-900/10"
            />
            <StatCard
              title="Average CTR"
              value={`${(stats.averageCTR || 0).toFixed(2)}%`}
              icon={<BarChart3 className="h-5 w-5 text-red-600" />}
              color="bg-red-50 dark:bg-red-900/10"
            />
            <StatCard
              title="Total Earnings"
              value={`$${(stats.totalEarnings || 0).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              color="bg-emerald-50 dark:bg-emerald-900/10"
            />
          </div>
        )
      case "ADMIN":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Active Campaigns"
              value={(stats.campaignsCreated || 0).toString()}
              icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
              color="bg-blue-50 dark:bg-blue-900/10"
            />
            <StatCard
              title="Total Impressions"
              value={(stats.totalImpressions || 0).toLocaleString()}
              icon={<Users className="h-5 w-5 text-green-600" />}
              color="bg-green-50 dark:bg-green-900/10"
            />
            <StatCard
              title="Total Revenue"
              value={`$${(stats.totalSpend || 0).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5 text-purple-600" />}
              color="bg-purple-50 dark:bg-purple-900/10"
            />
          </div>
        )
      default:
        return (
          <div className="text-center py-6">
            <p className="text-gray-500">No statistics available for this user role.</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Performance Statistics</CardTitle>
          <CardDescription>Your key metrics and performance indicators</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{renderRoleSpecificStats()}</CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: { title: string; value: string | number; icon: JSX.Element; color: string }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardContent className={`p-0`}>
        <div className={`flex items-center justify-between p-6 ${color}`}>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CertificationsTab({ certifications }: { certifications: UserProfile["certifications"] }) {
  if (!certifications || certifications.length === 0) {
    return (
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardContent className="py-10 text-center">
          <p className="text-gray-500">No certifications found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
        <CardTitle>Professional Certifications</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-4 border rounded-lg dark:border-gray-700 hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{cert.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Issued by {cert.issuer}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <Award className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Issued: {new Date(cert.date).toLocaleDateString()}</span>
                {cert.expiryDate && (
                  <span className="ml-4">Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
        <Button className="w-full" variant="outline">
          Add New Certification
        </Button>
      </CardFooter>
    </Card>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Password & Authentication</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Change Password</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your password regularly to maintain account security.
              </p>
              <Button variant="outline">Change Password</Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add an extra layer of security to your account.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Status:{" "}
                  <Badge
                    variant="outline"
                    className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  >
                    Not Enabled
                  </Badge>
                </span>
                <Button>Enable 2FA</Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Active Sessions</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your active login sessions across devices.
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex items-center">
                    <Monitor className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <p className="font-medium">Chrome on Windows</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last active: Just now (Current session)
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    Current
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex items-center">
                    <Monitor className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <p className="font-medium">Safari on iPhone</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last active: 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Login History</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* We'll fetch this data from the API in a real implementation */}
            <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center">
                <Monitor className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">Chrome on Windows</p>
                    <Badge className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Success
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Today, 12:45 PM • 192.168.1.1 • New York, USA
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center">
                <Monitor className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">Safari on iPhone</p>
                    <Badge className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Success
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Today, 10:30 AM • 192.168.0.4 • New York, USA
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center">
                <Monitor className="h-5 w-5 mr-3 text-gray-500" />
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">Firefox on Mac</p>
                    <Badge className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      Failed
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Yesterday, 8:15 PM • 192.168.1.5 • Boston, USA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 dark:bg-gray-800/50 flex justify-center">
          <Button variant="outline">View Full History</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function PreferencesTab({
  preferences,
  editablePreferences,
  isEditing,
  handleInputChange,
}: {
  preferences: UserProfile["preferences"]
  editablePreferences: UserProfile["preferences"] | undefined
  isEditing: boolean
  handleInputChange: (field: string, value: any) => void
}) {
  if (!preferences || !editablePreferences) return null

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Choose how the interface appears</p>
              </div>
              {isEditing ? (
                <select
                  value={editablePreferences.theme}
                  onChange={(e) => handleInputChange("preferences.theme", e.target.value)}
                  className="p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              ) : (
                <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 px-3 py-1">
                  {preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Push Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts for important activity</p>
              </div>
              {isEditing ? (
                <Switch
                  checked={editablePreferences.notifications}
                  onCheckedChange={(checked) => handleInputChange("preferences.notifications", checked)}
                />
              ) : (
                <Badge
                  variant="outline"
                  className={
                    preferences.notifications
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }
                >
                  {preferences.notifications ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Newsletter</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive our monthly newsletter</p>
              </div>
              {isEditing ? (
                <Switch
                  checked={editablePreferences.newsletter}
                  onCheckedChange={(checked) => handleInputChange("preferences.newsletter", checked)}
                />
              ) : (
                <Badge
                  variant="outline"
                  className={
                    preferences.newsletter
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }
                >
                  {preferences.newsletter ? "Subscribed" : "Unsubscribed"}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Marketing Emails</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive promotional content and offers</p>
              </div>
              {isEditing ? (
                <Switch
                  checked={editablePreferences.marketingEmails}
                  onCheckedChange={(checked) => handleInputChange("preferences.marketingEmails", checked)}
                />
              ) : (
                <Badge
                  variant="outline"
                  className={
                    preferences.marketingEmails
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }
                >
                  {preferences.marketingEmails ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Download Your Data</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get a copy of all your personal information</p>
              </div>
              <Button variant="outline">Download</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Delete Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently remove your account and all associated data
                </p>
              </div>
              <Button variant="destructive">Delete Account</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 mt-16 pb-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="border rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>

          <div className="space-y-6">
            <div className="border rounded-lg shadow-sm p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg shadow-sm p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
