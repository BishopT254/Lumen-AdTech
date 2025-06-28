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

    const campaignId = params.id;

    // Get advertiser ID from the session
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    // Find campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
      select: {
        id: true,
        name: true,
        budget: true,
        startDate: true,
        endDate: true,
        status: true,
        targetSchedule: true, // Use JSON fields for storing additional budget data
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get campaign spend data
    const adDeliveries = await prisma.adDelivery.findMany({
      where: {
        campaignId,
      },
    });

    // Calculate total spend and daily spend
    const totalImpressions = adDeliveries.reduce((sum, delivery) => sum + (delivery.impressions || 0), 0);
    const totalEngagements = adDeliveries.reduce((sum, delivery) => sum + (delivery.engagements || 0), 0);
    
    // Calculate estimated spend based on pricing model
    const campaignDetails = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { pricingModel: true },
    });

    let estimatedSpend = 0;
    if (campaignDetails) {
      // These rates would ideally come from configuration
      const rates = {
        CPM: 0.5, // $0.50 per 1000 impressions
        CPE: 0.05, // $0.05 per engagement
        CPA: 1.00, // $1.00 per action/conversion
        HYBRID: 0.3, // Blended rate
      };

      switch (campaignDetails.pricingModel) {
        case 'CPM':
          estimatedSpend = (totalImpressions / 1000) * rates.CPM;
          break;
        case 'CPE':
          estimatedSpend = totalEngagements * rates.CPE;
          break;
        case 'CPA':
          // For CPA, we'd need conversion data, using a placeholder for now
          const totalConversions = adDeliveries.reduce((sum, delivery) => sum + (delivery.completions || 0), 0);
          estimatedSpend = totalConversions * rates.CPA;
          break;
        case 'HYBRID':
          // A mix of CPM and CPE
          estimatedSpend = ((totalImpressions / 1000) * rates.CPM * 0.5) + 
                           (totalEngagements * rates.CPE * 0.5);
          break;
        default:
          estimatedSpend = 0;
      }
    }

    // Group deliveries by date to get daily spend
    const dailySpend = adDeliveries.reduce((acc, delivery) => {
      const date = delivery.actualDeliveryTime ? 
        new Date(delivery.actualDeliveryTime).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          impressions: 0,
          engagements: 0,
          spend: 0,
        };
      }
      
      acc[date].impressions += delivery.impressions || 0;
      acc[date].engagements += delivery.engagements || 0;
      
      // Calculate spend for this delivery based on pricing model
      let deliverySpend = 0;
      if (campaignDetails) {
        const rates = {
          CPM: 0.5,
          CPE: 0.05,
          CPA: 1.00,
          HYBRID: 0.3,
        };
  
        switch (campaignDetails.pricingModel) {
          case 'CPM':
            deliverySpend = ((delivery.impressions || 0) / 1000) * rates.CPM;
            break;
          case 'CPE':
            deliverySpend = (delivery.engagements || 0) * rates.CPE;
            break;
          case 'CPA':
            deliverySpend = (delivery.completions || 0) * rates.CPA;
            break;
          case 'HYBRID':
            deliverySpend = (((delivery.impressions || 0) / 1000) * rates.CPM * 0.5) + 
                           ((delivery.engagements || 0) * rates.CPE * 0.5);
            break;
        }
      }
      
      acc[date].spend += deliverySpend;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date
    const dailySpendArray = Object.values(dailySpend).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Parse additional budget data from targetSchedule JSON field
    const budgetSettings = campaign.targetSchedule ? 
      (typeof campaign.targetSchedule === 'string' ? 
        JSON.parse(campaign.targetSchedule) : 
        campaign.targetSchedule) : 
      {};
    
    const budgetData = {
      dailyBudget: budgetSettings.dailyBudget || null,
      hasBudgetAlert: budgetSettings.hasBudgetAlert || false,
      budgetAlertThreshold: budgetSettings.budgetAlertThreshold || null
    };

    return NextResponse.json({
      campaign: {
        ...campaign,
        ...budgetData
      },
      budget: {
        totalSpend: estimatedSpend,
        remaining: campaign.budget - estimatedSpend,
        spendPercentage: campaign.budget > 0 ? (estimatedSpend / campaign.budget) * 100 : 0,
        dailySpend: dailySpendArray,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign budget:", error);
    return NextResponse.json({ error: "Failed to fetch campaign budget" }, { status: 500 });
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
      select: {
        id: true,
        targetSchedule: true
      }
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Parse request body
    const budgetData = await req.json();
    
    // Validate budget values
    if (budgetData.budget && (isNaN(budgetData.budget) || budgetData.budget <= 0)) {
      return NextResponse.json({ error: "Total budget must be a positive number" }, { status: 400 });
    }
    
    if (budgetData.dailyBudget && (isNaN(budgetData.dailyBudget) || budgetData.dailyBudget <= 0)) {
      return NextResponse.json({ error: "Daily budget must be a positive number" }, { status: 400 });
    }

    if (budgetData.dailyBudget && budgetData.budget && budgetData.dailyBudget > budgetData.budget) {
      return NextResponse.json({ error: "Daily budget cannot exceed total budget" }, { status: 400 });
    }

    if (budgetData.budgetAlertThreshold && 
        (isNaN(budgetData.budgetAlertThreshold) || 
         budgetData.budgetAlertThreshold <= 0 || 
         budgetData.budgetAlertThreshold > 100)) {
      return NextResponse.json({ error: "Budget alert threshold must be between 1 and 100" }, { status: 400 });
    }

    // Get existing targetSchedule data
    let targetSchedule = existingCampaign.targetSchedule ? 
      (typeof existingCampaign.targetSchedule === 'string' ? 
        JSON.parse(existingCampaign.targetSchedule) : 
        existingCampaign.targetSchedule) : 
      {};
      
    // Update with new budget settings
    targetSchedule = {
      ...targetSchedule,
      dailyBudget: budgetData.dailyBudget ? parseFloat(budgetData.dailyBudget) : null,
      hasBudgetAlert: budgetData.hasBudgetAlert !== undefined ? budgetData.hasBudgetAlert : false,
      budgetAlertThreshold: budgetData.budgetAlertThreshold ? parseFloat(budgetData.budgetAlertThreshold) : null,
    };

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        budget: budgetData.budget ? parseFloat(budgetData.budget) : undefined,
        targetSchedule: targetSchedule,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Campaign budget settings updated",
      campaign: {
        ...campaign,
        dailyBudget: targetSchedule.dailyBudget,
        hasBudgetAlert: targetSchedule.hasBudgetAlert,
        budgetAlertThreshold: targetSchedule.budgetAlertThreshold
      }
    });
  } catch (error) {
    console.error("Error updating campaign budget:", error);
    return NextResponse.json({ error: "Failed to update campaign budget" }, { status: 500 });
  }
} 