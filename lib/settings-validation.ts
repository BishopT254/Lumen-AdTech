/**
 * Validation schemas for system settings
 * 
 * These schemas help enforce data integrity and provide validation rules
 * for the system configuration settings.
 */

export const validationSchemas = {
  // General settings schema
  general_settings: {
    type: "object",
    required: [
      "platformName", 
      "platformUrl", 
      "supportEmail", 
      "defaultTimezone", 
      "defaultLanguage", 
      "defaultCurrency"
    ],
    properties: {
      platformName: {
        type: "string",
        minLength: 1,
        maxLength: 100
      },
      platformUrl: {
        type: "string",
        format: "uri"
      },
      supportEmail: {
        type: "string",
        format: "email"
      },
      defaultTimezone: {
        type: "string"
      },
      defaultLanguage: {
        type: "string",
        enum: ["en", "fr", "es", "sw"]
      },
      defaultCurrency: {
        type: "string",
        enum: ["USD", "EUR", "GBP", "KES"]
      },
      dateFormat: {
        type: "string",
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]
      },
      timeFormat: {
        type: "string",
        enum: ["12h", "24h"]
      },
      darkModeDefault: {
        type: "boolean"
      },
      interfaceAnimations: {
        type: "boolean"
      },
      interfaceDensity: {
        type: "number",
        minimum: 0,
        maximum: 3
      }
    }
  },

  // Payment gateway schema
  payment_gateway: {
    type: "object",
    required: ["provider", "apiKey", "supportedCurrencies"],
    properties: {
      provider: {
        type: "string",
        enum: ["stripe", "mpesa", "flutterwave", "paypal"]
      },
      apiKey: {
        type: "string",
        minLength: 1
      },
      webhookSecret: {
        type: "string"
      },
      supportedCurrencies: {
        type: "array",
        items: {
          type: "string",
          minLength: 3,
          maxLength: 3
        },
        minItems: 1
      },
      testMode: {
        type: "boolean"
      }
    }
  },

  // Security settings schema
  security_settings: {
    type: "object",
    required: ["passwordPolicy", "sessionTimeout"],
    properties: {
      mfaRequired: {
        type: "boolean"
      },
      passwordPolicy: {
        type: "object",
        required: ["minLength"],
        properties: {
          minLength: {
            type: "number",
            minimum: 8,
            maximum: 128
          },
          requireUppercase: {
            type: "boolean"
          },
          requireLowercase: {
            type: "boolean"
          },
          requireNumbers: {
            type: "boolean"
          },
          requireSpecialChars: {
            type: "boolean"
          },
          expiryDays: {
            type: "number",
            minimum: 0
          }
        }
      },
      sessionTimeout: {
        type: "number",
        minimum: 1,
        maximum: 1440 // Max 24 hours in minutes
      },
      ipWhitelist: {
        type: "array",
        items: {
          type: "string",
          // IP address pattern (IPv4 or IPv6)
          pattern: "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$"
        }
      }
    }
  },

  // Notification settings schema
  notification_settings: {
    type: "object",
    properties: {
      emailEnabled: {
        type: "boolean"
      },
      smsEnabled: {
        type: "boolean"
      },
      pushEnabled: {
        type: "boolean"
      },
      defaultTemplates: {
        type: "object",
        properties: {
          campaignApproval: {
            type: "string"
          },
          paymentConfirmation: {
            type: "string"
          },
          lowBudgetAlert: {
            type: "string"
          }
        }
      }
    }
  },

  // Analytics settings schema
  analytics_settings: {
    type: "object",
    required: ["dataRetentionDays", "samplingRate"],
    properties: {
      dataRetentionDays: {
        type: "number",
        minimum: 1,
        maximum: 3650 // 10 years max
      },
      anonymizeData: {
        type: "boolean"
      },
      realTimeEnabled: {
        type: "boolean"
      },
      samplingRate: {
        type: "number",
        minimum: 1,
        maximum: 100
      },
      exportFormats: {
        type: "array",
        items: {
          type: "string",
          enum: ["CSV", "JSON", "Excel", "PDF"]
        }
      }
    }
  },

  // AI settings schema
  ai_settings: {
    type: "object",
    properties: {
      emotionDetectionEnabled: {
        type: "boolean"
      },
      audienceEstimationEnabled: {
        type: "boolean"
      },
      privacyLevel: {
        type: "string",
        enum: ["low", "medium", "high"]
      },
      modelUpdateFrequency: {
        type: "string",
        enum: ["daily", "weekly", "monthly", "quarterly"]
      },
      edgeProcessingEnabled: {
        type: "boolean"
      }
    }
  },

  // Commission rates schema
  commission_rates: {
    type: "object",
    required: ["default", "minimumPayout"],
    properties: {
      default: {
        type: "number",
        minimum: 0,
        maximum: 100
      },
      premium: {
        type: "number",
        minimum: 0,
        maximum: 100
      },
      enterprise: {
        type: "number",
        minimum: 0,
        maximum: 100
      },
      minimumPayout: {
        type: "number",
        minimum: 0
      }
    }
  },

  // Sustainability settings schema
  sustainability_settings: {
    type: "object",
    properties: {
      carbonTrackingEnabled: {
        type: "boolean"
      },
      energyOptimizationEnabled: {
        type: "boolean"
      },
      reportingFrequency: {
        type: "string",
        enum: ["weekly", "monthly", "quarterly"]
      },
      offsetProgram: {
        type: "string",
        enum: ["enabled", "disabled"]
      }
    }
  }
};

/**
 * Validate a configuration value against its schema
 * @param configKey The configuration key
 * @param value The configuration value to validate
 * @returns An object with validation result and errors if any
 */
export function validateConfig(configKey: string, value: any): { 
  isValid: boolean; 
  errors?: string[] 
} {
  const schema = validationSchemas[configKey as keyof typeof validationSchemas];
  
  if (!schema) {
    // If no schema is defined, consider it valid
    return { isValid: true };
  }

  // For a production app, use a proper JSON Schema validator library
  // This is a simplified validation for demonstration
  try {
    const errors: string[] = [];

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (value[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Validate property types and constraints
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propValue = value[key];
        
        // Skip undefined values (unless required, which is checked above)
        if (propValue === undefined) continue;
        
        // Type checking
        if (propSchema.type === 'string' && typeof propValue !== 'string') {
          errors.push(`Field "${key}" should be a string`);
        } else if (propSchema.type === 'number' && typeof propValue !== 'number') {
          errors.push(`Field "${key}" should be a number`);
        } else if (propSchema.type === 'boolean' && typeof propValue !== 'boolean') {
          errors.push(`Field "${key}" should be a boolean`);
        } else if (propSchema.type === 'array' && !Array.isArray(propValue)) {
          errors.push(`Field "${key}" should be an array`);
        } else if (propSchema.type === 'object' && (typeof propValue !== 'object' || propValue === null)) {
          errors.push(`Field "${key}" should be an object`);
        }

        // String validations
        if (propSchema.type === 'string' && typeof propValue === 'string') {
          if (propSchema.minLength !== undefined && propValue.length < propSchema.minLength) {
            errors.push(`Field "${key}" should be at least ${propSchema.minLength} characters`);
          }
          if (propSchema.maxLength !== undefined && propValue.length > propSchema.maxLength) {
            errors.push(`Field "${key}" should be at most ${propSchema.maxLength} characters`);
          }
          if (propSchema.enum && !propSchema.enum.includes(propValue)) {
            errors.push(`Field "${key}" should be one of: ${propSchema.enum.join(', ')}`);
          }
        }

        // Number validations
        if (propSchema.type === 'number' && typeof propValue === 'number') {
          if (propSchema.minimum !== undefined && propValue < propSchema.minimum) {
            errors.push(`Field "${key}" should be at least ${propSchema.minimum}`);
          }
          if (propSchema.maximum !== undefined && propValue > propSchema.maximum) {
            errors.push(`Field "${key}" should be at most ${propSchema.maximum}`);
          }
        }

        // Array validations
        if (propSchema.type === 'array' && Array.isArray(propValue)) {
          if (propSchema.minItems !== undefined && propValue.length < propSchema.minItems) {
            errors.push(`Field "${key}" should have at least ${propSchema.minItems} items`);
          }
        }
      }
    }

    return { 
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { 
      isValid: false,
      errors: ['Validation failed due to an error'] 
    };
  }
} 