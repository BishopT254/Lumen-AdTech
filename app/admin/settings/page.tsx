"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  BarChart,
  Bell,
  ClipboardList,
  DollarSign,
  Key,
  Leaf,
  Plus,
  Save,
  Server,
  Settings,
  Shield,
  X,
} from "lucide-react"

// Base types with camelCase naming
type PasswordPolicy = {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expiryDays: number
}

// Security settings with consistent camelCase
type SecuritySettings = {
  // Core properties (camelCase)
  mfaRequired: boolean
  passwordPolicy: PasswordPolicy
  sessionTimeout: number
  ipWhitelist: string[]
  apiRateLimiting: boolean
  rateLimit: number
  apiKeyExpiration: boolean
  keyExpiryDays: number
  ipWhitelistEnabled?: boolean
  maxLoginAttempts?: number
  lockoutDurationMinutes?: number
  twoFactorEnabled?: boolean

  // Backward compatibility for snake_case used in forms
  password_min_length?: number
  password_expiry_days?: number
  require_special_chars?: boolean
  require_numbers?: boolean
  require_uppercase?: boolean
  max_login_attempts?: number
  lockout_duration_minutes?: number
  two_factor_enabled?: boolean
  api_rate_limiting?: boolean
  rate_limit?: number
  api_key_expiration?: boolean
  key_expiry_days?: number
}

// Payment gateway with consistent naming
type PaymentGateway = {
  // Core properties (camelCase)
  provider: string
  apiKey: string
  webhookSecret: string
  supportedCurrencies: string[]
  testMode: boolean
  invoicePrefix?: string
  paymentTerms?: string | number
  taxRate?: number
  billingCycle?: string
  sendReminders?: boolean
  reminderDays?: number[]
  mpesaEnabled?: boolean
  mpesaApiKey?: string
  mpesaApiSecret?: string
  flutterwaveEnabled?: boolean
  flutterwaveApiKey?: string
  api_key_set?: boolean // Add this property

  // Backward compatibility for snake_case used in forms
  api_key?: string
  webhook_secret?: string
  test_mode?: boolean
  payment_terms?: string
  mpesa_enabled?: boolean
  mpesa_api_key?: string
  mpesa_api_secret?: string
  flutterwave_enabled?: boolean
  flutterwave_api_key?: string
}

// Notification settings with consistent naming
type NotificationSettings = {
  // Core properties (camelCase)
  emailEnabled?: boolean
  smsEnabled?: boolean
  pushEnabled?: boolean
  inAppNotifications?: boolean
  defaultTemplates?: {
    campaignApproval: string
    paymentConfirmation: string
    lowBudgetAlert: string
  }
  emailConfig?: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    fromEmail: string
    fromName: string

    // Backward compatibility
    smtp_host?: string
    smtp_port?: number
    smtp_username?: string
    smtp_password?: string
    from_email?: string
    from_name?: string
  }
  smsConfig?: {
    provider: string
    apiKey?: string // Make apiKey optional
    senderId: string
  }

  // Backward compatibility for snake_case used in forms
  email_notifications?: boolean
  sms_notifications?: boolean
  push_notifications?: boolean
  in_app_notifications?: boolean
}

// Analytics settings with consistent naming
type AnalyticsSettings = {
  // Core structured properties (camelCase)
  googleAnalytics?: {
    enabled: boolean
    trackingId: string
    anonymizeIp: boolean
  }
  internalAnalytics?: {
    enabled: boolean
    dataRetentionDays: number
    trackUserJourney: boolean
  }
  privacySettings?: {
    cookieConsent: boolean
    dataSharing: boolean
    allowExport: boolean
  }

  // Other properties (camelCase)
  dataRetentionDays?: number
  anonymizeData?: boolean
  realTimeEnabled?: boolean
  samplingRate?: number
  exportFormats?: string[]
}

// AI settings with consistent naming
type AISettings = {
  emotionDetectionEnabled: boolean
  audienceEstimationEnabled: boolean
  privacyLevel: string
  modelUpdateFrequency: string
  edgeProcessingEnabled: boolean
  federatedLearningEnabled?: boolean
  modelExplainabilityEnabled?: boolean
}

// Commission rates with consistent naming
type CommissionRates = {
  // Core properties (camelCase)
  standardRate?: number
  premiumRate?: number
  enterpriseRate?: number
  minimumPayout?: number
  currency?: string
  performanceBonuses?: {
    enabled: boolean
    engagementBonus: number
    retentionBonus: number
  }
  payoutSchedule?: {
    frequency: string
    payoutDay: string
    automaticPayouts: boolean
  }

  // Backward compatibility for legacy and form properties
  default?: number
  premium?: number
  enterprise?: number
  standard_rate?: number
  premium_rate?: number
  minimum_payout?: number
}

// Sustainability settings with consistent naming
type SustainabilitySettings = {
  carbonTrackingEnabled: boolean
  reportingFrequency: string
  energyOptimizationEnabled: boolean
  brightnessThreshold?: number
  offHoursPowerSaving?: boolean
  offsetProgram: string
  offsetProvider?: string
  offsetPercentage?: number
  ecoFriendlyDiscounts?: boolean
  ecoDiscountPercentage?: number
  partnerEnergyBonuses?: boolean
}

// General settings with consistent naming
type GeneralSettings = {
  // Core properties (camelCase)
  platformName?: string
  platformUrl?: string
  supportEmail?: string
  defaultTimezone?: string
  defaultLanguage?: string
  defaultCurrency?: string
  dateFormat?: string
  timeFormat?: string
  darkModeDefault?: boolean
  interfaceAnimations?: boolean
  interfaceDensity?: string | number

  // Backward compatibility for snake_case used in forms
  platform_name?: string
  platform_url?: string
  support_email?: string
  timezone?: string
  language?: string
  currency?: string
  date_format?: string
  time_format?: string
  dark_mode_default?: boolean
  interface_animations?: boolean
  interface_density?: string | number
}

// System settings with consistent naming
type SystemSettings = {
  // Core properties (camelCase)
  maintenanceMode: boolean
  maintenanceDay: string
  maintenanceTime: string
  maintenanceDuration: number
  automaticBackups?: boolean
  backupFrequency: string
  backupRetention: number
  backupStorage?: string
  logLevel?: string
  logRetention?: number
  externalLogging?: boolean
  logEndpoint?: string
  errorReporting?: boolean
  debugMode?: boolean
  featureFlags?: {
    arVrFeatures: boolean
    voiceInteraction: boolean
    blockchainVerification: boolean
    betaFeatures: boolean
  }

  // Backward compatibility
  autoBackup?: boolean
}

// Main configuration with consistent naming
type SystemConfig = {
  // Core properties (camelCase)
  paymentGateway?: PaymentGateway
  analyticsSettings?: AnalyticsSettings
  notificationSettings?: NotificationSettings
  commissionRates?: CommissionRates
  securitySettings?: SecuritySettings
  aiSettings?: AISettings
  sustainabilitySettings?: SustainabilitySettings
  generalSettings?: GeneralSettings
  systemSettings?: SystemSettings
  lastUpdated?: string

  // Backward compatibility for snake_case used in the current implementation
  payment_gateway: PaymentGateway
  analytics_settings: AnalyticsSettings
  notification_settings: NotificationSettings
  commission_rates: CommissionRates
  security_settings: SecuritySettings
  ai_settings: AISettings
  sustainability_settings: SustainabilitySettings
  general_settings?: GeneralSettings
  system_settings?: SystemSettings
  last_updated?: string
}

interface AuditLogEntry {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  reason: string;
}

// Add these type definitions at the top of the file
type SystemConfigState = {
  [key: string]: any;
  general_settings?: GeneralSettings;
  payment_gateway?: PaymentGateway;
  security_settings?: SecuritySettings;
  notification_settings?: NotificationSettings;
  analytics_settings?: AnalyticsSettings;
  ai_settings?: AISettings;
  commission_rates?: CommissionRates;
  sustainability_settings?: SustainabilitySettings;
  system_settings?: SystemSettings;
  last_updated?: string;
}

// Helper functions for consistent naming

/**
 * Transforms data between camelCase and snake_case formats
 * to ensure compatibility with both backend and frontend naming conventions
 */
const syncNamingConventions = <T extends Record<string, any>>(data: T): T => {
  // Don't process null/undefined
  if (!data) return data

  const result = { ...data } as Record<string, any>

  // General settings
  if ("platformName" in result || "platform_name" in result) {
    result.platformName = result.platformName || result.platform_name
    result.platform_name = result.platform_name || result.platformName

    result.platformUrl = result.platformUrl || result.platform_url
    result.platform_url = result.platform_url || result.platformUrl

    result.supportEmail = result.supportEmail || result.support_email
    result.support_email = result.support_email || result.supportEmail

    result.defaultTimezone = result.defaultTimezone || result.timezone
    result.timezone = result.timezone || result.defaultTimezone

    result.defaultLanguage = result.defaultLanguage || result.language
    result.language = result.language || result.defaultLanguage

    result.defaultCurrency = result.defaultCurrency || result.currency
    result.currency = result.currency || result.defaultCurrency

    result.dateFormat = result.dateFormat || result.date_format
    result.date_format = result.date_format || result.dateFormat

    result.timeFormat = result.timeFormat || result.time_format
    result.time_format = result.time_format || result.timeFormat

    result.darkModeDefault = result.darkModeDefault ?? result.dark_mode_default
    result.dark_mode_default = result.dark_mode_default ?? result.darkModeDefault

    result.interfaceAnimations = result.interfaceAnimations ?? result.interface_animations
    result.interface_animations = result.interface_animations ?? result.interfaceAnimations

    result.interfaceDensity = result.interfaceDensity ?? result.interface_density
    result.interface_density = result.interface_density ?? result.interfaceDensity
  }

  // Payment gateway
  if ("apiKey" in result || "api_key" in result) {
    result.apiKey = result.apiKey || result.api_key
    result.api_key = result.api_key || result.apiKey

    result.webhookSecret = result.webhookSecret || result.webhook_secret
    result.webhook_secret = result.webhook_secret || result.webhookSecret

    result.testMode = result.testMode ?? result.test_mode
    result.test_mode = result.test_mode ?? result.testMode

    result.paymentTerms = result.paymentTerms || result.payment_terms
    result.payment_terms = result.payment_terms || result.paymentTerms

    result.mpesaEnabled = result.mpesaEnabled ?? result.mpesa_enabled
    result.mpesa_enabled = result.mpesa_enabled ?? result.mpesaEnabled

    result.mpesaApiKey = result.mpesaApiKey || result.mpesa_api_key
    result.mpesa_api_key = result.mpesa_api_key || result.mpesaApiKey

    result.mpesaApiSecret = result.mpesaApiSecret || result.mpesa_api_secret
    result.mpesa_api_secret = result.mpesa_api_secret || result.mpesaApiSecret

    result.flutterwaveEnabled = result.flutterwaveEnabled ?? result.flutterwave_enabled
    result.flutterwave_enabled = result.flutterwave_enabled ?? result.flutterwaveEnabled

    result.flutterwaveApiKey = result.flutterwaveApiKey || result.flutterwave_api_key
    result.flutterwave_api_key = result.flutterwave_api_key || result.flutterwaveApiKey
  }

  // Security settings
  if (result.passwordPolicy || "password_min_length" in result) {
    // Ensure passwordPolicy exists
    if (!result.passwordPolicy && ("password_min_length" in result || "require_uppercase" in result)) {
      result.passwordPolicy = {
        minLength: Number(result.password_min_length) || 8,
        requireUppercase: result.require_uppercase ?? true,
        requireLowercase: true,
        requireNumbers: result.require_numbers ?? true,
        requireSpecialChars: result.require_special_chars ?? true,
        expiryDays: result.password_expiry_days || 90,
      }
    }

    result.password_min_length = result.password_min_length || result.passwordPolicy.minLength
    result.password_expiry_days = result.password_expiry_days || result.passwordPolicy.expiryDays
    result.require_uppercase = result.require_uppercase ?? result.passwordPolicy.requireUppercase
    result.require_numbers = result.require_numbers ?? result.passwordPolicy.requireNumbers
    result.require_special_chars = result.require_special_chars ?? result.passwordPolicy.requireSpecialChars

    result.mfaRequired = result.mfaRequired ?? result.two_factor_enabled
    result.two_factor_enabled = result.two_factor_enabled ?? result.mfaRequired

    result.apiRateLimiting = result.apiRateLimiting ?? result.api_rate_limiting
    result.api_rate_limiting = result.api_rate_limiting ?? result.apiRateLimiting

    result.rateLimit = result.rateLimit || result.rate_limit
    result.rate_limit = result.rate_limit || result.rateLimit

    result.apiKeyExpiration = result.apiKeyExpiration ?? result.api_key_expiration
    result.api_key_expiration = result.api_key_expiration ?? result.apiKeyExpiration

    result.keyExpiryDays = result.keyExpiryDays || result.key_expiry_days
    result.key_expiry_days = result.key_expiry_days || result.keyExpiryDays

    result.maxLoginAttempts = result.maxLoginAttempts || result.max_login_attempts
    result.max_login_attempts = result.max_login_attempts || result.maxLoginAttempts

    result.lockoutDurationMinutes = result.lockoutDurationMinutes || result.lockout_duration_minutes
    result.lockout_duration_minutes = result.lockout_duration_minutes || result.lockoutDurationMinutes
  }

  // Notification settings
  if ("emailEnabled" in result || "email_notifications" in result) {
    result.emailEnabled = result.emailEnabled ?? result.email_notifications
    result.email_notifications = result.email_notifications ?? result.emailEnabled

    result.smsEnabled = result.smsEnabled ?? result.sms_notifications
    result.sms_notifications = result.sms_notifications ?? result.smsEnabled

    result.pushEnabled = result.pushEnabled ?? result.push_notifications
    result.push_notifications = result.push_notifications ?? result.pushEnabled

    result.inAppNotifications = result.inAppNotifications ?? result.in_app_notifications
    result.in_app_notifications = result.in_app_notifications ?? result.inAppNotifications
  }

  // Email config
  if (result.emailConfig) {
    const emailCfg = result.emailConfig as Record<string, any>
    emailCfg.smtpHost = emailCfg.smtpHost || emailCfg.smtp_host
    emailCfg.smtp_host = emailCfg.smtp_host || emailCfg.smtpHost

    emailCfg.smtpPort = emailCfg.smtpPort || emailCfg.smtp_port
    emailCfg.smtp_port = emailCfg.smtp_port || emailCfg.smtpPort

    emailCfg.smtpUser = emailCfg.smtpUser || emailCfg.smtp_username
    emailCfg.smtp_username = emailCfg.smtp_username || emailCfg.smtpUser

    emailCfg.smtpPassword = emailCfg.smtpPassword || emailCfg.smtp_password
    emailCfg.smtp_password = emailCfg.smtp_password || emailCfg.smtpPassword

    emailCfg.fromEmail = emailCfg.fromEmail || emailCfg.from_email
    emailCfg.from_email = emailCfg.from_email || emailCfg.fromEmail

    emailCfg.fromName = emailCfg.fromName || emailCfg.from_name
    emailCfg.from_name = emailCfg.from_name || emailCfg.fromName
  }

  // Commission rates
  if ("standardRate" in result || "standard_rate" in result) {
    result.standardRate = result.standardRate || result.standard_rate || result.default
    result.standard_rate = result.standard_rate || result.standardRate || result.default
    result.default = result.default || result.standardRate || result.standard_rate

    result.premiumRate = result.premiumRate || result.premium_rate || result.premium
    result.premium_rate = result.premium_rate || result.premiumRate || result.premium
    result.premium = result.premium || result.premiumRate || result.premium_rate

    result.enterpriseRate = result.enterpriseRate || result.enterprise
    result.enterprise = result.enterprise || result.enterpriseRate

    result.minimumPayout = result.minimumPayout || result.minimum_payout
    result.minimum_payout = result.minimum_payout || result.minimumPayout
  }

  // System settings
  if ("automaticBackups" in result || "autoBackup" in result) {
    result.automaticBackups = result.automaticBackups ?? result.autoBackup
    result.autoBackup = result.autoBackup ?? result.automaticBackups
  }

  // Handle lastUpdated and last_updated
  if ("lastUpdated" in result || "last_updated" in result) {
    result.lastUpdated = result.lastUpdated || result.last_updated
    result.last_updated = result.last_updated || result.lastUpdated
  }

  return result as T
}

/**
 * Update the default system config to use both naming conventions
 */
const enhanceDefaultSystemConfig = (config: SystemConfig): SystemConfig => {
  // First ensure we have all required objects
  if (!config.generalSettings && !config.general_settings) {
    config.generalSettings = {}
    config.general_settings = {}
  }

  if (!config.paymentGateway && !config.payment_gateway) {
    config.paymentGateway = {} as PaymentGateway
    config.payment_gateway = {} as PaymentGateway
  }

  if (!config.securitySettings && !config.security_settings) {
    config.securitySettings = {} as SecuritySettings
    config.security_settings = {} as SecuritySettings
  }

  if (!config.notificationSettings && !config.notification_settings) {
    config.notificationSettings = {} as NotificationSettings
    config.notification_settings = {} as NotificationSettings
  }

  if (!config.analyticsSettings && !config.analytics_settings) {
    config.analyticsSettings = {} as AnalyticsSettings
    config.analytics_settings = {} as AnalyticsSettings
  }

  if (!config.aiSettings && !config.ai_settings) {
    config.aiSettings = {} as AISettings
    config.ai_settings = {} as AISettings
  }

  if (!config.commissionRates && !config.commission_rates) {
    config.commissionRates = {} as CommissionRates
    config.commission_rates = {} as CommissionRates
  }

  if (!config.sustainabilitySettings && !config.sustainability_settings) {
    config.sustainabilitySettings = {} as SustainabilitySettings
    config.sustainability_settings = {} as SustainabilitySettings
  }

  if (!config.systemSettings && !config.system_settings) {
    config.systemSettings = {
      maintenanceMode: false,
      maintenanceDay: "sunday",
      maintenanceTime: "02:00",
      maintenanceDuration: 60,
      backupFrequency: "daily",
      backupRetention: 30,
      featureFlags: {
        arVrFeatures: false,
        voiceInteraction: false,
        blockchainVerification: false,
        betaFeatures: false,
      },
    } as SystemSettings
    config.system_settings = config.systemSettings
  }

  // Now sync all names in both directions - properly handle undefined values
  const generalSettings = config.generalSettings || config.general_settings || {}
  config.generalSettings = syncNamingConventions(generalSettings)
  config.general_settings = config.generalSettings

  const paymentGateway = config.paymentGateway || config.payment_gateway || {}
  config.paymentGateway = syncNamingConventions(paymentGateway)
  config.payment_gateway = config.paymentGateway

  const securitySettings = config.securitySettings || config.security_settings || {}
  config.securitySettings = syncNamingConventions(securitySettings)
  config.security_settings = config.securitySettings

  const notificationSettings = config.notificationSettings || config.notification_settings || {}
  config.notificationSettings = syncNamingConventions(notificationSettings)
  config.notification_settings = config.notificationSettings

  const analyticsSettings = config.analyticsSettings || config.analytics_settings || {}
  config.analyticsSettings = syncNamingConventions(analyticsSettings)
  config.analytics_settings = config.analyticsSettings

  const aiSettings = config.aiSettings || config.ai_settings || {}
  config.aiSettings = syncNamingConventions(aiSettings)
  config.ai_settings = config.aiSettings

  const commissionRates = config.commissionRates || config.commission_rates || {}
  config.commissionRates = syncNamingConventions(commissionRates)
  config.commission_rates = config.commissionRates

  const sustainabilitySettings = config.sustainabilitySettings || config.sustainability_settings || {}
  config.sustainabilitySettings = syncNamingConventions(sustainabilitySettings)
  config.sustainability_settings = config.sustainabilitySettings

  const systemSettings = config.systemSettings ||
    config.system_settings || {
      maintenanceMode: false,
      maintenanceDay: "sunday",
      maintenanceTime: "02:00",
      maintenanceDuration: 60,
      backupFrequency: "daily",
      backupRetention: 30,
      featureFlags: {
        arVrFeatures: false,
        voiceInteraction: false,
        blockchainVerification: false,
        betaFeatures: false,
      },
    }
  config.systemSettings = syncNamingConventions(systemSettings)
  config.system_settings = config.systemSettings

  return config
}

// Update the initializeSystemConfigDefaults function to use consistent naming
const initializeSystemConfigDefaults = (config: SystemConfig): SystemConfig => {
  const defaulted = { ...config }

  // Create both camelCase and snake_case versions of object properties for backward compatibility

  // General settings
  if (!defaulted.general_settings) {
    defaulted.general_settings = {
      // snake_case for form compatibility
      platform_name: "Lumen AdTech",
      platform_url: "https://lumen-adtech.com",
      support_email: "support@lumen-adtech.com",
      timezone: "UTC",
      language: "en",
      currency: "USD",
      date_format: "MM/DD/YYYY",
      time_format: "12h",
      dark_mode_default: true,
      interface_animations: true,
      interface_density: "comfortable",

      // Also include camelCase versions for type compatibility
      platformName: "Lumen AdTech",
      platformUrl: "https://lumen-adtech.com",
      supportEmail: "support@lumen-adtech.com",
      defaultTimezone: "UTC",
      defaultLanguage: "en",
      defaultCurrency: "USD",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      darkModeDefault: true,
      interfaceAnimations: true,
      interfaceDensity: "comfortable",
    }
  }

  // Also provide camelCase version
  defaulted.generalSettings = {
    platformName: "Lumen AdTech",
    platformUrl: "https://lumen-adtech.com",
    supportEmail: "support@lumen-adtech.com",
    defaultTimezone: "UTC",
    defaultLanguage: "en",
    defaultCurrency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    darkModeDefault: true,
    interfaceAnimations: true,
    interfaceDensity: "comfortable",
  }

  // Payment gateway
  if (!defaulted.payment_gateway) {
    defaulted.payment_gateway = {
      // snake_case for form compatibility
      provider: "stripe",
      test_mode: true,
      api_key: "",
      webhook_secret: "",
      mpesa_enabled: false,
      mpesa_api_key: "",
      mpesa_api_secret: "",
      flutterwave_enabled: false,
      flutterwave_api_key: "",
      payment_terms: "net30",

      // camelCase for type compatibility
      apiKey: "",
      webhookSecret: "",
      supportedCurrencies: ["USD", "EUR", "KES"],
      testMode: true,
    }
  }

  // Also provide camelCase version
  defaulted.paymentGateway = {
    provider: "stripe",
    apiKey: "",
    webhookSecret: "",
    supportedCurrencies: ["USD", "EUR", "KES"],
    testMode: true,
    mpesaEnabled: false,
    mpesaApiKey: "",
    mpesaApiSecret: "",
    flutterwaveEnabled: false,
    flutterwaveApiKey: "",
    paymentTerms: "net30",
  }

  // Security settings
  if (!defaulted.security_settings) {
    defaulted.security_settings = {
      // snake_case for form compatibility
      password_min_length: 8,
      password_expiry_days: 90,
      require_special_chars: true,
      require_numbers: true,
      require_uppercase: true,
      max_login_attempts: 5,
      lockout_duration_minutes: 30,
      two_factor_enabled: false,
      api_rate_limiting: false,
      rate_limit: 60,
      api_key_expiration: false,
      key_expiry_days: 90,

      // camelCase for type compatibility
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90,
      },
      mfaRequired: false,
      sessionTimeout: 30,
      ipWhitelist: [],
      apiRateLimiting: false,
      rateLimit: 60,
      apiKeyExpiration: false,
      keyExpiryDays: 90,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      twoFactorEnabled: false,
    }
  }

  // Also provide camelCase version
  defaulted.securitySettings = {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
    mfaRequired: false,
    sessionTimeout: 30,
    ipWhitelist: [],
    apiRateLimiting: false,
    rateLimit: 60,
    apiKeyExpiration: false,
    keyExpiryDays: 90,
  }

  // Notification settings
  if (!defaulted.notification_settings) {
    defaulted.notification_settings = {
      // snake_case for form compatibility
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      in_app_notifications: true,

      // camelCase for type compatibility
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      inAppNotifications: true,

      // Email config with both naming conventions
      emailConfig: {
        // snake_case for forms
        smtp_host: "smtp.example.com",
        smtp_port: 587,
        smtp_username: "",
        smtp_password: "",
        from_email: "noreply@lumen-adtech.com",
        from_name: "Lumen AdTech",

        // camelCase for types
        smtpHost: "smtp.example.com",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "noreply@lumen-adtech.com",
        fromName: "Lumen AdTech",
      },

      // SMS config
      smsConfig: {
        provider: "twilio",
        apiKey: "",
        senderId: "LUMEN",
      },

      // Default templates
      defaultTemplates: {
        campaignApproval: "",
        paymentConfirmation: "",
        lowBudgetAlert: "",
      },
    }
  }

  // Also provide camelCase version
  defaulted.notificationSettings = {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppNotifications: true,
    emailConfig: {
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "noreply@lumen-adtech.com",
      fromName: "Lumen AdTech",
    },
    smsConfig: {
      provider: "twilio",
      apiKey: "",
      senderId: "LUMEN",
    },
    defaultTemplates: {
      campaignApproval: "",
      paymentConfirmation: "",
      lowBudgetAlert: "",
    },
  }

  // Analytics settings
  if (!defaulted.analytics_settings) {
    defaulted.analytics_settings = {
      // Legacy properties
      dataRetentionDays: 365,
      anonymizeData: true,
      realTimeEnabled: true,
      samplingRate: 100,
      exportFormats: ["csv", "json", "excel"],

      // Structured properties
      googleAnalytics: {
        enabled: false,
        trackingId: "",
        anonymizeIp: true,
      },
      internalAnalytics: {
        enabled: true,
        dataRetentionDays: 365,
        trackUserJourney: true,
      },
      privacySettings: {
        cookieConsent: true,
        dataSharing: false,
        allowExport: true,
      },
    }
  }

  // Also provide camelCase version
  defaulted.analyticsSettings = {
    dataRetentionDays: 365,
    anonymizeData: true,
    realTimeEnabled: true,
    samplingRate: 100,
    exportFormats: ["csv", "json", "excel"],
    googleAnalytics: {
      enabled: false,
      trackingId: "",
      anonymizeIp: true,
    },
    internalAnalytics: {
      enabled: true,
      dataRetentionDays: 365,
      trackUserJourney: true,
    },
    privacySettings: {
      cookieConsent: true,
      dataSharing: false,
      allowExport: true,
    },
  }

  // AI settings
  if (!defaulted.ai_settings) {
    defaulted.ai_settings = {
      emotionDetectionEnabled: true,
      audienceEstimationEnabled: true,
      privacyLevel: "medium",
      edgeProcessingEnabled: true,
      modelUpdateFrequency: "weekly",
      federatedLearningEnabled: true,
      modelExplainabilityEnabled: true,
    }
  }

  // Also provide camelCase version
  defaulted.aiSettings = {
    emotionDetectionEnabled: true,
    audienceEstimationEnabled: true,
    privacyLevel: "medium",
    edgeProcessingEnabled: true,
    modelUpdateFrequency: "weekly",
    federatedLearningEnabled: true,
    modelExplainabilityEnabled: true,
  }

  // Commission rates
  if (!defaulted.commission_rates) {
    defaulted.commission_rates = {
      // snake_case for forms
      standard_rate: 70,
      premium_rate: 80,
      minimum_payout: 50,
      currency: "USD",

      // Legacy camelCase
      default: 70,
      premium: 80,
      enterprise: 85,

      // New camelCase
      standardRate: 70,
      premiumRate: 80,
      enterpriseRate: 85,
      minimumPayout: 50,

      // Nested objects
      payoutSchedule: {
        frequency: "monthly",
        payoutDay: "15",
        automaticPayouts: true,
      },
      performanceBonuses: {
        enabled: true,
        engagementBonus: 5,
        retentionBonus: 3,
      },
    }
  }

  // Add camelCase version if it doesn't exist
  defaulted.commissionRates = defaulted.commission_rates

  // Sustainability settings
  if (!defaulted.sustainability_settings) {
    defaulted.sustainability_settings = {
      carbonTrackingEnabled: true,
      reportingFrequency: "monthly",
      energyOptimizationEnabled: true,
      brightnessThreshold: 50,
      offHoursPowerSaving: true,
      offsetProgram: "enabled",
      offsetProvider: "climatecare",
      offsetPercentage: 100,
      ecoFriendlyDiscounts: true,
      ecoDiscountPercentage: 5,
      partnerEnergyBonuses: true,
    }
  }

  // Add camelCase version if it doesn't exist
  defaulted.sustainabilitySettings = defaulted.sustainability_settings

  // System settings
  if (!defaulted.system_settings) {
    defaulted.system_settings = {
      maintenanceMode: false,
      maintenanceDay: "sunday",
      maintenanceTime: "02:00",
      maintenanceDuration: 60,

      // Both naming conventions for backup settings
      automaticBackups: true,
      autoBackup: true,

      backupFrequency: "daily",
      backupRetention: 30,
      backupStorage: "s3",
      logLevel: "info",
      logRetention: 90,
      externalLogging: false,
      logEndpoint: "",
      errorReporting: true,
      debugMode: false,

      // Feature flags
      featureFlags: {
        arVrFeatures: true,
        voiceInteraction: true,
        blockchainVerification: false,
        betaFeatures: true,
      },
    }
  }

  // Add camelCase version if it doesn't exist
  defaulted.systemSettings = defaulted.system_settings

  // Add timestamp
  const now = new Date().toISOString()
  defaulted.lastUpdated = now
  defaulted.last_updated = now

  return defaulted
}

// Add default system configuration for when nothing is loaded yet
const defaultSystemConfig: SystemConfig = {
  // Add default settings for a fresh install
  general_settings: {
    platform_name: "Lumen AdTech",
    platform_url: "https://lumen-adtech.com",
    support_email: "support@lumen-adtech.com",
    timezone: "UTC",
    language: "en",
    currency: "USD",
    date_format: "MM/DD/YYYY",
    time_format: "12h",
    dark_mode_default: true,
    interface_animations: true,
    interface_density: "comfortable",

    // Also include camelCase versions for type compatibility
    platformName: "Lumen AdTech",
    platformUrl: "https://lumen-adtech.com",
    supportEmail: "support@lumen-adtech.com",
    defaultTimezone: "UTC",
    defaultLanguage: "en",
    defaultCurrency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    darkModeDefault: true,
    interfaceAnimations: true,
    interfaceDensity: "comfortable",
  },
  // Also provide camelCase version
  generalSettings: {
    platformName: "Lumen AdTech",
    platformUrl: "https://lumen-adtech.com",
    supportEmail: "support@lumen-adtech.com",
    defaultTimezone: "UTC",
    defaultLanguage: "en",
    defaultCurrency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    darkModeDefault: true,
    interfaceAnimations: true,
    interfaceDensity: "comfortable",
  },
  payment_gateway: {
    provider: "stripe",
    api_key: "",
    webhook_secret: "",
    supportedCurrencies: ["USD", "EUR", "KES"],
    test_mode: true,
    mpesa_enabled: false,
    mpesa_api_key: "",
    mpesa_api_secret: "",
    flutterwave_enabled: false,
    flutterwave_api_key: "",
    payment_terms: "net30",
    apiKey: "",
    webhookSecret: "",
    testMode: true,
  },
  // Also provide camelCase version
  paymentGateway: {
    provider: "stripe",
    apiKey: "",
    webhookSecret: "",
    supportedCurrencies: ["USD", "EUR", "KES"],
    testMode: true,
    mpesaEnabled: false,
    mpesaApiKey: "",
    mpesaApiSecret: "",
    flutterwaveEnabled: false,
    flutterwaveApiKey: "",
    paymentTerms: "net30",
  },
  security_settings: {
    password_min_length: 8,
    password_expiry_days: 90,
    require_special_chars: true,
    require_numbers: true,
    require_uppercase: true,
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    two_factor_enabled: false,
    api_rate_limiting: false,
    rate_limit: 60,
    api_key_expiration: false,
    key_expiry_days: 90,
    mfaRequired: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
    sessionTimeout: 30,
    ipWhitelist: [],
    apiRateLimiting: false,
    rateLimit: 60,
    apiKeyExpiration: false,
    keyExpiryDays: 90,
  },
  // Also provide camelCase version
  securitySettings: {
    mfaRequired: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
    },
    sessionTimeout: 30,
    ipWhitelist: [],
    apiRateLimiting: false,
    rateLimit: 60,
    apiKeyExpiration: false,
    keyExpiryDays: 90,
  },
  notification_settings: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    in_app_notifications: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppNotifications: true,
    emailConfig: {
      smtp_host: "smtp.example.com",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      from_email: "noreply@lumen-adtech.com",
      from_name: "Lumen AdTech",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "noreply@lumen-adtech.com",
      fromName: "Lumen AdTech",
    },
    smsConfig: {
      provider: "twilio",
      apiKey: "",
      senderId: "LUMEN",
    },
  },
  // Also provide camelCase version
  notificationSettings: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    inAppNotifications: true,
    emailConfig: {
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "noreply@lumen-adtech.com",
      fromName: "Lumen AdTech",
    },
    smsConfig: {
      provider: "twilio",
      apiKey: "",
      senderId: "LUMEN",
    },
  },
  analytics_settings: {
    dataRetentionDays: 365,
    anonymizeData: true,
    realTimeEnabled: true,
    samplingRate: 100,
    exportFormats: ["csv", "json", "excel"],
    googleAnalytics: {
      enabled: false,
      trackingId: "",
      anonymizeIp: true,
    },
    internalAnalytics: {
      enabled: true,
      dataRetentionDays: 365,
      trackUserJourney: true,
    },
    privacySettings: {
      cookieConsent: true,
      dataSharing: false,
      allowExport: true,
    },
  },
  // Also provide camelCase version
  analyticsSettings: {
    dataRetentionDays: 365,
    anonymizeData: true,
    realTimeEnabled: true,
    samplingRate: 100,
    exportFormats: ["csv", "json", "excel"],
    googleAnalytics: {
      enabled: false,
      trackingId: "",
      anonymizeIp: true,
    },
    internalAnalytics: {
      enabled: true,
      dataRetentionDays: 365,
      trackUserJourney: true,
    },
    privacySettings: {
      cookieConsent: true,
      dataSharing: false,
      allowExport: true,
    },
  },
  ai_settings: {
    emotionDetectionEnabled: true,
    audienceEstimationEnabled: true,
    privacyLevel: "medium",
    edgeProcessingEnabled: true,
    modelUpdateFrequency: "weekly",
    federatedLearningEnabled: true,
    modelExplainabilityEnabled: true,
  },
  // Also provide camelCase version
  aiSettings: {
    emotionDetectionEnabled: true,
    audienceEstimationEnabled: true,
    privacyLevel: "medium",
    edgeProcessingEnabled: true,
    modelUpdateFrequency: "weekly",
    federatedLearningEnabled: true,
    modelExplainabilityEnabled: true,
  },
  commission_rates: {
    standard_rate: 70,
    premium_rate: 80,
    minimum_payout: 50,
    currency: "USD",
    performanceBonuses: {
      enabled: true,
      engagementBonus: 5,
      retentionBonus: 3,
    },
    standardRate: 70,
    premiumRate: 80,
    minimumPayout: 50,
  },
  // Also provide camelCase version
  commissionRates: {
    standardRate: 70,
    premiumRate: 80,
    enterpriseRate: 85,
    minimumPayout: 50,
    currency: "USD",
    performanceBonuses: {
      enabled: true,
      engagementBonus: 5,
      retentionBonus: 3,
    },
  },
  sustainability_settings: {
    carbonTrackingEnabled: true,
    reportingFrequency: "monthly",
    energyOptimizationEnabled: true,
    brightnessThreshold: 50,
    offHoursPowerSaving: true,
    offsetProgram: "enabled",
    offsetProvider: "climatecare",
    offsetPercentage: 100,
    ecoFriendlyDiscounts: true,
    ecoDiscountPercentage: 5,
    partnerEnergyBonuses: true,
  },
  // Also provide camelCase version
  sustainabilitySettings: {
    carbonTrackingEnabled: true,
    reportingFrequency: "monthly",
    energyOptimizationEnabled: true,
    brightnessThreshold: 50,
    offHoursPowerSaving: true,
    offsetProgram: "enabled",
    offsetProvider: "climatecare",
    offsetPercentage: 100,
    ecoFriendlyDiscounts: true,
    ecoDiscountPercentage: 5,
    partnerEnergyBonuses: true,
  },
  system_settings: {
    maintenanceMode: false,
    maintenanceDay: "sunday",
    maintenanceTime: "02:00",
    maintenanceDuration: 60,
    automaticBackups: true,
    backupFrequency: "daily",
    backupRetention: 30,
    backupStorage: "s3",
    logLevel: "info",
    logRetention: 90,
    externalLogging: false,
    logEndpoint: "",
    errorReporting: true,
    debugMode: false,
    featureFlags: {
      arVrFeatures: true,
      voiceInteraction: true,
      blockchainVerification: false,
      betaFeatures: true,
    },
  },
  // Also provide camelCase version
  systemSettings: {
    maintenanceMode: false,
    maintenanceDay: "sunday",
    maintenanceTime: "02:00",
    maintenanceDuration: 60,
    automaticBackups: true,
    backupFrequency: "daily",
    backupRetention: 30,
    backupStorage: "s3",
    logLevel: "info",
    logRetention: 90,
    externalLogging: false,
    logEndpoint: "",
    errorReporting: true,
    debugMode: false,
    featureFlags: {
      arVrFeatures: true,
      voiceInteraction: true,
      blockchainVerification: false,
      betaFeatures: true,
    },
  },
}

export default function AdminSettings() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("general")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])

  // Initialize with our default config
  const [systemConfig, setSystemConfig] = useState<SystemConfigState>(initializeSystemConfigDefaults(defaultSystemConfig))

  // Handle config changes
  const handleConfigChange = (section: keyof SystemConfigState, field: string, value: any) => {
    setSystemConfig((prevConfig: SystemConfigState) => {
      const updatedConfig = { ...prevConfig }
      
      // Ensure the section exists
      if (!updatedConfig[section]) {
        updatedConfig[section] = {} as any
      }

      // Handle both camelCase and snake_case fields for backward compatibility
      const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
      const snakeCaseField = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

      // Update both naming conventions
      ;(updatedConfig[section] as any)[field] = value
      ;(updatedConfig[section] as any)[camelCaseField] = value
      ;(updatedConfig[section] as any)[snakeCaseField] = value

      return updatedConfig
    })
  }

  // Handle nested config changes (for objects inside the main sections)
  const handleNestedConfigChange = (section: keyof SystemConfigState, nestedField: string, field: string, value: any) => {
    setSystemConfig((prevConfig: SystemConfigState) => {
      const updatedConfig = { ...prevConfig }
      if (updatedConfig[section] && (updatedConfig[section] as any)[nestedField]) {
        ;(updatedConfig[section] as any)[nestedField][field] = value
      } else if (updatedConfig[section]) {
        ;(updatedConfig[section] as any)[nestedField] = { [field]: value }
      }
      return updatedConfig
    })
  }

  // Handle changes to array items
  const handleArrayChange = (section: keyof SystemConfigState, field: string, index: number, value: any) => {
    setSystemConfig((prevConfig: SystemConfigState) => {
      const updatedConfig = { ...prevConfig }
      if (updatedConfig[section] && Array.isArray((updatedConfig[section] as any)[field])) {
        const newArray = [...(updatedConfig[section] as any)[field]]
        newArray[index] = value
        ;(updatedConfig[section] as any)[field] = newArray
      }
      return updatedConfig
    })
  }

  // Save settings to the backend
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)

      // Create a deep clone of the configuration to avoid direct state modification
      const configToSave = JSON.parse(JSON.stringify(systemConfig))

      // Ensure defaults are initialized
      if (!configToSave.general) configToSave.general = {}
      if (!configToSave.general_settings) configToSave.general_settings = {}
      if (!configToSave.paymentGateway) configToSave.paymentGateway = {}
      if (!configToSave.security) configToSave.security = {}
      if (!configToSave.notifications) configToSave.notifications = {}
      if (!configToSave.analytics) configToSave.analytics = {}
      if (!configToSave.commissionRates) configToSave.commissionRates = {}
      if (!configToSave.sustainability) configToSave.sustainability = {}
      if (!configToSave.system) configToSave.system = {}

      // Validate platform name - check both formats
      const platformName = configToSave.general?.platformName || configToSave.general_settings?.platform_name
      if (!platformName) {
        toast.error("Platform name is required")
        return
      }

      // Ensure platform name is set in both formats for backward compatibility
      configToSave.general.platformName = platformName
      configToSave.general_settings.platform_name = platformName

      // Validate payment terms if present
      if (configToSave.paymentGateway?.paymentTerms) {
        const validTerms = ['net7', 'net15', 'net30', 'net45', 'net60']
        if (!validTerms.includes(configToSave.paymentGateway.paymentTerms)) {
          toast.error("Invalid payment terms. Must be one of: net7, net15, net30, net45, net60")
          return
        }
      }

      // Send the updated configuration to the API
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify(configToSave),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const responseData = await response.json()

      // Update the state with the saved settings
      setSystemConfig(responseData.settings)
      setLastSaved(responseData.lastSaved)
      
      // Add to audit log
      setAuditLog(prev => [
        {
          id: Date.now(),
          user: 'You',
          action: 'Updated settings',
          timestamp: new Date().toISOString(),
          reason: 'Settings saved successfully'
        },
        ...prev
      ])

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Load settings from the backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)

        // Try to load from localStorage first for immediate UI feedback
        try {
          const cachedSettings = localStorage.getItem("adminSystemConfig")
          if (cachedSettings) {
            const parsedSettings = JSON.parse(cachedSettings)
            setSystemConfig(parsedSettings)
          }
        } catch (error) {
          console.error("Error loading cached settings:", error)
        }

        // Fetch settings from the API
        const response = await fetch('/api/admin/settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Ensure cookies are sent with the request
        })

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Please log in to access settings")
            return
          }
          if (response.status === 403) {
            toast.error("You don't have permission to access settings")
            return
          }
          throw new Error("Failed to load settings")
        }

        const data = await response.json()

        if (data.settings) {
          // Apply defaults for any missing properties
          const enhancedSettings = enhanceDefaultSystemConfig({
            ...initializeSystemConfigDefaults(defaultSystemConfig),
            ...data.settings,
          })
          setSystemConfig(enhancedSettings)
          
          // Save to localStorage
          localStorage.setItem("adminSystemConfig", JSON.stringify(enhancedSettings))
        }

        if (data.lastSaved) {
          setLastSaved(new Date(data.lastSaved))
        }

        if (data.auditLog) {
          setAuditLog(data.auditLog)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    // Only save to localStorage if we're not in loading state and have valid settings
    if (!isLoading && systemConfig) {
      try {
        localStorage.setItem("adminSystemConfig", JSON.stringify(systemConfig))
      } catch (error) {
        console.error("Error saving to localStorage:", error)
      }
    }
  }, [systemConfig, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <div className="flex items-center gap-4">
          {lastSaved && <p className="text-sm text-muted-foreground">Last saved: {lastSaved.toLocaleString()}</p>}
          <Button onClick={handleSaveSettings} className="flex items-center gap-2" disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-background"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 flex justify-start overflow-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Payment Gateway
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Analytics & AI
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commission
          </TabsTrigger>
          <TabsTrigger value="sustainability" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Sustainability
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic platform settings like name, URL, and language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platform_name">Platform Name</Label>
                  <Input
                    id="platform_name"
                    value={systemConfig.general_settings?.platform_name || ""}
                    onChange={(e) => handleConfigChange("general_settings", "platform_name", e.target.value)}
                    placeholder="Lumen AdTech"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform_url">Platform URL</Label>
                  <Input
                    id="platform_url"
                    value={systemConfig.general_settings?.platform_url || ""}
                    onChange={(e) => handleConfigChange("general_settings", "platform_url", e.target.value)}
                    placeholder="https://lumen-adtech.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    value={systemConfig.general_settings?.support_email || ""}
                    onChange={(e) => handleConfigChange("general_settings", "support_email", e.target.value)}
                    placeholder="support@lumen-adtech.com"
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select
                    value={systemConfig.general_settings?.timezone || "UTC"}
                    onValueChange={(value) => handleConfigChange("general_settings", "timezone", value)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select
                    value={systemConfig.general_settings?.language || "en"}
                    onValueChange={(value) => handleConfigChange("general_settings", "language", value)}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={systemConfig.general_settings?.currency || "USD"}
                    onValueChange={(value) => handleConfigChange("general_settings", "currency", value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_format">Date Format</Label>
                  <Select
                    value={systemConfig.general_settings?.date_format || "MM/DD/YYYY"}
                    onValueChange={(value) => handleConfigChange("general_settings", "date_format", value)}
                  >
                    <SelectTrigger id="date_format">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_format">Time Format</Label>
                  <Select
                    value={systemConfig.general_settings?.time_format || "12h"}
                    onValueChange={(value) => handleConfigChange("general_settings", "time_format", value)}
                  >
                    <SelectTrigger id="time_format">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (1:30 PM)</SelectItem>
                      <SelectItem value="24h">24-hour (13:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-lg font-medium">Interface Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark_mode_default">Dark Mode Default</Label>
                      <p className="text-sm text-muted-foreground">Set dark theme as the default for admin users</p>
                    </div>
                    <Switch
                      id="dark_mode_default"
                      checked={systemConfig.general_settings?.dark_mode_default || false}
                      onCheckedChange={(checked) =>
                        handleConfigChange("general_settings", "dark_mode_default", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="interface_animations">Interface Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable UI animations and transitions</p>
                    </div>
                    <Switch
                      id="interface_animations"
                      checked={systemConfig.general_settings?.interface_animations || false}
                      onCheckedChange={(checked) =>
                        handleConfigChange("general_settings", "interface_animations", checked)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interface_density">Interface Density</Label>
                  <Select
                    value={systemConfig.general_settings?.interface_density?.toString() || "comfortable"}
                    onValueChange={(value) => handleConfigChange("general_settings", "interface_density", value)}
                  >
                    <SelectTrigger id="interface_density">
                      <SelectValue placeholder="Select interface density" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Gateway Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway</CardTitle>
              <CardDescription>Configure payment gateways, billing cycles, and financial settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Gateway</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="payment-provider">Payment Provider</Label>
                    <Select
                      value={systemConfig.payment_gateway?.provider || "stripe"}
                      onValueChange={(value) => handleConfigChange("payment_gateway", "provider", value)}
                    >
                      <SelectTrigger id="payment-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="flutterwave">Flutterwave</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={systemConfig.payment_gateway?.api_key || ""}
                      onChange={(e) => handleConfigChange("payment_gateway", "api_key", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-secret">Webhook Secret</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={systemConfig.payment_gateway?.webhook_secret || ""}
                      onChange={(e) => handleConfigChange("payment_gateway", "webhook_secret", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="test-mode">Test Mode</Label>
                      <Switch
                        id="test-mode"
                        checked={systemConfig.payment_gateway?.test_mode || false}
                        onCheckedChange={(checked) => handleConfigChange("payment_gateway", "test_mode", checked)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Enable test mode for development and testing</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Supported Currencies</h3>
                <div className="flex flex-wrap gap-2">
                  {systemConfig.payment_gateway?.supportedCurrencies?.map((currency, index) => (
                    <Badge key={currency} variant="outline" className="flex items-center gap-1 px-3 py-1">
                      {currency}
                      <button
                        className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => {
                          const newCurrencies = [...(systemConfig.payment_gateway?.supportedCurrencies || [])]
                          newCurrencies.splice(index, 1)
                          handleConfigChange("payment_gateway", "supportedCurrencies", newCurrencies)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      const newCurrency = prompt("Enter currency code (e.g., USD, EUR):")
                      if (newCurrency && !systemConfig.payment_gateway?.supportedCurrencies?.includes(newCurrency)) {
                        handleConfigChange("payment_gateway", "supportedCurrencies", [
                          ...(systemConfig.payment_gateway?.supportedCurrencies || []),
                          newCurrency,
                        ])
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Currency
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Billing Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-prefix">Invoice Number Prefix</Label>
                    <Input
                      id="invoice-prefix"
                      value={systemConfig.payment_gateway?.invoicePrefix || "INV-"}
                      onChange={(e) => handleConfigChange("payment_gateway", "invoicePrefix", e.target.value)}
                      placeholder="INV-"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-terms">Default Payment Terms (days)</Label>
                    <Input
                      id="payment-terms"
                      type="number"
                      value={systemConfig.payment_gateway?.payment_terms || 30}
                      onChange={(e) =>
                        handleConfigChange("payment_gateway", "payment_terms", Number.parseInt(e.target.value) || 30)
                      }
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      value={systemConfig.payment_gateway?.taxRate || 16}
                      onChange={(e) =>
                        handleConfigChange("payment_gateway", "taxRate", Number.parseFloat(e.target.value) || 16)
                      }
                      placeholder="16"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing-cycle">Default Billing Cycle</Label>
                    <Select
                      value={systemConfig.payment_gateway?.billingCycle || "monthly"}
                      onValueChange={(value) => handleConfigChange("payment_gateway", "billingCycle", value)}
                    >
                      <SelectTrigger id="billing-cycle">
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Reminders</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Send Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically send payment reminders to advertisers
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.payment_gateway?.sendReminders || false}
                      onCheckedChange={(checked) => handleConfigChange("payment_gateway", "sendReminders", checked)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reminder-first">First Reminder (days before due)</Label>
                      <Input
                        id="reminder-first"
                        type="number"
                        value={systemConfig.payment_gateway?.reminderDays?.[0] || 7}
                        onChange={(e) => {
                          const days = [...(systemConfig.payment_gateway?.reminderDays || [7, 3, 1])]
                          days[0] = Number.parseInt(e.target.value) || 7
                          handleConfigChange("payment_gateway", "reminderDays", days)
                        }}
                        placeholder="7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-second">Second Reminder (days before due)</Label>
                      <Input
                        id="reminder-second"
                        type="number"
                        value={systemConfig.payment_gateway?.reminderDays?.[1] || 3}
                        onChange={(e) => {
                          const days = [...(systemConfig.payment_gateway?.reminderDays || [7, 3, 1])]
                          days[1] = Number.parseInt(e.target.value) || 3
                          handleConfigChange("payment_gateway", "reminderDays", days)
                        }}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-overdue">Overdue Reminder (days after due)</Label>
                      <Input
                        id="reminder-overdue"
                        type="number"
                        value={systemConfig.payment_gateway?.reminderDays?.[2] || 1}
                        onChange={(e) => {
                          const days = [...(systemConfig.payment_gateway?.reminderDays || [7, 3, 1])]
                          days[2] = Number.parseInt(e.target.value) || 1
                          handleConfigChange("payment_gateway", "reminderDays", days)
                        }}
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies, authentication requirements, and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mfa-required">Require Multi-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Force all users to set up MFA for their accounts</p>
                    </div>
                    <Switch
                      id="mfa-required"
                      checked={systemConfig.security_settings?.mfaRequired || false}
                      onCheckedChange={(checked) => handleConfigChange("security_settings", "mfaRequired", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={systemConfig.security_settings?.sessionTimeout || 30}
                      onChange={(e) =>
                        handleConfigChange("security_settings", "sessionTimeout", Number.parseInt(e.target.value) || 30)
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Time of inactivity before users are automatically logged out
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="min-length">Minimum Password Length</Label>
                    <Input
                      id="min-length"
                      type="number"
                      value={systemConfig.security_settings?.passwordPolicy?.minLength || 8}
                      onChange={(e) =>
                        handleNestedConfigChange(
                          "security_settings",
                          "passwordPolicy",
                          "minLength",
                          Number.parseInt(e.target.value) || 8,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-days">Password Expiry (days)</Label>
                    <Input
                      id="expiry-days"
                      type="number"
                      value={systemConfig.security_settings?.passwordPolicy?.expiryDays || 90}
                      onChange={(e) =>
                        handleNestedConfigChange(
                          "security_settings",
                          "passwordPolicy",
                          "expiryDays",
                          Number.parseInt(e.target.value) || 90,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-uppercase">Require Uppercase Letters</Label>
                    <Switch
                      id="require-uppercase"
                      checked={systemConfig.security_settings?.passwordPolicy?.requireUppercase || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("security_settings", "passwordPolicy", "requireUppercase", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-lowercase">Require Lowercase Letters</Label>
                    <Switch
                      id="require-lowercase"
                      checked={systemConfig.security_settings?.passwordPolicy?.requireLowercase || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("security_settings", "passwordPolicy", "requireLowercase", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-numbers">Require Numbers</Label>
                    <Switch
                      id="require-numbers"
                      checked={systemConfig.security_settings?.passwordPolicy?.requireNumbers || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("security_settings", "passwordPolicy", "requireNumbers", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-special">Require Special Characters</Label>
                    <Switch
                      id="require-special"
                      checked={systemConfig.security_settings?.passwordPolicy?.requireSpecialChars || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("security_settings", "passwordPolicy", "requireSpecialChars", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">IP Access Control</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>IP Whitelist</Label>
                      <p className="text-sm text-muted-foreground">Restrict admin access to specific IP addresses</p>
                    </div>
                    <Switch
                      checked={systemConfig.security_settings?.ipWhitelistEnabled || false}
                      onCheckedChange={(checked) =>
                        handleConfigChange("security_settings", "ipWhitelistEnabled", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed IP Addresses</Label>
                    <div className="flex flex-wrap gap-2">
                      {(systemConfig.security_settings?.ipWhitelist?.length || 0) > 0 ? (
                        systemConfig.security_settings?.ipWhitelist?.map((ip, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1 px-3 py-1">
                            {ip}
                            <button
                              className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                              onClick={() => {
                                const newList = [...(systemConfig.security_settings?.ipWhitelist || [])]
                                newList.splice(index, 1)
                                handleConfigChange("security_settings", "ipWhitelist", newList)
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No IP addresses added</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => {
                          const newIp = prompt("Enter IP address:")
                          if (newIp && !(systemConfig.security_settings?.ipWhitelist || []).includes(newIp)) {
                            handleConfigChange("security_settings", "ipWhitelist", [
                              ...(systemConfig.security_settings?.ipWhitelist || []),
                              newIp,
                            ])
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add IP
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">API Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>API Rate Limiting</Label>
                      <p className="text-sm text-muted-foreground">Limit the number of API requests per minute</p>
                    </div>
                    <Switch
                      checked={systemConfig.security_settings?.apiRateLimiting || false}
                      onCheckedChange={(checked) => handleConfigChange("security_settings", "apiRateLimiting", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      value={systemConfig.security_settings?.rateLimit || 60}
                      onChange={(e) =>
                        handleConfigChange("security_settings", "rateLimit", Number.parseInt(e.target.value) || 60)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>API Key Expiration</Label>
                      <p className="text-sm text-muted-foreground">Automatically expire API keys after a set period</p>
                    </div>
                    <Switch
                      checked={systemConfig.security_settings?.apiKeyExpiration || false}
                      onCheckedChange={(checked) =>
                        handleConfigChange("security_settings", "apiKeyExpiration", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-expiry">API Key Expiry (days)</Label>
                    <Input
                      id="key-expiry"
                      type="number"
                      value={systemConfig.security_settings?.keyExpiryDays || 90}
                      onChange={(e) =>
                        handleConfigChange("security_settings", "keyExpiryDays", Number.parseInt(e.target.value) || 90)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email, SMS, and push notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={systemConfig.notification_settings?.emailEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("notification_settings", "emailEnabled", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={systemConfig.notification_settings?.smsEnabled || false}
                      onCheckedChange={(checked) => handleConfigChange("notification_settings", "smsEnabled", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send notifications via browser/app push</p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={systemConfig.notification_settings?.pushEnabled || true}
                      onCheckedChange={(checked) => handleConfigChange("notification_settings", "pushEnabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      value={systemConfig.notification_settings?.emailConfig?.smtp_host || "smtp.example.com"}
                      onChange={(e) =>
                        handleNestedConfigChange("notification_settings", "emailConfig", "smtp_host", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={systemConfig.notification_settings?.emailConfig?.smtp_port || 587}
                      onChange={(e) =>
                        handleNestedConfigChange(
                          "notification_settings",
                          "emailConfig",
                          "smtp_port",
                          Number.parseInt(e.target.value) || 587,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">SMTP Username</Label>
                    <Input
                      id="smtp-user"
                      value={systemConfig.notification_settings?.emailConfig?.smtp_username || ""}
                      onChange={(e) =>
                        handleNestedConfigChange(
                          "notification_settings",
                          "emailConfig",
                          "smtp_username",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass">SMTP Password</Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      value={systemConfig.notification_settings?.emailConfig?.smtp_password || ""}
                      onChange={(e) =>
                        handleNestedConfigChange(
                          "notification_settings",
                          "emailConfig",
                          "smtp_password",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input
                      id="from-email"
                      value={
                        systemConfig.notification_settings?.emailConfig?.from_email || "notifications@lumen-adtech.com"
                      }
                      onChange={(e) =>
                        handleNestedConfigChange("notification_settings", "emailConfig", "from_email", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      value={systemConfig.notification_settings?.emailConfig?.from_name || "Lumen AdTech Platform"}
                      onChange={(e) =>
                        handleNestedConfigChange("notification_settings", "emailConfig", "from_name", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">SMS Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">SMS Provider</Label>
                    <Select
                      value={systemConfig.notification_settings?.smsConfig?.provider || "twilio"}
                      onValueChange={(value) =>
                        handleNestedConfigChange("notification_settings", "smsConfig", "provider", value)
                      }
                    >
                      <SelectTrigger id="sms-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="africastalking">Africa's Talking</SelectItem>
                        <SelectItem value="nexmo">Nexmo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-api-key">API Key</Label>
                    <Input
                      id="sms-api-key"
                      type="password"
                      value={systemConfig.notification_settings?.smsConfig?.apiKey || ""}
                      onChange={(e) =>
                        handleNestedConfigChange("notification_settings", "smsConfig", "apiKey", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-sender-id">Sender ID</Label>
                    <Input
                      id="sms-sender-id"
                      value={systemConfig.notification_settings?.smsConfig?.senderId || "LUMEN"}
                      onChange={(e) =>
                        handleNestedConfigChange("notification_settings", "smsConfig", "senderId", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Templates</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="campaign-approval">Campaign Approval Template</Label>
                        <Button variant="outline" size="sm">
                          Edit Template
                        </Button>
                      </div>
                      <Input
                        id="campaign-approval"
                        value={systemConfig.notification_settings?.defaultTemplates?.campaignApproval || ""}
                        onChange={(e) =>
                          handleNestedConfigChange(
                            "notification_settings",
                            "defaultTemplates",
                            "campaignApproval",
                            e.target.value,
                          )
                        }
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="payment-confirmation">Payment Confirmation Template</Label>
                        <Button variant="outline" size="sm">
                          Edit Template
                        </Button>
                      </div>
                      <Input
                        id="payment-confirmation"
                        value={systemConfig.notification_settings?.defaultTemplates?.paymentConfirmation || ""}
                        onChange={(e) =>
                          handleNestedConfigChange(
                            "notification_settings",
                            "defaultTemplates",
                            "paymentConfirmation",
                            e.target.value,
                          )
                        }
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="low-budget">Low Budget Alert Template</Label>
                        <Button variant="outline" size="sm">
                          Edit Template
                        </Button>
                      </div>
                      <Input
                        id="low-budget"
                        value={systemConfig.notification_settings?.defaultTemplates?.lowBudgetAlert || ""}
                        onChange={(e) =>
                          handleNestedConfigChange(
                            "notification_settings",
                            "defaultTemplates",
                            "lowBudgetAlert",
                            e.target.value,
                          )
                        }
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics & AI Settings */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>AI & Analytics Settings</CardTitle>
              <CardDescription>Configure AI models, analytics data collection, and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">AI Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emotion-detection">Emotion Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered emotion detection for audience engagement
                      </p>
                    </div>
                    <Switch
                      id="emotion-detection"
                      checked={systemConfig.ai_settings?.emotionDetectionEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("ai_settings", "emotionDetectionEnabled", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="audience-estimation">Audience Estimation</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered audience counting and demographics estimation
                      </p>
                    </div>
                    <Switch
                      id="audience-estimation"
                      checked={systemConfig.ai_settings?.audienceEstimationEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("ai_settings", "audienceEstimationEnabled", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="edge-processing">Edge Processing</Label>
                      <p className="text-sm text-muted-foreground">
                        Process AI data on device rather than in the cloud
                      </p>
                    </div>
                    <Switch
                      id="edge-processing"
                      checked={systemConfig.ai_settings?.edgeProcessingEnabled || true}
                      onCheckedChange={(checked) => handleConfigChange("ai_settings", "edgeProcessingEnabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Privacy Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="privacy-level">Privacy Level</Label>
                    <Select
                      value={systemConfig.ai_settings?.privacyLevel || "medium"}
                      onValueChange={(value) => handleConfigChange("ai_settings", "privacyLevel", value)}
                    >
                      <SelectTrigger id="privacy-level">
                        <SelectValue placeholder="Select privacy level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Store raw data for analysis</SelectItem>
                        <SelectItem value="medium">Medium - Anonymize data before storage</SelectItem>
                        <SelectItem value="high">High - Only store aggregated metrics</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Controls how audience data is processed and stored</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Anonymization</Label>
                      <p className="text-sm text-muted-foreground">Automatically anonymize all collected data</p>
                    </div>
                    <Switch
                      checked={systemConfig.analytics_settings?.anonymizeData ?? true}
                      onCheckedChange={(checked) => handleConfigChange("analytics_settings", "anonymizeData", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Analytics Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                    <Input
                      id="data-retention"
                      type="number"
                      value={systemConfig.analytics_settings?.dataRetentionDays ?? 365}
                      onChange={(e) =>
                        handleConfigChange("analytics_settings", "dataRetentionDays", Number.parseInt(e.target.value))
                      }
                    />
                    <p className="text-sm text-muted-foreground">How long to keep detailed analytics data</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampling-rate">Sampling Rate (%)</Label>
                    <Input
                      id="sampling-rate"
                      type="number"
                      value={systemConfig.analytics_settings?.samplingRate ?? 100}
                      onChange={(e) =>
                        handleConfigChange("analytics_settings", "samplingRate", Number.parseInt(e.target.value))
                      }
                    />
                    <p className="text-sm text-muted-foreground">Percentage of data to collect for analytics</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="real-time">Real-Time Analytics</Label>
                    <p className="text-sm text-muted-foreground">Enable real-time data processing and dashboards</p>
                  </div>
                  <Switch
                    id="real-time"
                    checked={systemConfig.analytics_settings?.realTimeEnabled ?? true}
                    onCheckedChange={(checked) => handleConfigChange("analytics_settings", "realTimeEnabled", checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">AI Model Management</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="model-update">Model Update Frequency</Label>
                    <Select
                      value={systemConfig.ai_settings?.modelUpdateFrequency || "weekly"}
                      onValueChange={(value) => handleConfigChange("ai_settings", "modelUpdateFrequency", value)}
                    >
                      <SelectTrigger id="model-update">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      How often to update AI models with new training data
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Federated Learning</Label>
                      <p className="text-sm text-muted-foreground">
                        Use federated learning to improve models without raw data transfer
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.ai_settings?.federatedLearningEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("ai_settings", "federatedLearningEnabled", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Model Explainability</Label>
                      <p className="text-sm text-muted-foreground">Generate explanations for AI-driven decisions</p>
                    </div>
                    <Switch
                      checked={systemConfig.ai_settings?.modelExplainabilityEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("ai_settings", "modelExplainabilityEnabled", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Rates Settings */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>Commission Rates</CardTitle>
              <CardDescription>Configure partner commission rates and payment thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Default Commission Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-rate">Default Rate (%)</Label>
                    <Input
                      id="default-rate"
                      type="number"
                      value={systemConfig.commission_rates?.default || 70}
                      onChange={(e) =>
                        handleConfigChange("commission_rates", "default", Number.parseInt(e.target.value) || 70)
                      }
                    />
                    <p className="text-sm text-muted-foreground">Standard commission rate for partners</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="premium-rate">Premium Rate (%)</Label>
                    <Input
                      id="premium-rate"
                      type="number"
                      value={systemConfig.commission_rates?.premium || 80}
                      onChange={(e) =>
                        handleConfigChange("commission_rates", "premium", Number.parseInt(e.target.value) || 80)
                      }
                    />
                    <p className="text-sm text-muted-foreground">Commission rate for premium partners</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enterprise-rate">Enterprise Rate (%)</Label>
                    <Input
                      id="enterprise-rate"
                      type="number"
                      value={systemConfig.commission_rates?.enterprise || 85}
                      onChange={(e) =>
                        handleConfigChange("commission_rates", "enterprise", Number.parseInt(e.target.value) || 85)
                      }
                    />
                    <p className="text-sm text-muted-foreground">Commission rate for enterprise partners</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-payout">Minimum Payout Amount</Label>
                    <Input
                      id="min-payout"
                      type="number"
                      value={systemConfig.commission_rates?.minimum_payout || 50}
                      onChange={(e) =>
                        handleConfigChange("commission_rates", "minimum_payout", Number.parseInt(e.target.value) || 50)
                      }
                    />
                    <p className="text-sm text-muted-foreground">Minimum amount required for partner payouts</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Performance Bonuses</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Performance-Based Bonuses</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable additional bonuses based on partner performance
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.commission_rates?.performanceBonuses?.enabled || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("commission_rates", "performanceBonuses", "enabled", checked)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="engagement-bonus">Engagement Bonus (%)</Label>
                      <Input
                        id="engagement-bonus"
                        type="number"
                        value={systemConfig.commission_rates?.performanceBonuses?.engagementBonus || 5}
                        onChange={(e) =>
                          handleNestedConfigChange(
                            "commission_rates",
                            "performanceBonuses",
                            "engagementBonus",
                            Number.parseInt(e.target.value) || 5,
                          )
                        }
                      />
                      <p className="text-sm text-muted-foreground">Additional commission for high engagement rates</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retention-bonus">Retention Bonus (%)</Label>
                      <Input
                        id="retention-bonus"
                        type="number"
                        value={systemConfig.commission_rates?.performanceBonuses?.retentionBonus || 3}
                        onChange={(e) =>
                          handleNestedConfigChange(
                            "commission_rates",
                            "performanceBonuses",
                            "retentionBonus",
                            Number.parseInt(e.target.value) || 3,
                          )
                        }
                      />
                      <p className="text-sm text-muted-foreground">Additional commission for long-term partnerships</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payout Schedule</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payout-frequency">Default Payout Frequency</Label>
                    <Select
                      value={systemConfig.commission_rates?.payoutSchedule?.frequency || "monthly"}
                      onValueChange={(value) =>
                        handleNestedConfigChange("commission_rates", "payoutSchedule", "frequency", value)
                      }
                    >
                      <SelectTrigger id="payout-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payout-day">Payout Day</Label>
                    <Select
                      value={systemConfig.commission_rates?.payoutSchedule?.payoutDay || "15"}
                      onValueChange={(value) =>
                        handleNestedConfigChange("commission_rates", "payoutSchedule", "payoutDay", value)
                      }
                    >
                      <SelectTrigger id="payout-day">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st of month</SelectItem>
                        <SelectItem value="15">15th of month</SelectItem>
                        <SelectItem value="last">Last day of month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Payouts</Label>
                      <p className="text-sm text-muted-foreground">Process payouts automatically on schedule</p>
                    </div>
                    <Switch
                      checked={systemConfig.commission_rates?.payoutSchedule?.automaticPayouts || true}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("commission_rates", "payoutSchedule", "automaticPayouts", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sustainability Settings */}
        <TabsContent value="sustainability">
          <Card>
            <CardHeader>
              <CardTitle>Sustainability Settings</CardTitle>
              <CardDescription>
                Configure carbon tracking, energy optimization, and sustainability reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Carbon Tracking</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="carbon-tracking">Carbon Footprint Tracking</Label>
                      <p className="text-sm text-muted-foreground">Track carbon emissions from ad delivery</p>
                    </div>
                    <Switch
                      id="carbon-tracking"
                      checked={systemConfig.sustainability_settings?.carbonTrackingEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "carbonTrackingEnabled", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reporting-frequency">Reporting Frequency</Label>
                    <Select
                      value={systemConfig.sustainability_settings?.reportingFrequency || "monthly"}
                      onValueChange={(value) =>
                        handleConfigChange("sustainability_settings", "reportingFrequency", value)
                      }
                    >
                      <SelectTrigger id="reporting-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Energy Optimization</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="energy-optimization">Energy Optimization</Label>
                      <p className="text-sm text-muted-foreground">Optimize device energy usage based on conditions</p>
                    </div>
                    <Switch
                      id="energy-optimization"
                      checked={systemConfig.sustainability_settings?.energyOptimizationEnabled || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "energyOptimizationEnabled", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brightness-threshold">Auto-Brightness Threshold (%)</Label>
                    <Input
                      id="brightness-threshold"
                      type="number"
                      value={systemConfig.sustainability_settings?.brightnessThreshold || 50}
                      onChange={(e) =>
                        handleConfigChange(
                          "sustainability_settings",
                          "brightnessThreshold",
                          Number.parseInt(e.target.value) || 50,
                        )
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Ambient light level to trigger brightness adjustment
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Off-Hours Power Saving</Label>
                      <p className="text-sm text-muted-foreground">Reduce power consumption during low-traffic hours</p>
                    </div>
                    <Switch
                      checked={systemConfig.sustainability_settings?.offHoursPowerSaving || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "offHoursPowerSaving", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Carbon Offset Program</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="offset-program">Carbon Offset Program</Label>
                      <p className="text-sm text-muted-foreground">Participate in carbon offset initiatives</p>
                    </div>
                    <Switch
                      id="offset-program"
                      checked={systemConfig.sustainability_settings?.offsetProgram === "enabled"}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "offsetProgram", checked ? "enabled" : "disabled")
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offset-provider">Offset Provider</Label>
                    <Select
                      value={systemConfig.sustainability_settings?.offsetProvider || "climatecare"}
                      onValueChange={(value) => handleConfigChange("sustainability_settings", "offsetProvider", value)}
                    >
                      <SelectTrigger id="offset-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="climatecare">ClimateCare</SelectItem>
                        <SelectItem value="carbonfund">Carbonfund</SelectItem>
                        <SelectItem value="terrapass">TerraPass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offset-percentage">Offset Percentage (%)</Label>
                    <Input
                      id="offset-percentage"
                      type="number"
                      value={systemConfig.sustainability_settings?.offsetPercentage || 100}
                      onChange={(e) =>
                        handleConfigChange(
                          "sustainability_settings",
                          "offsetPercentage",
                          Number.parseInt(e.target.value) || 100,
                        )
                      }
                    />
                    <p className="text-sm text-muted-foreground">Percentage of carbon footprint to offset</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sustainability Incentives</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Eco-Friendly Ad Discounts</Label>
                      <p className="text-sm text-muted-foreground">Offer discounts for eco-friendly ad campaigns</p>
                    </div>
                    <Switch
                      checked={systemConfig.sustainability_settings?.ecoFriendlyDiscounts || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "ecoFriendlyDiscounts", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eco-discount">Eco-Friendly Discount (%)</Label>
                    <Input
                      id="eco-discount"
                      type="number"
                      value={systemConfig.sustainability_settings?.ecoDiscountPercentage || 5}
                      onChange={(e) =>
                        handleConfigChange(
                          "sustainability_settings",
                          "ecoDiscountPercentage",
                          Number.parseInt(e.target.value) || 5,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Partner Energy Efficiency Bonuses</Label>
                      <p className="text-sm text-muted-foreground">
                        Reward partners for energy-efficient device operation
                      </p>
                    </div>
                    <Switch
                      checked={systemConfig.sustainability_settings?.partnerEnergyBonuses || true}
                      onCheckedChange={(checked) =>
                        handleConfigChange("sustainability_settings", "partnerEnergyBonuses", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-level settings, backups, and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Maintenance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Schedule automatic maintenance windows</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.maintenanceMode || false}
                      onCheckedChange={(checked) => handleConfigChange("system_settings", "maintenanceMode", checked)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-day">Maintenance Day</Label>
                      <Select
                        value={systemConfig.system_settings?.maintenanceDay || "sunday"}
                        onValueChange={(value) => handleConfigChange("system_settings", "maintenanceDay", value)}
                      >
                        <SelectTrigger id="maintenance-day">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-time">Maintenance Time</Label>
                      <Input
                        id="maintenance-time"
                        type="time"
                        value={systemConfig.system_settings?.maintenanceTime || "02:00"}
                        onChange={(e) => handleConfigChange("system_settings", "maintenanceTime", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-duration">Maintenance Duration (minutes)</Label>
                    <Input
                      id="maintenance-duration"
                      type="number"
                      value={systemConfig.system_settings?.maintenanceDuration || 60}
                      onChange={(e) =>
                        handleConfigChange(
                          "system_settings",
                          "maintenanceDuration",
                          Number.parseInt(e.target.value) || 60,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Backup Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Schedule regular database backups</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.automaticBackups || true}
                      onCheckedChange={(checked) => handleConfigChange("system_settings", "automaticBackups", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Backup Frequency</Label>
                    <Select
                      value={systemConfig.system_settings?.backupFrequency || "daily"}
                      onValueChange={(value) => handleConfigChange("system_settings", "backupFrequency", value)}
                    >
                      <SelectTrigger id="backup-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Backup Retention (days)</Label>
                    <Input
                      id="backup-retention"
                      type="number"
                      value={systemConfig.system_settings?.backupRetention || 30}
                      onChange={(e) =>
                        handleConfigChange("system_settings", "backupRetention", Number.parseInt(e.target.value) || 30)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-storage">Backup Storage Location</Label>
                    <Select
                      value={systemConfig.system_settings?.backupStorage || "s3"}
                      onValueChange={(value) => handleConfigChange("system_settings", "backupStorage", value)}
                    >
                      <SelectTrigger id="backup-storage">
                        <SelectValue placeholder="Select storage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                        <SelectItem value="local">Local Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Logging</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="log-level">Log Level</Label>
                    <Select
                      value={systemConfig.system_settings?.logLevel || "info"}
                      onValueChange={(value) => handleConfigChange("system_settings", "logLevel", value)}
                    >
                      <SelectTrigger id="log-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">Debug</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="log-retention">Log Retention (days)</Label>
                    <Input
                      id="log-retention"
                      type="number"
                      value={systemConfig.system_settings?.logRetention || 90}
                      onChange={(e) =>
                        handleConfigChange("system_settings", "logRetention", Number.parseInt(e.target.value) || 90)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>External Logging Service</Label>
                      <p className="text-sm text-muted-foreground">Send logs to external monitoring service</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.externalLogging || false}
                      onCheckedChange={(checked) => handleConfigChange("system_settings", "externalLogging", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="log-endpoint">Logging Service Endpoint</Label>
                    <Input
                      id="log-endpoint"
                      value={systemConfig.system_settings?.logEndpoint || "https://logs.example.com/ingest"}
                      onChange={(e) => handleConfigChange("system_settings", "logEndpoint", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Feature Flags</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>AR/VR Features</Label>
                      <p className="text-sm text-muted-foreground">Enable augmented reality ad experiences</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.featureFlags?.arVrFeatures || false}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("system_settings", "featureFlags", "arVrFeatures", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Voice Interaction</Label>
                      <p className="text-sm text-muted-foreground">Enable voice-activated ad interactions</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.featureFlags?.voiceInteraction || false}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("system_settings", "featureFlags", "voiceInteraction", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Blockchain Verification</Label>
                      <p className="text-sm text-muted-foreground">Enable blockchain-based ad delivery verification</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.featureFlags?.blockchainVerification || false}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("system_settings", "featureFlags", "blockchainVerification", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Beta Features</Label>
                      <p className="text-sm text-muted-foreground">Enable experimental features for testing</p>
                    </div>
                    <Switch
                      checked={systemConfig.system_settings?.featureFlags?.betaFeatures || false}
                      onCheckedChange={(checked) =>
                        handleNestedConfigChange("system_settings", "featureFlags", "betaFeatures", checked)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Track all changes made to system settings</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLog.length > 0 ? (
                <div className="space-y-4">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{entry.action}</p>
                        <p className="text-sm text-muted-foreground">By {entry.user}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No audit logs yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
