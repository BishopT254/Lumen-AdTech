'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Types for settings
export type GeneralSettings = {
  // Core properties (camelCase)
  platformName?: string;
  platformUrl?: string;
  supportEmail?: string;
  defaultTimezone?: string;
  defaultLanguage?: string;
  defaultCurrency?: string;
  dateFormat?: string;
  timeFormat?: string;
  darkModeDefault?: boolean;
  interfaceAnimations?: boolean;
  interfaceDensity?: string | number;

  // Backward compatibility for snake_case used in forms
  platform_name?: string;
  platform_url?: string;
  support_email?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  date_format?: string;
  time_format?: string;
  dark_mode_default?: boolean;
  interface_animations?: boolean;
  interface_density?: string | number;
};

export type PaymentGateway = {
  // Core properties (camelCase)
  provider: string;
  supportedCurrencies: string[];
  paymentTerms?: string | number;
  billingCycle?: string;
  sendReminders?: boolean;
  reminderDays?: number[];
  invoicePrefix?: string;
  taxRate?: number;

  // Backward compatibility for snake_case used in forms
  api_key?: string;
  webhook_secret?: string;
  test_mode?: boolean;
  payment_terms?: string;
  mpesa_enabled?: boolean;
  mpesa_api_key?: string;
  mpesa_api_secret?: string;
  flutterwave_enabled?: boolean;
  flutterwave_api_key?: string;
};

export type CommissionRates = {
  // Core properties (camelCase)
  standardRate?: number;
  premiumRate?: number;
  enterpriseRate?: number;
  minimumPayout?: number;
  currency?: string;
  performanceBonuses?: {
    enabled: boolean;
    engagementBonus: number;
    retentionBonus: number;
  };
  payoutSchedule?: {
    frequency: string;
    payoutDay: string;
    automaticPayouts: boolean;
  };

  // Backward compatibility for legacy and form properties
  default?: number;
  premium?: number;
  enterprise?: number;
  standard_rate?: number;
  premium_rate?: number;
  minimum_payout?: number;
};

export type SustainabilitySettings = {
  // Core properties (camelCase)
  carbonTrackingEnabled: boolean;
  reportingFrequency: string;
  energyOptimizationEnabled: boolean;
  brightnessThreshold?: number;
  offHoursPowerSaving?: boolean;
  offsetProgram: string;
  offsetProvider?: string;
  offsetPercentage?: number;
  ecoFriendlyDiscounts?: boolean;
  ecoDiscountPercentage?: number;
  partnerEnergyBonuses?: boolean;
};

export type SystemSettings = {
  // Core properties (camelCase)
  maintenanceMode: boolean;
  maintenanceDay?: string;
  maintenanceTime?: string;
  maintenanceDuration?: number;
  automaticBackups?: boolean;
  backupFrequency?: string;
  backupRetention?: number;
  backupStorage?: string;
  logLevel?: string;
  logRetention?: number;
  externalLogging?: boolean;
  logEndpoint?: string;
  errorReporting?: boolean;
  debugMode?: boolean;
  featureFlags?: {
    arVrFeatures: boolean;
    voiceInteraction: boolean;
    blockchainVerification: boolean;
    betaFeatures: boolean;
  };

  // Backward compatibility
  autoBackup?: boolean;
};

export type PublicSystemConfig = {
  // Core properties (camelCase)
  generalSettings?: GeneralSettings;
  paymentGateway?: PaymentGateway;
  commissionRates?: CommissionRates;
  sustainabilitySettings?: SustainabilitySettings;
  systemSettings?: SystemSettings;
  lastUpdated?: string;

  // Backward compatibility for snake_case used in the current implementation
  general_settings?: GeneralSettings;
  payment_gateway?: PaymentGateway;
  commission_rates?: CommissionRates;
  sustainability_settings?: SustainabilitySettings;
  system_settings?: SystemSettings;
  last_updated?: string;
  
  // Allow any other properties
  [key: string]: any;
};

// State management for system settings
type SettingsState = {
  configs: PublicSystemConfig;
  loading: boolean;
  error: string | null;
};

// Local storage key for caching settings
const LOCAL_STORAGE_KEY = 'lumen-public-settings';
const LOCAL_STORAGE_TIMESTAMP_KEY = 'lumen-public-settings-timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for accessing public system settings in the advertiser dashboard
 * @returns A set of values and functions for working with public system settings
 */
export function usePublicSettings() {
  const [state, setState] = useState<SettingsState>({
    configs: {},
    loading: true,
    error: null,
  });

  // Function to fetch system settings from API
  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // Try to get from local storage first if not forcing refresh
    if (!forceRefresh) {
      try {
        const cachedSettingsJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        const cachedTimestamp = localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
        
        if (cachedSettingsJSON && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // Check if cache is still fresh
          if (now - timestamp < CACHE_DURATION) {
            const cachedSettings = JSON.parse(cachedSettingsJSON);
            setState((prev) => ({
              ...prev,
              configs: cachedSettings,
              loading: false,
            }));
            return;
          }
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        // Continue to fetch from API if localStorage fails
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      // Public API endpoint for non-sensitive settings
      const response = await fetch('/api/public/settings');
      
      if (!response.ok) {
        throw new Error(`Error fetching settings: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Save to local storage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
      
      setState((prev) => ({
        ...prev,
        configs: data,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error fetching public system settings:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, []);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Extract common settings as a convenience
  const generalSettings = useMemo(
    () => (state.configs.general_settings || state.configs.generalSettings || null) as GeneralSettings | null,
    [state.configs.general_settings, state.configs.generalSettings]
  );

  const paymentGateway = useMemo(
    () => (state.configs.payment_gateway || state.configs.paymentGateway || null) as PaymentGateway | null,
    [state.configs.payment_gateway, state.configs.paymentGateway]
  );

  const commissionRates = useMemo(
    () => (state.configs.commission_rates || state.configs.commissionRates || null) as CommissionRates | null,
    [state.configs.commission_rates, state.configs.commissionRates]
  );

  const sustainabilitySettings = useMemo(
    () => (state.configs.sustainability_settings || state.configs.sustainabilitySettings || null) as SustainabilitySettings | null,
    [state.configs.sustainability_settings, state.configs.sustainabilitySettings]
  );

  const systemSettings = useMemo(
    () => (state.configs.system_settings || state.configs.systemSettings || null) as SystemSettings | null,
    [state.configs.system_settings, state.configs.systemSettings]
  );

  return {
    // State
    configs: state.configs,
    loading: state.loading,
    error: state.error,
    
    // Settings shortcuts
    generalSettings,
    paymentGateway,
    commissionRates,
    sustainabilitySettings,
    systemSettings,
    
    // Actions
    fetchSettings,
  };
} 