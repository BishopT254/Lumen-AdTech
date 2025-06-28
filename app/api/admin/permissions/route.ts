import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== "ADMIN") {
    return false
  }
  return true
}

// Define standard permissions
const standardPermissions = [
  {
    id: "manageUsers",
    name: "Manage Users",
    description: "Create, edit, and delete users",
  },
  {
    id: "manageAdvertisers",
    name: "Manage Advertisers",
    description: "Manage advertiser accounts",
  },
  {
    id: "managePartners",
    name: "Manage Partners",
    description: "Manage partner accounts",
  },
  {
    id: "manageCampaigns",
    name: "Manage Campaigns",
    description: "Create, edit, and delete campaigns",
  },
  {
    id: "managePayments",
    name: "Manage Payments",
    description: "Process and manage payments",
  },
  {
    id: "manageSettings",
    name: "Manage Settings",
    description: "Configure system settings",
  },
  {
    id: "viewReports",
    name: "View Reports",
    description: "Access system reports",
  },
  {
    id: "viewAnalytics",
    name: "View Analytics",
    description: "Access analytics data",
  },
  {
    id: "approveContent",
    name: "Approve Content",
    description: "Review and approve ad content",
  },
  {
    id: "manageDevices",
    name: "Manage Devices",
    description: "Configure and manage devices",
  },
  {
    id: "manageApiKeys",
    name: "Manage API Keys",
    description: "Create and manage API keys",
  },
  {
    id: "manageWebhooks",
    name: "Manage Webhooks",
    description: "Configure and manage webhooks",
  },
  {
    id: "manageIntegrations",
    name: "Manage Integrations",
    description: "Set up and manage third-party integrations",
  },
  {
    id: "manageFeatureFlags",
    name: "Manage Feature Flags",
    description: "Control feature flags and rollouts",
  },
  {
    id: "viewAuditLogs",
    name: "View Audit Logs",
    description: "Access system audit logs",
  },
]

export async function GET(req: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Return the standard permissions
    return NextResponse.json(standardPermissions)
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch permissions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
