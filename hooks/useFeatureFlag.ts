import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Hook for checking if a feature flag is enabled
 * 
 * @param flagName - The name of the feature flag to check
 * @param defaultValue - The default value to use if the flag isn't found (defaults to false)
 * @returns Boolean indicating if the feature is enabled
 */
export function useFeatureFlag(flagName: string, defaultValue: boolean = false): boolean {
  const { data: session } = useSession();
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const checkFeatureFlag = async () => {
      if (!session) {
        setIsEnabled(defaultValue);
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/admin/feature-flags?name=${encodeURIComponent(flagName)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch feature flag: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.flags && data.flags.length > 0) {
          const flag = data.flags[0];
          
          // Check if the flag is enabled
          if (!flag.enabled) {
            setIsEnabled(false);
            setIsLoading(false);
            return;
          }
          
          // If there's a percentage rollout, check if the user is in the percentage
          if (flag.percentage !== null && typeof flag.percentage === 'number') {
            // Generate a hash from the user ID or email for consistent experience
            const userIdentifier = session?.user?.id || session?.user?.email || '';
            const hash = simpleHash(flagName + userIdentifier);
            const normalizedHash = (hash % 100) + 1; // 1-100
            setIsEnabled(normalizedHash <= flag.percentage);
            setIsLoading(false);
            return;
          }
          
          // If there are conditions, evaluate them (simplified implementation)
          if (flag.conditions) {
            // This is a simplified example - in a real app, you'd have more complex condition logic
            const conditions = flag.conditions as { [key: string]: any };
            
            // Example condition: check user role
            if (conditions.roles && Array.isArray(conditions.roles)) {
              const userRole = session?.user?.role;
              setIsEnabled(userRole ? conditions.roles.includes(userRole) : false);
              setIsLoading(false);
              return;
            }
          }
          
          // If no special rules, the flag is enabled
          setIsEnabled(true);
        } else {
          // Flag not found, use default
          setIsEnabled(defaultValue);
        }
      } catch (err) {
        console.error("Error fetching feature flag:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsEnabled(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkFeatureFlag();
  }, [flagName, defaultValue, session]);
  
  return isEnabled;
}

/**
 * A simple hash function for deterministic percentage rollouts
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Hook for checking multiple feature flags at once
 * 
 * @param flagNames - Array of feature flag names to check
 * @param defaultValues - Object with default values for each flag
 * @returns Object with the enabled status of each flag
 */
export function useFeatureFlags(
  flagNames: string[],
  defaultValues: { [key: string]: boolean } = {}
): { [key: string]: boolean } {
  const { data: session } = useSession();
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkFeatureFlags = async () => {
      if (!session || flagNames.length === 0) {
        const defaults = flagNames.reduce((acc, flagName) => {
          acc[flagName] = defaultValues[flagName] || false;
          return acc;
        }, {} as { [key: string]: boolean });
        
        setFlags(defaults);
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch all flags in a single request
        const params = new URLSearchParams();
        flagNames.forEach(flagName => {
          params.append('name', flagName);
        });
        
        const response = await fetch(`/api/admin/feature-flags?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
        }
        
        const data = await response.json();
        const enabledFlags = data.flags.reduce((acc: { [key: string]: boolean }, flag: any) => {
          acc[flag.name] = flag.enabled;
          return acc;
        }, {});
        
        // Apply defaults for missing flags
        const result = flagNames.reduce((acc, flagName) => {
          acc[flagName] = enabledFlags[flagName] !== undefined
            ? enabledFlags[flagName]
            : (defaultValues[flagName] || false);
          return acc;
        }, {} as { [key: string]: boolean });
        
        setFlags(result);
      } catch (err) {
        console.error("Error fetching feature flags:", err);
        // Use defaults on error
        const defaults = flagNames.reduce((acc, flagName) => {
          acc[flagName] = defaultValues[flagName] || false;
          return acc;
        }, {} as { [key: string]: boolean });
        
        setFlags(defaults);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkFeatureFlags();
  }, [flagNames, defaultValues, session]);
  
  return flags;
} 