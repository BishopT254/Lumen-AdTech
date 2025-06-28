"use client"

import { DialogTitle } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { format } from "date-fns"
import { toast } from "sonner"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { UserRole } from "@prisma/client"

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

// Icons
import {
  ArrowLeft,
  Save,
  Trash2,
  Mail,
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Settings,
  BellRing,
  History,
  Activity,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react"
import { AlertCircle, Unlock } from "lucide-react"

// Define TypeScript interfaces based on Prisma schema
interface UserDetail {
  id: string
  name: string | null
  email: string
  role: UserRole
  emailVerified: Date | null
  image: string | null
  bio?: string | null
  createdAt: Date
  updatedAt: Date
  advertiser?: AdvertiserDetail | null
  partner?: PartnerDetail | null
  admin?: AdminDetail | null
  status?: string
  lastLogin?: Date | null
}

interface AdvertiserDetail {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

interface PartnerDetail {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  businessType?: string | null
  commissionRate?: number
  status?: string
}

interface AdminDetail {
  id: string
  userId: string
  permissions: Record<string, boolean>
}

interface UserActivity {
  id: string
  userId: string
  action: string
  description?: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

interface Permission {
  id: string
  name: string
  description: string
}

// Define validation schema based on Prisma model
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "ADVERTISER", "PARTNER"]),
  bio: z.string().optional().or(z.literal("")),
  sendWelcomeEmail: z.boolean().default(false),
  isActive: z.boolean().default(true),

  // Advertiser fields
  companyName: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),

  // Partner fields
  businessType: z.string().optional().or(z.literal("")),
  commissionRate: z.number().min(0).max(100).optional(),
  partnerStatus: z.string().optional(),

  // Admin fields
  permissions: z.record(z.boolean()).optional(),
})

type FormValues = z.infer<typeof userSchema>

// Define common permissions for admin users
const defaultAdminPermissions = {
  manageUsers: false,
  manageAdvertisers: false,
  managePartners: false,
  manageCampaigns: false,
  managePayments: false,
  manageSettings: false,
  viewReports: false,
  viewAnalytics: false,
  approveContent: false,
  manageDevices: false,
  manageApiKeys: false,
  manageWebhooks: false,
  manageIntegrations: false,
  manageFeatureFlags: false,
  viewAuditLogs: false,
}

// API functions
const fetchUser = async (userId: string): Promise<UserDetail> => {
  const response = await fetch(`/api/admin/users/${userId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch user")
  }
  return response.json()
}

const fetchUserActivity = async (userId: string): Promise<UserActivity[]> => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/activity`)
    if (!response.ok) {
      throw new Error("Failed to fetch user activity")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching user activity:", error)
    return []
  }
}

const fetchPermissions = async (): Promise<Permission[]> => {
  try {
    const response = await fetch("/api/admin/permissions")
    if (!response.ok) {
      throw new Error("Failed to fetch permissions")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return []
  }
}

const updateUser = async (userId: string, data: FormValues): Promise<UserDetail> => {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to update user")
  }

  return response.json()
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { data: session } = useSession()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // State
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [originalData, setOriginalData] = useState<FormValues | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false)
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false)
  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false)
  const [showBillingDialog, setShowBillingDialog] = useState(false)
  const [showIntegrationsDialog, setShowIntegrationsDialog] = useState(false)
  const [showApiKeysDialog, setShowApiKeysDialog] = useState(false)
  const [showWebhooksDialog, setShowWebhooksDialog] = useState(false)
  const [showDevicesDialog, setShowDevicesDialog] = useState(false)
  const [showSessionsDialog, setShowSessionsDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false)
  const [newRole, setNewRole] = useState<UserRole | null>(null)
  const [showRoleChangeWarning, setShowRoleChangeWarning] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showErrorMessage, setShowErrorMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showFormDirtyWarning, setShowFormDirtyWarning] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showSuspendConfirmation, setShowSuspendConfirmation] = useState(false)
  const [showUnsuspendConfirmation, setShowUnsuspendConfirmation] = useState(false)
  const [showVerifyConfirmation, setShowVerifyConfirmation] = useState(false)
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false)
  const [showChangeRoleConfirmation, setShowChangeRoleConfirmation] = useState(false)
  const [showChangeEmailConfirmation, setShowChangeEmailConfirmation] = useState(false)
  const [showChangePasswordConfirmation, setShowChangePasswordConfirmation] = useState(false)
  const [showChangeNameConfirmation, setShowChangeNameConfirmation] = useState(false)
  const [showChangeBioConfirmation, setShowChangeBioConfirmation] = useState(false)
  const [showChangeCompanyConfirmation, setShowChangeCompanyConfirmation] = useState(false)
  const [showChangeContactConfirmation, setShowChangeContactConfirmation] = useState(false)
  const [showChangePhoneConfirmation, setShowChangePhoneConfirmation] = useState(false)
  const [showChangeAddressConfirmation, setShowChangeAddressConfirmation] = useState(false)
  const [showChangeCityConfirmation, setShowChangeCityConfirmation] = useState(false)
  const [showChangeStateConfirmation, setShowChangeStateConfirmation] = useState(false)
  const [showChangePostalCodeConfirmation, setShowChangePostalCodeConfirmation] = useState(false)
  const [showChangeCountryConfirmation, setShowChangeCountryConfirmation] = useState(false)
  const [showChangeBusinessTypeConfirmation, setShowChangeBusinessTypeConfirmation] = useState(false)
  const [showChangeCommissionRateConfirmation, setShowChangeCommissionRateConfirmation] = useState(false)
  const [showChangePartnerStatusConfirmation, setShowChangePartnerStatusConfirmation] = useState(false)
  const [showChangePermissionsConfirmation, setShowChangePermissionsConfirmation] = useState(false)
  const [showChangeSendWelcomeEmailConfirmation, setShowChangeSendWelcomeEmailConfirmation] = useState(false)
  const [showChangeIsActiveConfirmation, setShowChangeIsActiveConfirmation] = useState(false)
  const [showChangeImageConfirmation, setShowChangeImageConfirmation] = useState(false)
  const [showChangeEmailVerifiedConfirmation, setShowChangeEmailVerifiedConfirmation] = useState(false)
  const [showChangeCreatedAtConfirmation, setShowChangeCreatedAtConfirmation] = useState(false)
  const [showChangeUpdatedAtConfirmation, setShowChangeUpdatedAtConfirmation] = useState(false)
  const [showChangeLastLoginConfirmation, setShowChangeLastLoginConfirmation] = useState(false)
  const [showChangeStatusConfirmation, setShowChangeStatusConfirmation] = useState(false)
  const [showChangeIdConfirmation, setShowChangeIdConfirmation] = useState(false)
  const [showChangeUserIdConfirmation, setShowChangeUserIdConfirmation] = useState(false)
  const [showChangeAdvertiserIdConfirmation, setShowChangeAdvertiserIdConfirmation] = useState(false)
  const [showChangePartnerIdConfirmation, setShowChangePartnerIdConfirmation] = useState(false)
  const [showChangeAdminIdConfirmation, setShowChangeAdminIdConfirmation] = useState(false)
  const [showChangeAdvertiserConfirmation, setShowChangeAdvertiserConfirmation] = useState(false)
  const [showChangePartnerConfirmation, setShowChangePartnerConfirmation] = useState(false)
  const [showChangeAdminConfirmation, setShowChangeAdminConfirmation] = useState(false)
  const [showChangeUserConfirmation, setShowChangeUserConfirmation] = useState(false)
  const [showChangeRoleTypeConfirmation, setShowChangeRoleTypeConfirmation] = useState(false)
  const [showChangeUserRoleConfirmation, setShowChangeUserUserRoleConfirmation] = useState(false)
  const [showChangeUserStatusConfirmation, setShowChangeUserUserStatusConfirmation] = useState(false)
  const [showChangeUserEmailConfirmation, setShowChangeUserUserEmailConfirmation] = useState(false)
  const [showChangeUserNameConfirmation, setShowChangeUserUserNameConfirmation] = useState(false)
  const [showChangeUserBioConfirmation, setShowChangeUserBioConfirmation] = useState(false)
  const [showChangeUserImageConfirmation, setShowChangeUserImageConfirmation] = useState(false)
  const [showChangeUserEmailVerifiedConfirmation, setShowChangeUserEmailVerifiedConfirmation] = useState(false)
  const [showChangeUserCreatedAtConfirmation, setShowChangeUserCreatedAtConfirmation] = useState(false)
  const [showChangeUserUpdatedAtConfirmation, setShowChangeUserUpdatedAtConfirmation] = useState(false)
  const [showChangeUserLastLoginConfirmation, setShowChangeUserLastLoginConfirmation] = useState(false)
  const [showChangeUserStatusConfirmation2, setShowChangeUserStatusConfirmation2] = useState(false)
  const [showChangeUserIdConfirmation2, setShowChangeUserIdConfirmation2] = useState(false)
  const [showChangeUserUserIdConfirmation, setShowChangeUserUserUserIdConfirmation] = useState(false)
  const [showChangeUserAdvertiserIdConfirmation, setShowChangeUserUserAdvertiserIdConfirmation] = useState(false)
  const [showChangeUserPartnerIdConfirmation, setShowChangeUserUserPartnerIdConfirmation] = useState(false)
  const [showChangeUserAdminIdConfirmation, setShowChangeUserUserAdminIdConfirmation] = useState(false)
  const [showChangeUserAdvertiserConfirmation, setShowChangeUserUserAdvertiserConfirmation] = useState(false)
  const [showChangeUserPartnerConfirmation, setShowChangeUserUserPartnerConfirmation] = useState(false)
  const [showChangeUserAdminConfirmation, setShowChangeUserUserAdminConfirmation] = useState(false)
  const [showChangeUserUserConfirmation, setShowChangeUserUserUserConfirmation] = useState(false)
  const [showChangeUserRoleTypeConfirmation, setShowChangeUserUserRoleTypeConfirmation] = useState(false)
  const [showChangeUserUserRoleConfirmation, setShowChangeUserUserUserRoleConfirmation] = useState(false)
  const [showChangeUserUserStatusConfirmation, setShowChangeUserUserUserStatusConfirmation] = useState(false)
  const [showChangeUserUserEmailConfirmation, setShowChangeUserUserUserEmailConfirmation] = useState(false)
  const [showChangeUserUserUserNameConfirmation, setShowChangeUserUserUserNameConfirmation] = useState(false)
  const [showChangeUserUserBioConfirmation, setShowChangeUserUserUserBioConfirmation] = useState(false)
  const [showChangeUserUserImageConfirmation, setShowChangeUserUserUserImageConfirmation] = useState(false)
  const [showChangeUserUserEmailVerifiedConfirmation, setShowChangeUserUserUserEmailVerifiedConfirmation] =
    useState(false)
  const [showChangeUserUserCreatedAtConfirmation, setShowChangeUserUserUserCreatedAtConfirmation] = useState(false)
  const [showChangeUserUserUpdatedAtConfirmation, setShowChangeUserUserUserUpdatedAtConfirmation] = useState(false)
  const [showChangeUserUserLastLoginConfirmation, setShowChangeUserUserUserLastLoginConfirmation] = useState(false)
  const [showChangeUserUserStatusConfirmation2, setShowChangeUserUserUserStatusConfirmation2] = useState(false)
  const [showChangeUserUserIdConfirmation2, setShowChangeUserUserUserIdConfirmation2] = useState(false)
  const [showChangeUserUserUserIdConfirmation, setShowChangeUserUserUserUserIdConfirmation] = useState(false)
  const [showChangeUserUserAdvertiserIdConfirmation, setShowChangeUserUserUserAdvertiserIdConfirmation] =
    useState(false)
  const [showChangeUserUserPartnerIdConfirmation, setShowChangeUserUserUserPartnerIdConfirmation] = useState(false)
  const [showChangeUserUserAdminIdConfirmation, setShowChangeUserUserUserAdminIdConfirmation] = useState(false)
  const [showChangeUserUserAdvertiserConfirmation, setShowChangeUserUserUserAdvertiserConfirmation] = useState(false)
  const [showChangeUserUserPartnerConfirmation, setShowChangeUserUserUserPartnerConfirmation] = useState(false)
  const [showChangeUserUserAdminConfirmation, setShowChangeUserUserUserAdminConfirmation] = useState(false)
  const [showChangeUserUserUserConfirmation, setShowChangeUserUserUserUserConfirmation] = useState(false)
  const [showChangeUserUserUserRoleTypeConfirmation, setShowChangeUserUserUserRoleTypeConfirmation] = useState(false)
  const [showChangeUserUserUserUserRoleConfirmation, setShowChangeUserUserUserUserRoleConfirmation] = useState(false)

  // Get system settings
  const { generalSettings, loading: loadingSettings, error: settingsError } = usePublicSettings()

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "ADVERTISER" as UserRole,
      bio: "",
      sendWelcomeEmail: false,
      isActive: true,
      companyName: "",
      contactPerson: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: generalSettings?.defaultCountry || "",
      businessType: "",
      commissionRate: 30, // Default 30% commission
      partnerStatus: "ACTIVE",
      permissions: defaultAdminPermissions,
    },
  })

  const selectedRole = form.watch("role")
  const formValues = form.watch()

  // Fetch user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        setError(null)
        const userData = await fetchUser(userId)
        setUser(userData)

        // Prepare form values from user data
        const formData: FormValues = {
          name: userData.name || "",
          email: userData.email,
          password: "", // Don't populate password
          role: userData.role,
          bio: userData.bio || "",
          sendWelcomeEmail: false,
          isActive: userData.status !== "suspended",

          // Advertiser fields
          companyName: userData.advertiser?.companyName || "",
          contactPerson: userData.advertiser?.contactPerson || "",
          phoneNumber: userData.advertiser?.phoneNumber || "",
          address: userData.advertiser?.address || "",
          city: userData.advertiser?.city || "",
          state: userData.advertiser?.state || "",
          postalCode: userData.advertiser?.postalCode || "",
          country: userData.advertiser?.country || generalSettings?.defaultCountry || "",

          // Partner fields
          businessType: userData.partner?.businessType || "",
          commissionRate: userData.partner?.commissionRate ? Number(userData.partner.commissionRate) * 100 : 30,
          partnerStatus: userData.partner?.status || "ACTIVE",

          // Admin fields
          permissions: userData.admin?.permissions || defaultAdminPermissions,
        }

        // Set form values
        form.reset(formData)
        setOriginalData(formData)

        // Load user activity
        setLoadingActivity(true)
        const activityData = await fetchUserActivity(userId)
        setUserActivity(activityData)
        setLoadingActivity(false)

        // Load permissions
        setLoadingPermissions(true)
        const permissionsData = await fetchPermissions()
        setPermissions(permissionsData)
        setLoadingPermissions(false)
      } catch (err) {
        console.error("Error loading user:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadUser()
    }
  }, [userId, form, generalSettings?.defaultCountry])

  // Check for form changes
  useEffect(() => {
    if (originalData) {
      const currentValues = form.getValues()

      // Compare current form values with original data
      const hasFormChanges = Object.keys(originalData).some((key) => {
        // Skip password field if empty
        if (key === "password" && !currentValues[key]) return false

        // Special handling for permissions object
        if (key === "permissions" && originalData.permissions && currentValues.permissions) {
          return Object.keys(originalData.permissions).some(
            (permKey) => originalData.permissions?.[permKey] !== currentValues.permissions?.[permKey],
          )
        }

        return originalData[key as keyof FormValues] !== currentValues[key as keyof FormValues]
      })

      setHasChanges(hasFormChanges)
    }
  }, [form, originalData, formValues])

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Only include password if it was changed
      if (!data.password) {
        delete data.password
      }

      const updatedUser = await updateUser(userId, data)

      // Update local state
      setUser(updatedUser)
      setOriginalData(data)
      setHasChanges(false)

      // Show success message
      setSuccessMessage("User updated successfully")
      setShowSuccessMessage(true)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)

      toast({
        title: "Success",
        description: "User updated successfully",
        variant: "default",
      })
    } catch (err) {
      console.error("Error updating user:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")

      // Show error message
      setErrorMessage(err instanceof Error ? err.message : "An unknown error occurred")
      setShowErrorMessage(true)

      // Hide error message after 5 seconds
      setTimeout(() => {
        setShowErrorMessage(false)
      }, 5000)

      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel button
  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true)
    } else {
      router.push("/admin/users")
    }
  }

  // Handle discard changes
  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false)
    router.push("/admin/users")
  }

  // Handle reset form
  const handleResetForm = () => {
    if (originalData) {
      form.reset(originalData)
      setHasChanges(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete user")
      }

      toast.success("Success", {
        description: "User deleted successfully",
        variant: "default",
      })

      // Redirect to users list
      router.push("/admin/users")
    } catch (err) {
      console.error("Error deleting user:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")

      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowDeleteDialog(false)
    }
  }

  // Handle suspend/unsuspend user
  const handleToggleSuspend = async () => {
    try {
      setIsSubmitting(true)

      const newStatus = user?.status === "suspended" ? "active" : "suspended"

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${newStatus === "suspended" ? "suspend" : "unsuspend"} user`)
      }

      // Update local state
      setUser((prev) => (prev ? { ...prev, status: newStatus } : null))

      // Update form value
      form.setValue("isActive", newStatus === "active")

      toast.success("Success", {
        description: `User ${newStatus === "suspended" ? "suspended" : "unsuspended"} successfully`,
        variant: "default",
      })
    } catch (err) {
      console.error(`Error ${user?.status === "suspended" ? "unsuspending" : "suspending"} user:`, err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")

      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowSuspendDialog(false)
    }
  }

  // Handle verify email
  const handleVerifyEmail = async () => {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/admin/users/${userId}/verify-email`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send verification email")
      }

      toast.success("Success", {
        description: "Verification email sent successfully",
        variant: "default",
      })
    } catch (err) {
      console.error("Error sending verification email:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")

      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowVerifyEmailDialog(false)
    }
  }

  // Handle reset password
  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to reset password")
      }

      toast.success("Success", {
        description: "Password reset email sent successfully",
        variant: "default",
      })
    } catch (err) {
      console.error("Error resetting password:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")

      toast.error("Error", {
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setShowResetPasswordDialog(false)
    }
  }

  // Handle role change
  const handleRoleChange = (role: UserRole) => {
    // Check if role is different from current role
    if (role !== user?.role) {
      setNewRole(role)
      setShowRoleChangeWarning(true)
      setShowChangeRoleDialog(true)
    } else {
      form.setValue("role", role)
    }
  }

  // Confirm role change
  const confirmRoleChange = () => {
    if (newRole) {
      form.setValue("role", newRole)
      setShowChangeRoleDialog(false)
      setNewRole(null)
    }
  }

  // Get avatar color based on user ID
  const getAvatarColor = (userId: string) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ]
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Never"
    return format(new Date(date), "PPP")
  }

  // Render role-specific fields
  const renderRoleSpecificFields = () => {
    switch (selectedRole) {
      case "ADVERTISER":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case "PARTNER":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Partner Company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="nonprofit">Non-profit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commissionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <div className="flex items-center space-x-4">
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="flex-1"
                        />
                        <span className="w-12 text-center">{field.value}%</span>
                      </div>
                    </FormControl>
                    <FormDescription>Commission rate for this partner (0-100%)</FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partnerStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case "ADMIN":
        return (
          <div className="space-y-6">
            <div className="rounded-md border p-4">
              <h3 className="mb-3 text-sm font-medium">Admin Permissions</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {permissions.map((permission) => (
                  <FormField
                    key={permission.id}
                    control={form.control}
                    name={`permissions.${permission.id}`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{permission.name}</FormLabel>
                          <FormDescription>{permission.description}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-primary border-gray-200"></div>
        <h3 className="text-lg font-medium">Loading user data...</h3>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load user</h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Edit User</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update user information and settings</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || !hasChanges}>
            {isSubmitting ? (
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
      </div>

      {/* Success message */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert className="bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {showErrorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings error */}
      {settingsError && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Settings Error</AlertTitle>
          <AlertDescription>Could not load system settings. Some default values may not be available.</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column - User info */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Basic user information</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                <AvatarFallback className={user ? getAvatarColor(user.id) : "bg-gray-500"}>
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{user?.name || "Unnamed User"}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <div className="flex space-x-2">
                <Badge
                  variant="outline"
                  className={
                    user?.role === "ADMIN"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      : user?.role === "ADVERTISER"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  }
                >
                  {user?.role}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    user?.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : user?.status === "suspended"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }
                >
                  {user?.status === "suspended" ? "Suspended" : "Active"}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">ID:</span>
                  <span className="font-mono text-xs">{user?.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span>{user?.createdAt ? formatDate(user.createdAt) : "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                  <span>{user?.lastLogin ? formatDate(user.lastLogin) : "Never"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Email Verified:</span>
                  <span>{user?.emailVerified ? formatDate(user.emailVerified) : "No"}</span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="grid w-full grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowResetPasswordDialog(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowVerifyEmailDialog(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Verify Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuspendDialog(true)}
                  className={
                    user?.status === "suspended"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {user?.status === "suspended" ? (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Unsuspend
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Suspend
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest user actions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : userActivity.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {userActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                              <Activity className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-medium">{activity.action}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Info className="h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium">No activity found</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This user has no recorded activity yet.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHistoryDialog(true)}>
                <History className="mr-2 h-4 w-4" />
                View Full Activity History
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right column - Edit form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update user information and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" onValueChange={setActiveTab}>
                <TabsList className="mb-4 grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="role">Role & Permissions</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <TabsContent value="profile" className="space-y-4">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormDescription>The user's full name (optional)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="user@example.com" {...field} required />
                              </FormControl>
                              <FormDescription>The user's email address (required)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Leave blank to keep current password"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>Leave blank to keep current password</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Brief description about the user"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>Optional biographical information</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="role" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Role</FormLabel>
                            <Select
                              onValueChange={(value) => handleRoleChange(value as UserRole)}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ADVERTISER">Advertiser</SelectItem>
                                <SelectItem value="PARTNER">Partner</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>The user's role determines their permissions and access</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Role-specific fields */}
                      {selectedRole && (
                        <>
                          <Separator className="my-6" />
                          <h3 className="mb-4 text-lg font-medium">
                            {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()} Details
                          </h3>
                          {renderRoleSpecificFields()}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Account Status</FormLabel>
                              <FormDescription>
                                {field.value ? "Account is active" : "Account is suspended"}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sendWelcomeEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Send Welcome Email</FormLabel>
                              <FormDescription>Send an email with login instructions to the user</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="rounded-md border p-4">
                        <h3 className="mb-3 text-sm font-medium">Advanced Settings</h3>
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowAdvancedSettingsDialog(true)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Advanced User Settings
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowNotificationsDialog(true)}
                          >
                            <BellRing className="mr-2 h-4 w-4" />
                            Notification Preferences
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setShowSecurityDialog(true)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Security Settings
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={handleResetForm} disabled={!hasChanges}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                      <Button type="submit" disabled={isSubmitting || !hasChanges}>
                        {isSubmitting ? (
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
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>You have unsaved changes. Are you sure you want to leave this page?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowUnsavedChangesDialog(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={handleDiscardChanges}>
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting this user will remove all their data, including campaigns, payments, and analytics.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend user dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user?.status === "suspended" ? "Unsuspend User" : "Suspend User"}</DialogTitle>
            <DialogDescription>
              {user?.status === "suspended"
                ? "Are you sure you want to unsuspend this user? They will regain access to the platform."
                : "Are you sure you want to suspend this user? They will lose access to the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={user?.status === "suspended" ? "default" : "destructive"}
              onClick={handleToggleSuspend}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {user?.status === "suspended" ? "Unsuspending..." : "Suspending..."}
                </>
              ) : user?.status === "suspended" ? (
                "Unsuspend User"
              ) : (
                "Suspend User"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to the user. They will receive instructions to create a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify email dialog */}
      <Dialog open={showVerifyEmailDialog} onOpenChange={setShowVerifyEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Email</DialogTitle>
            <DialogDescription>
              Send a verification email to the user. They will receive instructions to verify their email address.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowVerifyEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyEmail} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Verification Email"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to change this user's role? This will affect their permissions and access.
            </DialogDescription>
          </DialogHeader>
          {showRoleChangeWarning && (
            <Alert className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Changing the user's role will reset role-specific data. Make sure you have backed up any important
                information.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowChangeRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRoleChange}>Confirm Change</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Command palette */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => form.handleSubmit(onSubmit)()}>
              <Save className="mr-2 h-4 w-4" />
              <span>Save Changes</span>
            </CommandItem>
            <CommandItem onSelect={handleResetForm}>
              <RotateCcw className="mr-2 h-4 w-4" />
              <span>Reset Form</span>
            </CommandItem>
            <CommandItem onSelect={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              <span>Cancel</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="User Actions">
            <CommandItem onSelect={() => setShowResetPasswordDialog(true)}>
              <Key className="mr-2 h-4 w-4" />
              <span>Reset Password</span>
            </CommandItem>
            <CommandItem onSelect={() => setShowVerifyEmailDialog(true)}>
              <Mail className="mr-2 h-4 w-4" />
              <span>Verify Email</span>
            </CommandItem>
            <CommandItem onSelect={() => setShowSuspendDialog(true)}>
              {user?.status === "suspended" ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  <span>Unsuspend User</span>
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Suspend User</span>
                </>
              )}
            </CommandItem>
            <CommandItem onSelect={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete User</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
