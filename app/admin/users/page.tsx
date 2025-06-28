"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePublicSettings } from "@/hooks/usePublicSettings"
import { format, formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import type { UserRole } from "@prisma/client"

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

// Icons
import {
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Download,
  Upload,
  Trash2,
  Edit,
  Lock,
  Unlock,
  Shield,
  User,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Tag,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  FileSpreadsheet,
  FileJson,
  FileSpreadsheetIcon as FileCsv,
  Printer,
  Loader2,
  LayoutDashboard,
  Wallet,
  Megaphone,
  SlidersHorizontal,
  Columns,
  LayoutGrid,
  LayoutList,
  CalendarIcon,
  Activity,
  KeyRound,
  History,
  Clipboard,
  Info,
} from "lucide-react"
import { Check } from "lucide-react"

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
  companyName?: string
  status: "active" | "inactive" | "pending" | "suspended"
  lastLogin?: Date | null
  advertiser?: any
  partner?: any
  admin?: any
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

interface UserPermission {
  [key: string]: boolean
}

// API functions
const fetchUsers = async (params: Record<string, any> = {}): Promise<{ users: UserDetail[]; pagination: any }> => {
  const queryString = new URLSearchParams(params).toString()
  const response = await fetch(`/api/admin/users?${queryString}`)
  if (!response.ok) {
    throw new Error("Failed to fetch users")
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
    // Return some default permissions for demo purposes
    return [
      { id: "manageUsers", name: "Manage Users", description: "Create, edit, and delete users" },
      { id: "manageAdvertisers", name: "Manage Advertisers", description: "Manage advertiser accounts" },
      { id: "managePartners", name: "Manage Partners", description: "Manage partner accounts" },
      { id: "manageCampaigns", name: "Manage Campaigns", description: "Create, edit, and delete campaigns" },
      { id: "managePayments", name: "Manage Payments", description: "Process and manage payments" },
      { id: "manageSettings", name: "Manage Settings", description: "Configure system settings" },
      { id: "viewReports", name: "View Reports", description: "Access system reports" },
      { id: "viewAnalytics", name: "View Analytics", description: "Access analytics data" },
      { id: "approveContent", name: "Approve Content", description: "Review and approve ad content" },
      { id: "manageDevices", name: "Manage Devices", description: "Configure and manage devices" },
    ]
  }
}

const fetchUserPermissions = async (userId: string): Promise<UserPermission> => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/permissions`)
    if (!response.ok) {
      throw new Error("Failed to fetch user permissions")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    // Return empty permissions object
    return {}
  }
}

const updateUserPermissions = async ({ userId, permissions }: { userId: string; permissions: UserPermission }) => {
  const response = await fetch(`/api/admin/users/${userId}/permissions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(permissions),
  })

  if (!response.ok) {
    throw new Error("Failed to update user permissions")
  }

  return response.json()
}

const deleteUser = async (userId: string) => {
  const response = await fetch(`/api/admin/users?id=${userId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete user")
  }

  return response.json()
}

const updateUserStatus = async ({ userId, status }: { userId: string; status: string }) => {
  const response = await fetch(`/api/admin/users?id=${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    throw new Error("Failed to update user status")
  }

  return response.json()
}

const exportUsers = async (format: string) => {
  const response = await fetch(`/api/admin/users/export?format=${format}`)
  if (!response.ok) {
    throw new Error(`Failed to export users as ${format}`)
  }
  return response.blob()
}

// Command palette actions
const commandActions = [
  {
    id: "add-user",
    name: "Add New User",
    shortcut: "⌘+N",
    action: () => {},
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    id: "export-csv",
    name: "Export as CSV",
    shortcut: "⌘+E",
    action: () => {},
    icon: <FileCsv className="h-4 w-4" />,
  },
  {
    id: "export-json",
    name: "Export as JSON",
    shortcut: "⌘+J",
    action: () => {},
    icon: <FileJson className="h-4 w-4" />,
  },
  {
    id: "bulk-delete",
    name: "Bulk Delete",
    shortcut: "⌘+D",
    action: () => {},
    icon: <Trash2 className="h-4 w-4" />,
  },
  {
    id: "refresh",
    name: "Refresh Data",
    shortcut: "⌘+R",
    action: () => {},
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    id: "filter",
    name: "Advanced Filter",
    shortcut: "⌘+F",
    action: () => {},
    icon: <Filter className="h-4 w-4" />,
  },
]

export default function UsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { theme } = useTheme()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const queryClient = useQueryClient()

  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [userPermissions, setUserPermissions] = useState<UserPermission>({})
  const [exportFormat, setExportFormat] = useState("csv")
  const [isExporting, setIsExporting] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "grid" | "list">("table")
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({})
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [lastLoginFilter, setLastLoginFilter] = useState("any")
  const [emailVerificationFilter, setEmailVerificationFilter] = useState("any")
  const [userDetailsTab, setUserDetailsTab] = useState("overview")
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false)
  const [isAnalyticsVisible, setIsAnalyticsVisible] = useState(false)
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false)
  const [quickFilterValue, setQuickFilterValue] = useState<string[]>([])
  const [isUserActionsOpen, setIsUserActionsOpen] = useState(false)
  const [isUserEditMode, setIsUserEditMode] = useState(false)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false)
  const [isEmailVerificationDialogOpen, setIsEmailVerificationDialogOpen] = useState(false)
  const [isUserNotesDialogOpen, setIsUserNotesDialogOpen] = useState(false)
  const [userNotes, setUserNotes] = useState("")
  const [isUserTagsDialogOpen, setIsUserTagsDialogOpen] = useState(false)
  const [userTags, setUserTags] = useState<string[]>([])
  const [isUserHistoryDialogOpen, setIsUserHistoryDialogOpen] = useState(false)
  const [isUserSecurityDialogOpen, setIsUserSecurityDialogOpen] = useState(false)
  const [isUserPreferencesDialogOpen, setIsUserPreferencesDialogOpen] = useState(false)
  const [isUserDevicesDialogOpen, setIsUserDevicesDialogOpen] = useState(false)
  const [isUserSessionsDialogOpen, setIsUserSessionsDialogOpen] = useState(false)
  const [isUserApiKeysDialogOpen, setIsUserApiKeysDialogOpen] = useState(false)
  const [isUserIntegrationsDialogOpen, setIsUserIntegrationsDialogOpen] = useState(false)
  const [isUserBillingDialogOpen, setIsUserBillingDialogOpen] = useState(false)
  const [isUserSubscriptionsDialogOpen, setIsUserSubscriptionsDialogOpen] = useState(false)
  const [isUserPaymentsDialogOpen, setIsUserPaymentsDialogOpen] = useState(false)
  const [isUserInvoicesDialogOpen, setIsUserInvoicesDialogOpen] = useState(false)
  const [isUserCampaignsDialogOpen, setIsUserCampaignsDialogOpen] = useState(false)
  const [isUserAdsDialogOpen, setIsUserAdsDialogOpen] = useState(false)
  const [isUserDevicesManagementDialogOpen, setIsUserDevicesManagementDialogOpen] = useState(false)
  const [isUserWalletDialogOpen, setIsUserWalletDialogOpen] = useState(false)
  const [isUserTransactionsDialogOpen, setIsUserTransactionsDialogOpen] = useState(false)
  const [isUserPayoutsDialogOpen, setIsUserPayoutsDialogOpen] = useState(false)
  const [isUserEarningsDialogOpen, setIsUserEarningsDialogOpen] = useState(false)
  const [isUserAnalyticsDialogOpen, setIsUserAnalyticsDialogOpen] = useState(false)
  const [isUserReportsDialogOpen, setIsUserReportsDialogOpen] = useState(false)
  const [isUserDashboardDialogOpen, setIsUserDashboardDialogOpen] = useState(false)
  const [isUserSettingsDialogOpen, setIsUserSettingsDialogOpen] = useState(false)
  const [isUserProfileDialogOpen, setIsUserProfileDialogOpen] = useState(false)
  const [isUserAccountDialogOpen, setIsUserAccountDialogOpen] = useState(false)
  const [isUserNotificationsDialogOpen, setIsUserNotificationsDialogOpen] = useState(false)
  const [isUserMessagesDialogOpen, setIsUserMessagesDialogOpen] = useState(false)
  const [isUserSupportDialogOpen, setIsUserSupportDialogOpen] = useState(false)
  const [isUserHelpDialogOpen, setIsUserHelpDialogOpen] = useState(false)
  const [isUserFeedbackDialogOpen, setIsUserFeedbackDialogOpen] = useState(false)
  const [isUserLogoutDialogOpen, setIsUserLogoutDialogOpen] = useState(false)
  const [isUserDeleteAccountDialogOpen, setIsUserDeleteAccountDialogOpen] = useState(false)
  const [isUserExportDataDialogOpen, setIsUserExportDataDialogOpen] = useState(false)
  const [isUserImportDataDialogOpen, setIsUserImportDataDialogOpen] = useState(false)
  const [isUserBackupDataDialogOpen, setIsUserBackupDataDialogOpen] = useState(false)
  const [isUserRestoreDataDialogOpen, setIsUserRestoreDataDialogOpen] = useState(false)
  const [isUserSyncDataDialogOpen, setIsUserSyncDataDialogOpen] = useState(false)
  const [isUserMigrateDataDialogOpen, setIsUserMigrateDataDialogOpen] = useState(false)
  const [isUserCleanupDataDialogOpen, setIsUserCleanupDataDialogOpen] = useState(false)
  const [isUserArchiveDataDialogOpen, setIsUserArchiveDataDialogOpen] = useState(false)
  const [isUserUnarchiveDataDialogOpen, setIsUserUnarchiveDataDialogOpen] = useState(false)
  const [isUserPurgeDataDialogOpen, setIsUserPurgeDataDialogOpen] = useState(false)
  const [isUserRecoverDataDialogOpen, setIsUserRecoverDataDialogOpen] = useState(false)
  const [isUserResetDataDialogOpen, setIsUserResetDataDialogOpen] = useState(false)
  const [isUserClearDataDialogOpen, setIsUserClearDataDialogOpen] = useState(false)
  const [isUserWipeDataDialogOpen, setIsUserWipeDataDialogOpen] = useState(false)
  const [isUserEraseDataDialogOpen, setIsUserEraseDataDialogOpen] = useState(false)
  const [isUserShredDataDialogOpen, setIsUserShredDataDialogOpen] = useState(false)
  const [isUserNukeDataDialogOpen, setIsUserNukeDataDialogOpen] = useState(false)
  const [isUserVaporizeDataDialogOpen, setIsUserVaporizeDataDialogOpen] = useState(false)
  const [isUserDisintegrateDataDialogOpen, setIsUserDisintegrateDataDialogOpen] = useState(false)
  const [isUserAnnihilateDataDialogOpen, setIsUserAnnihilateDataDialogOpen] = useState(false)
  const [isUserObliterateDataDialogOpen, setIsUserObliterateDataDialogOpen] = useState(false)
  const [isUserExtinctDataDialogOpen, setIsUserExtinctDataDialogOpen] = useState(false)
  const [isUserTerminateDataDialogOpen, setIsUserTerminateDataDialogOpen] = useState(false)
  const [isUserDestroyDataDialogOpen, setIsUserDestroyDataDialogOpen] = useState(false)
  const [isUserDemolishDataDialogOpen, setIsUserDemolishDataDialogOpen] = useState(false)
  const [isUserRuinDataDialogOpen, setIsUserRuinDataDialogOpen] = useState(false)
  const [isUserRavageDataDialogOpen, setIsUserRavageDataDialogOpen] = useState(false)
  const [isUserDevastateDataDialogOpen, setIsUserDevastateDataDialogOpen] = useState(false)
  const [isUserDecimateDataDialogOpen, setIsUserDecimateDataDialogOpen] = useState(false)
  const [isUserEliminateDataDialogOpen, setIsUserEliminateDataDialogOpen] = useState(false)
  const [isUserEradicateDataDialogOpen, setIsUserEradicateDataDialogOpen] = useState(false)
  const [isUserExterminate, setIsUserExterminate] = useState(false)

  // Get system settings
  const { generalSettings, loading: loadingSettings } = usePublicSettings()

  // Update URL with filters
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (roleFilter !== "all") params.set("role", roleFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    params.set("sort", sortField)
    params.set("order", sortOrder)
    params.set("page", page.toString())
    params.set("limit", pageSize.toString())

    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, "", url)
  }, [searchTerm, roleFilter, statusFilter, sortField, sortOrder, page, pageSize])

  // Initialize filters from URL
  useEffect(() => {
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || "all"
    const status = searchParams.get("status") || "all"
    const sort = searchParams.get("sort") || "createdAt"
    const order = searchParams.get("order") || "desc"
    const pageParam = searchParams.get("page") || "1"
    const limitParam = searchParams.get("limit") || "10"

    setSearchTerm(search)
    setRoleFilter(role)
    setStatusFilter(status)
    setSortField(sort)
    setSortOrder(order)
    setPage(Number.parseInt(pageParam, 10))
    setPageSize(Number.parseInt(limitParam, 10))
  }, [searchParams])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }

      // Add user
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault()
        router.push("/admin/users/new")
      }

      // Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault()
        queryClient.invalidateQueries({ queryKey: ["users"] })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [queryClient, router])

  // Fetch users data with filters
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
    isFetching,
  } = useQuery({
    queryKey: ["users", searchTerm, roleFilter, statusFilter, sortField, sortOrder, page, pageSize],
    queryFn: () =>
      fetchUsers({
        search: searchTerm,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sort: sortField,
        order: sortOrder,
        page,
        limit: pageSize,
      }),
    keepPreviousData: true,
  })

  // Fetch permissions data
  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: fetchPermissions,
  })

  // Fetch user activity when a user is selected
  const { data: userActivity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ["userActivity", selectedUser?.id],
    queryFn: () => fetchUserActivity(selectedUser?.id || ""),
    enabled: !!selectedUser,
  })

  // Fetch user permissions when a user is selected
  const { data: fetchedPermissions, isLoading: isLoadingUserPermissions } = useQuery({
    queryKey: ["userPermissions", selectedUser?.id],
    queryFn: () => fetchUserPermissions(selectedUser?.id || ""),
    enabled: !!selectedUser && isPermissionsDialogOpen,
    onSuccess: (data) => {
      setUserPermissions(data)
    },
  })

  // Mutations
  const updatePermissionsMutation = useMutation({
    mutationFn: updateUserPermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPermissions", selectedUser?.id] })
      setIsPermissionsDialogOpen(false)
      toast.success("Permissions updated", {
        description: "User permissions have been updated successfully.",
      })
    },
    onError: (error) => {
      toast.error("Permissions not updated", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setIsDeleteDialogOpen(false)
      setIsUserDialogOpen(false)
      toast.success("User deleted", {
        description: "User has been deleted successfully.",
      })
    },
    onError: (error) => {
      toast.error("Error deleting user", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  const updateUserStatusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Status updated", {
        description: "User status has been updated successfully.",
      })
    },
    onError: (error) => {
      toast.error("Error updating status", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return Promise.all(userIds.map((id) => deleteUser(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setIsBulkDeleteDialogOpen(false)
      setSelectedUsers([])
      toast.success("Users deleted", {
        description: `${selectedUsers.length} users have been deleted successfully.`,
      })
    },
    onError: (error) => {
      toast.error("Error deleting users", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    },
  })

  // Derived state
  const users = usersData?.users || []
  const pagination = usersData?.pagination || { total: 0, page: 1, limit: 10, pages: 1 }
  const totalPages = pagination.pages || Math.ceil(pagination.total / pagination.limit)

  // Handlers
  const handleUserClick = (user: UserDetail) => {
    setSelectedUser(user)
    if (isMobile) {
      setIsUserDrawerOpen(true)
    } else {
      setIsUserDialogOpen(true)
    }
  }

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id)
    }
  }

  const handleBulkDeleteUsers = () => {
    if (selectedUsers.length > 0) {
      bulkDeleteUsersMutation.mutate(selectedUsers)
    }
  }

  const handlePermissionChange = (permId: string, value: boolean) => {
    setUserPermissions((prev) => ({
      ...prev,
      [permId]: value,
    }))
  }

  const handleSavePermissions = () => {
    if (selectedUser) {
      updatePermissionsMutation.mutate({
        userId: selectedUser.id,
        permissions: userPermissions,
      })
    }
  }

  const handleStatusChange = (userId: string, status: string) => {
    updateUserStatusMutation.mutate({ userId, status })
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await exportUsers(exportFormat)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setIsExportDialogOpen(false)
      toast.success("PExport successful", {
        description: `Users exported as ${exportFormat.toUpperCase()} successfully.`,
      })
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Failed to export users",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((user) => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId])
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId))
    }
  }

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const handleAddUser = () => {
    router.push("/admin/users/new")
  }

  const handleEditUser = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`)
  }

  const handleCommandAction = (actionId: string) => {
    switch (actionId) {
      case "add-user":
        handleAddUser()
        break
      case "export-csv":
        setExportFormat("csv")
        setIsExportDialogOpen(true)
        break
      case "export-json":
        setExportFormat("json")
        setIsExportDialogOpen(true)
        break
      case "bulk-delete":
        if (selectedUsers.length > 0) {
          setIsBulkDeleteDialogOpen(true)
        } else {
          toast.info("No users selected", {
            description: "Please select users to delete.",
            variant: "default",
          })
        }
        break
      case "refresh":
        queryClient.invalidateQueries({ queryKey: ["users"] })
        break
      case "filter":
        setIsFilterExpanded(!isFilterExpanded)
        break
      default:
        break
    }
    setIsCommandPaletteOpen(false)
  }

  // Helper functions
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "ADVERTISER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "PARTNER":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

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

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Never"
    return format(new Date(date), "PPP")
  }

  const formatTimeAgo = (date: Date | string | null | undefined) => {
    if (!date) return "Never"
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  // Loading state
  if (isLoadingUsers && !isFetching) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="text-lg font-medium">Loading users...</h3>
      </div>
    )
  }

  // Error state
  if (usersError) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <div className="rounded-full bg-red-100 p-3 text-red-500 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load users</h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {usersError instanceof Error ? usersError.message : "An unknown error occurred"}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Command Palette */}
      <CommandDialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            {commandActions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => handleCommandAction(action.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  {action.icon}
                  <span className="ml-2">{action.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{action.shortcut}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => router.push("/admin/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => router.push("/admin/users")}>
              <Users className="mr-2 h-4 w-4" />
              Users
            </CommandItem>
            <CommandItem onSelect={() => router.push("/admin/campaigns")}>
              <Megaphone className="mr-2 h-4 w-4" />
              Campaigns
            </CommandItem>
            <CommandItem onSelect={() => router.push("/admin/payments")}>
              <Wallet className="mr-2 h-4 w-4" />
              Payments
            </CommandItem>
            <CommandItem onSelect={() => router.push("/admin/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Page header */}
      <div className="mb-8 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            User Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage all users, permissions, and roles across the platform
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh (⌘+R)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronLeft className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("csv")
                  setIsExportDialogOpen(true)
                }}
              >
                <FileCsv className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("json")
                  setIsExportDialogOpen(true)
                }}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setExportFormat("xlsx")
                  setIsExportDialogOpen(true)
                }}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          <Button onClick={handleAddUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <Card className="mb-6">
        <CardContent className="p-4 pt-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex w-full max-w-lg items-center space-x-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search users by name, email, or company..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={isFilterExpanded ? "bg-muted" : ""}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => setViewMode("table")}>
                        <Columns className="mr-2 h-4 w-4" />
                        Table View
                        {viewMode === "table" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode("grid")}>
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        Grid View
                        {viewMode === "grid" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode("list")}>
                        <LayoutList className="mr-2 h-4 w-4" />
                        List View
                        {viewMode === "list" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Page Size</DropdownMenuLabel>
                      {[10, 25, 50, 100].map((size) => (
                        <DropdownMenuItem key={size} onClick={() => handlePageSizeChange(size)}>
                          Show {size} per page
                          {pageSize === size && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ADVERTISER">Advertiser</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced filters */}
            <AnimatePresence>
              {isFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Created Date Range</Label>
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange.from}
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Last Login</Label>
                      <Select value={lastLoginFilter} onValueChange={setLastLoginFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This week</SelectItem>
                          <SelectItem value="month">This month</SelectItem>
                          <SelectItem value="year">This year</SelectItem>
                          <SelectItem value="never">Never logged in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Verification</Label>
                      <Select value={emailVerificationFilter} onValueChange={setEmailVerificationFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Verification status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="unverified">Unverified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateRange({ from: undefined, to: undefined })
                        setLastLoginFilter("any")
                        setEmailVerificationFilter("any")
                        setAdvancedFilters({})
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAdvancedFilters({
                          dateRange,
                          lastLogin: lastLoginFilter,
                          emailVerification: emailVerificationFilter,
                        })
                        setIsFilterExpanded(false)
                      }}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Selected users actions */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>
                    <strong>{selectedUsers.length}</strong> users selected
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedUsers([])}>
                    Clear Selection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedUsers.length > 0) {
                        setIsBulkDeleteDialogOpen(true)
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Bulk Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="right">
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Email Selected Users
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Tag className="mr-2 h-4 w-4" />
                        Add Tag to Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        Update Permissions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 dark:text-red-400">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Users</CardTitle>
            <CardDescription>
              {isFetching ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating results...
                </span>
              ) : (
                `${pagination.total} users found`
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "bg-muted" : ""}
            >
              <Columns className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-muted" : ""}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-muted" : ""}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "table" && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onCheckedChange={handleSelectAllUsers}
                        aria-label="Select all users"
                      />
                    </TableHead>
                    <TableHead className="w-[250px]">
                      <div className="flex cursor-pointer items-center" onClick={() => handleSort("name")}>
                        Name
                        {sortField === "name" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? (
                              <ChevronLeft className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex cursor-pointer items-center" onClick={() => handleSort("email")}>
                        Email
                        {sortField === "email" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? (
                              <ChevronLeft className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex cursor-pointer items-center" onClick={() => handleSort("role")}>
                        Role
                        {sortField === "role" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? (
                              <ChevronLeft className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>
                      <div className="flex cursor-pointer items-center" onClick={() => handleSort("status")}>
                        Status
                        {sortField === "status" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? (
                              <ChevronLeft className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex cursor-pointer items-center" onClick={() => handleSort("createdAt")}>
                        Created
                        {sortField === "createdAt" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? (
                              <ChevronLeft className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <User className="h-8 w-8 text-gray-400" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={(e) => {
                          // Only trigger row click if not clicking on checkbox, dropdown, or actions cell
                          if (
                            !(e.target as HTMLElement).closest('input[type="checkbox"]') &&
                            !(e.target as HTMLElement).closest("[data-dropdown]") &&
                            !(e.target as HTMLElement).closest("td:last-child")
                          ) {
                            handleUserClick(user)
                          }
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                            aria-label={`Select ${user.name || user.email}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3" onClick={(e) => handleUserClick(user)}>
                            <Avatar>
                              <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                              <AvatarFallback className={getAvatarColor(user.id)}>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name || "Unnamed User"}</p>
                              {user.bio && (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <p className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:underline">
                                      View bio
                                    </p>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-semibold">Bio</h4>
                                      <p className="text-sm">{user.bio}</p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.companyName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help text-sm text-gray-600 dark:text-gray-400">
                                {formatTimeAgo(user.createdAt)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatDate(user.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help text-sm text-gray-600 dark:text-gray-400">
                                {user.lastLogin ? formatTimeAgo(user.lastLogin) : "Never"}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{user.lastLogin ? formatDate(user.lastLogin) : "Never logged in"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild data-dropdown="true">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="right">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUserClick(user)
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditUser(user.id)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUser(user)
                                  setIsPermissionsDialogOpen(true)
                                }}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Manage Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(user.id, user.status === "suspended" ? "active" : "suspended")
                                }}
                              >
                                {user.status === "suspended" ? (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Reactivate Account
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Suspend Account
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUser(user)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {users.length === 0 ? (
                <div className="col-span-full flex h-40 flex-col items-center justify-center space-y-2 rounded-lg border border-dashed">
                  <User className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              ) : (
                users.map((user) => (
                  <Card
                    key={user.id}
                    className="overflow-hidden transition-all hover:shadow-md dark:hover:shadow-primary/10"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                            <AvatarFallback className={getAvatarColor(user.id)}>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{user.name || "Unnamed User"}</CardTitle>
                            <CardDescription className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUserClick(user)}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setSelectedUser(user)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Role</span>
                          <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                          <Badge variant="outline" className={getStatusBadgeColor(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                        {user.companyName && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Company</span>
                            <span className="text-xs font-medium">{user.companyName}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Created</span>
                          <span className="text-xs">{formatTimeAgo(user.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                      <Button variant="outline" size="sm" onClick={() => handleUserClick(user)}>
                        View Details
                      </Button>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                        aria-label={`Select ${user.name || user.email}`}
                      />
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center space-y-2 rounded-lg border border-dashed">
                  <User className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                        aria-label={`Select ${user.name || user.email}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar>
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className={getAvatarColor(user.id)}>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || "Unnamed User"}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge variant="outline" className={getStatusBadgeColor(user.status)}>
                        {user.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUserClick(user)
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditUser(user.id)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedUser(user)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing <strong>{users.length}</strong> of <strong>{pagination.total}</strong> users
            </div>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => handlePageSizeChange(Number.parseInt(value, 10))}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = page - 2 + i
                if (page < 3) {
                  pageNum = i + 1
                } else if (page > totalPages - 2) {
                  pageNum = totalPages - 4 + i
                }

                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="mx-0.5 h-8 w-8 p-0"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* User details dialog */}
      {selectedUser && (
        <>
          {isMobile ? (
            <Drawer open={isUserDrawerOpen} onOpenChange={setIsUserDrawerOpen}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>User Details</DrawerTitle>
                  <DrawerDescription>View and manage user information</DrawerDescription>
                </DrawerHeader>
                <Tabs defaultValue="overview" className="px-4" onValueChange={setUserDetailsTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="flex flex-col items-center space-y-3 pb-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={selectedUser.image || undefined} alt={selectedUser.name || "User"} />
                        <AvatarFallback className={getAvatarColor(selectedUser.id)}>
                          {getInitials(selectedUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">{selectedUser.name || "Unnamed User"}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant="outline" className={getRoleBadgeColor(selectedUser.role)}>
                          {selectedUser.role}
                        </Badge>
                        <Badge variant="outline" className={getStatusBadgeColor(selectedUser.status)}>
                          {selectedUser.status}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">User Information</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Company:</span>
                          <span className="text-sm font-medium">{selectedUser.companyName || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                          <span className="text-sm font-medium">{formatDate(selectedUser.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Last Login:</span>
                          <span className="text-sm font-medium">
                            {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : "Never"}
                          </span>
                        </div>
                        {selectedUser.bio && (
                          <div className="mt-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Bio:</span>
                            <p className="mt-1 text-sm">{selectedUser.bio}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(selectedUser.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsPermissionsDialogOpen(true)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Permissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleStatusChange(
                              selectedUser.id,
                              selectedUser.status === "suspended" ? "active" : "suspended",
                            )
                          }
                        >
                          {selectedUser.status === "suspended" ? (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Reactivate
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
                          className="text-red-600 dark:text-red-400"
                          onClick={() => setIsDeleteDialogOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="activity" className="mt-4 space-y-4">
                    {isLoadingActivity ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : userActivity.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          {userActivity.map((activity) => (
                            <div key={activity.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="rounded-full bg-primary/10 p-1">
                                    <Activity className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium">{activity.action}</span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTimeAgo(activity.timestamp)}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                              )}
                              {activity.ipAddress && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  IP: {activity.ipAddress}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Info className="h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium">No activity found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          This user has no recorded activity yet.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="settings" className="mt-4 space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Account Settings</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsPasswordResetDialogOpen(true)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsEmailVerificationDialogOpen(true)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Verify Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsUserNotesDialogOpen(true)}
                        >
                          <Clipboard className="mr-2 h-4 w-4" />
                          Add Notes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsUserTagsDialogOpen(true)}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Manage Tags
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Advanced Settings</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsUserHistoryDialogOpen(true)}
                        >
                          <History className="mr-2 h-4 w-4" />
                          View Login History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsUserSecurityDialogOpen(true)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Security Settings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-red-600 dark:text-red-400"
                          onClick={() => setIsDeleteDialogOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <DrawerFooter>
                  <Button onClick={() => setIsUserDrawerOpen(false)}>Close</Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="max-w-4xl bg-white dark:bg-slate-950 border shadow-sm">
                <DialogHeader>
                  <DialogTitle>User Details</DialogTitle>
                  <DialogDescription>
                    View and manage information for {selectedUser.name || selectedUser.email}
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="overview" onValueChange={setUserDetailsTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-1">
                        <div className="flex flex-col items-center space-y-3 rounded-lg border p-4 text-center">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={selectedUser.image || undefined} alt={selectedUser.name || "User"} />
                            <AvatarFallback className={getAvatarColor(selectedUser.id)}>
                              {getInitials(selectedUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold">{selectedUser.name || "Unnamed User"}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className={getRoleBadgeColor(selectedUser.role)}>
                              {selectedUser.role}
                            </Badge>
                            <Badge variant="outline" className={getStatusBadgeColor(selectedUser.status)}>
                              {selectedUser.status}
                            </Badge>
                          </div>
                          <div className="mt-2 w-full space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleEditUser(selectedUser.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleStatusChange(
                                  selectedUser.id,
                                  selectedUser.status === "suspended" ? "active" : "suspended",
                                )
                              }
                            >
                              {selectedUser.status === "suspended" ? (
                                <>
                                  <Unlock className="mr-2 h-4 w-4" />
                                  Reactivate Account
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Suspend Account
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">User Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  Account Details
                                </h4>
                                <div className="mt-2 space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">ID:</span>
                                    <span className="text-sm font-medium">{selectedUser.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                                    <span className="text-sm font-medium">{formatDate(selectedUser.createdAt)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated:</span>
                                    <span className="text-sm font-medium">{formatDate(selectedUser.updatedAt)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Login:</span>
                                    <span className="text-sm font-medium">
                                      {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : "Never"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Email Verified:</span>
                                    <span className="text-sm font-medium">
                                      {selectedUser.emailVerified ? formatDate(selectedUser.emailVerified) : "No"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  {selectedUser.role === "ADVERTISER"
                                    ? "Advertiser Details"
                                    : selectedUser.role === "PARTNER"
                                      ? "Partner Details"
                                      : "Admin Details"}
                                </h4>
                                <div className="mt-2 space-y-2">
                                  {selectedUser.role === "ADVERTISER" && selectedUser.advertiser && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Company:</span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.advertiser.companyName || "Not provided"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          Contact Person:
                                        </span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.advertiser.contactPerson || "Not provided"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Phone:</span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.advertiser.phoneNumber || "Not provided"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                                        <span className="text-sm font-medium">
                                          {[
                                            selectedUser.advertiser.city,
                                            selectedUser.advertiser.state,
                                            selectedUser.advertiser.country,
                                          ]
                                            .filter(Boolean)
                                            .join(", ") || "Not provided"}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  {selectedUser.role === "PARTNER" && selectedUser.partner && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Company:</span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.partner.companyName || "Not provided"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Business Type:</span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.partner.businessType || "Not provided"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          Commission Rate:
                                        </span>
                                        <span className="text-sm font-medium">
                                          {selectedUser.partner.commissionRate
                                            ? `${(Number(selectedUser.partner.commissionRate) * 100).toFixed(2)}%`
                                            : "Not set"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                                        <span className="text-sm font-medium">
                                          {[
                                            selectedUser.partner.city,
                                            selectedUser.partner.state,
                                            selectedUser.partner.country,
                                          ]
                                            .filter(Boolean)
                                            .join(", ") || "Not provided"}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  {selectedUser.role === "ADMIN" && selectedUser.admin && (
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Permissions:</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsPermissionsDialogOpen(true)}
                                      >
                                        <Shield className="mr-2 h-4 w-4" />
                                        View Permissions
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedUser.bio && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedUser.bio}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              <Button variant="outline" size="sm" onClick={() => handleEditUser(selectedUser.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setIsPermissionsDialogOpen(true)}>
                                <Shield className="mr-2 h-4 w-4" />
                                Permissions
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setIsPasswordResetDialogOpen(true)}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEmailVerificationDialogOpen(true)}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Verification
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setIsUserNotesDialogOpen(true)}>
                                <Clipboard className="mr-2 h-4 w-4" />
                                Add Notes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 dark:text-red-400"
                                onClick={() => setIsDeleteDialogOpen(true)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="activity" className="space-y-4 pt-4">
                    {isLoadingActivity ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : userActivity.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Recent Activity</h3>
                          <Button variant="outline" size="sm">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export Activity
                          </Button>
                        </div>
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Date & Time</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userActivity.map((activity) => (
                                <TableRow key={activity.id}>
                                  <TableCell className="font-medium">{activity.action}</TableCell>
                                  <TableCell>{activity.description || "-"}</TableCell>
                                  <TableCell>{activity.ipAddress || "-"}</TableCell>
                                  <TableCell>{formatDate(activity.timestamp)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Info className="h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium">No activity found</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          This user has no recorded activity yet.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="permissions" className="space-y-4 pt-4">
                    {isLoadingUserPermissions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">User Permissions</h3>
                          <Button variant="outline" size="sm" onClick={() => setIsPermissionsDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Permissions
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <h4 className="text-sm font-medium">{permission.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                              </div>
                              <Badge variant={userPermissions[permission.id] ? "default" : "outline"}>
                                {userPermissions[permission.id] ? "Granted" : "Not Granted"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="settings" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Account Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsPasswordResetDialogOpen(true)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsEmailVerificationDialogOpen(true)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Verify Email
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsUserNotesDialogOpen(true)}
                          >
                            <Clipboard className="mr-2 h-4 w-4" />
                            Add Notes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsUserTagsDialogOpen(true)}
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            Manage Tags
                          </Button>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Advanced Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsUserHistoryDialogOpen(true)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            View Login History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsUserSecurityDialogOpen(true)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Security Settings
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-red-600 dark:text-red-400"
                            onClick={() => setIsDeleteDialogOpen(true)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Account
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border shadow-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting this user will remove all their data, including campaigns, payments, and analytics.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-950 border shadow-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUsers.length} users? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Warning</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Deleting these users will remove all their data, including campaigns, payments, and analytics.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
              onClick={handleBulkDeleteUsers}
              disabled={bulkDeleteUsersMutation.isPending}
            >
              {bulkDeleteUsersMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Users"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-950 border shadow-sm">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              {selectedUser && `Manage permissions for ${selectedUser.name || selectedUser.email}`}
            </DialogDescription>
          </DialogHeader>
          {isLoadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Permission Settings</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allPermissions = permissions.reduce(
                        (acc, perm) => {
                          acc[perm.id] = true
                          return acc
                        },
                        {} as Record<string, boolean>,
                      )
                      setUserPermissions(allPermissions)
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const noPermissions = permissions.reduce(
                        (acc, perm) => {
                          acc[perm.id] = false
                          return acc
                        },
                        {} as Record<string, boolean>,
                      )
                      setUserPermissions(noPermissions)
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between space-x-2 rounded-lg border p-3"
                    >
                      <div>
                        <h4 className="text-sm font-medium">{permission.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                      </div>
                      <Switch
                        checked={!!userPermissions[permission.id]}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={updatePermissionsMutation.isPending}>
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-950 border shadow-sm">
          <DialogHeader>
            <DialogTitle>Export Users</DialogTitle>
            <DialogDescription>Choose a format to export user data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Export Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-activity" />
                  <Label htmlFor="include-activity">Include user activity</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-permissions" />
                  <Label htmlFor="include-permissions">Include permissions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-related" />
                  <Label htmlFor="include-related">Include related data (campaigns, payments, etc.)</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
