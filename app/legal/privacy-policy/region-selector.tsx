"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Globe, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PrivacyPolicyRegionSelector() {
  const [selectedRegion, setSelectedRegion] = useState("global")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Select Your Region:</span>
        </div>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global (Default)</SelectItem>
            <SelectItem value="eu">European Union (GDPR)</SelectItem>
            <SelectItem value="uk">United Kingdom</SelectItem>
            <SelectItem value="us">United States (CCPA/CPRA)</SelectItem>
            <SelectItem value="ca">Canada (PIPEDA)</SelectItem>
            <SelectItem value="au">Australia (Privacy Act)</SelectItem>
            <SelectItem value="br">Brazil (LGPD)</SelectItem>
            <SelectItem value="za">South Africa (POPIA)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedRegion === "global" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Global Privacy Policy</AlertTitle>
          <AlertDescription>
            You are viewing our global privacy policy. Select a specific region to see additional information relevant
            to your location.
          </AlertDescription>
        </Alert>
      )}

      {selectedRegion === "eu" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>European Union</CardTitle>
              <Badge>GDPR</Badge>
            </div>
            <CardDescription>
              Additional information for individuals in the European Union under the General Data Protection Regulation
              (GDPR)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Legal Basis for Processing</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Under the GDPR, we must have a legal basis for processing your personal data. Our legal bases include:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>Consent:</strong> Where you have given clear consent for us to process your personal data for
                  a specific purpose
                </li>
                <li>
                  <strong>Contract:</strong> Where processing is necessary for the performance of a contract with you
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> Where processing is necessary for our legitimate interests or
                  those of a third party
                </li>
                <li>
                  <strong>Legal Obligation:</strong> Where processing is necessary to comply with a legal obligation
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Your Enhanced Rights</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Under the GDPR, you have enhanced rights regarding your personal data, including:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Right to be informed about how your data is used</li>
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Rights related to automated decision making and profiling</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Data Protection Officer</h3>
              <p className="text-sm text-muted-foreground">
                Our Data Protection Officer can be contacted at dpo@lumen-adtech.com or by mail at Lumen AdTech, GDPR
                Compliance Department, Nairobi, Kenya. EU residents may also contact our EU representative at
                eu-rep@lumen-adtech.com.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Supervisory Authority</h3>
              <p className="text-sm text-muted-foreground">
                You have the right to lodge a complaint with your local data protection authority if you have concerns
                about how we process your personal information.
              </p>
            </div>

            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm">
                Download GDPR-Specific Privacy Notice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRegion === "us" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>United States</CardTitle>
              <Badge>CCPA/CPRA</Badge>
            </div>
            <CardDescription>
              Additional information for California residents under the California Consumer Privacy Act (CCPA) and
              California Privacy Rights Act (CPRA)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">California Privacy Rights</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you are a California resident, you have the following rights under the CCPA/CPRA:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Right to know what personal information is collected, used, shared, or sold</li>
                <li>Right to delete personal information held by businesses</li>
                <li>Right to opt-out of the sale or sharing of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
                <li>Right to correct inaccurate personal information</li>
                <li>Right to limit use and disclosure of sensitive personal information</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Categories of Personal Information Collected</h3>
              <p className="text-sm text-muted-foreground mb-2">
                In the past 12 months, we have collected the following categories of personal information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Identifiers (e.g., name, email address)</li>
                <li>Commercial information (e.g., products or services purchased)</li>
                <li>Internet or other electronic network activity information</li>
                <li>Geolocation data</li>
                <li>Professional or employment-related information</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">No Sale of Personal Information</h3>
              <p className="text-sm text-muted-foreground">
                Lumen does not sell personal information as defined under the CCPA/CPRA. We may share anonymized,
                aggregated data with third parties for business purposes, but this information cannot reasonably be used
                to identify individuals.
              </p>
            </div>

            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm">
                Download California Privacy Notice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRegion !== "global" && selectedRegion !== "eu" && selectedRegion !== "us" && (
        <Card>
          <CardHeader>
            <CardTitle>{getRegionName(selectedRegion)}</CardTitle>
            <CardDescription>Additional information for individuals in {getRegionName(selectedRegion)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We are committed to complying with all applicable privacy laws in {getRegionName(selectedRegion)}. For
              specific information about your privacy rights in this region, please contact our Data Protection Officer
              at privacy@lumen-adtech.com.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="comparison" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">Regional Comparison</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 border">Feature</th>
                  <th className="text-left p-3 border">Global</th>
                  <th className="text-left p-3 border">EU (GDPR)</th>
                  <th className="text-left p-3 border">US (CCPA/CPRA)</th>
                  <th className="text-left p-3 border">Canada (PIPEDA)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border font-medium">Access Right</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Deletion Right</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Correction Right</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">✓</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Portability Right</td>
                  <td className="p-3 border">Limited</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">Limited</td>
                  <td className="p-3 border">Limited</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Opt-out of Sale</td>
                  <td className="p-3 border">N/A</td>
                  <td className="p-3 border">N/A</td>
                  <td className="p-3 border">✓</td>
                  <td className="p-3 border">N/A</td>
                </tr>
                <tr>
                  <td className="p-3 border font-medium">Response Time</td>
                  <td className="p-3 border">30 days</td>
                  <td className="p-3 border">30 days</td>
                  <td className="p-3 border">45 days</td>
                  <td className="p-3 border">30 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="rights" className="mt-4">
          <div className="space-y-4">
            <p>
              Based on your selected region ({getRegionName(selectedRegion)}), you have the following rights regarding
              your personal data:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You have the right to request information about what personal data we process about you and to
                    receive a copy of that data.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deletion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You have the right to request deletion of your personal information (right to be forgotten).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Correction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You have the right to request correction of inaccurate or incomplete information.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Objection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    You have the right to object to processing of your personal information.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center mt-4">
              <Button asChild>
                <a href="#data-request">Submit a Data Request</a>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getRegionName(code: string): string {
  const regions: Record<string, string> = {
    global: "Global",
    eu: "European Union",
    uk: "United Kingdom",
    us: "United States",
    ca: "Canada",
    au: "Australia",
    br: "Brazil",
    za: "South Africa",
  }

  return regions[code] || code
}

