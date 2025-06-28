"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Database, TabletIcon as DeviceTablet, Eye, Server, ShieldCheck, Users } from "lucide-react"

export function PrivacyPolicyDataFlow() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="visual">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Flow</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Explanation</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-4">
          <div className="bg-muted/50 p-6 rounded-lg overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="flex flex-col items-center">
                <div className="grid grid-cols-3 gap-6 w-full mb-8">
                  <DataFlowNode
                    icon={<DeviceTablet className="h-8 w-8" />}
                    title="Android TV Devices"
                    description="Collects anonymous audience metrics"
                    isSelected={selectedNode === "devices"}
                    onClick={() => setSelectedNode("devices")}
                  />

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <DataFlowNode
                    icon={<Eye className="h-8 w-8" />}
                    title="Edge Processing"
                    description="Local data processing with privacy protections"
                    isSelected={selectedNode === "edge"}
                    onClick={() => setSelectedNode("edge")}
                  />
                </div>

                <div className="h-8 border-l-2 border-dashed border-muted-foreground" />

                <div className="grid grid-cols-3 gap-6 w-full my-8">
                  <DataFlowNode
                    icon={<ShieldCheck className="h-8 w-8" />}
                    title="Encryption Layer"
                    description="End-to-end encryption of data"
                    isSelected={selectedNode === "encryption"}
                    onClick={() => setSelectedNode("encryption")}
                  />

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <DataFlowNode
                    icon={<Server className="h-8 w-8" />}
                    title="Lumen Platform"
                    description="Secure processing and analytics"
                    isSelected={selectedNode === "platform"}
                    onClick={() => setSelectedNode("platform")}
                  />
                </div>

                <div className="h-8 border-l-2 border-dashed border-muted-foreground" />

                <div className="grid grid-cols-3 gap-6 w-full">
                  <DataFlowNode
                    icon={<Database className="h-8 w-8" />}
                    title="Data Storage"
                    description="Encrypted, anonymized data storage"
                    isSelected={selectedNode === "storage"}
                    onClick={() => setSelectedNode("storage")}
                  />

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <DataFlowNode
                    icon={<Users className="h-8 w-8" />}
                    title="Advertisers & Partners"
                    description="Receive aggregated, anonymized insights"
                    isSelected={selectedNode === "advertisers"}
                    onClick={() => setSelectedNode("advertisers")}
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedNode && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                {selectedNode === "devices" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Android TV Devices</h3>
                    <p className="mb-2">Our Android TV applications installed in public spaces collect:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>Anonymous audience counts using computer vision</li>
                      <li>Basic demographic estimates (age ranges, gender distribution)</li>
                      <li>Attention metrics (glance detection, dwell time)</li>
                      <li>Device location data (for mobile installations)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> No facial recognition or biometric data storage. All
                      processing occurs locally on the device.
                    </p>
                  </div>
                )}

                {selectedNode === "edge" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Edge Processing</h3>
                    <p className="mb-2">Data is processed locally on the device using:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>TensorFlow Lite for on-device AI processing</li>
                      <li>Anonymization techniques to remove identifying information</li>
                      <li>Aggregation of metrics before transmission</li>
                      <li>Local data minimization to reduce sensitive information</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> Only processed, aggregated metrics are transmitted to our
                      servers, not raw camera data or individual-level information.
                    </p>
                  </div>
                )}

                {selectedNode === "encryption" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Encryption Layer</h3>
                    <p className="mb-2">All data transmitted from devices is protected by:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>TLS 1.3 for secure data transmission</li>
                      <li>End-to-end encryption for sensitive information</li>
                      <li>Secure authentication using JWT and OAuth2</li>
                      <li>Certificate pinning to prevent man-in-the-middle attacks</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> Data cannot be intercepted or read during transmission,
                      ensuring confidentiality between devices and our platform.
                    </p>
                  </div>
                )}

                {selectedNode === "platform" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Lumen Platform</h3>
                    <p className="mb-2">Our core platform processes data for:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>Ad delivery optimization and targeting</li>
                      <li>Performance measurement and analytics</li>
                      <li>Machine learning model improvement via federated learning</li>
                      <li>Billing and payment processing</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> Data is processed according to the purposes specified in our
                      Privacy Policy, with strict access controls and security measures.
                    </p>
                  </div>
                )}

                {selectedNode === "storage" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Data Storage</h3>
                    <p className="mb-2">Data is stored with the following protections:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>Encryption at rest for all databases</li>
                      <li>Data partitioning and access controls</li>
                      <li>Automated data retention policies</li>
                      <li>Regular security audits and monitoring</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> We maintain data minimization principles and only store
                      information necessary for our stated purposes, with appropriate retention periods.
                    </p>
                  </div>
                )}

                {selectedNode === "advertisers" && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Advertisers & Partners</h3>
                    <p className="mb-2">We share the following with advertisers and partners:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>Aggregated audience metrics and demographics</li>
                      <li>Campaign performance statistics</li>
                      <li>Engagement rates and conversion data</li>
                      <li>Device performance metrics (for partners)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground">
                      <strong>Privacy Protection:</strong> Only anonymized, aggregated data is shared with third
                      parties. Individual-level data or personally identifiable information is never shared without
                      explicit consent.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="detailed" className="mt-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">1. Data Collection</h3>
              <p className="mb-2">
                Our Android TV applications collect anonymous audience metrics using computer vision technology. This
                includes estimated viewer counts, approximate demographics, attention metrics, and anonymized emotional
                responses. For mobile installations, we also collect device location data to enable location-relevant
                content.
              </p>
              <p className="mb-2">
                <strong>Privacy Protections:</strong> No facial recognition or biometric data storage is used. All
                processing occurs locally on the device, and only aggregated, anonymized metrics are transmitted to our
                servers.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">2. Data Processing</h3>
              <p className="mb-2">
                Data is initially processed locally on the device using edge computing techniques. This includes
                anonymization, aggregation, and data minimization before any transmission occurs. When data is
                transmitted to our platform, it's protected by strong encryption and secure authentication mechanisms.
              </p>
              <p className="mb-2">
                <strong>Privacy Protections:</strong> We use federated learning techniques that allow our AI models to
                improve without centralizing raw data. This means the model learns from local data, but only model
                updates (not the data itself) are shared with our platform.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">3. Data Storage</h3>
              <p className="mb-2">
                All data stored in our systems is encrypted at rest and protected by strict access controls. We
                implement data retention policies that automatically delete information when it's no longer needed for
                our stated purposes. Regular security audits and monitoring help ensure the ongoing protection of stored
                data.
              </p>
              <p className="mb-2">
                <strong>Privacy Protections:</strong> We maintain data minimization principles and only store
                information necessary for our stated purposes, with appropriate retention periods defined in our data
                retention policy.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">4. Data Sharing</h3>
              <p className="mb-2">
                We share aggregated, anonymized data with advertisers and partners to provide campaign performance
                insights and analytics. This includes audience metrics, engagement rates, and conversion data. For
                device partners, we share performance metrics related to their specific devices.
              </p>
              <p className="mb-2">
                <strong>Privacy Protections:</strong> Only anonymized, aggregated data is shared with third parties.
                Individual-level data or personally identifiable information is never shared without explicit consent.
                All data sharing is governed by data processing agreements that ensure recipients maintain appropriate
                security and privacy standards.
              </p>
            </div>

            <div className="flex justify-center mt-6">
              <Button variant="outline">Download Data Flow Documentation</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface DataFlowNodeProps {
  icon: React.ReactNode
  title: string
  description: string
  isSelected: boolean
  onClick: () => void
}

function DataFlowNode({ icon, title, description, isSelected, onClick }: DataFlowNodeProps) {
  return (
    <div
      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <div className={`p-3 rounded-full mb-2 ${isSelected ? "bg-primary/10" : "bg-muted"}`}>{icon}</div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

