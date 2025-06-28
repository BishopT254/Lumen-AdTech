import { prisma } from './prisma';

/**
 * AR/Voice Interactive Ads System
 * 
 * This module provides functionality for creating, managing, and delivering
 * augmented reality (AR) and voice-interactive advertisements.
 */

// Types for AR markers
export interface ARMarker {
  id: string;
  type: 'image' | 'object' | 'location';
  value: string;
  size?: {
    width: number;
    height: number;
  };
  position?: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
}

// Types for AR content
export interface ARContent {
  id: string;
  type: '3d-model' | 'video' | 'image' | 'animation';
  url: string;
  size?: {
    width: number;
    height: number;
    depth?: number;
  };
  position?: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  animation?: {
    name: string;
    duration: number;
    loop: boolean;
  };
}

// Types for voice commands
export interface VoiceCommand {
  id: string;
  phrase: string;
  action: string;
  parameters?: Record<string, any>;
  fallbackPhrases?: string[];
  confidence?: number;
}

// Types for interactive elements
export interface InteractiveElement {
  id: string;
  type: 'button' | 'slider' | 'drag' | 'tap' | 'swipe';
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  appearance?: {
    color: string;
    opacity: number;
    text?: string;
  };
  action: string;
  parameters?: Record<string, any>;
}

// AR Ad creative configuration
export interface ARAdConfiguration {
  markers: ARMarker[];
  content: ARContent[];
  interactiveElements?: InteractiveElement[];
  trackingSettings?: {
    enableFaceTracking: boolean;
    enableHandTracking: boolean;
    enableEnvironmentTracking: boolean;
  };
  renderSettings?: {
    shadows: boolean;
    reflections: boolean;
    lighting: 'auto' | 'custom';
    customLights?: {
      type: 'ambient' | 'directional' | 'point' | 'spot';
      intensity: number;
      color: string;
      position?: {
        x: number;
        y: number;
        z: number;
      };
    }[];
  };
}

// Voice Ad creative configuration
export interface VoiceAdConfiguration {
  commands: VoiceCommand[];
  welcomeMessage?: string;
  fallbackResponse?: string;
  listeningTimeout?: number; // in seconds
  language?: string;
  voiceSettings?: {
    gender?: 'male' | 'female' | 'neutral';
    accent?: string;
    speed?: number; // 0.5-2.0
    pitch?: number; // 0.5-2.0
  };
}

// Interactive Ad Performance Metrics
export interface InteractiveAdMetrics {
  impressions: number;
  interactions: number;
  completions: number;
  abandonRate: number;
  averageInteractionTime: number;
  interactionsByType: Record<string, number>;
  conversionRate?: number;
}

export class InteractiveAdsSystem {
  /**
   * Create an AR advertisement configuration
   */
  async createARAdConfiguration(
    adCreativeId: string,
    config: ARAdConfiguration
  ): Promise<boolean> {
    try {
      // Update the ad creative with AR configuration
      await prisma.adCreative.update({
        where: { id: adCreativeId },
        data: {
          type: 'AR',
          ar_markers: config.markers,
          content: JSON.stringify({
            ar_content: config.content,
            interactive_elements: config.interactiveElements || [],
            tracking_settings: config.trackingSettings || {
              enableFaceTracking: false,
              enableHandTracking: true,
              enableEnvironmentTracking: true
            },
            render_settings: config.renderSettings || {
              shadows: true,
              reflections: false,
              lighting: 'auto'
            }
          })
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error creating AR ad configuration:', error);
      return false;
    }
  }
  
  /**
   * Create a voice-interactive advertisement configuration
   */
  async createVoiceAdConfiguration(
    adCreativeId: string,
    config: VoiceAdConfiguration
  ): Promise<boolean> {
    try {
      // Update the ad creative with voice configuration
      await prisma.adCreative.update({
        where: { id: adCreativeId },
        data: {
          type: 'VOICE',
          voiceCommands: config.commands,
          content: JSON.stringify({
            welcome_message: config.welcomeMessage || 'Hello! I can help you learn more about this product.',
            fallback_response: config.fallbackResponse || 'I\'m sorry, I didn\'t understand that. Can you try again?',
            listening_timeout: config.listeningTimeout || 10,
            language: config.language || 'en-US',
            voice_settings: config.voiceSettings || {
              gender: 'neutral',
              speed: 1.0,
              pitch: 1.0
            }
          })
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error creating voice ad configuration:', error);
      return false;
    }
  }
  
  /**
   * Process and validate AR markers for an ad
   */
  async validateARMarkers(markers: ARMarker[]): Promise<{
    valid: boolean;
    invalidMarkers: string[];
    suggestions: string[];
  }> {
    try {
      const invalidMarkers: string[] = [];
      const suggestions: string[] = [];
      
      // Check each marker for validity
      for (const marker of markers) {
        if (!marker.id || !marker.type || !marker.value) {
          invalidMarkers.push(marker.id || 'unknown');
          suggestions.push(`Marker ${marker.id || 'unknown'} is missing required fields (id, type, value)`);
          continue;
        }
        
        // Validate by marker type
        switch (marker.type) {
          case 'image':
            // Check if the image URL is valid and accessible
            if (!marker.value.match(/^https?:\/\/.+/)) {
              invalidMarkers.push(marker.id);
              suggestions.push(`Marker ${marker.id} has an invalid image URL`);
            }
            break;
            
          case 'object':
            // Object markers should have position information
            if (!marker.position) {
              invalidMarkers.push(marker.id);
              suggestions.push(`Marker ${marker.id} is an object marker but missing position information`);
            }
            break;
            
          case 'location':
            // Location should be in format "lat,lng"
            if (!marker.value.match(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)) {
              invalidMarkers.push(marker.id);
              suggestions.push(`Marker ${marker.id} has an invalid location format. Use "latitude,longitude"`);
            }
            break;
            
          default:
            invalidMarkers.push(marker.id);
            suggestions.push(`Marker ${marker.id} has an unsupported type: ${marker.type}`);
        }
      }
      
      return {
        valid: invalidMarkers.length === 0,
        invalidMarkers,
        suggestions
      };
    } catch (error) {
      console.error('Error validating AR markers:', error);
      return {
        valid: false,
        invalidMarkers: ['all'],
        suggestions: ['An error occurred during validation: ' + String(error)]
      };
    }
  }
  
  /**
   * Process and validate voice commands for an ad
   */
  async validateVoiceCommands(commands: VoiceCommand[]): Promise<{
    valid: boolean;
    invalidCommands: string[];
    suggestions: string[];
  }> {
    try {
      const invalidCommands: string[] = [];
      const suggestions: string[] = [];
      
      // Check for duplicates
      const phrases = commands.map(cmd => cmd.phrase.toLowerCase());
      const uniquePhrases = new Set(phrases);
      
      if (phrases.length !== uniquePhrases.size) {
        suggestions.push('There are duplicate voice command phrases. Each command should have a unique phrase.');
      }
      
      // Check each command for validity
      for (const command of commands) {
        if (!command.id || !command.phrase || !command.action) {
          invalidCommands.push(command.id || 'unknown');
          suggestions.push(`Command ${command.id || 'unknown'} is missing required fields (id, phrase, action)`);
          continue;
        }
        
        // Check phrase length (should be reasonably short for voice recognition)
        if (command.phrase.split(' ').length > 10) {
          invalidCommands.push(command.id);
          suggestions.push(`Command phrase "${command.phrase}" is too long. Keep phrases under 10 words for better recognition.`);
        }
        
        // Validate action
        const validActions = ['show_info', 'open_url', 'play_video', 'add_to_cart', 'contact_sales', 'navigate'];
        if (!validActions.includes(command.action)) {
          invalidCommands.push(command.id);
          suggestions.push(`Command ${command.id} has an unsupported action: ${command.action}. Valid actions are: ${validActions.join(', ')}`);
        }
        
        // Validate action parameters
        if (command.action === 'open_url' && (!command.parameters || !command.parameters.url)) {
          invalidCommands.push(command.id);
          suggestions.push(`Command ${command.id} with action 'open_url' is missing the required url parameter`);
        }
      }
      
      return {
        valid: invalidCommands.length === 0,
        invalidCommands,
        suggestions
      };
    } catch (error) {
      console.error('Error validating voice commands:', error);
      return {
        valid: false,
        invalidCommands: ['all'],
        suggestions: ['An error occurred during validation: ' + String(error)]
      };
    }
  }
  
  /**
   * Track interaction with an interactive ad
   */
  async trackInteraction(
    adDeliveryId: string,
    interactionType: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // Get the ad delivery
      const adDelivery = await prisma.adDelivery.findUnique({
        where: { id: adDeliveryId },
        include: {
          campaign: true,
          adCreative: true
        }
      });
      
      if (!adDelivery) {
        throw new Error(`Ad delivery with ID ${adDeliveryId} not found`);
      }
      
      // Track the interaction
      await prisma.adInteraction.create({
        data: {
          adDeliveryId,
          adCreativeId: adDelivery.adCreativeId,
          campaignId: adDelivery.campaignId,
          interactionType,
          timestamp: new Date(),
          durationMs: details?.durationMs || 0,
          metadata: details || {}
        }
      });
      
      // Update engagement count for the ad delivery
      await prisma.adDelivery.update({
        where: { id: adDeliveryId },
        data: {
          engagements: {
            increment: 1
          }
        }
      });
      
      // Update campaign analytics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await prisma.campaignAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: adDelivery.campaignId,
            date: today
          }
        },
        update: {
          engagements: { increment: 1 },
          interactionMetrics: {
            // Increment the count for this interaction type
            [interactionType]: { increment: 1 }
          }
        },
        create: {
          campaignId: adDelivery.campaignId,
          date: today,
          impressions: 1,
          engagements: 1,
          conversions: 0,
          ctr: 1.0,
          conversionRate: 0,
          interactionMetrics: {
            [interactionType]: 1
          }
        }
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }
  
  /**
   * Generate AR scene configuration for a specific device
   */
  async generateARSceneConfig(
    adCreativeId: string,
    deviceType: string
  ): Promise<any> {
    try {
      // Fetch the ad creative with AR configuration
      const adCreative = await prisma.adCreative.findUnique({
        where: { id: adCreativeId }
      });
      
      if (!adCreative) {
        throw new Error(`Ad creative with ID ${adCreativeId} not found`);
      }
      
      if (adCreative.type !== 'AR') {
        throw new Error(`Ad creative with ID ${adCreativeId} is not an AR ad`);
      }
      
      // Parse the content
      const content = JSON.parse(adCreative.content);
      const markers = adCreative.ar_markers as ARMarker[];
      
      // Optimize configuration based on device type
      const optimizedConfig = this.optimizeARConfigForDevice(
        markers,
        content,
        deviceType
      );
      
      return {
        markers: optimizedConfig.markers,
        content: optimizedConfig.content,
        interactive_elements: optimizedConfig.interactiveElements,
        tracking_settings: optimizedConfig.trackingSettings,
        render_settings: optimizedConfig.renderSettings
      };
    } catch (error) {
      console.error('Error generating AR scene config:', error);
      return null;
    }
  }
  
  /**
   * Optimize AR configuration for a specific device type
   */
  private optimizeARConfigForDevice(
    markers: ARMarker[],
    content: any,
    deviceType: string
  ): {
    markers: ARMarker[];
    content: ARContent[];
    interactiveElements: InteractiveElement[];
    trackingSettings: any;
    renderSettings: any;
  } {
    const arContent = content.ar_content as ARContent[];
    const interactiveElements = content.interactive_elements as InteractiveElement[];
    const trackingSettings = content.tracking_settings;
    const renderSettings = content.render_settings;
    
    // Apply device-specific optimizations
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        // Reduce complexity for mobile devices
        return {
          markers,
          content: arContent.map(item => ({
            ...item,
            // Reduce model complexity or video quality if appropriate
            scale: item.scale ? {
              x: item.scale.x * 0.8,
              y: item.scale.y * 0.8,
              z: item.scale.z * 0.8
            } : undefined
          })),
          interactiveElements,
          trackingSettings: {
            ...trackingSettings,
            enableFaceTracking: false, // Disable face tracking to save resources
            enableEnvironmentTracking: true
          },
          renderSettings: {
            ...renderSettings,
            shadows: false, // Disable shadows to improve performance
            reflections: false,
            lighting: 'auto'
          }
        };
        
      case 'tablet':
        // Moderate optimizations for tablets
        return {
          markers,
          content: arContent,
          interactiveElements,
          trackingSettings,
          renderSettings: {
            ...renderSettings,
            shadows: true,
            reflections: false
          }
        };
        
      case 'desktop':
      case 'ar_headset':
        // Full quality for powerful devices
        return {
          markers,
          content: arContent,
          interactiveElements,
          trackingSettings,
          renderSettings
        };
        
      default:
        // Default to mobile optimizations
        return {
          markers,
          content: arContent,
          interactiveElements,
          trackingSettings: {
            ...trackingSettings,
            enableFaceTracking: false,
            enableEnvironmentTracking: true
          },
          renderSettings: {
            ...renderSettings,
            shadows: false,
            reflections: false,
            lighting: 'auto'
          }
        };
    }
  }
  
  /**
   * Generate voice interaction configuration for a specific device
   */
  async generateVoiceInteractionConfig(
    adCreativeId: string,
    languagePreference?: string
  ): Promise<any> {
    try {
      // Fetch the ad creative with voice configuration
      const adCreative = await prisma.adCreative.findUnique({
        where: { id: adCreativeId }
      });
      
      if (!adCreative) {
        throw new Error(`Ad creative with ID ${adCreativeId} not found`);
      }
      
      if (adCreative.type !== 'VOICE') {
        throw new Error(`Ad creative with ID ${adCreativeId} is not a voice-interactive ad`);
      }
      
      // Parse the content
      const content = JSON.parse(adCreative.content);
      const commands = adCreative.voiceCommands as VoiceCommand[];
      
      // Apply language preference if specified
      const language = languagePreference || content.language || 'en-US';
      
      return {
        commands,
        welcome_message: content.welcome_message,
        fallback_response: content.fallback_response,
        listening_timeout: content.listening_timeout,
        language,
        voice_settings: content.voice_settings
      };
    } catch (error) {
      console.error('Error generating voice interaction config:', error);
      return null;
    }
  }
  
  /**
   * Get interactive ad performance metrics
   */
  async getInteractiveAdMetrics(
    campaignId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<InteractiveAdMetrics> {
    try {
      // Set default date range to last 30 days if not specified
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Get all ad deliveries for the campaign in the date range
      const adDeliveries = await prisma.adDelivery.findMany({
        where: {
          campaignId,
          scheduledTime: {
            gte: start,
            lte: end
          }
        },
        include: {
          interactions: true
        }
      });
      
      if (adDeliveries.length === 0) {
        return {
          impressions: 0,
          interactions: 0,
          completions: 0,
          abandonRate: 0,
          averageInteractionTime: 0,
          interactionsByType: {}
        };
      }
      
      // Calculate metrics
      let totalImpressions = 0;
      let totalInteractions = 0;
      let totalCompletions = 0;
      let totalInteractionTime = 0;
      const interactionsByType: Record<string, number> = {};
      
      for (const delivery of adDeliveries) {
        totalImpressions += delivery.impressions || 0;
        
        for (const interaction of delivery.interactions) {
          totalInteractions++;
          
          // Track interaction by type
          const type = interaction.interactionType;
          interactionsByType[type] = (interactionsByType[type] || 0) + 1;
          
          // Add to total interaction time
          totalInteractionTime += interaction.durationMs || 0;
          
          // Count completions (interactions of type 'completion' or 'conversion')
          if (type === 'completion' || type === 'conversion') {
            totalCompletions++;
          }
        }
      }
      
      // Calculate derived metrics
      const averageInteractionTime = totalInteractions > 0 ? totalInteractionTime / totalInteractions : 0;
      const abandonRate = totalInteractions > 0 ? 1 - (totalCompletions / totalInteractions) : 0;
      const conversionRate = totalImpressions > 0 ? totalCompletions / totalImpressions : 0;
      
      return {
        impressions: totalImpressions,
        interactions: totalInteractions,
        completions: totalCompletions,
        abandonRate,
        averageInteractionTime,
        interactionsByType,
        conversionRate
      };
    } catch (error) {
      console.error('Error getting interactive ad metrics:', error);
      return {
        impressions: 0,
        interactions: 0,
        completions: 0,
        abandonRate: 0,
        averageInteractionTime: 0,
        interactionsByType: {}
      };
    }
  }
}

// Export singleton instance
export const interactiveAds = new InteractiveAdsSystem(); 