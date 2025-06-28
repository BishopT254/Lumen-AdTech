"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ArrowRight, Calendar, Download, FileText } from "lucide-react"

export function PrivacyPolicyVersionHistory() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  const versions = [
    {
      version: "3.2.1",
      date: "April 2, 2024",
      changes: [
        "Updated information about federated learning implementation",
        "Added details about blockchain verification for ad impressions",
        "Clarified data retention periods",
        "Enhanced explanation of emotion detection privacy safeguards",
      ],
    },
    {
      version: "3.1.0",
      date: "January 15, 2024",
      changes: [
        "Added section on sustainability analytics and carbon footprint tracking",
        "Updated third-party service provider list",
        "Enhanced data subject rights section with more detailed explanations",
        "Added information about voice command processing",
      ],
    },
    {
      version: "3.0.0",
      date: "October 5, 2023",
      changes: [
        "Major revision to align with platform expansion to retail environments",
        "Added information about AR/VR content delivery and privacy implications",
        "Updated international data transfer mechanisms",
        "Comprehensive review and enhancement of all sections",
      ],
    },
    {
      version: "2.2.1",
      date: "July 12, 2023",
      changes: [
        "Updated contact information for Data Protection Officer",
        "Clarified audience measurement technology details",
        "Minor language improvements for clarity",
        "Fixed broken links in policy",
      ],
    },
    {
      version: "2.2.0",
      date: "May 1, 2023",
      changes: [
        "Added information about edge computing privacy protections",
        "Updated compliance with latest GDPR guidance",
        "Enhanced explanation of anonymization techniques",
        "Added section on children's privacy",
      ],
    },
    {
      version: "2.1.0",
      date: "February 10, 2023",
      changes: [
        "Added compliance information for Brazil's LGPD",
        "Updated California privacy rights section for CPRA",
        "Enhanced data security section with more details",
        "Improved explanation of audience metrics collection",
      ],
    },
    {
      version: "2.0.0",
      date: "November 15, 2022",
      changes: [
        "Major platform redesign with enhanced privacy controls",
        "Added information about computer vision technology",
        "Updated data processing methods and anonymization techniques",
        "Expanded international data transfer section",
        "Comprehensive review of all privacy practices",
      ],
    },
    {
      version: "1.5.0",
      date: "August 3, 2022",
      changes: [
        "Added information about location data processing",
        "Updated third-party service providers list",
        "Enhanced explanation of data subject rights",
        "Improved clarity on data retention policies",
      ],
    },
    {
      version: "1.0.0",
      date: "May 10, 2022",
      changes: [
        "Initial privacy policy release",
        "Established baseline privacy practices",
        "Defined data collection and processing activities",
        "Outlined user rights and company obligations",
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="timeline">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="comparison">Version Comparison</TabsTrigger>
          <TabsTrigger value="archive">Policy Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-6">
            <div className="relative">
              {versions.map((version, index) => (
                <div key={version.version} className="mb-8 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

                  <div className="relative flex items-start">
                    <div className="absolute left-0 w-3 h-3 rounded-full bg-primary -translate-x-1.5 mt-1.5" />

                    <div className="ml-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <Badge variant={index === 0 ? "default" : "outline"} className="w-fit">
                          v{version.version}
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {version.date}
                        </div>
                      </div>

                      <Card className={`${selectedVersion === version.version ? "border-primary" : ""}`}>
                        <CardContent className="p-4">
                          <ul className="list-disc pl-5 space-y-1 mb-4">
                            {version.changes.map((change, i) => (
                              <li key={i} className="text-sm">
                                {change}
                              </li>
                            ))}
                          </ul>

                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => setSelectedVersion(version.version)}>
                              <FileText className="mr-2 h-4 w-4" />
                              View This Version
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Compare From:</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  {versions.map((version) => (
                    <option key={version.version} value={version.version}>
                      v{version.version} ({version.date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Compare To:</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                  {versions.map((version, index) => (
                    <option key={version.version} value={version.version} selected={index === 0}>
                      v{version.version} ({version.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button className="w-full">Generate Comparison</Button>

            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-muted-foreground">
                Select two versions above and click "Generate Comparison" to see the differences between policy
                versions.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {versions.map((version) => (
                <Card key={version.version}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">Version {version.version}</h3>
                        <p className="text-sm text-muted-foreground">{version.date}</p>
                      </div>
                      <Badge variant="outline">PDF</Badge>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedVersion && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Version {selectedVersion} Preview</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVersion(null)}>
              Close Preview
            </Button>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <Badge>Version {selectedVersion}</Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Privacy Policy (Version {selectedVersion})</h2>
              <p className="text-muted-foreground mb-4">
                This is a preview of the privacy policy as it appeared in version {selectedVersion}. The full content
                would be displayed here in a real implementation.
              </p>

              <div className="h-40 flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground">Full policy content would appear here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

