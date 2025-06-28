import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get payment gateway settings
    const paymentGatewayConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "payment_gateway" },
    })

    // Get commission rate settings
    const commissionRatesConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "commission_rates" },
    })

    // Get tax settings
    const taxSettingsConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "tax_settings" },
    })

    // Get invoice settings
    const invoiceSettingsConfig = await prisma.systemConfig.findUnique({
      where: { configKey: "invoice_settings" },
    })

    return NextResponse.json({
      paymentGateway: paymentGatewayConfig?.configValue || null,
      commissionRates: commissionRatesConfig?.configValue || null,
      taxSettings: taxSettingsConfig?.configValue || null,
      invoiceSettings: invoiceSettingsConfig?.configValue || null,
    })
  } catch (error) {
    console.error("Error fetching payment settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { admin: true },
    })

    if (!user || user.role !== "ADMIN" || !user.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await req.json()
    const { configKey, configValue, description } = data

    if (!configKey || !configValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update or create the config
    const updatedConfig = await prisma.systemConfig.upsert({
      where: { configKey },
      update: {
        configValue,
        description: description || undefined,
        updatedBy: session.user.id,
      },
      create: {
        configKey,
        configValue,
        description: description || "",
        updatedBy: session.user.id,
      },
    })

    return NextResponse.json({ success: true, config: updatedConfig })
  } catch (error) {
    console.error("Error updating payment settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

