"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Zap, Shield, BrainCircuit, Leaf, Database, Lock, Cloud, Users, Eye, Search, BadgeCheck, CircuitBoard } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress, CircularProgress } from "@/components/ui/progress"

export default function FeaturesPage() {
  const aiCapabilities = [
    { title: "Federated Learning", icon: <BrainCircuit />, progress: 95 },
    { title: "Emotion Detection", icon: <Eye />, progress: 90 },
    { title: "Predictive Targeting", icon: <Search />, progress: 97 },
    { title: "Dynamic Creative Optimization", icon: <CircuitBoard />, progress: 92 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Next-Gen AdTech Platform Architecture
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Combining cutting-edge AI, blockchain transparency, and sustainable infrastructure to revolutionize digital
            advertising.
          </p>
        </motion.div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="5G-Optimized Delivery"
            description="MPEG-DASH adaptive streaming with edge computing nodes"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="ZK-Proof Verification"
            description="Hyperledger Indy-powered identity management"
          />
          <FeatureCard
            icon={<Leaf className="h-8 w-8" />}
            title="Carbon Tracking"
            description="Real-time emissions monitoring per campaign"
          />
        </div>
      </section>

      {/* Technical Deep Dive */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="ai" className="flex gap-2">
              <BrainCircuit className="h-4 w-4" /> AI Engine
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="flex gap-2">
              <Database className="h-4 w-4" /> Blockchain
            </TabsTrigger>
            <TabsTrigger value="infra" className="flex gap-2">
              <Cloud className="h-4 w-4" /> Infrastructure
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex gap-2">
              <BadgeCheck className="h-4 w-4" /> Compliance
            </TabsTrigger>
          </TabsList>

          {/* AI Tab Content */}
          <TabsContent value="ai">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {aiCapabilities.map((capability, index) => (
                <Card key={index} className="border border-gray-200 dark:border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      {capability.icon}
                      <span className="text-lg font-semibold">{capability.title}</span>
                    </div>
                    {index % 2 === 0 ? (
                      <Progress value={capability.progress} className="w-24" />
                    ) : (
                      <CircularProgress value={capability.progress} size="sm" className="w-8 h-8" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>• TensorFlow Lite edge processing</li>
                      <li>• Federated learning integration</li>
                      <li>• Real-time performance adaptation</li>
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          {/* Blockchain Tab Content */}
          <TabsContent value="blockchain">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="ledger">
                  <AccordionTrigger className="text-lg">Hyperledger Fabric Implementation</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Key Features</h4>
                        <ul className="text-gray-600 dark:text-gray-400">
                          <li>• 2.3s transaction finality</li>
                          <li>• 142k TPS capacity</li>
                          <li>• ZK-SNARK proofs</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Performance Metrics</h4>
                        <ul className="text-gray-600 dark:text-gray-400">
                          <li>• 99.999% uptime SLA</li>
                          <li>• 18ms p99 latency</li>
                          <li>• AES-256 encryption</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </TabsContent>

          {/* Infrastructure Tab Content */}
          <TabsContent value="infra">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Cloud Infrastructure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Multi-region Kubernetes clusters with autoscaling capabilities.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Compliance Tab Content */}
          <TabsContent value="compliance">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Regulatory Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Complete GDPR, CCPA, and ISO 27001 compliance with regular audits.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Global Infrastructure */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  Global Edge Network
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <StatBadge title="Edge Nodes" value="42.9K" />
                <StatBadge title="5G POPs" value="186" />
                <StatBadge title="Countries" value="94" />
              </div>
              <ul className="space-y-2 text-gray-300">
                <li>• AWS Wavelength integration</li>
                <li>• Google Distributed Cloud Edge</li>
                <li>• Multi-region Kubernetes clusters</li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative h-96 rounded-2xl overflow-hidden border border-gray-700"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
              <div className="absolute inset-0 pattern-dots" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Compliance & Security */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CertificationBadge
            title="GDPR Compliance"
            description="Full data sovereignty controls"
            icon={<Lock className="h-6 w-6" />}
          />
          <CertificationBadge
            title="WCAG 2.2 AA"
            description="Accessibility-first design"
            icon={<Users className="h-6 w-6" />}
          />
          <CertificationBadge
            title="ISO 27001"
            description="Enterprise-grade security"
            icon={<Shield className="h-6 w-6" />}
          />
        </div>
      </section>
    </div>
  )
}

// Add type definitions for component props
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <motion.div whileHover={{ y: -5 }}>
    <Card className="border border-gray-200 dark:border-gray-700 h-full">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
)

interface StatBadgeProps {
  title: string
  value: string
}

const StatBadge = ({ title, value }: StatBadgeProps) => (
  <div className="bg-gray-800 p-4 rounded-xl text-center">
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className="text-sm text-gray-400">{title}</div>
  </div>
)

interface CertificationBadgeProps {
  title: string
  description: string
  icon: React.ReactNode
}

const CertificationBadge = ({ title, description, icon }: CertificationBadgeProps) => (
  <motion.div whileHover={{ scale: 1.05 }}>
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center gap-3">
        {icon}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
)
