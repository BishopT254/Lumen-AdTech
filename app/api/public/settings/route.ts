import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";

// Cache constants
const CACHE_TTL = 3600; // 1 hour cache duration
const PUBLIC_SETTINGS_CACHE_KEY = "public_system_settings";

// List of config keys that are safe to expose to public
const PUBLIC_CONFIG_KEYS = [
  'general_settings',
  'commission_rates',
  'sustainability_settings',
  'system_settings'
];

// We'll filter sensitive fields from payment_gateway
const PAYMENT_GATEWAY_PUBLIC_FIELDS = [
  'provider',
  'supportedCurrencies',
  'paymentTerms',
  'billingCycle',
  'sendReminders',
  'reminderDays',
  'invoicePrefix',
  'taxRate',
  // Include snake_case variants for compatibility
  'payment_terms',
  'supported_currencies',
  'billing_cycle',
  'send_reminders',
  'reminder_days',
  'invoice_prefix',
  'tax_rate'
];

/**
 * Sanitizes the payment gateway configuration to only include non-sensitive fields
 * @param paymentGateway The full payment gateway configuration
 * @returns A sanitized version with only public fields
 */
function sanitizePaymentGateway(paymentGateway: any) {
  if (!paymentGateway) return null;
  
  const sanitized: Record<string, any> = {};
  
  // Only include safe fields
  for (const field of PAYMENT_GATEWAY_PUBLIC_FIELDS) {
    if (paymentGateway[field] !== undefined) {
      sanitized[field] = paymentGateway[field];
    }
  }
  
  return sanitized;
}

/**
 * Ensures compatibility by adding both camelCase and snake_case variants
 * @param obj The object to transform
 * @returns A compatible object with both naming conventions
 */
function ensureNamingCompatibility(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: Record<string, any> = { ...obj };
  
  // Process each key in the object
  Object.keys(obj).forEach(key => {
    // If it's already a nested object, recurse
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      result[key] = ensureNamingCompatibility(obj[key]);
    }
    
    // Convert snake_case to camelCase
    if (key.includes('_')) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (!result[camelKey]) {
        result[camelKey] = obj[key];
      }
    } 
    // Convert camelCase to snake_case
    else if (/[a-z][A-Z]/.test(key)) {
      const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      if (!result[snakeKey]) {
        result[snakeKey] = obj[key];
      }
    }
  });
  
  return result;
}

/**
 * Ensures all expected fields from the hook types are included in the final output
 * @param configKey The type of config
 * @param configValue The config data
 * @returns Config with all expected fields initialized
 */
function ensureExpectedFields(configKey: string, configValue: any): any {
  if (!configValue) return configValue;

  const configWithExpectedFields = { ...configValue };
  
  // Set default values based on the config type
  switch (configKey) {
    case 'general_settings':
      // Default values based on GeneralSettings type
      const generalSettingsDefaults = {
        platformName: configValue.platformName || configValue.platform_name || '',
        platformUrl: configValue.platformUrl || configValue.platform_url || '',
        supportEmail: configValue.supportEmail || configValue.support_email || '',
        defaultTimezone: configValue.defaultTimezone || configValue.timezone || 'UTC',
        defaultLanguage: configValue.defaultLanguage || configValue.language || 'en',
        defaultCurrency: configValue.defaultCurrency || configValue.currency || 'USD',
        dateFormat: configValue.dateFormat || configValue.date_format || 'YYYY-MM-DD',
        timeFormat: configValue.timeFormat || configValue.time_format || '24h',
        darkModeDefault: configValue.darkModeDefault ?? configValue.dark_mode_default ?? false,
        interfaceAnimations: configValue.interfaceAnimations ?? configValue.interface_animations ?? true,
        interfaceDensity: configValue.interfaceDensity ?? configValue.interface_density ?? 'normal'
      };
      return ensureNamingCompatibility(generalSettingsDefaults);
      
    case 'commission_rates':
      // Default values based on CommissionRates type
      const commissionDefaults = {
        standardRate: configValue.standardRate ?? configValue.standard_rate ?? configValue.default ?? 0,
        premiumRate: configValue.premiumRate ?? configValue.premium_rate ?? configValue.premium ?? 0,
        enterpriseRate: configValue.enterpriseRate ?? configValue.enterprise ?? 0,
        minimumPayout: configValue.minimumPayout ?? configValue.minimum_payout ?? 0,
        currency: configValue.currency || 'USD',
        performanceBonuses: configValue.performanceBonuses || {
          enabled: false,
          engagementBonus: 0,
          retentionBonus: 0
        },
        payoutSchedule: configValue.payoutSchedule || {
          frequency: 'monthly',
          payoutDay: '15',
          automaticPayouts: true
        }
      };
      return ensureNamingCompatibility(commissionDefaults);
      
    case 'sustainability_settings':
      // Default values based on SustainabilitySettings type
      const sustainabilityDefaults = {
        carbonTrackingEnabled: configValue.carbonTrackingEnabled ?? false,
        reportingFrequency: configValue.reportingFrequency || 'monthly',
        energyOptimizationEnabled: configValue.energyOptimizationEnabled ?? false,
        offsetProgram: configValue.offsetProgram || 'none',
        offsetPercentage: configValue.offsetPercentage ?? 0,
        ecoFriendlyDiscounts: configValue.ecoFriendlyDiscounts ?? false,
        ecoDiscountPercentage: configValue.ecoDiscountPercentage ?? 0,
        partnerEnergyBonuses: configValue.partnerEnergyBonuses ?? false
      };
      return ensureNamingCompatibility(sustainabilityDefaults);
      
    case 'system_settings':
      // Default values based on SystemSettings type
      const systemDefaults = {
        maintenanceMode: configValue.maintenanceMode ?? false,
        automaticBackups: configValue.automaticBackups ?? configValue.autoBackup ?? false,
        backupFrequency: configValue.backupFrequency || 'daily',
        logLevel: configValue.logLevel || 'error',
        debugMode: configValue.debugMode ?? false,
        featureFlags: configValue.featureFlags || {
          arVrFeatures: false,
          voiceInteraction: false,
          blockchainVerification: false,
          betaFeatures: false
        }
      };
      return ensureNamingCompatibility(systemDefaults);
      
    case 'payment_gateway':
      // Payment gateway is handled separately via sanitizePaymentGateway
      return configValue;
      
    default:
      return configValue;
  }
}

/**
 * GET handler for retrieving public settings
 * This endpoint is accessible without authentication and only returns non-sensitive settings
 */
export async function GET(req: Request) {
  try {
    // Check cache first
    const { searchParams } = new URL(req.url);
    const skipCache = searchParams.get("skipCache") === "true";
    
    if (!skipCache) {
      const cachedSettings = await getCache(PUBLIC_SETTINGS_CACHE_KEY);
      if (cachedSettings) {
        return NextResponse.json(cachedSettings);
      }
    }
    
    // Get all published configs that are public
    const configs = await prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: PUBLIC_CONFIG_KEYS
        }
      }
    });

    // Also get payment_gateway but we'll sanitize it
    const paymentGatewayConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'payment_gateway' }
    });
    
    // Process all configurations into a usable format
    const publicSettings: Record<string, any> = {};
    
    // Add all safe configs
    for (const config of configs) {
      try {
        // Parse the JSON value if it's a string
        let configValue = config.configValue;
        
        if (typeof configValue === 'string') {
          configValue = JSON.parse(configValue);
        }
        
        // Ensure all expected fields and naming compatibility
        const processedValue = ensureExpectedFields(config.configKey, configValue);
        publicSettings[config.configKey] = processedValue;
      } catch (error) {
        console.error(`Error processing config ${config.configKey}:`, error);
        // Skip this config if we can't process it
      }
    }
    
    // Add sanitized payment gateway if it exists
    if (paymentGatewayConfig) {
      try {
        let paymentGateway = paymentGatewayConfig.configValue;
        
        if (typeof paymentGateway === 'string') {
          paymentGateway = JSON.parse(paymentGateway);
        }
        
        const sanitizedGateway = sanitizePaymentGateway(paymentGateway);
        publicSettings['payment_gateway'] = ensureNamingCompatibility(sanitizedGateway);
      } catch (error) {
        console.error('Error processing payment gateway config:', error);
      }
    }
    
    // Add both camelCase and snake_case variants for top-level keys
    // to ensure perfect compatibility with the hook
    const compatibleSettings: Record<string, any> = { ...publicSettings };
    
    // Add camelCase variants for top-level keys
    if (publicSettings.general_settings) {
      compatibleSettings.generalSettings = publicSettings.general_settings;
    }
    if (publicSettings.commission_rates) {
      compatibleSettings.commissionRates = publicSettings.commission_rates;
    }
    if (publicSettings.sustainability_settings) {
      compatibleSettings.sustainabilitySettings = publicSettings.sustainability_settings;
    }
    if (publicSettings.system_settings) {
      compatibleSettings.systemSettings = publicSettings.system_settings;
    }
    if (publicSettings.payment_gateway) {
      compatibleSettings.paymentGateway = publicSettings.payment_gateway;
    }
    
    // Add system meta information
    compatibleSettings['_meta'] = {
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
    compatibleSettings['last_updated'] = new Date().toISOString();
    
    // Cache the result
    await setCache(PUBLIC_SETTINGS_CACHE_KEY, compatibleSettings, CACHE_TTL);
    
    return NextResponse.json(compatibleSettings);
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings" },
      { status: 500 }
    );
  }
}