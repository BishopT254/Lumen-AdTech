import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Campaign, CampaignAnalytics, CampaignStatus, Prisma } from "@prisma/client";

interface CampaignWithAnalytics extends Campaign {
  analytics: {
    impressions: number;
    engagements: number;
    conversions: number;
    costData: Prisma.JsonValue;
  } | null;
}

interface AnalyticsData {
  campaignId: string;
  impressions: number;
  engagements: number;
  conversions: number;
  costData: Prisma.JsonValue;
}

interface CampaignData extends Omit<Campaign, 'createdAt' | 'updatedAt'> {
  _count: { adCreatives: number };
  adCreatives: {
    id: string;
    name: string;
    type: string;
    content: string;
    format: string;
    duration: number | null;
    previewImage: string | null;
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from session user
    const advertiser = await prisma.advertiser.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser not found" }, { status: 404 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.CampaignWhereInput = {
      advertiserId: advertiser.id,
      ...(status && status !== 'ALL' ? { status: status as CampaignStatus } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      } : {}),
    };

    // Fetch campaigns with pagination and sorting
    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          budget: true,
          startDate: true,
          endDate: true,
          targetDemographics: true,
          targetSchedule: true,
          adCreatives: {
            select: {
              id: true,
              name: true,
              type: true,
              content: true,
              format: true,
              duration: true,
              previewImage: true,
              isApproved: true,
              createdAt: true,
              updatedAt: true,
            }
          },
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              adCreatives: true
            }
          }
        },
        orderBy: {
          [sortField]: sortDirection
        },
        skip,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get analytics data for campaigns
    const campaignIds = campaigns.map(campaign => campaign.id);
    const analytics = await prisma.campaignAnalytics.findMany({
      where: {
        campaignId: {
          in: campaignIds
        }
      },
      select: {
        campaignId: true,
        impressions: true,
        engagements: true,
        conversions: true,
        costData: true,
      }
    });

    // Merge analytics with campaign data
    const campaignsWithAnalytics = (campaigns as CampaignData[]).map((campaign) => {
      const campaignAnalytics = analytics.find((a: AnalyticsData) => a.campaignId === campaign.id);
      return {
        ...campaign,
        analytics: campaignAnalytics ? {
          impressions: campaignAnalytics.impressions,
          engagements: campaignAnalytics.engagements,
          conversions: campaignAnalytics.conversions,
          costData: campaignAnalytics.costData,
        } : null
      };
    });

    return NextResponse.json({
      campaigns: campaignsWithAnalytics,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Error fetching campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get advertiser ID from session user
    const advertiser = await prisma.advertiser.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser not found" }, { status: 404 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.startDate || !data.budget) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: advertiser.id,
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : new Date('9999-12-31'),
        budget: parseFloat(data.budget),
        status: (data.status as CampaignStatus) || 'DRAFT',
        targetDemographics: data.targetDemographics || {},
        targetSchedule: data.targetSchedule || {},
      },
      include: {
        adCreatives: true,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Error creating campaign" }, { status: 500 });
  }
} 