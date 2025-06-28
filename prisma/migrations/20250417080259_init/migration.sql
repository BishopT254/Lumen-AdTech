-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ADVERTISER', 'PARTNER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AWARENESS', 'CONSIDERATION', 'CONVERSION', 'TRAFFIC', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('CPM', 'CPE', 'CPA', 'HYBRID');

-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT', 'HTML', 'INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ANDROID_TV', 'DIGITAL_SIGNAGE', 'INTERACTIVE_KIOSK', 'VEHICLE_MOUNTED', 'RETAIL_DISPLAY', 'BUS', 'TRAM', 'TRAIN', 'METRO', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'COMPLETED', 'INVALID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'DELIVERED', 'FAILED', 'SKIPPED', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'OTHER', 'BANK_TRANSFER', 'MPESA', 'FLUTTERWAVE', 'PAYPAL', 'STRIPE', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('UNPAID', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'PROCESSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('DEMOGRAPHIC', 'BEHAVIORAL', 'LOCATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'REFUND', 'TRANSFER', 'FEE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADVERTISER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "objective" "CampaignObjective" NOT NULL DEFAULT 'AWARENESS',
    "budget" DECIMAL(10,2) NOT NULL,
    "dailyBudget" DECIMAL(10,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "targetLocations" JSONB,
    "targetSchedule" JSONB,
    "targetDemographics" JSONB,
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'CPM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "audienceSegmentId" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "CreativeType" NOT NULL,
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "duration" INTEGER,
    "previewImage" TEXT,
    "headline" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "callToAction" VARCHAR(50) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "ar_markers" JSONB,
    "voiceCommands" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABTest" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "winningVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ABTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABTestVariant" (
    "id" TEXT NOT NULL,
    "abTestId" TEXT NOT NULL,
    "adCreativeId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "trafficAllocation" DECIMAL(5,2) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ABTestVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAnalytics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DECIMAL(10,4) NOT NULL,
    "conversionRate" DECIMAL(10,4) NOT NULL,
    "averageDwellTime" DECIMAL(10,2),
    "audienceMetrics" JSONB,
    "emotionMetrics" JSONB,
    "costData" JSONB NOT NULL,

    CONSTRAINT "CampaignAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionData" (
    "id" TEXT NOT NULL,
    "adCreativeId" TEXT NOT NULL,
    "adDeliveryId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "joyScore" DECIMAL(4,3),
    "surpriseScore" DECIMAL(4,3),
    "neutralScore" DECIMAL(4,3),
    "dwellTime" DECIMAL(10,2),
    "viewerCount" INTEGER,
    "isAggregated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmotionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0.3,
    "paymentDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "location" JSONB NOT NULL,
    "routeDetails" JSONB,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "lastActive" TIMESTAMP(3),
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "firmwareVersion" TEXT,
    "capabilities" JSONB,
    "configSettings" JSONB,
    "maintenanceHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegistration" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationCode" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" "DeviceType",
    "location" JSONB,
    "metadata" JSONB,
    "tags" TEXT[],
    "notes" TEXT,
    "autoActivate" BOOLEAN NOT NULL DEFAULT false,
    "firmwareVersion" TEXT,
    "capabilities" JSONB,
    "configSettings" JSONB,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "registrationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adCreativeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "actualDeliveryTime" TIMESTAMP(3),
    "viewerCount" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "locationData" JSONB,
    "weatherData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAnalytics" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "uptime" DECIMAL(10,2) NOT NULL,
    "impressionsServed" INTEGER NOT NULL,
    "engagementsCount" INTEGER NOT NULL,
    "averageViewerCount" DECIMAL(10,2),
    "performanceMetrics" JSONB,
    "energyConsumption" DECIMAL(10,2),

    CONSTRAINT "DeviceAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "walletId" TEXT,
    "type" "PaymentMethodType" NOT NULL,
    "details" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "advertiserId" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "last4" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "type" "PaymentType" NOT NULL DEFAULT 'DEPOSIT',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethodId" TEXT,
    "advertiserId" TEXT,
    "dateInitiated" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "transactionId" TEXT,
    "receiptUrl" TEXT,
    "paymentMethod" "PaymentMethodType",

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "paymentId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'UNPAID',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEarning" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalImpressions" INTEGER NOT NULL,
    "totalEngagements" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "description" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "validationSchema" TEXT,
    "environment" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAuditLog" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changeReason" TEXT,

    CONSTRAINT "ConfigAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAccess" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConfigAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "conditions" JSONB,
    "percentage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAvailability" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "pricing" JSONB NOT NULL,

    CONSTRAINT "DeviceAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityMetrics" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "campaignId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "energyUsage" DOUBLE PRECISION NOT NULL,
    "carbonFootprint" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SustainabilityMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "emailFrequency" TEXT NOT NULL DEFAULT 'daily',
    "dashboardLayout" JSONB,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceData" (
    "id" TEXT NOT NULL,
    "adDeliveryId" TEXT NOT NULL,
    "demographics" JSONB,
    "viewerCount" INTEGER NOT NULL,
    "dwellTime" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalIntegration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceSegment" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" "SegmentType" NOT NULL DEFAULT 'CUSTOM',
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "walletStatus" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoPayoutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutThreshold" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "nextPayoutDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "reference" TEXT,
    "paymentMethodId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_userId_key" ON "Advertiser"("userId");

-- CreateIndex
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "AdCreative_campaignId_idx" ON "AdCreative"("campaignId");

-- CreateIndex
CREATE INDEX "AdCreative_type_idx" ON "AdCreative"("type");

-- CreateIndex
CREATE INDEX "AdCreative_status_idx" ON "AdCreative"("status");

-- CreateIndex
CREATE INDEX "AdCreative_createdAt_idx" ON "AdCreative"("createdAt");

-- CreateIndex
CREATE INDEX "ABTest_campaignId_idx" ON "ABTest"("campaignId");

-- CreateIndex
CREATE INDEX "ABTest_status_idx" ON "ABTest"("status");

-- CreateIndex
CREATE INDEX "ABTest_startDate_endDate_idx" ON "ABTest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ABTestVariant_abTestId_idx" ON "ABTestVariant"("abTestId");

-- CreateIndex
CREATE INDEX "ABTestVariant_adCreativeId_idx" ON "ABTestVariant"("adCreativeId");

-- CreateIndex
CREATE INDEX "CampaignAnalytics_campaignId_idx" ON "CampaignAnalytics"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAnalytics_date_idx" ON "CampaignAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAnalytics_campaignId_date_key" ON "CampaignAnalytics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "EmotionData_adCreativeId_idx" ON "EmotionData"("adCreativeId");

-- CreateIndex
CREATE INDEX "EmotionData_adDeliveryId_idx" ON "EmotionData"("adDeliveryId");

-- CreateIndex
CREATE INDEX "EmotionData_timestamp_idx" ON "EmotionData"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceIdentifier_key" ON "Device"("deviceIdentifier");

-- CreateIndex
CREATE INDEX "Device_partnerId_idx" ON "Device"("partnerId");

-- CreateIndex
CREATE INDEX "Device_deviceType_idx" ON "Device"("deviceType");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_healthStatus_idx" ON "Device"("healthStatus");

-- CreateIndex
CREATE INDEX "Device_firmwareVersion_idx" ON "Device"("firmwareVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_deviceId_key" ON "DeviceRegistration"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_registrationCode_key" ON "DeviceRegistration"("registrationCode");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_deviceIdentifier_key" ON "DeviceRegistration"("deviceIdentifier");

-- CreateIndex
CREATE INDEX "DeviceRegistration_deviceId_idx" ON "DeviceRegistration"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceRegistration_partnerId_idx" ON "DeviceRegistration"("partnerId");

-- CreateIndex
CREATE INDEX "DeviceRegistration_userId_idx" ON "DeviceRegistration"("userId");

-- CreateIndex
CREATE INDEX "DeviceRegistration_registrationCode_idx" ON "DeviceRegistration"("registrationCode");

-- CreateIndex
CREATE INDEX "DeviceRegistration_deviceIdentifier_idx" ON "DeviceRegistration"("deviceIdentifier");

-- CreateIndex
CREATE INDEX "DeviceRegistration_status_idx" ON "DeviceRegistration"("status");

-- CreateIndex
CREATE INDEX "DeviceRegistration_expiresAt_idx" ON "DeviceRegistration"("expiresAt");

-- CreateIndex
CREATE INDEX "DeviceRegistration_registrationAttempts_idx" ON "DeviceRegistration"("registrationAttempts");

-- CreateIndex
CREATE INDEX "AdDelivery_campaignId_idx" ON "AdDelivery"("campaignId");

-- CreateIndex
CREATE INDEX "AdDelivery_adCreativeId_idx" ON "AdDelivery"("adCreativeId");

-- CreateIndex
CREATE INDEX "AdDelivery_deviceId_idx" ON "AdDelivery"("deviceId");

-- CreateIndex
CREATE INDEX "AdDelivery_scheduledTime_idx" ON "AdDelivery"("scheduledTime");

-- CreateIndex
CREATE INDEX "AdDelivery_status_idx" ON "AdDelivery"("status");

-- CreateIndex
CREATE INDEX "DeviceAnalytics_deviceId_idx" ON "DeviceAnalytics"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAnalytics_date_idx" ON "DeviceAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_walletId_idx" ON "PaymentMethod"("walletId");

-- CreateIndex
CREATE INDEX "Payment_partnerId_idx" ON "Payment"("partnerId");

-- CreateIndex
CREATE INDEX "Payment_paymentMethodId_idx" ON "Payment"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_invoiceNumber_key" ON "Billing"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Billing_advertiserId_idx" ON "Billing"("advertiserId");

-- CreateIndex
CREATE INDEX "Billing_campaignId_idx" ON "Billing"("campaignId");

-- CreateIndex
CREATE INDEX "Billing_paymentId_idx" ON "Billing"("paymentId");

-- CreateIndex
CREATE INDEX "Billing_status_idx" ON "Billing"("status");

-- CreateIndex
CREATE INDEX "Billing_dueDate_idx" ON "Billing"("dueDate");

-- CreateIndex
CREATE INDEX "PartnerEarning_partnerId_idx" ON "PartnerEarning"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerEarning_status_idx" ON "PartnerEarning"("status");

-- CreateIndex
CREATE INDEX "PartnerEarning_periodStart_periodEnd_idx" ON "PartnerEarning"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfig_updatedBy_idx" ON "SystemConfig"("updatedBy");

-- CreateIndex
CREATE INDEX "SystemConfig_environment_idx" ON "SystemConfig"("environment");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_configKey_idx" ON "ConfigAuditLog"("configKey");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_changedBy_idx" ON "ConfigAuditLog"("changedBy");

-- CreateIndex
CREATE INDEX "ConfigAuditLog_changeDate_idx" ON "ConfigAuditLog"("changeDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigAccess_configKey_userRole_key" ON "ConfigAccess"("configKey", "userRole");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "FeatureFlag_createdBy_idx" ON "FeatureFlag"("createdBy");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "DeviceAvailability_deviceId_idx" ON "DeviceAvailability"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAvailability_startTime_endTime_idx" ON "DeviceAvailability"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "DeviceAvailability_isBooked_idx" ON "DeviceAvailability"("isBooked");

-- CreateIndex
CREATE INDEX "SustainabilityMetrics_deviceId_idx" ON "SustainabilityMetrics"("deviceId");

-- CreateIndex
CREATE INDEX "SustainabilityMetrics_campaignId_idx" ON "SustainabilityMetrics"("campaignId");

-- CreateIndex
CREATE INDEX "SustainabilityMetrics_date_idx" ON "SustainabilityMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "AudienceData_adDeliveryId_idx" ON "AudienceData"("adDeliveryId");

-- CreateIndex
CREATE INDEX "AudienceData_timestamp_idx" ON "AudienceData"("timestamp");

-- CreateIndex
CREATE INDEX "ExternalIntegration_provider_idx" ON "ExternalIntegration"("provider");

-- CreateIndex
CREATE INDEX "ExternalIntegration_isActive_idx" ON "ExternalIntegration"("isActive");

-- CreateIndex
CREATE INDEX "Webhook_isActive_idx" ON "Webhook"("isActive");

-- CreateIndex
CREATE INDEX "AudienceSegment_createdById_idx" ON "AudienceSegment"("createdById");

-- CreateIndex
CREATE INDEX "AudienceSegment_type_idx" ON "AudienceSegment"("type");

-- CreateIndex
CREATE INDEX "AudienceSegment_isActive_idx" ON "AudienceSegment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_partnerId_key" ON "Wallet"("partnerId");

-- CreateIndex
CREATE INDEX "Wallet_partnerId_idx" ON "Wallet"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertiser" ADD CONSTRAINT "Advertiser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_audienceSegmentId_fkey" FOREIGN KEY ("audienceSegmentId") REFERENCES "AudienceSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTest" ADD CONSTRAINT "ABTest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTestVariant" ADD CONSTRAINT "ABTestVariant_abTestId_fkey" FOREIGN KEY ("abTestId") REFERENCES "ABTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABTestVariant" ADD CONSTRAINT "ABTestVariant_adCreativeId_fkey" FOREIGN KEY ("adCreativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAnalytics" ADD CONSTRAINT "CampaignAnalytics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionData" ADD CONSTRAINT "EmotionData_adCreativeId_fkey" FOREIGN KEY ("adCreativeId") REFERENCES "AdCreative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionData" ADD CONSTRAINT "EmotionData_adDeliveryId_fkey" FOREIGN KEY ("adDeliveryId") REFERENCES "AdDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_adCreativeId_fkey" FOREIGN KEY ("adCreativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAnalytics" ADD CONSTRAINT "DeviceAnalytics_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarning" ADD CONSTRAINT "PartnerEarning_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAuditLog" ADD CONSTRAINT "ConfigAuditLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAvailability" ADD CONSTRAINT "DeviceAvailability_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityMetrics" ADD CONSTRAINT "SustainabilityMetrics_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityMetrics" ADD CONSTRAINT "SustainabilityMetrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceData" ADD CONSTRAINT "AudienceData_adDeliveryId_fkey" FOREIGN KEY ("adDeliveryId") REFERENCES "AdDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceSegment" ADD CONSTRAINT "AudienceSegment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
