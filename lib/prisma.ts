import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to connect to the database
export async function connectToDatabase() {
  try {
    await prisma.$connect();
    return prisma;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw error;
  }
}

// Helper function to disconnect from the database
export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect from the database:', error);
    throw error;
  }
}

// Function to seed the database for development
export async function seedDatabase() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Seeding is only available in development mode');
    return;
  }
  
  try {
    console.log('Seeding database...');
    
    // Create a test admin user
    const adminEmail = 'admin@lumenadtech.com';
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: 'Admin User',
        password: '$2a$10$7aXmdSFOhUy2UJ9LunNWn.x8q.oT1Ec4MTBRIE0ENl59pFYqRDTvG', // hashed "password123"
        role: 'ADMIN',
        admin: {
          create: {
            department: 'Engineering',
            permissions: ['ALL'],
          },
        },
      },
    });
    
    console.log('Admin user created:', admin.id);
    
    // Create a test advertiser user
    const advertiserEmail = 'advertiser@example.com';
    const advertiser = await prisma.user.upsert({
      where: { email: advertiserEmail },
      update: {},
      create: {
        email: advertiserEmail,
        name: 'Test Advertiser',
        password: '$2a$10$7aXmdSFOhUy2UJ9LunNWn.x8q.oT1Ec4MTBRIE0ENl59pFYqRDTvG', // hashed "password123"
        role: 'ADVERTISER',
        advertiser: {
          create: {
            companyName: 'Test Company',
            industry: 'Technology',
            website: 'https://example.com',
            contactPhone: '+1234567890',
            address: '123 Test Street',
            city: 'Test City',
            country: 'Test Country',
            postalCode: '12345',
          },
        },
      },
    });
    
    console.log('Advertiser user created:', advertiser.id);
    
    // Create a test partner user
    const partnerEmail = 'partner@example.com';
    const partner = await prisma.user.upsert({
      where: { email: partnerEmail },
      update: {},
      create: {
        email: partnerEmail,
        name: 'Test Partner',
        password: '$2a$10$7aXmdSFOhUy2UJ9LunNWn.x8q.oT1Ec4MTBRIE0ENl59pFYqRDTvG', // hashed "password123"
        role: 'PARTNER',
        partner: {
          create: {
            companyName: 'Test Partner Company',
            industry: 'Digital Signage',
            website: 'https://partner-example.com',
            contactPhone: '+0987654321',
            address: '456 Partner Street',
            city: 'Partner City',
            country: 'Partner Country',
            postalCode: '54321',
            commissionRate: 0.7,
          },
        },
      },
    });
    
    console.log('Partner user created:', partner.id);
    
    // Create test devices for the partner
    const device1 = await prisma.device.create({
      data: {
        partnerId: (await prisma.partner.findUnique({ where: { userId: partner.id } }))!.id,
        name: 'Digital Billboard 1',
        type: 'BILLBOARD',
        model: 'Samsung OH85N',
        screenSize: '85"',
        resolution: '3840x2160',
        location: 'Downtown',
        latitude: 40.7128,
        longitude: -74.006,
        status: 'ACTIVE',
      },
    });
    
    const device2 = await prisma.device.create({
      data: {
        partnerId: (await prisma.partner.findUnique({ where: { userId: partner.id } }))!.id,
        name: 'Mall Kiosk 1',
        type: 'KIOSK',
        model: 'LG 55EH5C',
        screenSize: '55"',
        resolution: '1920x1080',
        location: 'Central Mall',
        latitude: 40.7129,
        longitude: -74.007,
        status: 'ACTIVE',
      },
    });
    
    console.log('Devices created:', device1.id, device2.id);
    
    // Create a test campaign for the advertiser
    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: (await prisma.advertiser.findUnique({ where: { userId: advertiser.id } }))!.id,
        name: 'Test Campaign',
        objective: 'BRAND_AWARENESS',
        status: 'ACTIVE',
        budget: 1000,
        dailyBudget: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        targetAudience: {
          ageRanges: ['18-24', '25-34'],
          genders: ['Male', 'Female'],
          interests: ['Technology', 'Fashion'],
        },
        targetLocations: ['Downtown', 'Central Mall'],
        bidStrategy: 'MAXIMIZE_IMPRESSIONS',
        bidAmount: 0.05,
        pricingModel: 'CPM',
      },
    });
    
    console.log('Campaign created:', campaign.id);
    
    // Create test ad creative
    const adCreative = await prisma.adCreative.create({
      data: {
        campaignId: campaign.id,
        advertiserId: (await prisma.advertiser.findUnique({ where: { userId: advertiser.id } }))!.id,
        name: 'Test Ad Creative',
        description: 'A test ad creative',
        type: 'IMAGE',
        url: 'https://example.com/ad-image.jpg',
        format: 'LANDSCAPE',
        dimensions: {
          width: 1920,
          height: 1080,
        },
        status: 'APPROVED',
      },
    });
    
    console.log('Ad creative created:', adCreative.id);
    
    // Create test ad delivery
    const now = new Date();
    const adDelivery = await prisma.adDelivery.create({
      data: {
        campaignId: campaign.id,
        deviceId: device1.id,
        adCreativeId: adCreative.id,
        scheduledTime: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour later
        status: 'SCHEDULED',
        metadata: {
          priority: 5,
          duration: 30,
          scheduledBy: 'SYSTEM',
          type: 'IMAGE',
        },
      },
    });
    
    console.log('Ad delivery created:', adDelivery.id);
    
    // Create test payment
    const payment = await prisma.payment.create({
      data: {
        advertiserId: (await prisma.advertiser.findUnique({ where: { userId: advertiser.id } }))!.id,
        amount: 500,
        currency: 'USD',
        method: 'STRIPE',
        status: 'COMPLETED',
        transactionId: 'pi_' + Math.random().toString(36).substring(2, 15),
        description: 'Campaign funding',
        completedAt: new Date(),
      },
    });
    
    console.log('Payment created:', payment.id);
    
    // Create test billing
    const billing = await prisma.billing.create({
      data: {
        advertiserId: (await prisma.advertiser.findUnique({ where: { userId: advertiser.id } }))!.id,
        amount: 500,
        currency: 'USD',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        paymentId: payment.id,
        description: 'Account deposit',
      },
    });
    
    console.log('Billing created:', billing.id);
    
    // Create test API key
    const apiKey = await prisma.apiKey.create({
      data: {
        name: 'Test Device API Key',
        key: 'lumen_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        entityType: 'PARTNER',
        entityId: (await prisma.partner.findUnique({ where: { userId: partner.id } }))!.id,
        permissions: ['DEVICE_MANAGEMENT', 'AD_DELIVERY'],
      },
    });
    
    console.log('API key created:', apiKey.id);
    console.log('API key value:', apiKey.key);
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
} 