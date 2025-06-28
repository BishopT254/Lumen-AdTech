import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

    // Parse URL query params
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaignId");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");

    // Build filter criteria
    const whereClause: any = {
      campaign: {
        advertiserId: advertiser.id,
      },
    };

    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    // Fetch all ad creatives for the advertiser's campaigns or specific campaign
    const adCreatives = await prisma.adCreative.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group creatives by campaign
    const creativesByCategory = adCreatives.reduce((acc: any, creative) => {
      const campaignId = creative.campaign.id;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaignId,
          campaignName: creative.campaign.name,
          creatives: [],
        };
      }
      acc[campaignId].creatives.push({
        id: creative.id,
        name: creative.name,
        type: creative.type,
        status: creative.status,
        content: creative.content,
        createdAt: creative.createdAt,
        updatedAt: creative.updatedAt,
      });
      return acc;
    }, {});

    return NextResponse.json({
      campaigns: Object.values(creativesByCategory),
      count: adCreatives.length,
    });
  } catch (error) {
    console.error("Error fetching ad creatives:", error);
    return NextResponse.json({ error: "Failed to fetch ad creatives" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    // Parse request body
    const { campaignId, name, type, content } = await req.json();
    
    // Validate required fields
    if (!campaignId || !name || !type || !content) {
      return NextResponse.json({
        error: "Missing required fields: campaignId, name, type, and content"
      }, { status: 400 });
    }

    // Validate content based on type
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

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Create new ad creative
    const newAdCreative = await prisma.adCreative.create({
      data: {
        name,
        type,
        status: 'PENDING_REVIEW', // Default status for new creatives
        content,
        campaign: {
          connect: {
            id: campaignId,
          },
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
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ad creative created successfully',
      creative: newAdCreative,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating ad creative:", error);
    return NextResponse.json({ error: "Failed to create ad creative" }, { status: 500 });
  }
} 