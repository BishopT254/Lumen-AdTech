'use client';

import { useState } from 'react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export default function SustainabilityPage() {
  const { sustainabilitySettings, loading, error } = usePublicSettings();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  
  // Mock data for demonstration
  const campaigns = [
    {
      id: 'camp-001',
      name: 'Summer Promotion',
      totalImpressions: 126500,
      carbonUsage: 12.5, // kg CO2
      energyUsage: 450, // kWh
      optimizationScore: 76,
      startDate: new Date('2023-05-15'),
      endDate: new Date('2023-06-15'),
    },
    {
      id: 'camp-002',
      name: 'Product Launch',
      totalImpressions: 85000,
      carbonUsage: 8.2,
      energyUsage: 320,
      optimizationScore: 92,
      startDate: new Date('2023-07-01'),
      endDate: new Date('2023-07-31'),
    },
    {
      id: 'camp-003',
      name: 'Holiday Special',
      totalImpressions: 247000,
      carbonUsage: 21.3,
      energyUsage: 820,
      optimizationScore: 64,
      startDate: new Date('2023-11-25'),
      endDate: new Date('2023-12-31'),
    }
  ];
  
  // Mock data for carbon offsets
  const carbonOffsets = [
    {
      id: 'offset-1',
      date: new Date('2023-06-20'),
      amount: 10.5, // kg CO2
      project: 'Reforestation Project, Kenya',
      cost: 52.50,
      certificate: 'KE-RF-2023-06-78954'
    },
    {
      id: 'offset-2',
      date: new Date('2023-08-15'),
      amount: 8.2,
      project: 'Solar Energy Initiative, India',
      cost: 41.00,
      certificate: 'IN-SE-2023-08-12388'
    },
    {
      id: 'offset-3',
      date: new Date('2023-12-10'),
      amount: 21.3,
      project: 'Wind Farm Development, Scotland',
      cost: 106.50,
      certificate: 'SC-WF-2023-12-45721'
    }
  ];
  
  // Calculate total carbon and energy usage
  const totalCarbonUsage = campaigns.reduce((total, camp) => total + camp.carbonUsage, 0);
  const totalEnergyUsage = campaigns.reduce((total, camp) => total + camp.energyUsage, 0);
  const totalCarbonOffset = carbonOffsets.reduce((total, offset) => total + offset.amount, 0);
  const netCarbonFootprint = totalCarbonUsage - totalCarbonOffset;
  
  // Calculate average optimization score
  const avgOptimizationScore = campaigns.reduce((total, camp) => total + camp.optimizationScore, 0) / campaigns.length;

  // If sustainability features are not enabled
  if (!sustainabilitySettings?.carbonTrackingEnabled && !loading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sustainability Dashboard</CardTitle>
            <CardDescription>
              Carbon tracking and eco-friendly advertising features
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-12">
            <Alert>
              <AlertTitle>Sustainability Features Not Enabled</AlertTitle>
              <AlertDescription>
                The sustainability tracking features are currently disabled by the platform administrators.
                Please contact the platform team if you're interested in sustainable advertising options.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
            Unable to load sustainability data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sustainability Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and optimize your advertising campaigns for environmental impact
          </p>
        </div>
        {sustainabilitySettings?.ecoFriendlyDiscounts && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-4 md:mt-0">
            Eco-friendly discount: {sustainabilitySettings.ecoDiscountPercentage}% available
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Carbon Footprint</CardTitle>
            <CardDescription>Total from all campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{netCarbonFootprint.toFixed(2)} kg CO₂</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCarbonOffset.toFixed(2)} kg offset • {totalCarbonUsage.toFixed(2)} kg total
            </p>
            <Progress 
              value={(totalCarbonOffset / totalCarbonUsage) * 100} 
              className="h-2 mt-4"
            />
          </CardContent>
          <CardFooter className="pt-0">
            <p className="text-xs text-muted-foreground">
              {sustainabilitySettings?.reportingFrequency || 'Monthly'} reporting
            </p>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Energy Consumption</CardTitle>
            <CardDescription>Across all delivery devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEnergyUsage.toFixed(2)} kWh</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated from {campaigns.reduce((total, camp) => total + camp.totalImpressions, 0).toLocaleString()} impressions
            </p>
            <div className="flex items-center space-x-1 mt-4">
              <div className="bg-red-500 h-2 rounded" style={{ width: '40%' }}></div>
              <div className="bg-yellow-500 h-2 rounded" style={{ width: '35%' }}></div>
              <div className="bg-green-500 h-2 rounded" style={{ width: '25%' }}></div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <p className="text-xs text-muted-foreground">
              {sustainabilitySettings?.energyOptimizationEnabled ? 'Energy optimization enabled' : 'Energy optimization available'}
            </p>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Optimization Score</CardTitle>
            <CardDescription>Eco-efficiency rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgOptimizationScore.toFixed(0)}/100</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on creative efficiency and delivery optimization
            </p>
            <Progress 
              value={avgOptimizationScore} 
              className="h-2 mt-4"
            />
          </CardContent>
          <CardFooter className="pt-0">
            <p className="text-xs text-muted-foreground">
              {avgOptimizationScore >= 80 ? 'Excellent' : avgOptimizationScore >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <Tabs defaultValue="campaigns" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="campaigns">Campaign Impact</TabsTrigger>
          <TabsTrigger value="offsets">Carbon Offsets</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Environmental Impact</CardTitle>
              <CardDescription>
                Compare the carbon footprint of your active and past campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium p-4">Campaign</th>
                      <th className="text-left font-medium p-4">Period</th>
                      <th className="text-right font-medium p-4">Impressions</th>
                      <th className="text-right font-medium p-4">Carbon (kg CO₂)</th>
                      <th className="text-right font-medium p-4">Energy (kWh)</th>
                      <th className="text-right font-medium p-4">Eco Score</th>
                      <th className="text-right font-medium p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr 
                        key={campaign.id} 
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedCampaign(campaign.id === selectedCampaign ? null : campaign.id)}
                      >
                        <td className="p-4">{campaign.name}</td>
                        <td className="p-4">
                          {format(campaign.startDate, 'MMM d')} - {format(campaign.endDate, 'MMM d, yyyy')}
                        </td>
                        <td className="p-4 text-right">{campaign.totalImpressions.toLocaleString()}</td>
                        <td className="p-4 text-right">{campaign.carbonUsage.toFixed(2)}</td>
                        <td className="p-4 text-right">{campaign.energyUsage}</td>
                        <td className="p-4 text-right">
                          <Badge variant={campaign.optimizationScore >= 80 ? "success" : campaign.optimizationScore >= 60 ? "default" : "destructive"}>
                            {campaign.optimizationScore}/100
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="outline">Optimize</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedCampaign && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Optimization Opportunities</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Reduce video quality during off-peak hours to save approximately 0.8 kg CO₂</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Optimize creative assets with more efficient compression (potential 15% energy reduction)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Target locations with renewable energy-powered displays for additional carbon reduction</span>
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Download Sustainability Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="offsets">
          <Card>
            <CardHeader>
              <CardTitle>Carbon Offset History</CardTitle>
              <CardDescription>
                Track your contributions to environmental sustainability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium p-4">Date</th>
                      <th className="text-left font-medium p-4">Project</th>
                      <th className="text-right font-medium p-4">Amount (kg CO₂)</th>
                      <th className="text-right font-medium p-4">Cost</th>
                      <th className="text-left font-medium p-4">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carbonOffsets.map((offset) => (
                      <tr key={offset.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">{format(offset.date, 'MMM d, yyyy')}</td>
                        <td className="p-4">{offset.project}</td>
                        <td className="p-4 text-right">{offset.amount.toFixed(2)}</td>
                        <td className="p-4 text-right">${offset.cost.toFixed(2)}</td>
                        <td className="p-4">
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            {offset.certificate}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Purchase Carbon Offsets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Basic Offset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$25</div>
                      <p className="text-xs text-muted-foreground mt-1">5 kg CO₂ offset</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" className="w-full">Purchase</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Standard Offset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$50</div>
                      <p className="text-xs text-muted-foreground mt-1">10 kg CO₂ offset</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="default" size="sm" className="w-full">Purchase</Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Premium Offset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$100</div>
                      <p className="text-xs text-muted-foreground mt-1">22 kg CO₂ offset</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" className="w-full">Purchase</Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Eco-Friendly Recommendations</CardTitle>
              <CardDescription>
                Optimize your campaigns for sustainability and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Energy-Efficient Creative Assets
                  </h3>
                  <p className="text-sm mt-2">
                    Our analysis shows that optimizing your video assets could reduce energy consumption by up to 25%.
                    Consider using our automatic optimization tools for videos and images.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Run Optimization
                  </Button>
                </div>
                
                <div className="border p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Green Hosting Prioritization
                  </h3>
                  <p className="text-sm mt-2">
                    Target your campaigns to devices and locations that use renewable energy. 
                    We've identified 15 routes with solar-powered displays that align with your target audience.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Adjust Targeting
                  </Button>
                </div>
                
                <div className="border p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Off-Peak Scheduling
                  </h3>
                  <p className="text-sm mt-2">
                    Display your ads during times when the power grid has lower carbon intensity.
                    We recommend adjusting your campaign to increase delivery during 10am-2pm when solar generation is highest.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Optimize Schedule
                  </Button>
                </div>
                
                {sustainabilitySettings?.offsetProgram && (
                  <div className="border p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <h3 className="font-semibold flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Offset Program Available
                    </h3>
                    <p className="text-sm mt-2">
                      Take advantage of our {sustainabilitySettings.offsetProgram} program to offset the carbon
                      footprint of your campaigns. This can improve your brand's sustainability credentials.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4">
                      Learn More
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {sustainabilitySettings?.ecoFriendlyDiscounts && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Eco-Friendly Discount Program</CardTitle>
            <CardDescription>
              Qualify for discounts by improving your campaign's sustainability metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Qualification Criteria</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Achieve an optimization score of 80 or higher</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Use compressed and optimized creative assets</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Target at least 30% of delivery to energy-efficient locations</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Participate in carbon offset program</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Your Discount Status</h3>
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-sm font-medium">Current Qualification</div>
                        <div className="text-2xl font-bold mt-1">2/4 Criteria Met</div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Partial Discount
                      </Badge>
                    </div>
                    
                    <Progress value={50} className="h-2 mb-6" />
                    
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Standard Campaign Rate</span>
                        <span>$5.00 CPM</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Eco-Friendly Discount ({sustainabilitySettings.ecoDiscountPercentage}%)</span>
                        <span>- ${(5 * sustainabilitySettings.ecoDiscountPercentage / 100).toFixed(2)} CPM</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Your Rate</span>
                        <span>${(5 - (5 * sustainabilitySettings.ecoDiscountPercentage / 100)).toFixed(2)} CPM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Button className="w-full mt-4">
                  Improve Sustainability Score
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 