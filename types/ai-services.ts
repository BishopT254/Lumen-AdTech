/**
 * Type definitions for AI services
 */

// AI recommendation types
export interface AiRecommendation {
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: 'targeting' | 'budget' | 'creative' | 'schedule' | 'general';
}

export interface AiInsight {
  title: string;
  description: string;
  data?: Record<string, any>;
}

export interface AiSuggestions {
  items: string[];
  generatedAt: string;
}

// Campaign recommendations
export interface CampaignRecommendations {
  insights: AiInsight[];
  recommendations: AiRecommendation[];
}

// Audience-related types
export interface AudienceRecommendation {
  segmentId: string;
  segmentName: string;
  recommendationType: 'increase' | 'decrease' | 'maintain' | 'explore';
  confidence: number;
  reasoning: string;
}

export interface AudienceRecommendations {
  recommendations: AudienceRecommendation[];
  metrics: {
    currentReach: number;
    potentialReach: number;
    costEfficiency: number;
  };
}

// Emotion-related recommendations
export interface EmotionTargetingRecommendation {
  emotion: string;
  action: 'target' | 'avoid' | 'neutral';
  confidence: number;
  reasoning: string;
  supportingData?: {
    engagementRate?: number;
    conversionRate?: number;
    sampleSize?: number;
  };
}

export interface EmotionTargetingRecommendations {
  recommendations: EmotionTargetingRecommendation[];
  insights: string[];
  suggestedEmotions: string[];
}

// Computer vision insight types
export interface ComputerVisionInsight {
  type: 'audience' | 'creative' | 'engagement';
  score: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface CreativeVisionAnalysis {
  attentionMap: {
    hotspots: Array<{
      x: number;
      y: number;
      radius: number;
      intensity: number;
    }>;
    maxAttentionRegion: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  objectDetection: Array<{
    label: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  brandElements: {
    logoDetected: boolean;
    logoPosition?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    colorSchemeSummary: Record<string, number>;
  };
  insights: ComputerVisionInsight[];
}

// Pricing and bid recommendations
export interface DynamicPricingRecommendation {
  bidStrategy: 'aggressive' | 'balanced' | 'conservative';
  recommendedBid: number;
  minBid: number;
  maxBid: number;
  estimatedCpm: number;
  estimatedImpressions: number;
  confidence: number;
  reasoning: string;
}

export interface PricingRecommendations {
  recommendations: DynamicPricingRecommendation[];
  marketInsights: {
    averageCpm: number;
    demandLevel: 'high' | 'medium' | 'low';
    competitorActivity: 'increasing' | 'stable' | 'decreasing';
    trendingSectors: string[];
  };
}

// Location targeting recommendations
export interface LocationInsight {
  locationId: string;
  name: string;
  type: 'country' | 'region' | 'city' | 'postal';
  performance: {
    impressions: number;
    engagements: number;
    conversions: number;
    engagementRate: number;
    conversionRate: number;
  };
  recommendation: 'increase' | 'maintain' | 'decrease' | 'exclude';
  reasoning: string;
}

export interface LocationRecommendations {
  insights: LocationInsight[];
  topPerformingLocations: string[];
  underperformingLocations: string[];
  newOpportunities: string[];
}

// Ad rotation insights
export interface AdRotationInsight {
  creativeId: string;
  creativeName: string;
  performanceScore: number;
  impressions: number;
  engagements: number;
  completions: number;
  viewerCount: number;
  recommendation: 'increase' | 'maintain' | 'decrease' | 'pause';
  reasoning: string;
}

export interface AdRotationRecommendations {
  insights: AdRotationInsight[];
  optimizedDistribution: Record<string, number>;
}

// Interactive ad insights
export interface InteractionMetric {
  type: string;
  count: number;
  rate: number;
  avgDuration: number;
}

export interface InteractionInsights {
  totalInteractions: number;
  interactionRate: number;
  metrics: InteractionMetric[];
  topInteractions: string[];
  recommendations: string[];
} 