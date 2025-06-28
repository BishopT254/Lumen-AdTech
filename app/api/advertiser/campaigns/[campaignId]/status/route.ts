import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = params.id;

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Find campaign
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Parse request body
    const { status } = await req.json();
    
    // Validate status is a valid enum value
    if (!Object.values(CampaignStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Define valid status transitions
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
      PENDING_APPROVAL: ["ACTIVE", "REJECTED", "CANCELLED"],
      ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
      PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED"],
      COMPLETED: [],
      REJECTED: ["DRAFT"],
      CANCELLED: ["DRAFT"],
    };

    // Check if the status transition is valid
    if (!validTransitions[existingCampaign.status as CampaignStatus].includes(status)) {
      return NextResponse.json({
        error: `Invalid status transition from ${existingCampaign.status} to ${status}`
      }, { status: 400 });
    }

    // Update campaign status
    const campaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: `Campaign status updated to ${status}`,
      campaign 
    });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json({ error: "Failed to update campaign status" }, { status: 500 });
  }
} 