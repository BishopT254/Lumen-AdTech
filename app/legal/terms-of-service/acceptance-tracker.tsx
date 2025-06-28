"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Clock, FileText } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TermsAcceptanceTracker() {
  const [acceptanceHistory] = useState([
    {
      version: "2.5.0",
      acceptedDate: "April 2, 2024",
      method: "Account Login",
      ipAddress: "192.168.1.xxx",
      device: "Chrome on Windows",
    },
    {
      version: "2.4.0",
      acceptedDate: "January 15, 2024",
      method: "Email Confirmation",
      ipAddress: "192.168.1.xxx",
      device: "Safari on macOS",
    },
    {
      version: "2.3.0",
      acceptedDate: "October 10, 2023",
      method: "Account Login",
      ipAddress: "192.168.1.xxx",
      device: "Firefox on Windows",
    },
    {
      version: "2.0.0",
      acceptedDate: "June 5, 2023",
      method: "Account Creation",
      ipAddress: "192.168.1.xxx",
      device: "Chrome on Android",
    },
  ])

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="font-medium">Current Acceptance Status</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          You have accepted the current version (2.5.0) of our Terms of Service.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last accepted on April 2, 2024</span>
        </div>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Acceptance History</TabsTrigger>
          <TabsTrigger value="changes">What Changed</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-4">
            {acceptanceHistory.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={index === 0 ? "default" : "outline"}>Version {item.version}</Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {item.acceptedDate}
                        </div>
                      </div>
                      <p className="text-sm">Accepted via: {item.method}</p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <FileText className="mr-2 h-4 w-4" />
                      View Version
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>IP Address: {item.ipAddress}</div>
                    <div>Device: {item.device}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="changes" className="mt-4">
          <div className="space-y-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge>Version 2.5.0</Badge>
                <span className="text-sm text-muted-foreground">April 2, 2024</span>
              </div>
              <h3 className="font-medium mb-2">Key Changes from Previous Version</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Updated Partner commission structure (Section 6.2)</li>
                <li>Added support for AR/VR ad experiences (Section 4)</li>
                <li>Enhanced data security requirements (Section 10.2)</li>
                <li>Updated dispute resolution process (Section 13)</li>
                <li>Clarified content guidelines for restricted categories (Section 7.2)</li>
              </ul>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Version 2.4.0</Badge>
                <span className="text-sm text-muted-foreground">January 15, 2024</span>
              </div>
              <h3 className="font-medium mb-2">Key Changes from Previous Version</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Added blockchain verification for impressions (Section 5.5)</li>
                <li>Updated payment methods to include mobile money services (Section 8.1)</li>
                <li>Enhanced Partner device requirements (Section 6.3)</li>
                <li>Updated intellectual property provisions (Section 9)</li>
                <li>Clarified termination procedures (Section 12)</li>
              </ul>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Version 2.3.0</Badge>
                <span className="text-sm text-muted-foreground">October 10, 2023</span>
              </div>
              <h3 className="font-medium mb-2">Key Changes from Previous Version</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Added support for voice-activated engagement (Section 4)</li>
                <li>Updated content technical requirements (Section 7.3)</li>
                <li>Enhanced confidentiality provisions (Section 10)</li>
                <li>Updated limitation of liability (Section 11)</li>
                <li>Added sustainability tracking features (Section 4)</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-4">
        <Button variant="outline" size="sm">
          Download Acceptance Records
        </Button>
      </div>
    </div>
  )
}

