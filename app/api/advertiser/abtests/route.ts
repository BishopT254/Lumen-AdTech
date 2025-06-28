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

    if (status) {
      whereClause.status = status;
    }

    // Use JSON fields to store A/B test data since we don't have dedicated tables yet
    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiserId: advertiser.id,
        // Filter campaigns that have A/B test data
        OR: [
          {
            targetDemographics: {
              path: ['abTests'],
              not: null,
            },
          },
          {
            ...(campaignId ? { id: campaignId } : {}),
          }
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        targetDemographics: true, // Use this JSON field to store A/B test data
        adCreatives: {
          select: {
            id: true,
            name: true,
            type: true,
            content: true,
          },
        },
      },
    });

    // Transform data to extract A/B tests
    const abTests = campaigns.flatMap(campaign => {
      const demographics = campaign.targetDemographics || {};
      const abTestsData = demographics.abTests || [];
      
      if (!Array.isArray(abTestsData)) {
        return [];
      }
      
      return abTestsData.map((test: any) => ({
        id: test.id || `test-${Math.random().toString(36).substring(2, 9)}`,
        campaignId: campaign.id,
        campaignName: campaign.name,
        name: test.name,
        status: test.status || 'DRAFT',
        startDate: test.startDate ? new Date(test.startDate) : null,
        endDate: test.endDate ? new Date(test.endDate) : null,
        variants: test.variants || [],
        createdAt: test.createdAt || new Date().toISOString(),
        updatedAt: test.updatedAt || new Date().toISOString(),
      }));
    });

    // Apply filtering based on URL params
    let filteredTests = abTests;
    if (status) {
      filteredTests = filteredTests.filter(test => test.status === status);
    }

    return NextResponse.json({
      tests: filteredTests,
      count: filteredTests.length,
    });
  } catch (error) {
    console.error("Error fetching A/B tests:", error);
    return NextResponse.json({ error: "Failed to fetch A/B tests" }, { status: 500 });
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
    const { campaignId, name, variants } = await req.json();
    
    // Validate required fields
    if (!campaignId || !name || !variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json({
        error: "Missing required fields: campaignId, name, and at least 2 variants"
      }, { status: 400 });
    }

    // Validate variants
    for (const variant of variants) {
      if (!variant.name || !variant.adCreativeId) {
        return NextResponse.json({
          error: "Each variant must have a name and adCreativeId"
        }, { status: 400 });
      }
      
      if (variant.traffic && (isNaN(variant.traffic) || variant.traffic <= 0 || variant.traffic > 100)) {
        return NextResponse.json({
          error: "Traffic allocation must be between 1 and 100"
        }, { status: 400 });
      }
    }

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
      select: {
        id: true,
        targetDemographics: true,
        adCreatives: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify that all ad creatives belong to this campaign
    const campaignCreativeIds = campaign.adCreatives.map(creative => creative.id);
    for (const variant of variants) {
      if (!campaignCreativeIds.includes(variant.adCreativeId)) {
        return NextResponse.json({
          error: `Ad creative ${variant.adCreativeId} does not belong to this campaign`
        }, { status: 400 });
      }
    }

    // Create new A/B test
    const newTest = {
      id: `abtest-${Math.random().toString(36).substring(2, 9)}`,
      name,
      status: 'DRAFT',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      variants: variants.map(variant => ({
        ...variant,
        impressions: 0,
        engagements: 0,
        conversions: 0,
        // Set default traffic allocation if not provided
        traffic: variant.traffic || Math.floor(100 / variants.length),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update campaign to include the new A/B test
    const targetDemographics = campaign.targetDemographics || {};
    const existingTests = Array.isArray(targetDemographics.abTests) ? targetDemographics.abTests : [];
    
    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        targetDemographics: {
          ...targetDemographics,
          abTests: [...existingTests, newTest],
        },
      },
      select: {
        id: true,
        name: true,
        targetDemographics: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'A/B test created successfully',
      test: newTest,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating A/B test:", error);
    return NextResponse.json({ error: "Failed to create A/B test" }, { status: 500 });
  }
} 