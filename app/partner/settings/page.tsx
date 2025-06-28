"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import {
  Bell,
  Check,
  CreditCard,
  Globe,
  Info,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  ClockIcon,
  LogOut,
  Download,
  AlertTriangle,
  Trash2,
  Clock,
} from "lucide-react"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Update the PartnerProfile type to perfectly match the Prisma schema
type PartnerProfile = {
  id: string
  userId: string
  companyName: string
  contactPerson: string
  phoneNumber: string
  email?: string // Add email field
  address?: string
  city?: string
  state?: string
  postalCode: string
  country?: string
  commissionRate: number
  status: "active" | "pending" | "suspended"
  verificationStatus: "verified" | "unverified" | "pending"
  paymentDetails: {
    bankName?: string
    accountNumber?: string
    accountName?: string
    swiftCode?: string
    routingNumber?: string
    mpesaNumber?: string
    flutterwaveEmail?: string
    paypalEmail?: string
    stripeAccountId?: string // Add Stripe account ID
    preferredPaymentMethod?: "bank" | "mpesa" | "flutterwave" | "paypal" | "stripe"
  }
  taxInformation: {
    taxId?: string
    vatNumber?: string
    taxExempt?: boolean
    taxResidency?: string
    withholdingTaxRate?: number
    taxFormStatus?: "pending" | "submitted" | "approved" | "rejected"
  }
  businessType?: "individual" | "company" | "partnership" | "non-profit"
  createdAt: string
  updatedAt: string
}

// Update NotificationPreferences to include all possible notification types
type NotificationPreferences = {
  email: boolean
  sms: boolean
  push: boolean
  paymentNotifications: boolean
  maintenanceAlerts: boolean
  campaignUpdates: boolean
  performanceReports: boolean
  securityAlerts: boolean
  marketingEmails: boolean
  systemUpdates: boolean
  deviceOfflineAlerts: boolean // Add device offline alerts
  newCampaignNotifications: boolean // Add new campaign notifications
  paymentFailureAlerts: boolean // Add payment failure alerts
  documentExpiryReminders: boolean // Add document expiry reminders
}

// Update SecuritySettings to include all security options
type SecuritySettings = {
  twoFactorEnabled: boolean
  twoFactorMethod?: "app" | "sms" | "email"
  loginNotifications: boolean
  sessionTimeout: number
  lastPasswordChange: string
  passwordExpiryDays: number
  ipRestrictions?: string[]
  allowedDevices?: string[]
  loginAttempts?: number
  accountLockoutThreshold?: number
  passwordComplexityLevel?: "low" | "medium" | "high"
}

// Update ProfileFormData to match all the fields in PartnerProfile
type ProfileFormData = {
  companyName: string
  contactPerson: string
  phoneNumber: string
  email: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  bankName: string
  accountNumber: string
  accountName: string
  swiftCode: string
  routingNumber: string
  mpesaNumber: string
  flutterwaveEmail: string
  paypalEmail: string
  stripeAccountId: string
  preferredPaymentMethod: string
  taxId: string
  vatNumber: string
  taxExempt: boolean
  taxResidency: string
  withholdingTaxRate: number
  businessType: string
}

// Define the LoginHistory type
type LoginHistory = {
  id: string
  ipAddress: string
  device: string
  browser: string
  location: string
  timestamp: string
  status: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin?callbackUrl=/partner/settings")
    },
  })
  const { theme, setTheme } = useTheme()
  const { generalSettings, paymentGateway, commissionRates, loading: settingsLoading } = usePublicSettings()

  // State for profile data
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({})
  const [showLoginHistory, setShowLoginHistory] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dataChanged, setDataChanged] = useState(false)

  // Form state
  // Update the formData state initialization to include all fields
  const [formData, setFormData] = useState<ProfileFormData>({
    companyName: "",
    contactPerson: "",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    swiftCode: "",
    routingNumber: "",
    mpesaNumber: "",
    flutterwaveEmail: "",
    paypalEmail: "",
    stripeAccountId: "",
    preferredPaymentMethod: "bank",
    taxId: "",
    vatNumber: "",
    taxExempt: false,
    taxResidency: "",
    withholdingTaxRate: 0,
    businessType: "company",
  })

  // Detect unsaved changes
  // Update the useEffect for detecting unsaved changes to include all fields
  useEffect(() => {
    if (!profile) return

    const hasChanges =
      formData.companyName !== profile.companyName ||
      formData.contactPerson !== profile.contactPerson ||
      formData.phoneNumber !== profile.phoneNumber ||
      formData.email !== (profile.email || "") ||
      formData.address !== (profile.address || "") ||
      formData.city !== (profile.city || "") ||
      formData.state !== (profile.state || "") ||
      formData.postalCode !== (profile.postalCode || "") ||
      formData.country !== (profile.country || "") ||
      formData.bankName !== (profile.paymentDetails.bankName || "") ||
      formData.accountNumber !== (profile.paymentDetails.accountNumber || "") ||
      formData.accountName !== (profile.paymentDetails.accountName || "") ||
      formData.swiftCode !== (profile.paymentDetails.swiftCode || "") ||
      formData.routingNumber !== (profile.paymentDetails.routingNumber || "") ||
      formData.mpesaNumber !== (profile.paymentDetails.mpesaNumber || "") ||
      formData.flutterwaveEmail !== (profile.paymentDetails.flutterwaveEmail || "") ||
      formData.paypalEmail !== (profile.paymentDetails.paypalEmail || "") ||
      formData.stripeAccountId !== (profile.paymentDetails.stripeAccountId || "") ||
      formData.preferredPaymentMethod !== (profile.paymentDetails.preferredPaymentMethod || "bank") ||
      formData.taxId !== (profile.taxInformation.taxId || "") ||
      formData.vatNumber !== (profile.taxInformation.vatNumber || "") ||
      formData.taxExempt !== (profile.taxInformation.taxExempt || false) ||
      formData.taxResidency !== (profile.taxInformation.taxResidency || "") ||
      formData.withholdingTaxRate !== (profile.taxInformation.withholdingTaxRate || 0) ||
      formData.businessType !== (profile.businessType || "company")

    setDataChanged(hasChanges)
  }, [formData, profile])

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dataChanged) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [dataChanged])

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)

        // In a real app, you would fetch from your API
        const response = await fetch("/api/account-settings/profile")
        if (!response.ok) {
          throw new Error("Failed to fetch profile data")
        }
        const data = await response.json()
        setProfile(data.profile)
        setNotificationPrefs(data.notificationPreferences)
        setSecuritySettings(data.securitySettings)
        setLoginHistory(data.loginHistory || [])

        // Set form data from API response
        if (data.profile) {
          // Inside the fetchProfileData function, update the setFormData call:
          setFormData({
            companyName: data.profile.companyName,
            contactPerson: data.profile.contactPerson,
            phoneNumber: data.profile.phoneNumber,
            email: data.profile.email || "",
            address: data.profile.address || "",
            city: data.profile.city || "",
            state: data.profile.state || "",
            postalCode: data.profile.postalCode || "",
            country: data.profile.country || "",
            bankName: data.profile.paymentDetails?.bankName || "",
            accountNumber: data.profile.paymentDetails?.accountNumber || "",
            accountName: data.profile.paymentDetails?.accountName || "",
            swiftCode: data.profile.paymentDetails?.swiftCode || "",
            routingNumber: data.profile.paymentDetails?.routingNumber || "",
            mpesaNumber: data.profile.paymentDetails?.mpesaNumber || "",
            flutterwaveEmail: data.profile.paymentDetails?.flutterwaveEmail || "",
            paypalEmail: data.profile.paymentDetails?.paypalEmail || "",
            stripeAccountId: data.profile.paymentDetails?.stripeAccountId || "",
            preferredPaymentMethod: data.profile.paymentDetails?.preferredPaymentMethod || "bank",
            taxId: data.profile.taxInformation?.taxId || "",
            vatNumber: data.profile.taxInformation?.vatNumber || "",
            taxExempt: data.profile.taxInformation?.taxExempt || false,
            taxResidency: data.profile.taxInformation?.taxResidency || "",
            withholdingTaxRate: data.profile.taxInformation?.withholdingTaxRate || 0,
            businessType: data.profile.businessType || "company",
          })
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast.error("Failed to load profile data. Please try again.")

        // Fallback to mock data for development
        // Update the mock data to include all fields
        const mockProfile: PartnerProfile = {
          id: "partner_1",
          userId: "user_1",
          companyName: "TechVision Media",
          contactPerson: session?.user?.name || "John Doe",
          phoneNumber: "+254712345678",
          email: session?.user?.email || "john@techvision.co.ke",
          address: "123 Innovation Way",
          city: "Nairobi",
          state: "Nairobi County",
          postalCode: "00100",
          country: "Kenya",
          commissionRate: 70,
          status: "active",
          verificationStatus: "verified",
          paymentDetails: {
            bankName: "Equity Bank",
            accountNumber: "1234567890",
            accountName: "TechVision Media Ltd",
            swiftCode: "EQBLKENA",
            routingNumber: "",
            mpesaNumber: "+254712345678",
            paypalEmail: "",
            stripeAccountId: "",
            preferredPaymentMethod: "bank",
          },
          taxInformation: {
            taxId: "P051234567X",
            vatNumber: "VAT123456",
            taxExempt: false,
            taxResidency: "Kenya",
            withholdingTaxRate: 5,
            taxFormStatus: "approved",
          },
          businessType: "company",
          createdAt: "2023-01-15T08:30:00Z",
          updatedAt: "2023-06-10T14:20:00Z",
        }

        // Update the mockNotificationPrefs to include all notification types
        const mockNotificationPrefs: NotificationPreferences = {
          email: true,
          sms: true,
          push: false,
          paymentNotifications: true,
          maintenanceAlerts: true,
          campaignUpdates: false,
          performanceReports: true,
          securityAlerts: true,
          marketingEmails: false,
          systemUpdates: true,
          deviceOfflineAlerts: true,
          newCampaignNotifications: false,
          paymentFailureAlerts: true,
          documentExpiryReminders: true,
        }

        // Update the mockSecuritySettings to include all security options
        const mockSecuritySettings: SecuritySettings = {
          twoFactorEnabled: false,
          twoFactorMethod: "app",
          loginNotifications: true,
          sessionTimeout: 30,
          lastPasswordChange: "2023-04-10T09:15:00Z",
          passwordExpiryDays: 90,
          ipRestrictions: [],
          allowedDevices: [],
          loginAttempts: 0,
          accountLockoutThreshold: 5,
          passwordComplexityLevel: "medium",
        }

        const mockLoginHistory: LoginHistory[] = [
          {
            id: "login_1",
            ipAddress: "102.68.128.74",
            device: "Desktop",
            browser: "Chrome 122.0.6261",
            location: "Nairobi, Kenya",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            status: "success",
          },
          {
            id: "login_2",
            ipAddress: "102.68.128.74",
            device: "Mobile",
            browser: "Safari 16.0",
            location: "Nairobi, Kenya",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            status: "success",
          },
          {
            id: "login_3",
            ipAddress: "185.143.234.76",
            device: "Unknown",
            browser: "Unknown",
            location: "Moscow, Russia",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
            status: "failed",
          },
        ]

        setProfile(mockProfile)
        setNotificationPrefs(mockNotificationPrefs)
        setSecuritySettings(mockSecuritySettings)
        setLoginHistory(mockLoginHistory)

        // Set form data
        setFormData({
          companyName: mockProfile.companyName,
          contactPerson: mockProfile.contactPerson,
          phoneNumber: mockProfile.phoneNumber,
          email: mockProfile.email || "",
          address: mockProfile.address || "",
          city: mockProfile.city || "",
          state: mockProfile.state || "",
          postalCode: mockProfile.postalCode || "",
          country: mockProfile.country || "",
          bankName: mockProfile.paymentDetails.bankName || "",
          accountNumber: mockProfile.paymentDetails.accountNumber || "",
          accountName: mockProfile.paymentDetails.accountName || "",
          swiftCode: mockProfile.paymentDetails.swiftCode || "",
          routingNumber: mockProfile.paymentDetails.routingNumber || "",
          mpesaNumber: mockProfile.paymentDetails.mpesaNumber || "",
          flutterwaveEmail: mockProfile.paymentDetails.flutterwaveEmail || "",
          paypalEmail: mockProfile.paymentDetails.paypalEmail || "",
          stripeAccountId: mockProfile.paymentDetails.stripeAccountId || "",
          preferredPaymentMethod: mockProfile.paymentDetails.preferredPaymentMethod || "bank",
          taxId: mockProfile.taxInformation.taxId || "",
          vatNumber: mockProfile.vatNumber || "",
          taxExempt: mockProfile.taxInformation.taxExempt || false,
          taxResidency: mockProfile.taxInformation.taxResidency || "",
          withholdingTaxRate: mockProfile.taxInformation.withholdingTaxRate || 0,
          businessType: mockProfile.businessType || "company",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchProfileData()
    }
  }, [session])

  // Validate form data
  // Update the validateForm function to validate all required fields
  const validateForm = () => {
    const errors: Partial<Record<keyof ProfileFormData, string>> = {}

    if (!formData.companyName.trim()) {
      errors.companyName = "Company name is required"
    }

    if (!formData.contactPerson.trim()) {
      errors.contactPerson = "Contact person is required"
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required"
    } else if (!/^\+?\d{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ""))) {
      errors.phoneNumber = "Please enter a valid phone number"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (formData.flutterwaveEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.flutterwaveEmail)) {
      errors.flutterwaveEmail = "Please enter a valid email address"
    }

    if (formData.paypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.paypalEmail)) {
      errors.paypalEmail = "Please enter a valid email address"
    }

    // Validate based on preferred payment method
    if (formData.preferredPaymentMethod === "bank") {
      if (!formData.bankName) {
        errors.bankName = "Bank name is required for bank transfers"
      }
      if (!formData.accountNumber) {
        errors.accountNumber = "Account number is required for bank transfers"
      }
      if (!formData.accountName) {
        errors.accountName = "Account holder name is required for bank transfers"
      }
    } else if (formData.preferredPaymentMethod === "mpesa" && !formData.mpesaNumber) {
      errors.mpesaNumber = "M-Pesa number is required for M-Pesa payments"
    } else if (formData.preferredPaymentMethod === "flutterwave" && !formData.flutterwaveEmail) {
      errors.flutterwaveEmail = "Email is required for Flutterwave payments"
    } else if (formData.preferredPaymentMethod === "paypal" && !formData.paypalEmail) {
      errors.paypalEmail = "Email is required for PayPal payments"
    } else if (formData.preferredPaymentMethod === "stripe" && !formData.stripeAccountId) {
      errors.stripeAccountId = "Stripe account connection is required"
    }

    // Validate tax information if tax exempt is false
    if (!formData.taxExempt) {
      if (!formData.taxId) {
        errors.taxId = "Tax ID is required unless you are tax exempt"
      }
      if (!formData.taxResidency) {
        errors.taxResidency = "Tax residency is required unless you are tax exempt"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (formErrors[name as keyof ProfileFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle notification preference changes
  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    if (notificationPrefs) {
      setNotificationPrefs((prev) => ({ ...prev!, [key]: value }))
    }
  }

  // Handle security settings changes
  const handleSecurityChange = (key: keyof SecuritySettings, value: any) => {
    if (securitySettings) {
      setSecuritySettings((prev) => ({ ...prev!, [key]: value }))
    }
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      if (!validateForm()) {
        toast.error("Please fix the errors in the form")
        return
      }

      setIsSaving(true)

      // Prepare data for API
      // Update the handleSaveProfile function to save all form fields
      // Inside the handleSaveProfile function, update the profileData object:
      const profileData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        businessType: formData.businessType,
        paymentDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          swiftCode: formData.swiftCode,
          routingNumber: formData.routingNumber,
          mpesaNumber: formData.mpesaNumber,
          flutterwaveEmail: formData.flutterwaveEmail,
          paypalEmail: formData.paypalEmail,
          stripeAccountId: formData.stripeAccountId,
          preferredPaymentMethod: formData.preferredPaymentMethod,
        },
        taxInformation: {
          taxId: formData.taxId,
          vatNumber: formData.vatNumber,
          taxExempt: formData.taxExempt,
          taxResidency: formData.taxResidency,
          withholdingTaxRate: formData.withholdingTaxRate,
        },
      }

      // In a real app, you would make an API call here
      const response = await fetch("/api/account-settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      // Update profile state with form data
      // Update the setProfile call in handleSaveProfile to include all fields
      if (profile) {
        setProfile({
          ...profile,
          companyName: formData.companyName,
          contactPerson: formData.contactPerson,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          businessType: formData.businessType as any,
          paymentDetails: {
            ...profile.paymentDetails,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            accountName: formData.accountName,
            swiftCode: formData.swiftCode,
            routingNumber: formData.routingNumber,
            mpesaNumber: formData.mpesaNumber,
            flutterwaveEmail: formData.flutterwaveEmail,
            paypalEmail: formData.paypalEmail,
            stripeAccountId: formData.stripeAccountId,
            preferredPaymentMethod: formData.preferredPaymentMethod as any,
          },
          taxInformation: {
            ...profile.taxInformation,
            taxId: formData.taxId,
            vatNumber: formData.vatNumber,
            taxExempt: formData.taxExempt,
            taxResidency: formData.taxResidency,
            withholdingTaxRate: formData.withholdingTaxRate,
          },
          updatedAt: new Date().toISOString(),
        })
      }

      setDataChanged(false)
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle save notification preferences
  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true)

      // In a real app, you would make an API call here
      const response = await fetch("/api/account-settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPrefs),
      })

      if (!response.ok) {
        throw new Error("Failed to update notification preferences")
      }

      toast.success("Notification preferences updated successfully")
    } catch (error) {
      console.error("Error saving notification preferences:", error)
      toast.error("Failed to update notification preferences. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle save security settings
  const handleSaveSecurity = async () => {
    try {
      setIsSaving(true)

      // In a real app, you would make an API call here
      const response = await fetch("/api/partner/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(securitySettings),
      })

      if (!response.ok) {
        throw new Error("Failed to update security settings")
      }

      toast.success("Security settings updated successfully")
    } catch (error) {
      console.error("Error saving security settings:", error)
      toast.error("Failed to update security settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle setup two-factor authentication
  const handleSetupTwoFactor = () => {
    router.push("/partner/security/two-factor")
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format timestamp with time
  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Export profile data as JSON
  const exportProfileData = async () => {
    try {
      const response = await fetch("/api/profile/export")

      if (!response.ok) {
        throw new Error("Failed to export profile data")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `partner-profile-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Profile data exported successfully")
    } catch (error) {
      console.error("Error exporting profile data:", error)
      toast.error("Failed to export profile data. Please try again.")

      // Fallback for development
      if (!profile) return

      const exportData = {
        profile,
        notificationPreferences: notificationPrefs,
        securitySettings: securitySettings,
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const downloadLink = document.createElement("a")
      downloadLink.setAttribute("href", dataUri)
      downloadLink.setAttribute("download", `partner-profile-${profile.id}.json`)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast.success("Profile data exported successfully")
    }
  }

  // Calculate days since last password change
  const calculatePasswordAgeDays = () => {
    if (!securitySettings) return 0

    const lastChange = new Date(securitySettings.lastPasswordChange).getTime()
    const now = new Date().getTime()
    const diffDays = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Password expiry progress percentage
  const passwordExpiryPercentage = () => {
    if (!securitySettings) return 0
    const ageDays = calculatePasswordAgeDays()
    return Math.min((ageDays / securitySettings.passwordExpiryDays) * 100, 100)
  }

  // Password expiry status
  const passwordExpiryStatus = () => {
    if (!securitySettings) return { color: "bg-gray-200", label: "Unknown" }

    const ageDays = calculatePasswordAgeDays()
    const daysLeft = securitySettings.passwordExpiryDays - ageDays

    if (daysLeft <= 0) return { color: "bg-red-500", label: "Expired" }
    if (daysLeft <= 7) return { color: "bg-orange-500", label: `${daysLeft} days left` }
    if (daysLeft <= 15) return { color: "bg-yellow-500", label: `${daysLeft} days left` }
    return { color: "bg-green-500", label: `${daysLeft} days left` }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      setIsSaving(true)

      // In a real app, you would make an API call here
      const response = await fetch("/api/partner/account", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete account")
      }

      toast.success("Account deletion request submitted")
      setShowDeleteConfirm(false)

      // Redirect to confirmation page
      router.push("/account/deletion-confirmation")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Export login history as CSV
  const exportLoginHistory = () => {
    if (!loginHistory.length) {
      toast.error("No login history to export")
      return
    }

    // Create CSV content
    const headers = ["Date & Time", "IP Address", "Device", "Browser", "Location", "Status"]
    const csvRows = [headers.join(",")]

    loginHistory.forEach((login) => {
      const row = [
        formatTimestamp(login.timestamp),
        login.ipAddress,
        login.device,
        login.browser,
        login.location,
        login.status,
      ]
        .map((item) => `"${item}"`)
        .join(",")

      csvRows.push(row)
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `login-history-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Login history exported successfully")
  }

  if (status === "loading" || settingsLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportProfileData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className={cn(formErrors.companyName && "border-destructive")}
                    required
                  />
                  {formErrors.companyName && <p className="text-xs text-destructive">{formErrors.companyName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">
                    Contact Person <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className={cn(formErrors.contactPerson && "border-destructive")}
                    required
                  />
                  {formErrors.contactPerson && <p className="text-xs text-destructive">{formErrors.contactPerson}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className={cn("pl-10", formErrors.phoneNumber && "border-destructive")}
                      placeholder="+254712345678"
                      required
                    />
                  </div>
                  {formErrors.phoneNumber && <p className="text-xs text-destructive">{formErrors.phoneNumber}</p>}
                  <p className="text-xs text-muted-foreground">Include country code (e.g., +254 for Kenya)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" value={session?.user?.email || ""} disabled className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">To change your email address, please contact support</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your physical address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Nairobi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province/County</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="e.g. Nairobi County"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal/ZIP Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="e.g. 00100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="e.g. Kenya"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Update your payment details for receiving earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">
                    Your commission rate is{" "}
                    <Badge variant="outline" className="ml-1">
                      {profile?.commissionRate}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    This rate is applied to all earnings from ad displays on your devices. &nbsp; 
                    {profile?.commissionRate === 70 ? (
					  <Button
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => router.push("/partner/upgrade")}
                      >
                        Upgrade to premium partner status to increase your rate.
                      </Button>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="preferredPaymentMethod">Preferred Payment Method</Label>
                <Select
                  value={formData.preferredPaymentMethod}
                  onValueChange={(value) => handleSelectChange("preferredPaymentMethod", value)}
                >
                  <SelectTrigger id="preferredPaymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    {paymentGateway?.mpesaEnabled && <SelectItem value="mpesa">M-Pesa</SelectItem>}
                    {paymentGateway?.flutterwaveEnabled && <SelectItem value="flutterwave">Flutterwave</SelectItem>}
                    <SelectItem value="paypal">PayPal</SelectItem>
                    {paymentGateway?.stripeEnabled && <SelectItem value="stripe">Stripe</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {(formData.preferredPaymentMethod === "bank" || formData.preferredPaymentMethod === "") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Bank Transfer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">
                        Bank Name{" "}
                        {formData.preferredPaymentMethod === "bank" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        placeholder="e.g. Equity Bank"
                        className={cn(formErrors.bankName && "border-destructive")}
                      />
                      {formErrors.bankName && <p className="text-xs text-destructive">{formErrors.bankName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">
                        Account Holder Name{" "}
                        {formData.preferredPaymentMethod === "bank" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="accountName"
                        name="accountName"
                        value={formData.accountName}
                        onChange={handleInputChange}
                        placeholder="Name as it appears on bank account"
                        className={cn(formErrors.accountName && "border-destructive")}
                      />
                      {formErrors.accountName && <p className="text-xs text-destructive">{formErrors.accountName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">
                        Account Number{" "}
                        {formData.preferredPaymentMethod === "bank" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="accountNumber"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        placeholder="Bank account number"
                        className={cn(formErrors.accountNumber && "border-destructive")}
                      />
                      {formErrors.accountNumber && (
                        <p className="text-xs text-destructive">{formErrors.accountNumber}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
                      <Input
                        id="swiftCode"
                        name="swiftCode"
                        value={formData.swiftCode}
                        onChange={handleInputChange}
                        placeholder="For international transfers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        name="routingNumber"
                        value={formData.routingNumber}
                        onChange={handleInputChange}
                        placeholder="For US bank accounts"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentGateway?.mpesaEnabled && formData.preferredPaymentMethod === "mpesa" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">M-Pesa Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="mpesaNumber">
                      M-Pesa Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="mpesaNumber"
                        name="mpesaNumber"
                        value={formData.mpesaNumber}
                        onChange={handleInputChange}
                        placeholder="+254712345678"
                        className={cn("pl-10", formErrors.mpesaNumber && "border-destructive")}
                      />
                    </div>
                    {formErrors.mpesaNumber && <p className="text-xs text-destructive">{formErrors.mpesaNumber}</p>}
                    <p className="text-xs text-muted-foreground">Include country code (e.g., +254 for Kenya)</p>
                  </div>
                </div>
              )}

              {paymentGateway?.flutterwaveEnabled && formData.preferredPaymentMethod === "flutterwave" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Flutterwave Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="flutterwaveEmail">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="flutterwaveEmail"
                        name="flutterwaveEmail"
                        value={formData.flutterwaveEmail}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        className={cn("pl-10", formErrors.flutterwaveEmail && "border-destructive")}
                      />
                    </div>
                    {formErrors.flutterwaveEmail && (
                      <p className="text-xs text-destructive">{formErrors.flutterwaveEmail}</p>
                    )}
                  </div>
                </div>
              )}

              {formData.preferredPaymentMethod === "paypal" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">PayPal Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="paypalEmail">
                      PayPal Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="paypalEmail"
                        name="paypalEmail"
                        value={formData.paypalEmail}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        className={cn("pl-10", formErrors.paypalEmail && "border-destructive")}
                      />
                    </div>
                    {formErrors.paypalEmail && <p className="text-xs text-destructive">{formErrors.paypalEmail}</p>}
                  </div>
                </div>
              )}

              {formData.preferredPaymentMethod === "stripe" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Stripe Account</h3>
                  <div className="space-y-2">
                    {formData.stripeAccountId ? (
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-300">Stripe account connected</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Your Stripe account is connected and ready to receive payments
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              // In a real app, this would disconnect the Stripe account
                              setFormData((prev) => ({ ...prev, stripeAccountId: "" }))
                              toast.success("Stripe account disconnected")
                            }}
                          >
                            Disconnect Account
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 p-4 rounded-md">
                        <p className="text-sm mb-3">
                          Connect your Stripe account to receive payments directly to your bank account.
                        </p>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            // In a real app, this would redirect to Stripe Connect OAuth flow
                            toast.info("Redirecting to Stripe Connect...")
                            setTimeout(() => {
                              setFormData((prev) => ({
                                ...prev,
                                stripeAccountId: "acct_" + Math.random().toString(36).substring(2, 15),
                              }))
                              toast.success("Stripe account connected successfully")
                            }, 1500)
                          }}
                        >
                          <img src="/stripe-logo.svg" alt="Stripe" className="h-4 w-auto" />
                          Connect with Stripe
                        </Button>
                        {formErrors.stripeAccountId && (
                          <p className="text-xs text-destructive mt-2">{formErrors.stripeAccountId}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium">Business Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => handleSelectChange("businessType", value)}
                  >
                    <SelectTrigger id="businessType">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                      <SelectItem value="company">Company / Corporation</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="non-profit">Non-Profit Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tax Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">
                      Tax ID / PIN
                      {!formData.taxExempt && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      placeholder="e.g. P051234567X"
                      className={cn(formErrors.taxId && "border-destructive")}
                    />
                    {formErrors.taxId && <p className="text-xs text-destructive">{formErrors.taxId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">VAT Number</Label>
                    <Input
                      id="vatNumber"
                      name="vatNumber"
                      value={formData.vatNumber}
                      onChange={handleInputChange}
                      placeholder="If applicable"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxResidency">
                      Tax Residency
                      {!formData.taxExempt && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="taxResidency"
                      name="taxResidency"
                      value={formData.taxResidency}
                      onChange={handleInputChange}
                      placeholder="Country of tax residence"
                      className={cn(formErrors.taxResidency && "border-destructive")}
                    />
                    {formErrors.taxResidency && <p className="text-xs text-destructive">{formErrors.taxResidency}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withholdingTaxRate">Withholding Tax Rate (%)</Label>
                    <Input
                      id="withholdingTaxRate"
                      name="withholdingTaxRate"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.withholdingTaxRate.toString()}
                      onChange={(e) =>
                        handleInputChange({
                          ...e,
                          target: {
                            ...e.target,
                            name: e.target.name,
                            value: e.target.value ? Number.parseFloat(e.target.value) : 0,
                          },
                        } as React.ChangeEvent<HTMLInputElement>)
                      }
                      placeholder="e.g. 5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard rate is {commissionRates?.defaultWithholdingTaxRate || 5}% unless exempted
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    id="taxExempt"
                    checked={formData.taxExempt}
                    onCheckedChange={(checked) => handleCheckboxChange("taxExempt", checked)}
                  />
                  <Label htmlFor="taxExempt">Tax Exempt</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you are tax exempt, please provide supporting documentation to our support team.
                </p>
                {profile?.taxInformation?.taxFormStatus && (
                  <div
                    className={cn(
                      "mt-4 p-3 rounded-md text-sm",
                      profile.taxInformation.taxFormStatus === "approved"
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                        : profile.taxInformation.taxFormStatus === "rejected"
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                          : profile.taxInformation.taxFormStatus === "submitted"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {profile.taxInformation.taxFormStatus === "approved" && <Check className="h-4 w-4" />}
                      {profile.taxInformation.taxFormStatus === "rejected" && <AlertTriangle className="h-4 w-4" />}
                      {profile.taxInformation.taxFormStatus === "submitted" && <Info className="h-4 w-4" />}
                      {profile.taxInformation.taxFormStatus === "pending" && <Clock className="h-4 w-4" />}
                      <span className="font-medium capitalize">Tax forms {profile.taxInformation.taxFormStatus}</span>
                    </div>
                    {profile.taxInformation.taxFormStatus === "rejected" && (
                      <p className="mt-1 pl-6">Please resubmit your tax forms with the correct information.</p>
                    )}
                    {profile.taxInformation.taxFormStatus === "pending" && (
                      <p className="mt-1 pl-6">Please submit your tax forms to complete your profile.</p>
                    )}
                    {profile.taxInformation.taxFormStatus === "submitted" && (
                      <p className="mt-1 pl-6">
                        Your tax forms are under review. This process may take 1-3 business days.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Last updated: {profile ? formatDate(profile.updatedAt) : "N/A"}
                </span>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving || !dataChanged} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you'd like to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {notificationPrefs && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="emailNotifications" className="text-base">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={notificationPrefs.email}
                        onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="smsNotifications" className="text-base">
                          SMS Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                      </div>
                      <Switch
                        id="smsNotifications"
                        checked={notificationPrefs.sms}
                        onCheckedChange={(checked) => handleNotificationChange("sms", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="pushNotifications" className="text-base">
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive notifications in browser and mobile app</p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        checked={notificationPrefs.push}
                        onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Customize which notifications you'd like to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {notificationPrefs && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="paymentNotifications" className="text-base">
                          Payment Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts about payments and earnings updates
                        </p>
                      </div>
                      <Switch
                        id="paymentNotifications"
                        checked={notificationPrefs.paymentNotifications}
                        onCheckedChange={(checked) => handleNotificationChange("paymentNotifications", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="maintenanceAlerts" className="text-base">
                          Maintenance Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts about system maintenance and downtime
                        </p>
                      </div>
                      <Switch
                        id="maintenanceAlerts"
                        checked={notificationPrefs.maintenanceAlerts}
                        onCheckedChange={(checked) => handleNotificationChange("maintenanceAlerts", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="campaignUpdates" className="text-base">
                          Campaign Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive updates about new advertising campaigns</p>
                      </div>
                      <Switch
                        id="campaignUpdates"
                        checked={notificationPrefs.campaignUpdates}
                        onCheckedChange={(checked) => handleNotificationChange("campaignUpdates", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="performanceReports" className="text-base">
                          Performance Reports
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive weekly and monthly performance reports</p>
                      </div>
                      <Switch
                        id="performanceReports"
                        checked={notificationPrefs.performanceReports}
                        onCheckedChange={(checked) => handleNotificationChange("performanceReports", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="securityAlerts" className="text-base">
                          Security Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts about account security and suspicious activities
                        </p>
                      </div>
                      <Switch
                        id="securityAlerts"
                        checked={notificationPrefs.securityAlerts}
                        onCheckedChange={(checked) => handleNotificationChange("securityAlerts", checked)}
                        aria-readonly={true}
                        disabled={true}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Info className="h-3 w-3 inline mr-1 relative -top-0.5" />
                      Security alerts cannot be disabled for your account safety
                    </p>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="marketingEmails" className="text-base">
                          Marketing Emails
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive promotional offers and marketing communications
                        </p>
                      </div>
                      <Switch
                        id="marketingEmails"
                        checked={notificationPrefs.marketingEmails}
                        onCheckedChange={(checked) => handleNotificationChange("marketingEmails", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="systemUpdates" className="text-base">
                          System Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications about platform updates and new features
                        </p>
                      </div>
                      <Switch
                        id="systemUpdates"
                        checked={notificationPrefs.systemUpdates}
                        onCheckedChange={(checked) => handleNotificationChange("systemUpdates", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="deviceOfflineAlerts" className="text-base">
                          Device Offline Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive alerts when your devices go offline</p>
                      </div>
                      <Switch
                        id="deviceOfflineAlerts"
                        checked={notificationPrefs.deviceOfflineAlerts}
                        onCheckedChange={(checked) => handleNotificationChange("deviceOfflineAlerts", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="newCampaignNotifications" className="text-base">
                          New Campaign Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications when new campaigns are available for your devices
                        </p>
                      </div>
                      <Switch
                        id="newCampaignNotifications"
                        checked={notificationPrefs.newCampaignNotifications}
                        onCheckedChange={(checked) => handleNotificationChange("newCampaignNotifications", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="paymentFailureAlerts" className="text-base">
                          Payment Failure Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts when there are issues with your payment methods
                        </p>
                      </div>
                      <Switch
                        id="paymentFailureAlerts"
                        checked={notificationPrefs.paymentFailureAlerts}
                        onCheckedChange={(checked) => handleNotificationChange("paymentFailureAlerts", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="documentExpiryReminders" className="text-base">
                          Document Expiry Reminders
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive reminders when your documents are about to expire
                        </p>
                      </div>
                      <Switch
                        id="documentExpiryReminders"
                        checked={notificationPrefs.documentExpiryReminders}
                        onCheckedChange={(checked) => handleNotificationChange("documentExpiryReminders", checked)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} disabled={isSaving} className="gap-2 ml-auto">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {securitySettings && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="twoFactorAuth" className="text-base">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={securitySettings.twoFactorEnabled ? "default" : "outline"}>
                          {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={handleSetupTwoFactor}>
                          {securitySettings.twoFactorEnabled ? "Manage" : "Set Up"}
                        </Button>
                      </div>
                    </div>

                    {securitySettings.twoFactorEnabled && (
                      <div className="ml-6 mt-2">
                        <p className="text-sm font-medium">
                          Method:{" "}
                          {securitySettings.twoFactorMethod === "app"
                            ? "Authenticator App"
                            : securitySettings.twoFactorMethod === "sms"
                              ? "SMS"
                              : "Email"}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="loginNotifications" className="text-base">
                          Login Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications when someone logs into your account
                        </p>
                      </div>
                      <Switch
                        id="loginNotifications"
                        checked={securitySettings.loginNotifications}
                        onCheckedChange={(checked) => handleSecurityChange("loginNotifications", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="sessionTimeout" className="text-base">
                          Session Timeout
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically log out after period of inactivity
                        </p>
                      </div>
                      <div className="w-[180px]">
                        <Select
                          value={securitySettings.sessionTimeout.toString()}
                          onValueChange={(value) => handleSecurityChange("sessionTimeout", Number.parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeout" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-base">Password Age</Label>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Last changed: {formatDate(securitySettings.lastPasswordChange)}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              calculatePasswordAgeDays() > securitySettings.passwordExpiryDays &&
                                "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                            )}
                          >
                            {calculatePasswordAgeDays()} days ago
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={passwordExpiryPercentage()}
                        className={cn(passwordExpiryStatus().color, "h-2")}
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          Password expires after {securitySettings.passwordExpiryDays} days
                        </p>
                        <span className="text-xs font-medium">{passwordExpiryStatus().label}</span>
                      </div>
                      <div className="pt-2">
                        <Button variant="outline" size="sm" onClick={() => router.push("/auth/change-password")}>
                          <Lock className="mr-2 h-3.5 w-3.5" />
                          Change Password
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="passwordComplexity" className="text-base">
                          Password Complexity
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Set the required complexity level for your password
                        </p>
                      </div>
                      <div className="w-[180px]">
                        <Select
                          value={securitySettings.passwordComplexityLevel}
                          onValueChange={(value) => handleSecurityChange("passwordComplexityLevel", value)}
                        >
                          <SelectTrigger id="passwordComplexity">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="accountLockout" className="text-base">
                          Account Lockout Threshold
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Number of failed login attempts before account is locked
                        </p>
                      </div>
                      <div className="w-[180px]">
                        <Select
                          value={securitySettings.accountLockoutThreshold?.toString() || "5"}
                          onValueChange={(value) =>
                            handleSecurityChange("accountLockoutThreshold", Number.parseInt(value))
                          }
                        >
                          <SelectTrigger id="accountLockout">
                            <SelectValue placeholder="Select threshold" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 attempts</SelectItem>
                            <SelectItem value="5">5 attempts</SelectItem>
                            <SelectItem value="10">10 attempts</SelectItem>
                            <SelectItem value="0">Never lock (not recommended)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {securitySettings.loginAttempts > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mt-2">
                        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {securitySettings.loginAttempts} failed login{" "}
                            {securitySettings.loginAttempts === 1 ? "attempt" : "attempts"} detected
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setShowLoginHistory(true)} className="gap-2">
                <ClockIcon className="h-4 w-4" />
                View Login History
              </Button>
              <Button onClick={handleSaveSecurity} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader className="border-b border-destructive/20">
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                <div>
                  <h3 className="font-medium text-destructive mb-1">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto flex gap-2 items-center"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-destructive/5 rounded-b-lg border-t border-destructive/10">
              <Alert variant="destructive" className="bg-transparent border-0 p-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  All account data will be permanently removed and cannot be recovered
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Login History Dialog */}
      <Dialog open={showLoginHistory} onOpenChange={setShowLoginHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Login History</DialogTitle>
            <DialogDescription>Recent login attempts to your account</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium">Date & Time</th>
                  <th className="text-left py-3 font-medium">IP Address</th>
                  <th className="text-left py-3 font-medium">Device</th>
                  <th className="text-left py-3 font-medium">Location</th>
                  <th className="text-left py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((login) => (
                  <tr key={login.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 text-sm">{formatTimestamp(login.timestamp)}</td>
                    <td className="py-3 text-sm">{login.ipAddress}</td>
                    <td className="py-3 text-sm">
                      {login.device} / {login.browser}
                    </td>
                    <td className="py-3 text-sm">{login.location}</td>
                    <td className="py-3 text-sm">
                      {login.status === "success" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        >
                          <Check className="h-3 w-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={exportLoginHistory} className="gap-2">
              <Download className="h-4 w-4" />
              Export Log
            </Button>
            <Button onClick={() => setShowLoginHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you absolutely sure?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                All your data including profile information, payment details, and transaction history will be
                permanently deleted.
              </AlertDescription>
            </Alert>
            <div className="bg-muted/50 p-3 rounded text-sm">
              <p>If you have an outstanding balance in your account, please withdraw it before deletion.</p>
              <p className="mt-2">
                If you're experiencing issues with our service, please consider{" "}
                <Button variant="link" className="p-0 h-auto text-sm" onClick={() => router.push("/support")}>
                  contacting support
                </Button>{" "}
                instead.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">You'll be immediately logged out of all sessions.</p>
            </div>
          </div>
          <DialogFooter className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isSaving}
              className="w-full sm:w-auto gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isSaving ? "Processing..." : "Yes, Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes warning */}
      {dataChanged && activeTab !== "profile" && (
		  <Dialog open={true} onOpenChange={() => setActiveTab("profile")}>
			<DialogContent className="max-w-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
			  <DialogHeader>
				<DialogTitle className="text-black dark:text-white font-semibold">Unsaved Changes</DialogTitle>
				<DialogDescription className="text-gray-700 dark:text-gray-300">You have unsaved changes in your profile information.</DialogDescription>
			  </DialogHeader>
			  <div className="py-3">
				<p className="text-gray-800 dark:text-gray-200">Would you like to save your changes before leaving this tab?</p>
			  </div>
			  <DialogFooter className="flex gap-2 sm:gap-0">
				<Button
				  variant="ghost"
				  onClick={() => {
					setDataChanged(false)
				  }}
				  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
				>
				  Discard Changes
				</Button>
				<Button
				  onClick={() => {
					setActiveTab("profile")
				  }}
				  className="bg-primary text-white hover:bg-primary-dark"
				>
				  Stay and Save
				</Button>
			  </DialogFooter>
			</DialogContent>
		  </Dialog>
		 )}
    </div>
  )
}