'use client';

import { useState } from 'react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ARVRPage() {
  const { systemSettings, loading, error } = usePublicSettings();
  
  // AR/VR features should only be available when the feature flag is enabled
  const arVrEnabled = systemSettings?.featureFlags?.arVrFeatures || false;
  
  // Mock AR/VR experience templates
  const arExperiences = [
    {
      id: 'ar-001',
      name: 'Product Showcase',
      description: 'Allow users to view your product in 3D with interactive elements',
      thumbnail: '/assets/ar-product-demo.jpg',
      complexity: 'Medium',
      engagementRate: '32%',
    },
    {
      id: 'ar-002',
      name: 'Try Before You Buy',
      description: 'Virtual try-on experience for clothing, accessories, or makeup',
      thumbnail: '/assets/ar-try-on.jpg',
      complexity: 'High',
      engagementRate: '45%',
    },
    {
      id: 'ar-003',
      name: 'Interactive Poster',
      description: 'Transform static displays into interactive experiences with AR overlays',
      thumbnail: '/assets/ar-poster.jpg',
      complexity: 'Low',
      engagementRate: '28%',
    }
  ];
  
  const vrExperiences = [
    {
      id: 'vr-001',
      name: 'Virtual Showroom',
      description: 'Immersive 360° environment to showcase products or services',
      thumbnail: '/assets/vr-showroom.jpg',
      complexity: 'High',
      engagementRate: '38%',
    },
    {
      id: 'vr-002',
      name: 'Branded VR Game',
      description: 'Engaging mini-game experience with your brand integrated',
      thumbnail: '/assets/vr-game.jpg',
      complexity: 'Very High',
      engagementRate: '52%',
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load AR/VR experience data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If AR/VR features are not enabled
  if (!arVrEnabled) {
    return (
      <div className="container mx-auto py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AR/VR Experiences</CardTitle>
            <CardDescription>
              Create immersive augmented and virtual reality ad experiences
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-12">
            <Alert>
              <AlertTitle>AR/VR Features Not Enabled</AlertTitle>
              <AlertDescription>
                Immersive AR/VR advertising features are currently not enabled for your account.
                Please contact the platform administrator if you're interested in accessing these features.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AR/VR Experiences</h1>
          <p className="text-muted-foreground mt-2">
            Create immersive augmented and virtual reality ad experiences
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mt-4 md:mt-0">
          Beta Feature
        </Badge>
      </div>
      
      <Tabs defaultValue="ar" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="ar">Augmented Reality</TabsTrigger>
          <TabsTrigger value="vr">Virtual Reality</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {arExperiences.map((experience) => (
              <Card key={experience.id} className="overflow-hidden">
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardHeader>
                  <CardTitle>{experience.name}</CardTitle>
                  <CardDescription>{experience.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Complexity:</span>
                    <span>{experience.complexity}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Avg. Engagement:</span>
                    <span className="font-medium text-green-600">{experience.engagementRate}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button size="sm">Create</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="font-semibold flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About AR Experiences
            </h3>
            <p className="text-sm mt-2">
              Augmented Reality ads allow users to interact with your products or brand through their smartphone 
              camera. AR experiences enhance engagement by overlaying digital content on the real world.
              Our platform makes it easy to create QR code triggers that launch AR experiences from our Android TV apps.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="vr">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vrExperiences.map((experience) => (
              <Card key={experience.id} className="overflow-hidden">
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardHeader>
                  <CardTitle>{experience.name}</CardTitle>
                  <CardDescription>{experience.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Complexity:</span>
                    <span>{experience.complexity}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Avg. Engagement:</span>
                    <span className="font-medium text-green-600">{experience.engagementRate}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button size="sm">Create</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="font-semibold flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About VR Experiences
            </h3>
            <p className="text-sm mt-2">
              Virtual Reality experiences offer fully immersive brand interactions. Users can explore 
              virtual environments through supported devices like smartphone-based VR headsets.
              These experiences typically require more resources but deliver exceptionally high engagement rates.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Getting Started with AR/VR</CardTitle>
          <CardDescription>
            Follow these steps to create your first immersive ad experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 mt-2">
            <li className="flex items-start">
              <span className="flex h-6 w-6 mr-3 rounded-full bg-primary text-white items-center justify-center text-sm">1</span>
              <div>
                <h4 className="font-medium">Choose a template</h4>
                <p className="text-sm text-muted-foreground">
                  Select an AR or VR template that best suits your advertising goals
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex h-6 w-6 mr-3 rounded-full bg-primary text-white items-center justify-center text-sm">2</span>
              <div>
                <h4 className="font-medium">Upload your assets</h4>
                <p className="text-sm text-muted-foreground">
                  Upload 3D models, images, videos, and other media to customize your experience
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex h-6 w-6 mr-3 rounded-full bg-primary text-white items-center justify-center text-sm">3</span>
              <div>
                <h4 className="font-medium">Customize interactions</h4>
                <p className="text-sm text-muted-foreground">
                  Define how users will interact with your content and what actions they can take
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex h-6 w-6 mr-3 rounded-full bg-primary text-white items-center justify-center text-sm">4</span>
              <div>
                <h4 className="font-medium">Test and publish</h4>
                <p className="text-sm text-muted-foreground">
                  Preview your experience, make adjustments, and publish to your ad campaigns
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Create Your First AR/VR Experience</Button>
        </CardFooter>
      </Card>
    </div>
  );
} 