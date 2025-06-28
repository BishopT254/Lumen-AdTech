import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clear existing data
  await clearDatabase();
  
  // Create users with different roles
  const users = await createUsers();
  
  // Create advertisers, partners, and admins
  const advertisers = await createAdvertisers(users.filter(u => u.role === 'ADVERTISER'));
  const partners = await createPartners(users.filter(u => u.role === 'PARTNER'));
  const admins = await createAdmins(users.filter(u => u.role === 'ADMIN'));
  
  // Verify we have at least one admin user
  if (!admins || admins.length === 0) {
    throw new Error('No admin users were created. Cannot proceed with system configuration.');
  }
  
  // Create devices for partners
  const devices = await createDevices(partners);
  
  // Create payment methods for advertisers
  const paymentMethods = await createPaymentMethods(advertisers);
  
  // Create campaigns for advertisers
  const campaigns = await createCampaigns(advertisers);
  
  // Create ad creatives for campaigns
  const adCreatives = await createAdCreatives(campaigns);
  
  // Create AB tests for campaigns
  const abTests = await createABTests(campaigns, adCreatives);
  
  // Create ad deliveries
  const adDeliveries = await createAdDeliveries(campaigns, adCreatives, devices);
  
  // Create analytics data
  await createAnalyticsData(campaigns, adCreatives, adDeliveries, devices);
  
  // Create payments and billings
  await createPaymentsAndBillings(advertisers, campaigns, paymentMethods);
  
  // Create partner earnings
  await createPartnerEarnings(partners);
  
  // Get the admin user directly from the database to ensure we have a valid user
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!adminUser) {
    throw new Error('No admin user found in the database. Cannot proceed with system configuration.');
  }
  
  // Create system configuration with the valid admin user
  await createSystemConfig(adminUser);
  
  // Create feature flags with the valid admin user
  await createFeatureFlags(adminUser);
  
  // Create config audit logs with the valid admin user
  await createConfigAuditLogs(adminUser);
  
  // Create config access records
  await createConfigAccess();
  
  // Create new model data
  await createUserPreferences(users);
  await createApiKeys(users);
  await createNotifications(users);
  await createDeviceAvailability(devices);
  await createSustainabilityMetrics(devices, campaigns);
  await createAudienceData(adDeliveries);
  await createExternalIntegrations();
  await createWebhooks();
  
  console.log('Database seeding completed successfully!');
}

async function clearDatabase() {
  const tablesToClear = [
    // New models
    'Webhook',
    'ExternalIntegration',
    'AudienceData',
    'ApiKey',
    'UserPreference',
    'SustainabilityMetrics',
    'DeviceAvailability',
    'Notification',
    // Existing models
    'FeatureFlag',
    'ConfigAccess',
    'ConfigAuditLog',
    'SystemConfig',
    'PartnerEarning',
    'Billing',
    'Payment',
    'PaymentMethod',
    'DeviceAnalytics',
    'EmotionData',
    'AdDelivery',
    'ABTestVariant',
    'ABTest',
    'CampaignAnalytics',
    'AdCreative',
    'Campaign',
    'Device',
    'Admin',
    'Partner',
    'Advertiser',
    'VerificationToken',
    'Session',
    'Account',
    'User'
  ];
  
  console.log('Clearing existing data...');
  
  for (const table of tablesToClear) {
    try {
      // Using executeRaw for a clean truncate that resets sequences
      // Note: This is PostgreSQL specific syntax
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.log(`Could not clear table ${table}: ${error.message}`);
    }
  }
}

async function createUsers() {
  console.log('Creating users...');
  
  const hashedPassword = await hash('Password123!', 10);
  
  const userData = [
    // Advertisers
    {
      name: 'John Advertiser',
      email: 'john@adcompany.com',
      password: hashedPassword,
      role: 'ADVERTISER',
      emailVerified: new Date(),
      bio: "Marketing professional with 10+ years of experience in digital advertising."
    },
    {
      name: 'Sarah Marketing',
      email: 'sarah@brandcorp.com',
      password: hashedPassword,
      role: 'ADVERTISER',
      emailVerified: new Date(),
      bio: "Brand specialist focusing on innovative advertising solutions."
    },
    {
      name: 'Michael Ads',
      email: 'michael@adagency.com',
      password: hashedPassword,
      role: 'ADVERTISER',
      emailVerified: new Date(),
      bio: "Creative director specializing in multimedia advertising campaigns."
    },
    
    // Partners
    {
      name: 'David Partner',
      email: 'david@displaynetwork.com',
      password: hashedPassword,
      role: 'PARTNER',
      emailVerified: new Date(),
      bio: "Display network operator with a focus on high-traffic urban areas."
    },
    {
      name: 'Lisa Screens',
      email: 'lisa@screenpartner.com',
      password: hashedPassword,
      role: 'PARTNER',
      emailVerified: new Date(),
      bio: "Digital signage expert with extensive experience in retail and transit advertising."
    },
    
    // Admins
    {
      name: 'Admin User',
      email: 'admin@adplatform.com',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
      bio: "Platform administrator with background in adtech systems and operations."
    }
  ];
  
  const users = [];
  
  for (const user of userData) {
    const createdUser = await prisma.user.create({
      data: user
    });
    users.push(createdUser);
  }
  
  console.log(`Created ${users.length} users`);
  return users;
}

async function createAdvertisers(advertiserUsers) {
  console.log('Creating advertisers...');
  
  const advertisers = [];
  
  const advertiserData = [
    {
      companyName: 'AdCompany Inc.',
      contactPerson: 'John Advertiser',
      phoneNumber: '+1234567890',
      address: '123 Ad Street',
      city: 'New York',
      country: 'USA'
    },
    {
      companyName: 'BrandCorp',
      contactPerson: 'Sarah Marketing',
      phoneNumber: '+1987654321',
      address: '456 Brand Avenue',
      city: 'Los Angeles',
      country: 'USA'
    },
    {
      companyName: 'Ad Agency Pro',
      contactPerson: 'Michael Ads',
      phoneNumber: '+1122334455',
      address: '789 Agency Boulevard',
      city: 'Chicago',
      country: 'USA'
    }
  ];
  
  for (let i = 0; i < advertiserUsers.length; i++) {
    const advertiser = await prisma.advertiser.create({
      data: {
        userId: advertiserUsers[i].id,
        ...advertiserData[i]
      }
    });
    advertisers.push(advertiser);
  }
  
  console.log(`Created ${advertisers.length} advertisers`);
  return advertisers;
}

async function createPartners(partnerUsers) {
  console.log('Creating partners...');
  
  const partners = [];
  
  const partnerData = [
    {
      companyName: 'Display Network Ltd.',
      contactPerson: 'David Partner',
      phoneNumber: '+2547123456',
      address: '10 Display Road',
      city: 'Nairobi',
      country: 'Kenya',
      commissionRate: 0.3,
      paymentDetails: {
        bankName: 'Kenya Commercial Bank',
        accountNumber: '1234567890',
        swiftCode: 'KCBLKENX'
      }
    },
    {
      companyName: 'Screen Partners Co.',
      contactPerson: 'Lisa Screens',
      phoneNumber: '+2547987654',
      address: '20 Screen Street',
      city: 'Mombasa',
      country: 'Kenya',
      commissionRate: 0.35,
      paymentDetails: {
        bankName: 'Equity Bank',
        accountNumber: '0987654321',
        swiftCode: 'EQBLKENA'
      }
    }
  ];
  
  for (let i = 0; i < partnerUsers.length; i++) {
    const partner = await prisma.partner.create({
      data: {
        userId: partnerUsers[i].id,
        ...partnerData[i]
      }
    });
    partners.push(partner);
  }
  
  console.log(`Created ${partners.length} partners`);
  return partners;
}

async function createAdmins(adminUsers) {
  console.log('Creating admins...');
  
  const admins = [];
  
  for (const adminUser of adminUsers) {
    const admin = await prisma.admin.create({
      data: {
        userId: adminUser.id,
        permissions: {
          canManageUsers: true,
          canManageCampaigns: true,
          canManagePartners: true,
          canManagePayments: true,
          canViewAnalytics: true,
          canManageSystem: true
        }
      }
    });
    admins.push(admin);
  }
  
  console.log(`Created ${admins.length} admins`);
  return admins;
}

async function createDevices(partners) {
  console.log('Creating devices...');
  
  const devices = [];
  
  const deviceTypes = ['ANDROID_TV', 'DIGITAL_SIGNAGE', 'INTERACTIVE_KIOSK', 'VEHICLE_MOUNTED', 'RETAIL_DISPLAY'];
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'MAINTENANCE'];
  const healthStatuses = ['HEALTHY', 'HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE'];
  
  // Create 5 devices for each partner
  for (const partner of partners) {
    for (let i = 0; i < 5; i++) {
      const deviceType = deviceTypes[i];
      const deviceStatus = statuses[i];
      const healthStatus = healthStatuses[i];
      
      const location = {
        latitude: -1.2921 + (Math.random() * 0.1),
        longitude: 36.8219 + (Math.random() * 0.1),
        address: `${100 + i} Main Street, Nairobi`,
        area: 'Central Business District'
      };
      
      let routeDetails = null;
      if (deviceType === 'VEHICLE_MOUNTED') {
        routeDetails = {
          routeName: `Route ${i + 1}`,
          startPoint: 'Westlands',
          endPoint: 'CBD',
          averageDailyPassengers: 1000 + (i * 200)
        };
      }
      
      const device = await prisma.device.create({
        data: {
          partnerId: partner.id,
          name: `${partner.companyName} - ${deviceType} #${i + 1}`,
          deviceIdentifier: `DEV-${partner.id.substring(0, 4)}-${i + 1}-${Date.now()}`,
          deviceType: deviceType,
          location: location,
          routeDetails: routeDetails,
          status: deviceStatus,
          lastActive: new Date(),
          healthStatus: healthStatus
        }
      });
      
      devices.push(device);
    }
  }
  
  console.log(`Created ${devices.length} devices`);
  return devices;
}

async function createPaymentMethods(advertisers) {
  console.log('Creating payment methods...');
  
  const paymentMethods = [];
  
  const paymentTypes = ['VISA', 'MASTERCARD', 'MPESA', 'FLUTTERWAVE', 'PAYPAL'];
  
  for (const advertiser of advertisers) {
    // Create 2 payment methods for each advertiser
    for (let i = 0; i < 2; i++) {
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      
      let paymentMethodData = {
        advertiserId: advertiser.id,
        type: paymentType,
        isDefault: i === 0 // First one is default
      };
      
      // Add card-specific details for card payment methods
      if (paymentType === 'VISA' || paymentType === 'MASTERCARD' || paymentType === 'AMEX') {
        paymentMethodData = {
          ...paymentMethodData,
          last4: `${1000 + Math.floor(Math.random() * 9000)}`.substring(0, 4),
          expMonth: 1 + Math.floor(Math.random() * 12),
          expYear: 2024 + Math.floor(Math.random() * 5)
        };
      } else {
        // For non-card methods, still need these fields
        paymentMethodData = {
          ...paymentMethodData,
          last4: '0000',
          expMonth: 12,
          expYear: 2030
        };
      }
      
      const paymentMethod = await prisma.paymentMethod.create({
        data: paymentMethodData
      });
      
      paymentMethods.push(paymentMethod);
    }
  }
  
  console.log(`Created ${paymentMethods.length} payment methods`);
  return paymentMethods;
}

async function createCampaigns(advertisers) {
  console.log('Creating campaigns...');
  
  const campaigns = [];
  const objectives = ['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'TRAFFIC', 'ENGAGEMENT'];
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED'];
  const pricingModels = ['CPM', 'CPE', 'CPA', 'HYBRID'];
  
  // Create 3 campaigns for each advertiser
  for (const advertiser of advertisers) {
    for (let i = 0; i < 3; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (i * 5)); // Stagger start dates
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30-day campaigns
      
      const objective = objectives[Math.floor(Math.random() * objectives.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const pricingModel = pricingModels[Math.floor(Math.random() * pricingModels.length)];
      
      const targetLocations = [
        {
          city: 'Nairobi',
          areas: ['CBD', 'Westlands', 'Kilimani'],
          radius: 5 // km
        },
        {
          city: 'Mombasa',
          areas: ['Nyali', 'City Center'],
          radius: 3 // km
        }
      ];
      
      const targetSchedule = {
        weekdays: [1, 2, 3, 4, 5], // Monday to Friday
        weekends: status === 'ACTIVE' ? [6, 7] : [], // Saturday and Sunday for some campaigns
        timeRanges: [
          { start: '07:00', end: '10:00' },
          { start: '16:00', end: '20:00' }
        ]
      };
      
      const targetDemographics = {
        ageRanges: ['18-24', '25-34', '35-44'],
        gender: 'ALL',
        interests: ['Technology', 'Fashion', 'Food']
      };
      
      const campaign = await prisma.campaign.create({
        data: {
          advertiserId: advertiser.id,
          name: `${advertiser.companyName} Campaign ${i + 1}`,
          description: `This is a ${objective.toLowerCase()} campaign for ${advertiser.companyName}`,
          status: status,
          objective: objective,
          budget: 5000 + (i * 1000),
          dailyBudget: 500 + (i * 100),
          startDate: startDate,
          endDate: endDate,
          targetLocations: targetLocations,
          targetSchedule: targetSchedule,
          targetDemographics: targetDemographics,
          pricingModel: pricingModel
        }
      });
      
      campaigns.push(campaign);
    }
  }
  
  console.log(`Created ${campaigns.length} campaigns`);
  return campaigns;
}

async function createAdCreatives(campaigns) {
  console.log('Creating ad creatives...');
  
  const adCreatives = [];
  const creativeTypes = ['IMAGE', 'VIDEO', 'INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE'];
  const statuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];
  
  // Create 2 ad creatives for each campaign
  for (const campaign of campaigns) {
    for (let i = 0; i < 2; i++) {
      const creativeType = creativeTypes[Math.floor(Math.random() * creativeTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      let arMarkers = null;
      let voiceCommands = null;
      
      if (creativeType === 'AR_EXPERIENCE') {
        arMarkers = {
          markers: [
            {
              id: `marker-${i + 1}`,
              type: 'image',
              triggerDistance: 2, // meters
              content: {
                type: '3d-model',
                url: 'https://example.com/models/product.glb'
              }
            }
          ]
        };
      }
      
      if (creativeType === 'VOICE_INTERACTIVE') {
        voiceCommands = {
          commands: [
            {
              trigger: 'show more information',
              action: 'DISPLAY_DETAILS'
            },
            {
              trigger: 'add to cart',
              action: 'ADD_TO_CART'
            }
          ],
          fallbackMessage: 'Sorry, I didn\'t understand that command.'
        };
      }
      
      const adCreative = await prisma.adCreative.create({
        data: {
          campaignId: campaign.id,
          name: `Creative ${i + 1} for ${campaign.name}`,
          type: creativeType,
          status: status,
          content: `https://example.com/creatives/${campaign.id}-${i + 1}.${creativeType === 'VIDEO' ? 'mp4' : 'jpg'}`,
          format: creativeType === 'VIDEO' ? 'mp4' : 'jpg',
          duration: creativeType === 'VIDEO' ? 15 + (i * 15) : null,
          previewImage: `https://example.com/previews/${campaign.id}-${i + 1}.jpg`,
          headline: `Amazing Offer ${i + 1} - Limited Time!`,
          description: `Check out our amazing products with special discount for a limited time only. Don't miss this opportunity!`,
          callToAction: i === 0 ? 'Shop Now' : 'Learn More',
          isApproved: status === 'APPROVED',
          rejectionReason: status === 'REJECTED' ? 'Content does not comply with our guidelines.' : null,
          ar_markers: arMarkers,
          voiceCommands: voiceCommands
        }
      });
      
      adCreatives.push(adCreative);
    }
  }
  
  console.log(`Created ${adCreatives.length} ad creatives`);
  return adCreatives;
}

async function createABTests(campaigns, adCreatives) {
  console.log('Creating AB tests...');
  
  const abTests = [];
  const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
  
  // Create AB tests for 50% of campaigns
  for (let i = 0; i < campaigns.length; i++) {
    if (i % 2 === 0) { // Only for even indexed campaigns
      const campaign = campaigns[i];
      
      // Find ad creatives for this campaign
      const campaignCreatives = adCreatives.filter(creative => creative.campaignId === campaign.id);
      
      if (campaignCreatives.length >= 2) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // 14-day test
        
        const abTest = await prisma.aBTest.create({
          data: {
            campaignId: campaign.id,
            name: `A/B Test for ${campaign.name}`,
            description: 'Testing different creative variations to optimize performance',
            status: status,
            startDate: startDate,
            endDate: status === 'COMPLETED' ? endDate : null,
            winningVariantId: status === 'COMPLETED' ? campaignCreatives[0].id : null
          }
        });
        
        // Create variants for this AB test
        for (let j = 0; j < campaignCreatives.length; j++) {
          const creative = campaignCreatives[j];
          
          await prisma.aBTestVariant.create({
            data: {
              abTestId: abTest.id,
              adCreativeId: creative.id,
              name: `Variant ${j + 1}`,
              trafficAllocation: j === 0 ? 60 : 40, // 60/40 split
              impressions: Math.floor(Math.random() * 10000),
              engagements: Math.floor(Math.random() * 1000),
              conversions: Math.floor(Math.random() * 100)
            }
          });
        }
        
        abTests.push(abTest);
      }
    }
  }
  
  console.log(`Created ${abTests.length} AB tests`);
  return abTests;
}

async function createAdDeliveries(campaigns, adCreatives, devices) {
  console.log('Creating ad deliveries...');
  
  const adDeliveries = [];
  const statuses = ['SCHEDULED', 'DELIVERED', 'FAILED', 'SKIPPED', 'PENDING'];
  
  // Create ad deliveries for active campaigns
  const activeCampaigns = campaigns.filter(campaign => campaign.status === 'ACTIVE');
  
  for (const campaign of activeCampaigns) {
    // Find ad creatives for this campaign
    const campaignCreatives = adCreatives.filter(creative => creative.campaignId === campaign.id);
    
    if (campaignCreatives.length > 0) {
      // Create 10 deliveries for each campaign
      for (let i = 0; i < 10; i++) {
        const creative = campaignCreatives[i % campaignCreatives.length];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const scheduledTime = new Date();
        scheduledTime.setHours(scheduledTime.getHours() - (24 - i)); // Spread over last 24 hours
        
        let actualDeliveryTime = null;
        if (status === 'DELIVERED') {
          actualDeliveryTime = new Date(scheduledTime);
          actualDeliveryTime.setMinutes(actualDeliveryTime.getMinutes() + 5); // 5 minutes after scheduled
        }
        
        const viewerCount = status === 'DELIVERED' ? 10 + Math.floor(Math.random() * 90) : null;
        const impressions = status === 'DELIVERED' ? viewerCount : 0;
        const engagements = status === 'DELIVERED' ? Math.floor(impressions * 0.2) : 0;
        const completions = status === 'DELIVERED' ? Math.floor(engagements * 0.5) : 0;
        
        const locationData = {
          latitude: device.location.latitude,
          longitude: device.location.longitude,
          accuracy: 5 + Math.random() * 10
        };
        
        const weatherData = {
          temperature: 20 + Math.random() * 10,
          condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
          humidity: 50 + Math.floor(Math.random() * 30)
        };
        
        const adDelivery = await prisma.adDelivery.create({
          data: {
            campaignId: campaign.id,
            adCreativeId: creative.id,
            deviceId: device.id,
            scheduledTime: scheduledTime,
            actualDeliveryTime: actualDeliveryTime,
            viewerCount: viewerCount,
            impressions: impressions,
            engagements: engagements,
            completions: completions,
            status: status,
            locationData: locationData,
            weatherData: weatherData
          }
        });
        
        adDeliveries.push(adDelivery);
        
        // Create emotion data for delivered ads
        if (status === 'DELIVERED') {
          await prisma.emotionData.create({
            data: {
              adCreativeId: creative.id,
              adDeliveryId: adDelivery.id,
              timestamp: actualDeliveryTime,
              joyScore: Math.random().toFixed(3),
              surpriseScore: Math.random().toFixed(3),
              neutralScore: Math.random().toFixed(3),
              dwellTime: 5 + Math.random() * 20,
              viewerCount: viewerCount,
              isAggregated: true
            }
          });
        }
      }
    }
  }
  
  console.log(`Created ${adDeliveries.length} ad deliveries`);
  return adDeliveries;
}

async function createAnalyticsData(campaigns, adCreatives, adDeliveries, devices) {
  console.log('Creating analytics data...');
  
  // Create campaign analytics for the last 30 days
  for (const campaign of campaigns) {
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Start of day
      
      const impressions = 1000 + Math.floor(Math.random() * 9000);
      const engagements = Math.floor(impressions * (0.05 + Math.random() * 0.15));
      const conversions = Math.floor(engagements * (0.1 + Math.random() * 0.2));
      const ctr = (engagements / impressions * 100).toFixed(4);
      const conversionRate = (conversions / engagements * 100).toFixed(4);
      
      const audienceMetrics = {
        demographics: {
          '18-24': 0.2 + Math.random() * 0.1,
          '25-34': 0.3 + Math.random() * 0.1,
          '35-44': 0.2 + Math.random() * 0.1,
          '45-54': 0.1 + Math.random() * 0.1,
          '55+': 0.1 + Math.random() * 0.1
        },
        gender: {
          male: 0.4 + Math.random() * 0.2,
          female: 0.4 + Math.random() * 0.2,
          other: 0.1 + Math.random() * 0.1
        }
      };
      
      const emotionMetrics = {
        joy: 0.4 + Math.random() * 0.3,
        surprise: 0.2 + Math.random() * 0.2,
        neutral: 0.2 + Math.random() * 0.2
      };
      
      const costData = {
        spend: 100 + Math.random() * 900,
        cpm: 5 + Math.random() * 10,
        cpe: 0.5 + Math.random() * 1,
        cpa: 5 + Math.random() * 20
      };
      
      await prisma.campaignAnalytics.create({
        data: {
          campaignId: campaign.id,
          date: date,
          impressions: impressions,
          engagements: engagements,
          conversions: conversions,
          ctr: parseFloat(ctr),
          conversionRate: parseFloat(conversionRate),
          averageDwellTime: 10 + Math.random() * 20,
          audienceMetrics: audienceMetrics,
          emotionMetrics: emotionMetrics,
          costData: costData
        }
      });
    }
  }
  
  // Create device analytics for the last 30 days
  for (const device of devices) {
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0); // Start of day
      
      await prisma.deviceAnalytics.create({
        data: {
          deviceId: device.id,
          date: date,
          uptime: 20 + Math.random() * 4, // Hours
          impressionsServed: 100 + Math.floor(Math.random() * 900),
          engagementsCount: 10 + Math.floor(Math.random() * 90),
          averageViewerCount: 5 + Math.random() * 15,
          performanceMetrics: {
            cpu: 20 + Math.random() * 60,
            memory: 30 + Math.random() * 40,
            network: 5 + Math.random() * 20
          },
          energyConsumption: 2 + Math.random() * 3
        }
      });
    }
  }
  
  console.log('Created analytics data');
}

async function createPaymentsAndBillings(advertisers, campaigns, paymentMethods) {
  console.log('Creating payments and billings...');
  
  const paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
  const billingStatuses = ['UNPAID', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID'];
  
  for (const advertiser of advertisers) {
    // Get payment methods for this advertiser
    const advertiserPaymentMethods = paymentMethods.filter(pm => pm.advertiserId === advertiser.id);
    
    if (advertiserPaymentMethods.length > 0) {
      // Create 3 payments for each advertiser
      for (let i = 0; i < 3; i++) {
        const paymentMethod = advertiserPaymentMethods[i % advertiserPaymentMethods.length];
        const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
        
        const dateInitiated = new Date();
        dateInitiated.setDate(dateInitiated.getDate() - (i * 30)); // Monthly payments
        
        let dateCompleted = null;
        if (status === 'COMPLETED' || status === 'REFUNDED') {
          dateCompleted = new Date(dateInitiated);
          dateCompleted.setHours(dateCompleted.getHours() + 2); // 2 hours after initiation
        }
        
        const amount = 1000 + Math.random() * 9000;
        
        // Updated to use paymentMethodType instead of paymentMethod
        const payment = await prisma.payment.create({
          data: {
            advertiserId: advertiser.id,
            amount: amount,
            paymentMethodType: paymentMethod.type, // Use paymentMethodType instead of paymentMethod
            paymentMethodId: paymentMethod.id,
            transactionId: `TXN-${Date.now()}-${i}`,
            status: status,
            dateInitiated: dateInitiated,
            dateCompleted: dateCompleted,
            receiptUrl: status === 'COMPLETED' ? `https://example.com/receipts/${advertiser.id}-${i}.pdf` : null
          }
        });
        
        // Create billings associated with this payment
        // Get campaigns for this advertiser
        const advertiserCampaigns = campaigns.filter(c => c.advertiserId === advertiser.id);
        
        if (advertiserCampaigns.length > 0) {
          const campaign = advertiserCampaigns[i % advertiserCampaigns.length];
          const billingStatus = status === 'COMPLETED' ? 'PAID' : billingStatuses[Math.floor(Math.random() * billingStatuses.length)];
          
          const dueDate = new Date(dateInitiated);
          dueDate.setDate(dueDate.getDate() + 15); // Due in 15 days
          
          const tax = amount * 0.16; // 16% tax
          const total = amount + tax;
          
          await prisma.billing.create({
            data: {
              advertiserId: advertiser.id,
              campaignId: campaign.id,
              paymentId: status === 'COMPLETED' ? payment.id : null,
              invoiceNumber: `INV-${advertiser.id.substring(0, 4)}-${Date.now()}-${i}`,
              amount: amount,
              tax: tax,
              total: total,
              status: billingStatus,
              dueDate: dueDate,
              items: [
                {
                  description: `Ad campaign: ${campaign.name}`,
                  quantity: 1,
                  unitPrice: amount,
                  total: amount
                },
                {
                  description: 'Tax (16%)',
                  quantity: 1,
                  unitPrice: tax,
                  total: tax
                }
              ]
            }
          });
        }
      }
    }
  }
  
  console.log('Created payments and billings');
}

async function createPartnerEarnings(partners) {
  console.log('Creating partner earnings...');
  
  const statuses = ['PENDING', 'PROCESSED', 'PAID', 'CANCELLED'];
  
  // Create earnings for the last 3 months
  for (const partner of partners) {
    for (let i = 0; i < 3; i++) {
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - (i + 1));
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);
      
      const totalImpressions = 10000 + Math.floor(Math.random() * 90000);
      const totalEngagements = Math.floor(totalImpressions * (0.05 + Math.random() * 0.15));
      const amount = totalImpressions * 0.001 * partner.commissionRate * 100; // $0.001 per impression * commission rate
      
      const status = i === 0 ? 'PENDING' : statuses[Math.floor(Math.random() * statuses.length)];
      
      let paidDate = null;
      let transactionId = null;
      
      if (status === 'PAID') {
        paidDate = new Date();
        paidDate.setDate(paidDate.getDate() - Math.floor(Math.random() * 30));
        transactionId = `PAYOUT-${partner.id.substring(0, 4)}-${Date.now()}-${i}`;
      }
      
      await prisma.partnerEarning.create({
        data: {
          partnerId: partner.id,
          periodStart: periodStart,
          periodEnd: periodEnd,
          totalImpressions: totalImpressions,
          totalEngagements: totalEngagements,
          amount: amount,
          status: status,
          paidDate: paidDate,
          transactionId: transactionId
        }
      });
    }
  }
  
  console.log('Created partner earnings');
}

async function createSystemConfig(adminUser) {
  console.log('Creating system configuration...');
  
  // Verify we have a valid admin user
  if (!adminUser || !adminUser.id) {
    throw new Error('Invalid admin user provided for system configuration');
  }
  
  const configs = [
    {
      configKey: 'payment_gateway',
      configValue: {
        provider: 'stripe',
        apiKey: 'sk_test_example',
        webhookSecret: 'whsec_example',
        supportedCurrencies: ['USD', 'KES', 'EUR']
      },
      description: 'Payment gateway configuration',
      isEncrypted: true,
      environment: 'production',
      validationSchema: '{"type":"object","properties":{"provider":{"type":"string"},"apiKey":{"type":"string"},"webhookSecret":{"type":"string"},"supportedCurrencies":{"type":"array"}}}'
    },
    {
      configKey: 'analytics_settings',
      configValue: {
        dataRetentionDays: 365,
        anonymizeData: true,
        realTimeEnabled: true
      },
      description: 'Analytics data settings',
      environment: 'production'
    },
    {
      configKey: 'notification_settings',
      configValue: {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        defaultTemplates: {
          campaignApproval: 'template_id_1',
          paymentConfirmation: 'template_id_2',
          lowBudgetAlert: 'template_id_3'
        }
      },
      description: 'Notification settings',
      environment: 'production'
    },
    {
      configKey: 'commission_rates',
      configValue: {
        default: 0.3,
        premium: 0.35,
        enterprise: 0.25,
        minimumPayout: 100
      },
      description: 'Partner commission rate settings',
      environment: 'production'
    }
  ];
  
  for (const config of configs) {
    try {
      // First check if the config already exists
      const existingConfig = await prisma.systemConfig.findUnique({
        where: { configKey: config.configKey }
      });
      
      if (existingConfig) {
        // Update existing config
        await prisma.systemConfig.update({
          where: { configKey: config.configKey },
          data: {
            configValue: config.configValue,
            description: config.description,
            updatedBy: adminUser.id, // Use the valid admin user ID
            isEncrypted: config.isEncrypted || false,
            environment: config.environment,
            validationSchema: config.validationSchema
          }
        });
      } else {
        // Create new config
        await prisma.systemConfig.create({
          data: {
            configKey: config.configKey,
            configValue: config.configValue,
            description: config.description,
            updatedBy: adminUser.id, // Use the valid admin user ID
            isEncrypted: config.isEncrypted || false,
            environment: config.environment,
            validationSchema: config.validationSchema
          }
        });
      }
    } catch (error) {
      console.error(`Failed to create/update system config for ${config.configKey}:`, error);
      throw error;
    }
  }
  
  console.log('Created/Updated system configuration');
}

async function createFeatureFlags(adminUser) {
  console.log('Creating feature flags...');
  
  const featureFlags = [
    {
      name: 'ar_experiences',
      description: 'Enable AR experiences in ad creatives',
      enabled: true,
      conditions: {
        userRoles: ['ADVERTISER', 'ADMIN'],
        deviceTypes: ['ANDROID_TV', 'INTERACTIVE_KIOSK']
      },
      percentage: 100,
      createdBy: adminUser.id
    },
    {
      name: 'voice_commands',
      description: 'Enable voice command interactions',
      enabled: true,
      conditions: {
        userRoles: ['ADVERTISER', 'ADMIN'],
        deviceTypes: ['INTERACTIVE_KIOSK']
      },
      percentage: 50,
      createdBy: adminUser.id
    },
    {
      name: 'emotion_analytics',
      description: 'Enable emotion analytics for campaigns',
      enabled: true,
      conditions: {
        userRoles: ['ADVERTISER', 'ADMIN'],
        campaignObjectives: ['ENGAGEMENT', 'CONSIDERATION']
      },
      percentage: 100,
      createdBy: adminUser.id
    },
    {
      name: 'new_billing_system',
      description: 'Enable new billing system with improved reporting',
      enabled: false,
      conditions: {
        userRoles: ['ADMIN']
      },
      percentage: 0,
      createdBy: adminUser.id
    }
  ];
  
  for (const flag of featureFlags) {
    await prisma.featureFlag.create({
      data: flag
    });
  }
  
  console.log(`Created ${featureFlags.length} feature flags`);
}

async function createConfigAuditLogs(adminUser) {
  console.log('Creating config audit logs...');
  
  const configKeys = ['payment_gateway', 'analytics_settings', 'notification_settings', 'commission_rates'];
  
  for (const configKey of configKeys) {
    // Create 3 audit log entries for each config
    for (let i = 0; i < 3; i++) {
      const changeDate = new Date();
      changeDate.setDate(changeDate.getDate() - (i * 5)); // Changes every 5 days
      
      await prisma.configAuditLog.create({
        data: {
          configKey: configKey,
          previousValue: {
            version: i,
            // Sample previous values
            ...(configKey === 'payment_gateway' ? { provider: 'paypal' } : {}),
            ...(configKey === 'analytics_settings' ? { dataRetentionDays: 180 } : {}),
            ...(configKey === 'notification_settings' ? { smsEnabled: false } : {}),
            ...(configKey === 'commission_rates' ? { default: 0.25 } : {})
          },
          newValue: {
            version: i + 1,
            // Sample new values
            ...(configKey === 'payment_gateway' ? { provider: 'stripe' } : {}),
            ...(configKey === 'analytics_settings' ? { dataRetentionDays: 365 } : {}),
            ...(configKey === 'notification_settings' ? { smsEnabled: true } : {}),
            ...(configKey === 'commission_rates' ? { default: 0.3 } : {})
          },
          changedBy: adminUser.id,
          changeDate: changeDate,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          changeReason: `Regular update to ${configKey.replace('_', ' ')}`
        }
      });
    }
  }
  
  console.log('Created config audit logs');
}

async function createConfigAccess() {
  console.log('Creating config access records...');
  
  const configKeys = ['payment_gateway', 'analytics_settings', 'notification_settings', 'commission_rates'];
  const userRoles = ['ADMIN', 'ADVERTISER', 'PARTNER'];
  
  for (const configKey of configKeys) {
    for (const role of userRoles) {
      await prisma.configAccess.create({
        data: {
          configKey: configKey,
          userRole: role,
          canView: role === 'ADMIN' || (role === 'ADVERTISER' && configKey !== 'payment_gateway'),
          canEdit: role === 'ADMIN'
        }
      });
    }
  }
  
  console.log('Created config access records');
}

// New functions for the added models

async function createUserPreferences(users) {
  console.log('Creating user preferences...');
  
  const themes = ['light', 'dark', 'system'];
  const emailFrequencies = ['daily', 'weekly', 'never'];
  
  for (const user of users) {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const emailFrequency = emailFrequencies[Math.floor(Math.random() * emailFrequencies.length)];
    
    const dashboardLayout = {
      widgets: [
        { id: 'campaigns', position: { x: 0, y: 0, w: 6, h: 4 } },
        { id: 'analytics', position: { x: 6, y: 0, w: 6, h: 4 } },
        { id: 'payments', position: { x: 0, y: 4, w: 12, h: 3 } }
      ],
      collapsed: ['notifications']
    };
    
    await prisma.userPreference.create({
      data: {
        userId: user.id,
        theme: theme,
        emailFrequency: emailFrequency,
        dashboardLayout: dashboardLayout
      }
    });
  }
  
  console.log(`Created ${users.length} user preferences`);
}

async function createApiKeys(users) {
  console.log('Creating API keys...');
  
  // Only create API keys for admin and advertiser users
  const eligibleUsers = users.filter(user => user.role === 'ADMIN' || user.role === 'ADVERTISER');
  
  for (const user of eligibleUsers) {
    // Create 2 API keys for each eligible user
    for (let i = 0; i < 2; i++) {
      const keyName = i === 0 ? 'Default API Key' : 'Analytics API Key';
      const keyValue = `${user.role.toLowerCase()}_${user.id.substring(0, 8)}_${Date.now()}_${i}`;
      
      const permissions = {
        read: true,
        write: i === 0, // Only first key can write
        scopes: i === 0 
          ? ['campaigns', 'analytics', 'payments'] 
          : ['analytics']
      };
      
      // Set expiry date for second key only
      const expiresAt = i === 1 
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        : null;
      
      await prisma.apiKey.create({
        data: {
          userId: user.id,
          name: keyName,
          key: keyValue,
          permissions: permissions,
          expiresAt: expiresAt,
          lastUsed: i === 0 ? new Date() : null
        }
      });
    }
  }
  
  console.log(`Created API keys for ${eligibleUsers.length} users`);
}

async function createNotifications(users) {
  console.log('Creating notifications...');
  
  const notificationTypes = [
    'PAYMENT_UPDATE', 
    'NEW_DEVICE', 
    'CAMPAIGN_APPROVAL', 
    'BUDGET_ALERT',
    'SYSTEM_UPDATE'
  ];
  
  for (const user of users) {
    // Create 5 notifications for each user
    for (let i = 0; i < 5; i++) {
      const type = notificationTypes[i % notificationTypes.length];
      const isRead = i < 2; // First 2 are read
      
      let title, message, relatedData;
      
      switch (type) {
        case 'PAYMENT_UPDATE':
          title = 'Payment Processed';
          message = 'Your recent payment has been successfully processed.';
          relatedData = { paymentId: `payment_${i}`, amount: 1000 + (i * 100) };
          break;
        case 'NEW_DEVICE':
          title = 'New Device Added';
          message = 'A new device has been added to your network.';
          relatedData = { deviceId: `device_${i}`, deviceType: 'DIGITAL_SIGNAGE' };
          break;
        case 'CAMPAIGN_APPROVAL':
          title = 'Campaign Approved';
          message = 'Your campaign has been approved and is now active.';
          relatedData = { campaignId: `campaign_${i}`, status: 'ACTIVE' };
          break;
        case 'BUDGET_ALERT':
          title = 'Budget Alert';
          message = 'Your campaign is approaching its budget limit.';
          relatedData = { campaignId: `campaign_${i}`, remainingBudget: 200 };
          break;
        case 'SYSTEM_UPDATE':
          title = 'System Update';
          message = 'The platform will undergo maintenance tonight.';
          relatedData = { maintenanceTime: '2023-05-15T22:00:00Z', duration: '2 hours' };
          break;
      }
      
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - (i * 24)); // Spread over last few days
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: title,
          message: message,
          type: type,
          isRead: isRead,
          relatedData: relatedData,
          createdAt: createdAt
        }
      });
    }
  }
  
  console.log(`Created notifications for ${users.length} users`);
}

async function createDeviceAvailability(devices) {
  console.log('Creating device availability records...');
  
  // Create availability slots for the next 7 days
  for (const device of devices) {
    for (let day = 0; day < 7; day++) {
      // Create 3 time slots per day
      for (let slot = 0; slot < 3; slot++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + day);
        startTime.setHours(8 + (slot * 4), 0, 0, 0); // 8am, 12pm, 4pm
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 4); // 4-hour slots
        
        const isBooked = Math.random() > 0.7; // 30% chance of being booked
        
        // Dynamic pricing based on time of day and device type
        const basePrice = device.deviceType === 'INTERACTIVE_KIOSK' ? 100 : 
                         device.deviceType === 'DIGITAL_SIGNAGE' ? 80 : 60;
        
        const timeMultiplier = slot === 1 ? 1.5 : 1; // Peak hours (12-4) cost more
        const weekendMultiplier = [0, 6].includes((startTime.getDay())) ? 0.8 : 1; // Weekends cost less
        
        const pricing = {
          basePrice: basePrice,
          finalPrice: basePrice * timeMultiplier * weekendMultiplier,
          currency: 'USD',
          discounts: weekendMultiplier < 1 ? [{ type: 'WEEKEND', percentage: 20 }] : []
        };
        
        await prisma.deviceAvailability.create({
          data: {
            deviceId: device.id,
            startTime: startTime,
            endTime: endTime,
            isBooked: isBooked,
            pricing: pricing
          }
        });
      }
    }
  }
  
  console.log(`Created availability records for ${devices.length} devices`);
}

async function createSustainabilityMetrics(devices, campaigns) {
  console.log('Creating sustainability metrics...');
  
  // Create metrics for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Start of day
    
    // Create metrics for each device
    for (const device of devices) {
      const energyUsage = 0.5 + Math.random() * 2; // kWh
      const carbonFootprint = energyUsage * 0.4; // CO2 equivalent
      
      await prisma.sustainabilityMetrics.create({
        data: {
          deviceId: device.id,
          date: date,
          energyUsage: energyUsage,
          carbonFootprint: carbonFootprint
        }
      });
    }
    
    // Create metrics for active campaigns
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
    for (const campaign of activeCampaigns) {
      const energyUsage = 1 + Math.random() * 5; // kWh (campaigns use more energy across devices)
      const carbonFootprint = energyUsage * 0.4; // CO2 equivalent
      
      await prisma.sustainabilityMetrics.create({
        data: {
          campaignId: campaign.id,
          date: date,
          energyUsage: energyUsage,
          carbonFootprint: carbonFootprint
        }
      });
    }
  }
  
  console.log(`Created sustainability metrics for ${devices.length} devices and ${campaigns.filter(c => c.status === 'ACTIVE').length} campaigns`);
}

async function createAudienceData(adDeliveries) {
  console.log('Creating audience data...');
  
  // Only create audience data for delivered ads
  const deliveredAds = adDeliveries.filter(ad => ad.status === 'DELIVERED');
  
  for (const adDelivery of deliveredAds) {
    // Create 3 audience data points per delivery (representing different time periods)
    for (let i = 0; i < 3; i++) {
      const timestamp = new Date(adDelivery.actualDeliveryTime);
      timestamp.setMinutes(timestamp.getMinutes() + (i * 5)); // 5-minute intervals
      
      const viewerCount = 5 + Math.floor(Math.random() * 20); // 5-25 viewers
      const dwellTime = 3 + Math.random() * 12; // 3-15 seconds
      
      const demographics = {
        ageGroups: {
          '18-24': 0.2 + Math.random() * 0.1,
          '25-34': 0.3 + Math.random() * 0.1,
          '35-44': 0.2 + Math.random() * 0.1,
          '45-54': 0.1 + Math.random() * 0.1,
          '55+': 0.1 + Math.random() * 0.1
        },
        gender: {
          male: 0.4 + Math.random() * 0.2,
          female: 0.4 + Math.random() * 0.2,
          unknown: 0.1 + Math.random() * 0.1
        },
        attentionLevel: {
          high: 0.3 + Math.random() * 0.3,
          medium: 0.2 + Math.random() * 0.3,
          low: 0.1 + Math.random() * 0.2
        }
      };
      
      await prisma.audienceData.create({
        data: {
          adDeliveryId: adDelivery.id,
          demographics: demographics,
          viewerCount: viewerCount,
          dwellTime: dwellTime,
          timestamp: timestamp
        }
      });
    }
  }
  
  console.log(`Created audience data for ${deliveredAds.length} ad deliveries`);
}

async function createExternalIntegrations() {
  console.log('Creating external integrations...');
  
  const integrations = [
    {
      name: 'Google Analytics',
      provider: 'google_analytics',
      credentials: {
        apiKey: 'ga_test_key',
        viewId: '12345678',
        accountId: 'ga_account_123'
      },
      isActive: true,
      lastSynced: new Date()
    },
    {
      name: 'Facebook Ads',
      provider: 'facebook_ads',
      credentials: {
        accessToken: 'fb_test_token',
        adAccountId: 'act_12345678'
      },
      isActive: true,
      lastSynced: new Date()
    },
    {
      name: 'Mailchimp',
      provider: 'mailchimp',
      credentials: {
        apiKey: 'mc_test_key',
        listId: 'list12345',
        dataCenter: 'us6'
      },
      isActive: false,
      lastSynced: null
    },
    {
      name: 'HubSpot',
      provider: 'hubspot',
      credentials: {
        apiKey: 'hs_test_key',
        portalId: '6789012'
      },
      isActive: true,
      lastSynced: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    }
  ];
  
  for (const integration of integrations) {
    await prisma.externalIntegration.create({
      data: integration
    });
  }
  
  console.log(`Created ${integrations.length} external integrations`);
}

async function createWebhooks() {
  console.log('Creating webhooks...');
  
  const webhooks = [
    {
      url: 'https://example.com/webhooks/campaign-status',
      secret: 'whsec_campaign_123456',
      events: ['campaign.created', 'campaign.updated', 'campaign.completed'],
      isActive: true
    },
    {
      url: 'https://example.com/webhooks/payments',
      secret: 'whsec_payments_123456',
      events: ['payment.succeeded', 'payment.failed'],
      isActive: true
    },
    {
      url: 'https://example.com/webhooks/devices',
      secret: 'whsec_devices_123456',
      events: ['device.online', 'device.offline', 'device.warning'],
      isActive: true
    },
    {
      url: 'https://example.com/webhooks/analytics',
      secret: 'whsec_analytics_123456',
      events: ['analytics.daily.generated', 'analytics.threshold.reached'],
      isActive: false
    }
  ];
  
  for (const webhook of webhooks) {
    await prisma.webhook.create({
      data: webhook
    });
  }
  
  console.log(`Created ${webhooks.length} webhooks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });