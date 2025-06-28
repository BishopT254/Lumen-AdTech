'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

// Types for settings
export type GeneralSettings = {
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultLanguage: string;
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: string;
  darkModeDefault: boolean;
  interfaceAnimations: boolean;
  interfaceDensity: number;
};

export type SystemConfig = {
  general_settings?: GeneralSettings;
  payment_gateway?: any;
  analytics_settings?: any;
  notification_settings?: any;
  commission_rates?: any;
  security_settings?: any;
  ai_settings?: any;
  sustainability_settings?: any;
  [key: string]: any;
};

// State management for system settings
type SettingsState = {
  configs: SystemConfig;
  loading: boolean;
  error: string | null;
  hasChanges: boolean;
};

// Local storage key for caching settings
const LOCAL_STORAGE_KEY = 'lumen-system-settings';
const LOCAL_STORAGE_TIMESTAMP_KEY = 'lumen-system-settings-timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for accessing and managing system settings
 * @param options Configuration options for the hook
 * @returns A set of values and functions for working with system settings
 */
export function useSystemSettings(options: {
  includeKeys?: string[];
  skipCache?: boolean;
} = {}) {
  const { includeKeys, skipCache = false } = options;

  const [state, setState] = useState<SettingsState>({
    configs: {},
    loading: true,
    error: null,
    hasChanges: false,
  });

  // Function to fetch system settings from API
  const fetchSettings = useCallback(
    async (forceRefresh = false) => {
      // Try to get from local storage first if not skipping cache
      if (!forceRefresh && !skipCache) {
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
        // Build URL with query parameters
        let url = '/api/admin/settings';
        const params = new URLSearchParams();
        
        if (skipCache) {
          params.append('skipCache', 'true');
        }
        
        if (includeKeys && includeKeys.length > 0) {
          params.append('keys', includeKeys.join(','));
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        
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
          hasChanges: false,
        }));
      } catch (error) {
        console.error('Error fetching system settings:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        }));
      }
    },
    [includeKeys, skipCache]
  );

  // Function to update system settings
  const updateSettings = useCallback(
    async (configKey: string, value: any, description?: string) => {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configKey,
            configValue: value,
            description,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error updating settings: ${response.statusText}`);
        }
        
        await response.json();
        
        // Update local state
        setState((prev) => ({
          ...prev,
          configs: {
            ...prev.configs,
            [configKey]: { value, description },
          },
          hasChanges: false,
        }));
        
        // Invalidate cache
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
        
        // Refetch to get updated data
        fetchSettings(true);
        
        return true;
      } catch (error) {
        console.error(`Error updating ${configKey}:`, error);
        toast.error("Error updating settings", {
          description: error instanceof Error ? error.message : 'An unknown error occurred'
        });
        return false;
      }
    },
    [fetchSettings]
  );

  // Function to update multiple settings at once
  const updateMultipleSettings = useCallback(
    async (updates: Record<string, { value: any; description?: string }>) => {
      try {
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          throw new Error(`Error updating settings: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Invalidate cache
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);
        
        // Refetch to get updated data
        fetchSettings(true);
        
        return result;
      } catch (error) {
        console.error('Error updating multiple settings:', error);
        toast.error("Error updating settings", {
          description: error instanceof Error ? error.message : 'An unknown error occurred'
        });
        return { success: false, error };
      }
    },
    [fetchSettings]
  );

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Extract general settings as a convenience
  const generalSettings = useMemo(
    () => (state.configs.general_settings ? state.configs.general_settings.value || state.configs.general_settings : null) as GeneralSettings | null,
    [state.configs.general_settings]
  );

  // Mark settings as changed
  const setHasChanges = useCallback((hasChanges: boolean) => {
    setState((prev) => ({ ...prev, hasChanges }));
  }, []);

  // Reset any pending changes
  const resetChanges = useCallback(() => {
    fetchSettings(true);
  }, [fetchSettings]);

  return {
    // State
    configs: state.configs,
    loading: state.loading,
    error: state.error,
    hasChanges: state.hasChanges,
    
    // Settings shortcuts
    generalSettings,
    
    // Actions
    fetchSettings,
    updateSettings,
    updateMultipleSettings,
    setHasChanges,
    resetChanges,
  };
} 