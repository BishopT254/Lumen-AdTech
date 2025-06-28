import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// AdCreative schema for validation
const adCreativeSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(3).max(100),
  type: z.enum(["IMAGE", "VIDEO", "INTERACTIVE", "AR_EXPERIENCE", "VOICE_INTERACTIVE"]),
  content: z.string().url(), // URL to the creative content
  format: z.string(), // File format or content type
  duration: z.number().int().positive().optional(), // Duration in seconds for video content
  previewImage: z.string().url().optional(), // URL to preview image
  ar_markers: z.any().optional(), // JSON data for AR markers and triggers
  voiceCommands: z.any().optional(), // JSON data for supported voice commands
});

// GET handler for fetching ad creatives
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const creativeType = searchParams.get("type");
    const userId = session.user.id;
    
    // Build query based on parameters and user role
    const query: any = {};
    
    if (campaignId) {
      query.campaignId = campaignId;
    }
    
    if (creativeType) {
      query.type = creativeType;
    }
    
    // For advertisers, only show creatives from their campaigns
    if (session.user.role === "ADVERTISER") {
      // Get the advertiser profile
      const advertiser = await prisma.advertiser.findUnique({
        where: { userId }
      });
      
      if (!advertiser) {
        return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
      }
      
      // Get campaigns for this advertiser
      const campaigns = await prisma.campaign.findMany({
        where: { advertiserId: advertiser.id },
        select: { id: true }
      });
      
      const campaignIds = campaigns.map((campaign: { id: string }) => campaign.id);
      
      if (campaignId && !campaignIds.includes(campaignId)) {
        return NextResponse.json({ error: "Campaign not found or access denied" }, { status: 403 });
      }
      
      query.campaignId = {
        in: campaignIds
      };
    }
    
    // Partners don't have direct access to ad creatives
    if (session.user.role === "PARTNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Fetch ad creatives based on query
    const adCreatives = await prisma.adCreative.findMany({
      where: query,
      include: {
        campaign: {
          select: {
            name: true,
            status: true,
            advertiser: {
              select: {
                companyName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(adCreatives);
    
  } catch (error) {
    console.error("Error fetching ad creatives:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad creatives" },
      { status: 500 }
    );
  }
}

// POST handler for creating a new ad creative
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = adCreativeSchema.parse(body);
      
      // Verify the campaign exists and user has permission
      const campaign = await prisma.campaign.findUnique({
        where: { id: validatedData.campaignId },
        include: {
          advertiser: true
        }
      });
      
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      
      // Check permissions - only admins and campaign owner can add creatives
      if (session.user.role === "ADVERTISER") {
        const advertiser = await prisma.advertiser.findUnique({
          where: { userId: session.user.id }
        });
        
        if (!advertiser || advertiser.id !== campaign.advertiser.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      
      // Create the ad creative
      const adCreative = await prisma.adCreative.create({
        data: {
          ...validatedData,
          isApproved: session.user.role === "ADMIN", // Auto-approve if admin
        }
      });
      
      return NextResponse.json(adCreative, { status: 201 });
      
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
  } catch (error) {
    console.error("Error creating ad creative:", error);
    return NextResponse.json(
      { error: "Failed to create ad creative" },
      { status: 500 }
    );
  }
} 