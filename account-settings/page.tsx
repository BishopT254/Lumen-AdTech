"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

// Icons
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  Key,
  Loader2,
  Lock,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Upload,
  User,
} from "lucide-react"

// Types
interface UserAccount {
  id: string
  name: string
  email: string
  emailVerified: string | null
  image: string | null
  role: "ADMIN" | "ADVERTISER" | "PARTNER"
  createdAt: string
  updatedAt: string
  bio: any | null
  preferences: {
    theme: "light" | "dark" | "system"
    emailFrequency: string
    dashboardLayout: any
  } | null
  advertiser?: {
    id: string
    companyName: string
    contactPerson: string
    phoneNumber: string
    address: string | null
    city: string | null
    country: string | null
  } | null
  partner?: {
    id: string
    companyName: string
    contactPerson: string
    phoneNumber: string
    address: string | null
    city: string | null
    country: string | null
    commissionRate: number
    paymentDetails: any | null
  } | null
  admin?: {
    id: string
    permissions: any
  } | null
  apiKeys: ApiKey[]
  sessions: Session[]
}

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: any
  lastUsed: string | null
  expiresAt: string | null
  createdAt: string
}

interface Session {
  id: string
  expires: string
  sessionToken: string
}

interface PaymentMethod {
  id: string
  type: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface BillingInfo {
  paymentMethods: PaymentMethod[]
  invoices: {
    id: string
    invoiceNumber: string
    amount: number
    status: string
    dueDate: string
    paidDate: string | null
  }[]
}

// Form schemas
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  bio: z.any().optional(),
  image: z.string().optional(),
})

const companyFormSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  phoneNumber: z.string().min(5, { message: "Phone number must be at least 5 characters." }),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

const apiKeyFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  permissions: z.record(z.boolean()).optional(),
  expiresAt: z.string().optional(),
})

const notificationFormSchema = z.object({
  emailFrequency: z.enum(["daily", "weekly", "important", "never"]),
  marketingEmails: z.boolean().default(false),
  securityAlerts: z.boolean().default(true),
  accountActivity: z.boolean().default(true),
  productUpdates: z.boolean().default(true),
})

export default function AccountSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [showApiKey, setShowApiKey] = useState("")
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialize forms
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      image: "",
    },
  })

  const companyForm = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phoneNumber: "",
      address: "",
      city: "",
      country: "",
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const apiKeyForm = useForm<z.infer<typeof apiKeyFormSchema>>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: "",
      permissions: {
        read: true,
        write: false,
        delete: false,
      },
      expiresAt: "",
    },
  })

  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailFrequency: "important",
      marketingEmails: false,
      securityAlerts: true,
      accountActivity: true,
      productUpdates: true,
    },
  })

  // Fetch user account data
  const fetchUserAccount = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/account-settings")

      if (!response.ok) {
        throw new Error("Failed to fetch account data")
      }

      const data = await response.json()
      setUserAccount(data.user)
      setBillingInfo(data.billing)

      // Set form values
      profileForm.reset({
        name: data.user.name || "",
        email: data.user.email || "",
        bio: data.user.bio || "",
        image: data.user.image || "",
      })

      if (data.user.role === "ADVERTISER" && data.user.advertiser) {
        companyForm.reset({
          companyName: data.user.advertiser.companyName || "",
          contactPerson: data.user.advertiser.contactPerson || "",
          phoneNumber: data.user.advertiser.phoneNumber || "",
          address: data.user.advertiser.address || "",
          city: data.user.advertiser.city || "",
          country: data.user.advertiser.country || "",
        })
      } else if (data.user.role === "PARTNER" && data.user.partner) {
        companyForm.reset({
          companyName: data.user.partner.companyName || "",
          contactPerson: data.user.partner.contactPerson || "",
          phoneNumber: data.user.partner.phoneNumber || "",
          address: data.user.partner.address || "",
          city: data.user.partner.city || "",
          country: data.user.partner.country || "",
        })
      }

      if (data.user.preferences) {
        notificationForm.reset({
          emailFrequency: data.user.preferences.emailFrequency || "important",
          marketingEmails: data.user.preferences.emailFrequency === "daily",
          securityAlerts: true,
          accountActivity: true,
          productUpdates: data.user.preferences.emailFrequency !== "never",
        })
      }

      setPreviewImage(data.user.image || null)
    } catch (error) {
      console.error("Error fetching account data:", error)
      toast.error("Failed to load account data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [profileForm, companyForm, notificationForm])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchUserAccount()
    }
  }, [status, router, fetchUserAccount])

  // Handle profile form submission
  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    try {
      setIsSaving(true)

      const response = await fetch("/api/account-settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const result = await response.json()
      setUserAccount((prev) => (prev ? { ...prev, ...result.user } : result.user))
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle company form submission
  const onCompanySubmit = async (data: z.infer<typeof companyFormSchema>) => {
    try {
      setIsSaving(true)

      const response = await fetch("/api/account-settings/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update company information")
      }

      const result = await response.json()
      setUserAccount((prev) => {
        if (!prev) return result.user

        if (prev.role === "ADVERTISER") {
          return { ...prev, advertiser: result.advertiser }
        } else if (prev.role === "PARTNER") {
          return { ...prev, partner: result.partner }
        }

        return prev
      })

      toast.success("Company information updated successfully")
    } catch (error) {
      console.error("Error updating company information:", error)
      toast.error("Failed to update company information. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle password form submission
  const onPasswordSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    try {
      setIsSaving(true)

      const response = await fetch("/api/account-settings/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update password")
      }

      toast.success("Password updated successfully")
      passwordForm.reset()
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast.error(error.message || "Failed to update password. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle API key creation
  const onApiKeySubmit = async (data: z.infer<typeof apiKeyFormSchema>) => {
    try {
      setIsCreatingApiKey(true)

      const response = await fetch("/api/account-settings/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create API key")
      }

      const result = await response.json()
      setShowApiKey(result.key)

      // Update user account with new API key
      setUserAccount((prev) => {
        if (!prev) return null
        return {
          ...prev,
          apiKeys: [...(prev.apiKeys || []), result.apiKey],
        }
      })

      apiKeyForm.reset()
      toast.success("API key created successfully")
    } catch (error) {
      console.error("Error creating API key:", error)
      toast.error("Failed to create API key. Please try again.")
    } finally {
      setIsCreatingApiKey(false)
    }
  }

  // Handle API key deletion
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/account-settings/api-keys/${keyId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete API key")
      }

      // Update user account by removing the deleted API key
      setUserAccount((prev) => {
        if (!prev) return null
        return {
          ...prev,
          apiKeys: prev.apiKeys.filter((key) => key.id !== keyId),
        }
      })

      toast.success("API key deleted successfully")
    } catch (error) {
      console.error("Error deleting API key:", error)
      toast.error("Failed to delete API key. Please try again.")
    }
  }

  // Handle notification preferences submission
  const onNotificationSubmit = async (data: z.infer<typeof notificationFormSchema>) => {
    try {
      setIsSaving(true)

      // Convert form data to the format expected by the API
      const emailFrequency = data.marketingEmails
        ? "daily"
        : data.productUpdates
          ? "weekly"
          : data.securityAlerts || data.accountActivity
            ? "important"
            : "never"

      const response = await fetch("/api/account-settings/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailFrequency,
          preferences: {
            securityAlerts: data.securityAlerts,
            accountActivity: data.accountActivity,
            productUpdates: data.productUpdates,
            marketingEmails: data.marketingEmails,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update notification preferences")
      }

      const result = await response.json()
      setUserAccount((prev) => {
        if (!prev) return null
        return {
          ...prev,
          preferences: result.preferences,
        }
      })

      toast.success("Notification preferences updated successfully")
    } catch (error) {
      console.error("Error updating notification preferences:", error)
      toast.error("Failed to update notification preferences. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingImage(true)

      // Create a preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Create form data for upload
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/account-settings/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const result = await response.json()

      // Update form and user account
      profileForm.setValue("image", result.imageUrl)
      setUserAccount((prev) => (prev ? { ...prev, image: result.imageUrl } : null))

      toast.success("Profile image uploaded successfully")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image. Please try again.")
      // Reset preview on error
      setPreviewImage(userAccount?.image || null)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm account deletion")
      return
    }

    try {
      setIsDeleting(true)

      const response = await fetch("/api/account-settings/delete-account", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      toast.success("Account deleted successfully")
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // Handle session revocation
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/account-settings/sessions/${sessionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to revoke session")
      }

      // Update user account by removing the revoked session
      setUserAccount((prev) => {
        if (!prev) return null
        return {
          ...prev,
          sessions: prev.sessions.filter((session) => session.id !== sessionId),
        }
      })

      toast.success("Session revoked successfully")
    } catch (error) {
      console.error("Error revoking session:", error)
      toast.error("Failed to revoke session. Please try again.")
    }
  }

  // Loading state
  if (status === "loading" || isLoading) {
    return <AccountSettingsSkeleton />
  }

  // Check if user is authenticated
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access your account settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>You need to be signed in to view and manage your account settings.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 pt-16 md:px-6 lg:px-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Account Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              <ChevronRight className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center space-y-3 pb-2">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={previewImage || "/placeholder.svg?height=80&width=80"}
                        alt={userAccount?.name || "User"}
                      />
                      <AvatarFallback>{userAccount?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    {isUploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{userAccount?.name}</p>
                    <p className="text-sm text-muted-foreground">{userAccount?.email}</p>
                  </div>
                  <Badge
                    className={`${
                      userAccount?.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        : userAccount?.role === "ADVERTISER"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    }`}
                  >
                    {userAccount?.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col space-y-1">
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab("profile")}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </Button>
              {(userAccount?.role === "ADVERTISER" || userAccount?.role === "PARTNER") && (
                <Button
                  variant={activeTab === "company" ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => setActiveTab("company")}
                >
                  <Building className="mr-2 h-4 w-4" />
                  Company
                </Button>
              )}
              <Button
                variant={activeTab === "security" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab("security")}
              >
                <Lock className="mr-2 h-4 w-4" />
                Security
              </Button>
              <Button
                variant={activeTab === "notifications" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
              <Button
                variant={activeTab === "api" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab("api")}
              >
                <Key className="mr-2 h-4 w-4" />
                API Keys
              </Button>
              {userAccount?.role === "ADVERTISER" && (
                <Button
                  variant={activeTab === "billing" ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => setActiveTab("billing")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Button>
              )}
              <Button
                variant={activeTab === "sessions" ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setActiveTab("sessions")}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Sessions
              </Button>
              <Button
                variant={activeTab === "danger" ? "default" : "ghost"}
                className="justify-start text-destructive"
                onClick={() => setActiveTab("danger")}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Danger Zone
              </Button>
            </div>
          </div>

          {/* Main content area */}
          <div className="space-y-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and profile settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="relative">
                            <Avatar className="h-24 w-24">
                              <AvatarImage
                                src={previewImage || "/placeholder.svg?height=96&width=96"}
                                alt={userAccount?.name || "User"}
                              />
                              <AvatarFallback>{userAccount?.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            {isUploadingImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <h3 className="font-medium">Profile Picture</h3>
                            <p className="text-sm text-muted-foreground">
                              Upload a profile picture to personalize your account
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById("profile-image")?.click()}
                                disabled={isUploadingImage}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                              </Button>
                              {previewImage && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewImage(null)
                                    profileForm.setValue("image", "")
                                  }}
                                  disabled={isUploadingImage}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              )}
                            </div>
                            <input
                              id="profile-image"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={isUploadingImage}
                            />
                          </div>
                        </div>

                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your email address" {...field} />
                              </FormControl>
                              <FormDescription>This is the email address you use to sign in.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us a little about yourself"
                                  className="min-h-[120px]"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>This will be displayed on your public profile.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Company Tab */}
            {activeTab === "company" && (userAccount?.role === "ADVERTISER" || userAccount?.role === "PARTNER") && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Update your company details and business information</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...companyForm}>
                    <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={companyForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={companyForm.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Person</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter contact person name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={companyForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={companyForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter company address"
                                  className="min-h-[80px]"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={companyForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter city" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={companyForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter country" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password to keep your account secure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword.current ? "text" : "password"}
                                      placeholder="Enter your current password"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3"
                                      onClick={() =>
                                        setShowPassword({ ...showPassword, current: !showPassword.current })
                                      }
                                    >
                                      {showPassword.current ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                      <span className="sr-only">
                                        {showPassword.current ? "Hide password" : "Show password"}
                                      </span>
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword.new ? "text" : "password"}
                                      placeholder="Enter your new password"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3"
                                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                    >
                                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      <span className="sr-only">
                                        {showPassword.new ? "Hide password" : "Show password"}
                                      </span>
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormDescription>Password must be at least 8 characters long.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword.confirm ? "text" : "password"}
                                      placeholder="Confirm your new password"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3"
                                      onClick={() =>
                                        setShowPassword({ ...showPassword, confirm: !showPassword.confirm })
                                      }
                                    >
                                      {showPassword.confirm ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                      <span className="sr-only">
                                        {showPassword.confirm ? "Hide password" : "Show password"}
                                      </span>
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" disabled={isSaving}>
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Update Password
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">
                          Protect your account with an additional security layer
                        </p>
                      </div>
                      <Switch checked={false} onCheckedChange={() => toast.info("This feature is coming soon!")} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">Recovery Codes</h3>
                        <p className="text-sm text-muted-foreground">Generate backup codes to access your account</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toast.info("This feature is coming soon!")}>
                        Generate Codes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Manage how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="emailFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Frequency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select email frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Daily Digest</SelectItem>
                                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                                  <SelectItem value="important">Important Updates Only</SelectItem>
                                  <SelectItem value="never">No Emails</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How often would you like to receive email notifications?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        <div className="space-y-4">
                          <h3 className="font-medium">Notification Types</h3>

                          <FormField
                            control={notificationForm.control}
                            name="securityAlerts"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Security Alerts</FormLabel>
                                  <FormDescription>Receive notifications about security-related events</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="accountActivity"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Account Activity</FormLabel>
                                  <FormDescription>Receive notifications about your account activity</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="productUpdates"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Product Updates</FormLabel>
                                  <FormDescription>
                                    Receive notifications about new features and improvements
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="marketingEmails"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Marketing Emails</FormLabel>
                                  <FormDescription>Receive promotional content and special offers</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Preferences
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Create and manage API keys for accessing our API</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {showApiKey && (
                      <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        <AlertTitle>API Key Created Successfully</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 flex items-center gap-2">
                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                              {showApiKey}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(showApiKey)
                                toast.success("API key copied to clipboard")
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          <p className="mt-2 text-sm font-medium">
                            Make sure to copy your API key now. You won't be able to see it again!
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Form {...apiKeyForm}>
                      <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={apiKeyForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter a name for this API key" {...field} />
                                </FormControl>
                                <FormDescription>A descriptive name to help you identify this key</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={apiKeyForm.control}
                            name="expiresAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expiration Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormDescription>Leave blank for a non-expiring key</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium">Permissions</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="read-permission"
                                checked={apiKeyForm.watch("permissions.read")}
                                onCheckedChange={(checked) => {
                                  apiKeyForm.setValue("permissions.read", checked)
                                }}
                              />
                              <Label htmlFor="read-permission">Read</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="write-permission"
                                checked={apiKeyForm.watch("permissions.write")}
                                onCheckedChange={(checked) => {
                                  apiKeyForm.setValue("permissions.write", checked)
                                }}
                              />
                              <Label htmlFor="write-permission">Write</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="delete-permission"
                                checked={apiKeyForm.watch("permissions.delete")}
                                onCheckedChange={(checked) => {
                                  apiKeyForm.setValue("permissions.delete", checked)
                                }}
                              />
                              <Label htmlFor="delete-permission">Delete</Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" disabled={isCreatingApiKey}>
                            {isCreatingApiKey ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create API Key
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h3 className="font-medium">Your API Keys</h3>
                      {userAccount?.apiKeys && userAccount.apiKeys.length > 0 ? (
                        <div className="space-y-4">
                          {userAccount.apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-1">
                                <p className="font-medium">{key.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Created: {new Date(key.createdAt).toLocaleDateString()}
                                  {key.lastUsed && ` • Last used: ${new Date(key.lastUsed).toLocaleDateString()}`}
                                  {key.expiresAt && ` • Expires: ${new Date(key.expiresAt).toLocaleDateString()}`}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  {key.permissions.read && <Badge variant="outline">Read</Badge>}
                                  {key.permissions.write && <Badge variant="outline">Write</Badge>}
                                  {key.permissions.delete && <Badge variant="outline">Delete</Badge>}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteApiKey(key.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete API key</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-8 text-center">
                          <h3 className="font-medium">No API Keys</h3>
                          <p className="text-sm text-muted-foreground mt-1">You haven't created any API keys yet.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Documentation</CardTitle>
                    <CardDescription>Learn how to use our API to integrate with your applications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">API Reference</h3>
                        <p className="text-sm text-muted-foreground">
                          Comprehensive documentation for all API endpoints
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/api/docs" target="_blank">
                          <FileText className="mr-2 h-4 w-4" />
                          View Docs
                        </Link>
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-medium">API Changelog</h3>
                        <p className="text-sm text-muted-foreground">Stay updated with the latest API changes</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/api/changelog" target="_blank">
                          <FileText className="mr-2 h-4 w-4" />
                          View Changelog
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && userAccount?.role === "ADVERTISER" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Manage your payment methods and billing information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
                      <div className="space-y-4">
                        {billingInfo.paymentMethods.map((method) => (
                          <div key={method.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center space-x-4">
                              <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                                <CreditCard className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {method.type} •••• {method.last4}
                                  {method.isDefault && (
                                    <Badge className="ml-2" variant="outline">
                                      Default
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Expires {method.expMonth}/{method.expYear}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete payment method</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <h3 className="font-medium">No Payment Methods</h3>
                        <p className="text-sm text-muted-foreground mt-1">You haven't added any payment methods yet.</p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button onClick={() => toast.info("This feature is coming soon!")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Payment Method
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download your past invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
                      <div className="space-y-4">
                        {billingInfo.invoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(invoice.dueDate).toLocaleDateString()} • ${invoice.amount.toFixed(2)}
                              </p>
                              <Badge
                                className={
                                  invoice.status === "PAID"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : invoice.status === "UNPAID"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                }
                              >
                                {invoice.status}
                              </Badge>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <h3 className="font-medium">No Invoices</h3>
                        <p className="text-sm text-muted-foreground mt-1">You don't have any invoices yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your active login sessions across devices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userAccount?.sessions && userAccount.sessions.length > 0 ? (
                    <div className="space-y-4">
                      {userAccount.sessions.map((session) => {
                        const isCurrentSession = session.id === userAccount.sessions[0]?.id
                        return (
                          <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center space-x-4">
                              <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {isCurrentSession ? "Current Session" : "Session"}
                                  {isCurrentSession && (
                                    <Badge className="ml-2" variant="outline">
                                      Current
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Expires: {new Date(session.expires).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCurrentSession}
                              onClick={() => handleRevokeSession(session.id)}
                            >
                              {isCurrentSession ? "Active" : "Revoke"}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <h3 className="font-medium">No Active Sessions</h3>
                      <p className="text-sm text-muted-foreground mt-1">You don't have any active sessions.</p>
                    </div>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Session Management</AlertTitle>
                    <AlertDescription>
                      Revoking a session will immediately log out that device. Your current session cannot be revoked.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-destructive p-4">
                    <div className="flex flex-col space-y-2">
                      <h3 className="font-medium text-destructive">Delete Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <div className="flex justify-end">
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="destructive">Delete Account</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Are you absolutely sure?</DialogTitle>
                              <DialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove all
                                associated data from our servers.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm font-medium">
                                Please type <span className="font-bold">DELETE</span> to confirm:
                              </p>
                              <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE to confirm"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete Account"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col space-y-2">
                      <h3 className="font-medium">Export Account Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Download a copy of all your personal data stored in our system.
                      </p>
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => toast.info("This feature is coming soon!")}>
                          <Download className="mr-2 h-4 w-4" />
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountSettingsSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 pt-16 md:px-6 lg:px-8">
      <div className="flex flex-col space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-[180px] w-full" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>

          {/* Main content area skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
