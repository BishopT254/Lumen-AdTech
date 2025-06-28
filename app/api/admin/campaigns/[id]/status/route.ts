import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema for status update
const statusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"]),
  reason: z.string().optional(),
})

// PATCH handler for updating campaign status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const campaignId = params.id
    const body = await request.json()

    // Validate request body
    const { status, reason } = statusUpdateSchema.parse(body)

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Update campaign status in a transaction
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // Update the campaign
      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status,
          ...(status === "REJECTED" && reason ? { rejectionReason: reason } : {}),
        },
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: `CAMPAIGN_${status}`,
          description: `Campaign "${updated.name}" status changed to ${status}${reason ? ` with reason: ${reason}` : ""}`,
          metadata: {
            campaignId,
            previousStatus: campaign.status,
            newStatus: status,
            reason,
          },
        },
      })

      return updated
    })

    return NextResponse.json(updatedCampaign)
  } catch (error) {
    console.error("Error updating campaign status:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update campaign status" }, { status: 500 })
  }
}
