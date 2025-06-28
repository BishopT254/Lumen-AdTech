/**
 * Emotion detection and targeting type definitions
 */

// Basic emotion intensity data
export interface EmotionData {
  joy: number;
  surprise: number;
  anger: number;
  fear: number;
  disgust: number;
  sadness: number;
  neutral: number;
}

// Boolean flags for targeting specific emotions
export interface EmotionTargeting {
  joy: boolean;
  surprise: boolean;
  anger: boolean;
  fear: boolean;
  disgust: boolean;
  sadness: boolean;
  neutral: boolean;
}

// Valid emotion keys
export type EmotionKey = keyof EmotionData;

// Insights about emotions detected
export interface EmotionInsight {
  emotion: EmotionKey;
  score: number;
  title: string;
  description: string;
  recommendation?: string;
}

// Form data structure for emotion targeting
export interface EmotionTargetingFormData {
  emotionAware: boolean;
  targetEmotions: EmotionTargeting;
}

// Emotion threshold settings
export interface EmotionThresholds {
  [key: string]: number;
  joy: number;
  surprise: number;
  anger: number;
  fear: number;
  disgust: number;
  sadness: number;
  neutral: number;
}

// Emotion response to content
export interface EmotionResponse {
  predominant: EmotionKey;
  emotions: EmotionData;
  confidence: number;
  faceCount: number;
}

// Audience emotion analytics
export interface EmotionAnalytics {
  predominantEmotion: EmotionKey;
  emotionDistribution: EmotionData;
  engagementByEmotion: Record<EmotionKey, number>;
  conversionsByEmotion: Record<EmotionKey, number>;
  timeSeriesData?: {
    timestamp: string;
    emotions: EmotionData;
  }[];
} 