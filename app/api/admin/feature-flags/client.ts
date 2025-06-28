/**
 * Client utility functions for interacting with the feature flags API
 */

/**
 * Fetch all feature flags
 */
export async function getFeatureFlags() {
  const response = await fetch("/api/admin/feature-flags")

  if (!response.ok) {
    throw new Error("Failed to fetch feature flags")
  }

  return response.json()
}

/**
 * Create or update a feature flag
 */
export async function saveFeatureFlag(featureFlag: {
  name: string
  description?: string
  enabled?: boolean
  percentage?: number | null
  conditions?: any | null
}) {
  const response = await fetch("/api/admin/feature-flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(featureFlag),
  })

  if (!response.ok) {
    throw new Error("Failed to save feature flag")
  }

  return response.json()
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(name: string) {
  const response = await fetch(`/api/admin/feature-flags?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete feature flag")
  }

  return response.json()
}

/**
 * Check if a feature flag is enabled
 * This can be used on the client side to conditionally render features
 */
export async function isFeatureEnabled(name: string) {
  try {
    const response = await fetch(`/api/features/check?name=${encodeURIComponent(name)}`)

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.enabled
  } catch (error) {
    console.error("Error checking feature flag:", error)
    return false
  }
}
