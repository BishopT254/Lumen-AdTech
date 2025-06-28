import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['ADMIN', 'ADVERTISER', 'PARTNER']).default('ADVERTISER'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADVERTISER', 'PARTNER']).default('ADVERTISER'),
});

// Campaign validation schemas
export const campaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.coerce.number().positive('Budget must be a positive number'),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED']).default('DRAFT'),
  targetLocations: z.any().optional(),
  targetSchedule: z.any().optional(),
  targetDemographics: z.any().optional(),
  pricingModel: z.enum(['CPM', 'CPE', 'CPA', 'HYBRID']).default('CPM'),
});

// Device validation schemas
export const deviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Device name must be at least 2 characters'),
  deviceIdentifier: z.string().min(2, 'Device identifier must be at least 2 characters'),
  deviceType: z.enum(['ANDROID_TV', 'DIGITAL_SIGNAGE', 'INTERACTIVE_KIOSK', 'VEHICLE_MOUNTED', 'RETAIL_DISPLAY']),
  location: z.any(),
  routeDetails: z.any().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE']).default('PENDING'),
  healthStatus: z.enum(['UNKNOWN', 'HEALTHY', 'WARNING', 'CRITICAL', 'OFFLINE']).default('UNKNOWN'),
});

// Advertiser profile validation schema
export const advertiserProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters'),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

// Partner profile validation schema
export const partnerProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters'),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(1).default(0.3),
  paymentDetails: z.any().optional(),
});

// Ad creative validation schema
export const adCreativeSchema = z.object({
  id: z.string().optional(),
  campaignId: z.string(),
  name: z.string().min(2, 'Creative name must be at least 2 characters'),
  type: z.enum(['IMAGE', 'VIDEO', 'INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE']),
  content: z.string().url('Content must be a valid URL'),
  format: z.string(),
  duration: z.coerce.number().optional(),
  previewImage: z.string().url('Preview image must be a valid URL').optional(),
  isApproved: z.boolean().default(false),
  rejectionReason: z.string().optional(),
  ar_markers: z.any().optional(),
  voiceCommands: z.any().optional(),
});

// Payment validation schema
export const paymentSchema = z.object({
  id: z.string().optional(),
  advertiserId: z.string(),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  paymentMethod: z.enum(['CREDIT_CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'PAYPAL']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('PENDING'),
  transactionId: z.string().optional(),
  description: z.string().optional(),
});

// Ad delivery validation schema
export const adDeliverySchema = z.object({
  id: z.string().optional(),
  campaignId: z.string(),
  adCreativeId: z.string(),
  deviceId: z.string(),
  scheduledTime: z.coerce.date(),
  actualDeliveryTime: z.coerce.date().optional(),
  viewerCount: z.coerce.number().optional(),
  impressions: z.coerce.number().default(0),
  engagements: z.coerce.number().default(0),
  completions: z.coerce.number().default(0),
  status: z.enum(['SCHEDULED', 'DELIVERED', 'FAILED', 'SKIPPED', 'PENDING']).default('SCHEDULED'),
  locationData: z.any().optional(),
  weatherData: z.any().optional(),
}); 