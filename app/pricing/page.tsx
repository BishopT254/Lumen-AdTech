'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Leaf, Clock, Database, Shield, BadgeDollarSign, Calculator, Scale, Globe, Sparkles, Wallet, BadgeCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function PricingPage() {
  const [impressions, setImpressions] = useState(10000);
  const [engagements, setEngagements] = useState(1500);
  const [conversions, setConversions] = useState(200);
  const [sustainabilityMode, setSustainabilityMode] = useState(false);

  const pricingModels = [
    {
      id: 'cpm',
      title: 'Cost Per Mile',
      icon: <Globe className="h-6 w-6" />,
      formula: 'Impressions × Rate / 1000',
      description: 'Pay for every 1,000 views of your ad',
      variables: [
        { name: 'Base Rate', value: 2.5 },
        { name: 'Location Modifier', value: 1.2 },
        { name: 'Time Modifier', value: 0.9 }
      ]
    },
    {
      id: 'cpe',
      title: 'Cost Per Engagement',
      icon: <Sparkles className="h-6 w-6" />,
      formula: 'Engagements × Rate',
      description: 'Pay only when users interact with your ad',
      variables: [
        { name: 'Base Rate', value: 0.45 },
        { name: 'AR Interaction Bonus', value: 0.3 },
        { name: 'Voice Command Bonus', value: 0.2 }
      ]
    },
    {
      id: 'cpa',
      title: 'Cost Per Action',
      icon: <BadgeCheck className="h-6 w-6" />,
      formula: 'Conversions × Rate',
      description: 'Pay only for verified conversions',
      variables: [
        { name: 'Base Rate', value: 12.0 },
        { name: 'Product Category Modifier', value: 1.1 },
        { name: 'Location Accuracy Bonus', value: 0.8 }
      ]
    }
  ];

  const dynamicPricing = useMemo(() => ({
    cpm: impressions * 2.5 * (sustainabilityMode ? 0.95 : 1),
    cpe: engagements * 0.45 * (sustainabilityMode ? 0.97 : 1),
    cpa: conversions * 12.0 * (sustainabilityMode ? 0.98 : 1)
  }), [impressions, engagements, conversions, sustainabilityMode]);

  const carbonCost = useMemo(() => 
    (impressions * 0.0002 + engagements * 0.0015 + conversions * 0.005) * (sustainabilityMode ? 0.8 : 1),
    [impressions, engagements, conversions, sustainabilityMode]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Performance-Based Pricing Engine
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Leverage our AI-optimized pricing models that adapt in real-time to market conditions, audience engagement, and sustainability goals.
          </p>
        </motion.div>
      </section>

      {/* Dynamic Pricing Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Intelligent Pricing Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center gap-4">
              <Switch 
                id="sustainability-mode" 
                checked={sustainabilityMode}
                onCheckedChange={setSustainabilityMode}
              />
              <Label htmlFor="sustainability-mode">
                Eco-Friendly Mode (5-20% discounts with carbon optimization)
              </Label>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Estimated Impressions</Label>
                  <span className="text-gray-600 dark:text-gray-400">
                    {impressions.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[impressions]}
                  min={1000}
                  max={1000000}
                  step={1000}
                  onValueChange={([val]) => setImpressions(val)}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Expected Engagements</Label>
                  <span className="text-gray-600 dark:text-gray-400">
                    {engagements.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[engagements]}
                  min={100}
                  max={50000}
                  step={100}
                  onValueChange={([val]) => setEngagements(val)}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Projected Conversions</Label>
                  <span className="text-gray-600 dark:text-gray-400">
                    {conversions.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[conversions]}
                  min={10}
                  max={5000}
                  step={10}
                  onValueChange={([val]) => setConversions(val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <PricingModelCard
                title="CPM Estimate"
                value={dynamicPricing.cpm}
                icon={<Globe className="h-6 w-6" />}
                carbonCost={carbonCost}
                sustainabilityMode={sustainabilityMode}
              />
              <PricingModelCard
                title="CPE Estimate"
                value={dynamicPricing.cpe}
                icon={<Sparkles className="h-6 w-6" />}
                carbonCost={carbonCost}
                sustainabilityMode={sustainabilityMode}
              />
              <PricingModelCard
                title="CPA Estimate"
                value={dynamicPricing.cpa}
                icon={<BadgeCheck className="h-6 w-6" />}
                carbonCost={carbonCost}
                sustainabilityMode={sustainabilityMode}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pricing Models Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="cpm" className="space-y-6">
          <TabsList className="grid grid-cols-3">
            {pricingModels.map((model) => (
              <TabsTrigger key={model.id} value={model.id}>
                <span className="flex items-center gap-2">
                  {model.icon}
                  {model.title}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {pricingModels.map((model) => (
            <TabsContent key={model.id} value={model.id}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{model.description}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Pricing Formula</h3>
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <code className="text-sm">{model.formula}</code>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Dynamic Variables</h3>
                        <div className="space-y-2">
                          {model.variables.map((variable, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{variable.name}</span>
                              <span>× {variable.value.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Enterprise Solutions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Enterprise-Grade Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Blockchain Verification</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Hyperledger Fabric transaction ledger</li>
                <li>• Real-time impression verification</li>
                <li>• Smart contract auditing</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">AI Optimization</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Predictive budget allocation</li>
                <li>• Automated bid management</li>
                <li>• Real-time creative optimization</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const PricingModelCard = ({ title, value, icon, carbonCost, sustainabilityMode }) => (
  <motion.div whileHover={{ y: -5 }}>
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-lg font-semibold">{title}</span>
        </div>
        {sustainabilityMode && <Leaf className="h-5 w-5 text-green-500" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">
          ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Carbon Cost: {carbonCost.toFixed(3)} kg CO₂
        </div>
      </CardContent>
    </Card>
  </motion.div>
);