import * as tf from '@tensorflow/tfjs';
import { prisma } from './prisma';

/**
 * Computer Vision-Based Audience Estimation Module
 * 
 * This module provides audience estimation capabilities using computer vision,
 * including person detection, demographic estimation, attention metrics,
 * and privacy-preserving audience analysis.
 */

interface DetectionResult {
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  score: number;
  class: string;
}

interface PersonDetectionResult {
  detections: DetectionResult[];
  count: number;
  error?: string;
  processingTime: number;
}

interface DemographicEstimationResult {
  ageRanges: Record<string, number>;
  gender: Record<string, number>;
  confidence: number;
  error?: string;
}

interface AttentionMetricsResult {
  facingScreen: number;
  lookingAway: number;
  attentionScore: number;
  dwellTime?: number;
  error?: string;
}

export class ComputerVisionSystem {
  private personDetectionModel: tf.GraphModel | null = null;
  private demographicModel: tf.GraphModel | null = null;
  private attentionModel: tf.GraphModel | null = null;
  private modelsLoaded = false;
  private isLoading = false;

  constructor() {
    this.initializeModels();
  }

  /**
   * Initialize computer vision models asynchronously
   */
  private async initializeModels() {
    if (this.modelsLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      // Initialize TensorFlow.js backend
      await tf.ready();
      
      // Only set WebGL backend in browser environments
      if (typeof window !== 'undefined') {
        if (tf.getBackend() !== 'webgl' && tf.ENV.getBool('HAS_WEBGL')) {
          await tf.setBackend('webgl');
        }
      }
      // Don't try to set tensorflow backend in server-side rendering

      // Load person detection model (SSD MobileNet)
      this.personDetectionModel = await tf.loadGraphModel(
        process.env.NEXT_PUBLIC_BASE_URL 
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/person-detection/model.json`
          : 'https://storage.googleapis.com/lumen-models/person-detection/model.json'
      );

      // Load demographic estimation model
      this.demographicModel = await tf.loadGraphModel(
        process.env.NEXT_PUBLIC_BASE_URL 
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/demographic-estimation/model.json`
          : 'https://storage.googleapis.com/lumen-models/demographic-estimation/model.json'
      );

      // Load attention metrics model
      this.attentionModel = await tf.loadGraphModel(
        process.env.NEXT_PUBLIC_BASE_URL 
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/models/attention-metrics/model.json`
          : 'https://storage.googleapis.com/lumen-models/attention-metrics/model.json'
      );

      this.modelsLoaded = true;
      console.log('Computer vision models loaded successfully');
    } catch (error) {
      console.error('Error loading computer vision models:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Ensure that models are loaded before processing
   */
  private async ensureModelsLoaded(): Promise<boolean> {
    if (this.modelsLoaded) {
      return true;
    }

    if (!this.isLoading) {
      await this.initializeModels();
    } else {
      // Wait for loading to complete
      await new Promise(resolve => {
        const checkLoading = () => {
          if (!this.isLoading) {
            resolve(true);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    return this.modelsLoaded;
  }

  /**
   * Detect persons in the given image
   */
  async detectPersons(imageData: ImageData | Uint8Array, options: {
    minScore?: number;
    maxDetections?: number;
  } = {}): Promise<PersonDetectionResult> {
    const startTime = performance.now();
    
    try {
      // Ensure models are loaded
      const modelsLoaded = await this.ensureModelsLoaded();
      if (!modelsLoaded || !this.personDetectionModel) {
        return {
          detections: [],
          count: 0,
          error: 'Person detection model not loaded',
          processingTime: performance.now() - startTime
        };
      }

      // Convert image data to tensor
      let imageTensor;
      if (imageData instanceof ImageData) {
        imageTensor = tf.browser.fromPixels(imageData);
      } else {
        // Assuming Uint8Array with shape [height, width, 3]
        const shape = [imageData.length / 3 / 4, 4, 3]; // Estimate shape
        imageTensor = tf.tensor3d(Array.from(imageData), shape);
      }

      // Normalize and resize the image
      const normalized = tf.div(imageTensor, 255.0);
      const resized = tf.image.resizeBilinear(normalized, [300, 300]);
      const batched = tf.expandDims(resized, 0);

      // Run inference
      const predictions = await this.personDetectionModel.executeAsync(batched) as tf.Tensor[];
      
      // Process results
      const scores = await predictions[0].data();
      const boxes = await predictions[1].data();
      const classes = await predictions[2].data();
      const numDetections = await predictions[3].data();

      // Calculate the number of valid detections
      const validDetections = [];
      const minScore = options.minScore || 0.5;
      const maxDetections = options.maxDetections || 100;
      
      // Process detection results
      for (let i = 0; i < Math.min(numDetections[0], maxDetections); i++) {
        const score = scores[i];
        const classId = classes[i];
        
        // Class 1 is "person" in COCO dataset
        if (score >= minScore && classId === 1) {
          const [top, left, bottom, right] = [
            boxes[i * 4],
            boxes[i * 4 + 1],
            boxes[i * 4 + 2],
            boxes[i * 4 + 3]
          ];
          
          validDetections.push({
            boundingBox: {
              top,
              left,
              width: right - left,
              height: bottom - top
            },
            score,
            class: 'person'
          });
        }
      }

      // Cleanup tensors
      imageTensor.dispose();
      normalized.dispose();
      resized.dispose();
      batched.dispose();
      predictions.forEach(tensor => tensor.dispose());

      return {
        detections: validDetections,
        count: validDetections.length,
        processingTime: performance.now() - startTime
      };
    } catch (error) {
      console.error('Error detecting persons:', error);
      return {
        detections: [],
        count: 0,
        error: String(error),
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Estimate demographics for detected persons
   */
  async estimateDemographics(
    imageData: ImageData | Uint8Array,
    detections: DetectionResult[]
  ): Promise<DemographicEstimationResult> {
    try {
      // Ensure models are loaded
      const modelsLoaded = await this.ensureModelsLoaded();
      if (!modelsLoaded || !this.demographicModel) {
        return {
          ageRanges: {},
          gender: {},
          confidence: 0,
          error: 'Demographic model not loaded'
        };
      }

      // Convert image data to tensor
      let imageTensor;
      if (imageData instanceof ImageData) {
        imageTensor = tf.browser.fromPixels(imageData);
      } else {
        // Assuming Uint8Array with shape [height, width, 3]
        const shape = [imageData.length / 3 / 4, 4, 3]; // Estimate shape
        imageTensor = tf.tensor3d(Array.from(imageData), shape);
      }

      // Process each detected person
      const ageRanges: Record<string, number> = {
        '0-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0
      };
      
      const gender: Record<string, number> = {
        male: 0,
        female: 0,
        unknown: 0
      };

      let totalConfidence = 0;
      
      for (const detection of detections) {
        // Extract the person region
        const { top, left, width, height } = detection.boundingBox;
        const person = tf.image.cropAndResize(
          tf.expandDims(imageTensor, 0),
          [[top, left, top + height, left + width]],
          [0],
          [128, 128]
        );

        // Normalize the cropped image
        const normalized = tf.div(person, 255.0);

        // Run inference for demographics
        const predictions = await this.demographicModel.predict(normalized) as tf.Tensor;
        const demographicData = await predictions.data();

        // Process demographic predictions
        // Format: [age_0-17, age_18-24, age_25-34, age_35-44, age_45-54, age_55+, gender_male, gender_female]
        const ageScores = demographicData.slice(0, 6);
        const genderScores = demographicData.slice(6, 8);
        
        // Find the highest scoring age range
        const maxAgeIndex = ageScores.indexOf(Math.max(...Array.from(ageScores)));
        const ageCategories = ['0-17', '18-24', '25-34', '35-44', '45-54', '55+'];
        ageRanges[ageCategories[maxAgeIndex]]++;
        
        // Determine gender
        const maleScore = genderScores[0];
        const femaleScore = genderScores[1];
        if (maleScore > femaleScore && maleScore > 0.6) {
          gender.male++;
        } else if (femaleScore > maleScore && femaleScore > 0.6) {
          gender.female++;
        } else {
          gender.unknown++;
        }
        
        // Calculate confidence for this detection
        const maxAgeScore = ageScores[maxAgeIndex];
        const maxGenderScore = Math.max(maleScore, femaleScore);
        const detectionConfidence = (maxAgeScore + maxGenderScore) / 2;
        totalConfidence += detectionConfidence;
        
        // Cleanup tensors
        person.dispose();
        normalized.dispose();
        predictions.dispose();
      }

      // Calculate average confidence
      const averageConfidence = detections.length > 0 ? totalConfidence / detections.length : 0;
      
      // Convert raw counts to percentages
      const totalPeople = detections.length;
      if (totalPeople > 0) {
        for (const category in ageRanges) {
          ageRanges[category] = ageRanges[category] / totalPeople;
        }
        for (const category in gender) {
          gender[category] = gender[category] / totalPeople;
        }
      }

      // Cleanup tensor
      imageTensor.dispose();

      return {
        ageRanges,
        gender,
        confidence: averageConfidence
      };
    } catch (error) {
      console.error('Error estimating demographics:', error);
      return {
        ageRanges: {},
        gender: {},
        confidence: 0,
        error: String(error)
      };
    }
  }

  /**
   * Analyze attention metrics for detected persons
   */
  async analyzeAttention(
    imageSequence: ImageData[] | Uint8Array[],
    detections: DetectionResult[][]
  ): Promise<AttentionMetricsResult> {
    try {
      // Ensure models are loaded
      const modelsLoaded = await this.ensureModelsLoaded();
      if (!modelsLoaded || !this.attentionModel) {
        return {
          facingScreen: 0,
          lookingAway: 0,
          attentionScore: 0,
          error: 'Attention model not loaded'
        };
      }

      // Process multiple frames for attention tracking
      const frames = imageSequence.length;
      let totalFacingCount = 0;
      let totalLookingAwayCount = 0;
      
      for (let i = 0; i < frames; i++) {
        // Convert image data to tensor
        let imageTensor;
        if (imageSequence[i] instanceof ImageData) {
          imageTensor = tf.browser.fromPixels(imageSequence[i] as ImageData);
        } else {
          // Assuming Uint8Array with shape [height, width, 3]
          const shape = [(imageSequence[i] as Uint8Array).length / 3 / 4, 4, 3]; // Estimate shape
          imageTensor = tf.tensor3d(Array.from(imageSequence[i] as Uint8Array), shape);
        }

        const frameDetections = detections[i];
        
        // Process each detected person in the frame
        let frameFacingCount = 0;
        
        for (const detection of frameDetections) {
          // Extract the face region (assuming head is in upper part of bounding box)
          const { top, left, width, height } = detection.boundingBox;
          // Focus on the upper third of the person for face
          const faceTop = top;
          const faceHeight = height * 0.33;
          
          const face = tf.image.cropAndResize(
            tf.expandDims(imageTensor, 0),
            [[faceTop, left, faceTop + faceHeight, left + width]],
            [0],
            [96, 96]
          );

          // Normalize the cropped face
          const normalized = tf.div(face, 255.0);

          // Run inference for attention
          const predictions = await this.attentionModel.predict(normalized) as tf.Tensor;
          const attentionData = await predictions.data();

          // Process attention predictions
          // Format: [facing_screen, looking_away]
          const facingScore = attentionData[0];
          const lookingAwayScore = attentionData[1];
          
          if (facingScore > lookingAwayScore && facingScore > 0.6) {
            frameFacingCount++;
          }
          
          // Cleanup tensors
          face.dispose();
          normalized.dispose();
          predictions.dispose();
        }
        
        totalFacingCount += frameFacingCount;
        totalLookingAwayCount += (frameDetections.length - frameFacingCount);
        
        // Cleanup tensor
        imageTensor.dispose();
      }

      // Calculate attention metrics
      const totalDetections = detections.flat().length;
      const facingScreen = totalDetections > 0 ? totalFacingCount / totalDetections : 0;
      const lookingAway = totalDetections > 0 ? totalLookingAwayCount / totalDetections : 0;
      
      // Calculate attention score (0-1)
      // Higher weight for consistently facing the screen across frames
      const attentionScore = facingScreen;
      
      // Calculate dwell time based on attention across frames
      // Assuming 1 second per frame, or this could be passed as a parameter
      const dwellTime = frames > 0 ? frames * facingScreen : 0;

      return {
        facingScreen,
        lookingAway,
        attentionScore,
        dwellTime
      };
    } catch (error) {
      console.error('Error analyzing attention:', error);
      return {
        facingScreen: 0,
        lookingAway: 0,
        attentionScore: 0,
        error: String(error)
      };
    }
  }

  /**
   * Analyze multiple image frames to get audience metrics
   */
  async analyzeAudience(
    imageSequence: ImageData[] | Uint8Array[],
    options: {
      adDeliveryId?: string;
      deviceId?: string;
      minDetectionScore?: number;
      processInterval?: number; // Process every Nth frame
    } = {}
  ) {
    try {
      if (!imageSequence || imageSequence.length === 0) {
        throw new Error('No image data provided');
      }

      const processInterval = options.processInterval || 1; // Default process every frame
      const processedFrames = [];
      const detectionResults = [];
      
      // Process frames at the specified interval
      for (let i = 0; i < imageSequence.length; i += processInterval) {
        processedFrames.push(imageSequence[i]);
        
        // Detect persons in the frame
        const detectionResult = await this.detectPersons(imageSequence[i], {
          minScore: options.minDetectionScore || 0.5
        });
        
        detectionResults.push(detectionResult.detections);
      }
      
      // Estimate demographics based on detected persons
      const demographicsResult = await this.estimateDemographics(
        processedFrames[Math.floor(processedFrames.length / 2)], // Use middle frame
        detectionResults[Math.floor(detectionResults.length / 2)] // Use middle frame detections
      );
      
      // Analyze attention metrics across frames
      const attentionResult = await this.analyzeAttention(
        processedFrames,
        detectionResults
      );
      
      // Calculate average person count
      const averageCount = detectionResults.reduce(
        (sum, detections) => sum + detections.length, 
        0
      ) / detectionResults.length;
      
      // Prepare the final result
      const result = {
        audienceCount: Math.round(averageCount),
        demographics: demographicsResult.ageRanges,
        gender: demographicsResult.gender,
        attention: {
          facingScreen: attentionResult.facingScreen,
          attentionScore: attentionResult.attentionScore,
          dwellTime: attentionResult.dwellTime || 0
        },
        processingMetrics: {
          processedFrames: processedFrames.length,
          totalFrames: imageSequence.length,
          detectionConfidence: demographicsResult.confidence
        }
      };
      
      // If adDeliveryId is provided, store the analytics
      if (options.adDeliveryId) {
        await this.storeAudienceAnalytics(options.adDeliveryId, result);
      }
      
      return result;
    } catch (error) {
      console.error('Error analyzing audience:', error);
      return {
        error: String(error),
        audienceCount: 0,
        demographics: {},
        gender: {},
        attention: {
          facingScreen: 0,
          attentionScore: 0,
          dwellTime: 0
        }
      };
    }
  }

  /**
   * Store audience analytics in the database
   */
  private async storeAudienceAnalytics(adDeliveryId: string, data: any) {
    try {
      // Get the ad delivery details
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
      
      // Update the ad delivery with viewer count
      await prisma.adDelivery.update({
        where: { id: adDeliveryId },
        data: {
          viewerCount: data.audienceCount,
          impressions: { increment: data.audienceCount }
        }
      });
      
      // Store emotion data
      await prisma.emotionData.create({
        data: {
          adCreativeId: adDelivery.adCreativeId,
          adDeliveryId: adDeliveryId,
          timestamp: new Date(),
          joyScore: 0, // Default values since we're not detecting emotions in this module
          surpriseScore: 0,
          neutralScore: 0,
          dwellTime: data.attention.dwellTime,
          viewerCount: data.audienceCount,
          isAggregated: true
        }
      });
      
      // Update campaign analytics
      // First, check if we have an entry for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate engagement based on attention score
      const engagements = Math.round(data.audienceCount * data.attention.attentionScore);
      
      await prisma.campaignAnalytics.upsert({
        where: {
          campaignId_date: {
            campaignId: adDelivery.campaignId,
            date: today
          }
        },
        update: {
          impressions: { increment: data.audienceCount },
          engagements: { increment: engagements },
          audienceMetrics: {
            // Merge with existing metrics if any
            // This is a simplified approach; actual implementation would be more sophisticated
            ageRanges: data.demographics,
            gender: data.gender
          }
        },
        create: {
          campaignId: adDelivery.campaignId,
          date: today,
          impressions: data.audienceCount,
          engagements: engagements,
          conversions: 0,
          ctr: data.attention.attentionScore,
          conversionRate: 0,
          averageDwellTime: data.attention.dwellTime,
          audienceMetrics: {
            ageRanges: data.demographics,
            gender: data.gender
          },
          costData: {
            cpm: 0,
            cpe: 0,
            cpa: 0,
            spend: 0
          }
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error storing audience analytics:', error);
      return { success: false, error: String(error) };
    }
  }
}

// Export singleton instance
export const computerVision = new ComputerVisionSystem(); 