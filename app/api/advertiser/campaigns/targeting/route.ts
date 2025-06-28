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

    // Fetch available targeting options
    // These would normally come from a database table, but we'll hard-code them for now
    const targetingOptions = {
      demographics: {
        ageRanges: [
          { id: 'age_18_24', name: '18-24' },
          { id: 'age_25_34', name: '25-34' },
          { id: 'age_35_44', name: '35-44' },
          { id: 'age_45_54', name: '45-54' },
          { id: 'age_55_64', name: '55-64' },
          { id: 'age_65_plus', name: '65+' },
        ],
        genders: [
          { id: 'male', name: 'Male' },
          { id: 'female', name: 'Female' },
          { id: 'non_binary', name: 'Non-binary' },
          { id: 'other', name: 'Other' },
        ],
        incomeRanges: [
          { id: 'income_low', name: 'Under $40,000' },
          { id: 'income_medium', name: '$40,000 - $80,000' },
          { id: 'income_high', name: '$80,000 - $120,000' },
          { id: 'income_very_high', name: 'Over $120,000' },
        ],
        educationLevels: [
          { id: 'education_high_school', name: 'High School' },
          { id: 'education_college', name: 'College' },
          { id: 'education_bachelors', name: 'Bachelor\'s Degree' },
          { id: 'education_masters', name: 'Master\'s Degree' },
          { id: 'education_phd', name: 'Ph.D or Higher' },
        ],
      },
      psychographics: {
        interests: [
          { id: 'interest_technology', name: 'Technology' },
          { id: 'interest_fashion', name: 'Fashion' },
          { id: 'interest_sports', name: 'Sports' },
          { id: 'interest_food', name: 'Food & Cooking' },
          { id: 'interest_travel', name: 'Travel' },
          { id: 'interest_fitness', name: 'Fitness & Health' },
          { id: 'interest_music', name: 'Music' },
          { id: 'interest_gaming', name: 'Gaming' },
          { id: 'interest_finance', name: 'Finance' },
          { id: 'interest_education', name: 'Education' },
        ],
        lifestyles: [
          { id: 'lifestyle_urban', name: 'Urban' },
          { id: 'lifestyle_suburban', name: 'Suburban' },
          { id: 'lifestyle_rural', name: 'Rural' },
          { id: 'lifestyle_eco', name: 'Eco-conscious' },
          { id: 'lifestyle_luxury', name: 'Luxury' },
          { id: 'lifestyle_minimalist', name: 'Minimalist' },
        ],
        values: [
          { id: 'value_family', name: 'Family-oriented' },
          { id: 'value_career', name: 'Career-focused' },
          { id: 'value_health', name: 'Health-conscious' },
          { id: 'value_social', name: 'Socially conscious' },
          { id: 'value_adventure', name: 'Adventure-seeking' },
        ],
      },
      behavioral: {
        purchaseHistory: [
          { id: 'purchase_frequent', name: 'Frequent Shoppers' },
          { id: 'purchase_high_value', name: 'High-value Shoppers' },
          { id: 'purchase_discount', name: 'Discount Shoppers' },
          { id: 'purchase_seasonal', name: 'Seasonal Shoppers' },
        ],
        browsingBehavior: [
          { id: 'browsing_mobile', name: 'Mobile Users' },
          { id: 'browsing_desktop', name: 'Desktop Users' },
          { id: 'browsing_social', name: 'Social Media Users' },
          { id: 'browsing_video', name: 'Video Content Viewers' },
        ],
        loyaltyStatus: [
          { id: 'loyalty_new', name: 'New Customers' },
          { id: 'loyalty_returning', name: 'Returning Customers' },
          { id: 'loyalty_long_term', name: 'Long-term Customers' },
        ],
      },
      geographic: {
        countries: [
          { id: 'country_us', name: 'United States' },
          { id: 'country_ca', name: 'Canada' },
          { id: 'country_uk', name: 'United Kingdom' },
          { id: 'country_eu', name: 'European Union' },
          { id: 'country_au', name: 'Australia' },
          { id: 'country_other', name: 'Other' },
        ],
        regions: [
          { id: 'region_northeast', name: 'Northeast' },
          { id: 'region_southeast', name: 'Southeast' },
          { id: 'region_midwest', name: 'Midwest' },
          { id: 'region_southwest', name: 'Southwest' },
          { id: 'region_west', name: 'West' },
        ],
        cityTypes: [
          { id: 'city_major', name: 'Major Cities' },
          { id: 'city_suburban', name: 'Suburban Areas' },
          { id: 'city_rural', name: 'Rural Areas' },
        ],
      },
      emotional: {
        sentiments: [
          { id: 'emotion_happy', name: 'Happy/Upbeat' },
          { id: 'emotion_serious', name: 'Serious/Professional' },
          { id: 'emotion_relaxed', name: 'Relaxed/Casual' },
          { id: 'emotion_excited', name: 'Excited/Energetic' },
        ],
        tones: [
          { id: 'tone_humorous', name: 'Humorous' },
          { id: 'tone_informative', name: 'Informative' },
          { id: 'tone_inspirational', name: 'Inspirational' },
          { id: 'tone_practical', name: 'Practical' },
        ],
      },
      technographic: {
        devices: [
          { id: 'device_smartphone', name: 'Smartphone' },
          { id: 'device_tablet', name: 'Tablet' },
          { id: 'device_desktop', name: 'Desktop Computer' },
          { id: 'device_smart_tv', name: 'Smart TV' },
          { id: 'device_gaming', name: 'Gaming Console' },
        ],
        platforms: [
          { id: 'platform_ios', name: 'iOS' },
          { id: 'platform_android', name: 'Android' },
          { id: 'platform_windows', name: 'Windows' },
          { id: 'platform_mac', name: 'macOS' },
          { id: 'platform_linux', name: 'Linux' },
        ],
        browsers: [
          { id: 'browser_chrome', name: 'Chrome' },
          { id: 'browser_safari', name: 'Safari' },
          { id: 'browser_firefox', name: 'Firefox' },
          { id: 'browser_edge', name: 'Edge' },
          { id: 'browser_other', name: 'Other' },
        ],
      },
      temporal: {
        timeOfDay: [
          { id: 'time_morning', name: 'Morning (6am-12pm)' },
          { id: 'time_afternoon', name: 'Afternoon (12pm-6pm)' },
          { id: 'time_evening', name: 'Evening (6pm-12am)' },
          { id: 'time_night', name: 'Night (12am-6am)' },
        ],
        dayOfWeek: [
          { id: 'day_weekday', name: 'Weekdays' },
          { id: 'day_weekend', name: 'Weekends' },
        ],
        seasons: [
          { id: 'season_spring', name: 'Spring' },
          { id: 'season_summer', name: 'Summer' },
          { id: 'season_fall', name: 'Fall' },
          { id: 'season_winter', name: 'Winter' },
        ],
      },
    };

    // Return targeting options
    return NextResponse.json({
      success: true,
      targeting: targetingOptions,
    });
  } catch (error) {
    console.error("Error fetching targeting options:", error);
    return NextResponse.json({ error: "Failed to fetch targeting options" }, { status: 500 });
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
    const { campaignId, targeting } = await req.json();
    
    // Validate required fields
    if (!campaignId || !targeting) {
      return NextResponse.json({
        error: "Missing required fields: campaignId and targeting"
      }, { status: 400 });
    }

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        advertiserId: advertiser.id,
      },
      select: {
        id: true,
        name: true,
        targetDemographics: true,
        targetSchedule: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Validate targeting data
    if (targeting.demographics && typeof targeting.demographics !== 'object') {
      return NextResponse.json({ error: "Demographics targeting must be an object" }, { status: 400 });
    }

    if (targeting.temporal && typeof targeting.temporal !== 'object') {
      return NextResponse.json({ error: "Temporal targeting must be an object" }, { status: 400 });
    }

    // Prepare data for update
    const updateData: any = {};
    
    // Handle demographics targeting
    if (targeting.demographics) {
      updateData.targetDemographics = {
        ...campaign.targetDemographics,
        ...targeting.demographics,
      };
    }
    
    // Handle temporal targeting
    if (targeting.temporal) {
      updateData.targetSchedule = {
        ...campaign.targetSchedule,
        ...targeting.temporal,
      };
    }
    
    // Store other targeting data in JSON fields
    // We're using targetDemographics to store other targeting data as well
    if (targeting.psychographics) {
      updateData.targetDemographics = {
        ...(updateData.targetDemographics || campaign.targetDemographics || {}),
        psychographics: targeting.psychographics,
      };
    }
    
    if (targeting.behavioral) {
      updateData.targetDemographics = {
        ...(updateData.targetDemographics || campaign.targetDemographics || {}),
        behavioral: targeting.behavioral,
      };
    }
    
    if (targeting.geographic) {
      updateData.targetDemographics = {
        ...(updateData.targetDemographics || campaign.targetDemographics || {}),
        geographic: targeting.geographic,
      };
    }
    
    if (targeting.emotional) {
      updateData.targetDemographics = {
        ...(updateData.targetDemographics || campaign.targetDemographics || {}),
        emotional: targeting.emotional,
      };
    }
    
    if (targeting.technographic) {
      updateData.targetDemographics = {
        ...(updateData.targetDemographics || campaign.targetDemographics || {}),
        technographic: targeting.technographic,
      };
    }

    // Update campaign targeting
    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        targetDemographics: true,
        targetSchedule: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign targeting updated successfully',
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error("Error updating campaign targeting:", error);
    return NextResponse.json({ error: "Failed to update campaign targeting" }, { status: 500 });
  }
} 