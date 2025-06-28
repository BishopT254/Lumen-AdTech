import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Get creative id from params
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Creative ID is required" }, { status: 400 });
    }

    // Fetch the ad creative
    const adCreative = await prisma.adCreative.findFirst({
      where: {
        id,
        campaign: {
          advertiserId: advertiser.id,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        content: true,
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!adCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 });
    }

    // Fetch performance metrics if available
    const metrics = await prisma.adDelivery.findMany({
      where: {
        adCreativeId: id,
      },
      select: {
        id: true,
        impressions: true,
        clicks: true,
        conversions: true,
        date: true,
      },
    });

    // Calculate aggregated metrics
    const totalImpressions = metrics.reduce((sum, metric) => sum + (metric.impressions || 0), 0);
    const totalClicks = metrics.reduce((sum, metric) => sum + (metric.clicks || 0), 0);
    const totalConversions = metrics.reduce((sum, metric) => sum + (metric.conversions || 0), 0);
    
    const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return NextResponse.json({
      creative: {
        ...adCreative,
        performance: {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          clickThroughRate: clickThroughRate.toFixed(2) + '%',
          conversionRate: conversionRate.toFixed(2) + '%',
          dailyMetrics: metrics,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching ad creative:", error);
    return NextResponse.json({ error: "Failed to fetch ad creative" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Get creative id from params
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Creative ID is required" }, { status: 400 });
    }

    // Verify ownership of the ad creative
    const existingCreative = await prisma.adCreative.findFirst({
      where: {
        id,
        campaign: {
          advertiserId: advertiser.id,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 });
    }

    // Parse request body
    const { name, type, content, status } = await req.json();
    
    // Validate status change
    if (status && !['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED'].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // If status is approved, only admin can set it (handle in admin API)
    if (status === 'APPROVED' && existingCreative.status !== 'APPROVED') {
      return NextResponse.json({ 
        error: "Only administrators can approve ad creatives" 
      }, { status: 403 });
    }

    // Check if content is valid based on type
    if (type && content) {
      if (type === 'IMAGE' && (!content.url || !content.altText)) {
        return NextResponse.json({
          error: "Image content must include url and altText"
        }, { status: 400 });
      } else if (type === 'VIDEO' && (!content.url || !content.duration)) {
        return NextResponse.json({
          error: "Video content must include url and duration"
        }, { status: 400 });
      } else if (type === 'TEXT' && !content.text) {
        return NextResponse.json({
          error: "Text content must include text"
        }, { status: 400 });
      } else if (type === 'HTML' && !content.html) {
        return NextResponse.json({
          error: "HTML content must include html"
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (content) updateData.content = content;
    if (status) updateData.status = status;

    // If content is changed, reset to pending review
    if (content && existingCreative.status === 'APPROVED') {
      updateData.status = 'PENDING_REVIEW';
    }

    // Update the ad creative
    const updatedCreative = await prisma.adCreative.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        content: true,
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ad creative updated successfully',
      creative: updatedCreative,
    });
  } catch (error) {
    console.error("Error updating ad creative:", error);
    return NextResponse.json({ error: "Failed to update ad creative" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADVERTISER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Get creative id from params
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Creative ID is required" }, { status: 400 });
    }

    // Verify ownership and get campaign details
    const adCreative = await prisma.adCreative.findFirst({
      where: {
        id,
        campaign: {
          advertiserId: advertiser.id,
        },
      },
      select: {
        id: true,
        campaignId: true,
      },
    });

    if (!adCreative) {
      return NextResponse.json({ error: "Ad creative not found" }, { status: 404 });
    }

    // Check if this is the only creative for the campaign
    const creativeCount = await prisma.adCreative.count({
      where: {
        campaignId: adCreative.campaignId,
      },
    });

    if (creativeCount <= 1) {
      return NextResponse.json({ 
        error: "Cannot delete the only creative for a campaign. Add another creative before deleting this one." 
      }, { status: 400 });
    }

    // Delete the ad creative
    await prisma.adCreative.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ad creative deleted successfully',
    });
  } catch (error) {
    console.error("Error deleting ad creative:", error);
    return NextResponse.json({ error: "Failed to delete ad creative" }, { status: 500 });
  }
} 