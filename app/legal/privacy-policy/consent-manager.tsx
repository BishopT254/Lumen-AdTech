"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PrivacyPolicyConsentManager() {
  const [consents, setConsents] = useState({
    analytics: true,
    audienceMetrics: true,
    locationTracking: true,
    emotionDetection: false,
    thirdPartySharing: true,
    personalization: true,
  })

  const [saved, setSaved] = useState(false)

  const handleConsentChange = (key: string, value: boolean) => {
    setConsents((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSaved(false)
  }

  const handleSavePreferences = () => {
    // In a real implementation, this would save to backend/cookies
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleAcceptAll = () => {
    setConsents({
      analytics: true,
      audienceMetrics: true,
      locationTracking: true,
      emotionDetection: true,
      thirdPartySharing: true,
      personalization: true,
    })
    setSaved(false)
  }

  const handleRejectAll = () => {
    setConsents({
      analytics: false,
      audienceMetrics: false,
      locationTracking: false,
      emotionDetection: false,
      thirdPartySharing: false,
      personalization: false,
    })
    setSaved(false)
  }

  return (
    <div className="space-y-6">
      {saved && (
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your privacy preferences have been saved successfully.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Consents</TabsTrigger>
          <TabsTrigger value="required">Required</TabsTrigger>
          <TabsTrigger value="optional">Optional</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="analytics" className="font-medium">
                Analytics & Performance
              </Label>
              <p className="text-sm text-muted-foreground">Allow us to collect usage data to improve our platform</p>
            </div>
            <Switch
              id="analytics"
              checked={consents.analytics}
              onCheckedChange={(checked) => handleConsentChange("analytics", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="audienceMetrics" className="font-medium">
                Audience Metrics
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous counting of viewers and basic demographics
              </p>
            </div>
            <Switch
              id="audienceMetrics"
              checked={consents.audienceMetrics}
              onCheckedChange={(checked) => handleConsentChange("audienceMetrics", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="locationTracking" className="font-medium">
                Location Tracking
              </Label>
              <p className="text-sm text-muted-foreground">Allow tracking of device location for relevant content</p>
            </div>
            <Switch
              id="locationTracking"
              checked={consents.locationTracking}
              onCheckedChange={(checked) => handleConsentChange("locationTracking", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="emotionDetection" className="font-medium">
                Emotion Detection
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous analysis of emotional responses to content
              </p>
            </div>
            <Switch
              id="emotionDetection"
              checked={consents.emotionDetection}
              onCheckedChange={(checked) => handleConsentChange("emotionDetection", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="thirdPartySharing" className="font-medium">
                Third-Party Data Sharing
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow sharing of anonymized data with advertisers and partners
              </p>
            </div>
            <Switch
              id="thirdPartySharing"
              checked={consents.thirdPartySharing}
              onCheckedChange={(checked) => handleConsentChange("thirdPartySharing", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="personalization" className="font-medium">
                Personalization
              </Label>
              <p className="text-sm text-muted-foreground">Allow content personalization based on interactions</p>
            </div>
            <Switch
              id="personalization"
              checked={consents.personalization}
              onCheckedChange={(checked) => handleConsentChange("personalization", checked)}
            />
          </div>
        </TabsContent>

        <TabsContent value="required" className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Required Consents</AlertTitle>
            <AlertDescription>
              These consents are necessary for the basic functionality of our platform and cannot be disabled.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label className="font-medium">Essential Cookies</Label>
              <p className="text-sm text-muted-foreground">Necessary for the website to function properly</p>
            </div>
            <Switch checked={true} disabled />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label className="font-medium">Security</Label>
              <p className="text-sm text-muted-foreground">Required for secure operation and fraud prevention</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </TabsContent>

        <TabsContent value="optional" className="space-y-4 mt-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="analytics" className="font-medium">
                Analytics & Performance
              </Label>
              <p className="text-sm text-muted-foreground">Allow us to collect usage data to improve our platform</p>
            </div>
            <Switch
              id="analytics"
              checked={consents.analytics}
              onCheckedChange={(checked) => handleConsentChange("analytics", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="audienceMetrics" className="font-medium">
                Audience Metrics
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous counting of viewers and basic demographics
              </p>
            </div>
            <Switch
              id="audienceMetrics"
              checked={consents.audienceMetrics}
              onCheckedChange={(checked) => handleConsentChange("audienceMetrics", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="locationTracking" className="font-medium">
                Location Tracking
              </Label>
              <p className="text-sm text-muted-foreground">Allow tracking of device location for relevant content</p>
            </div>
            <Switch
              id="locationTracking"
              checked={consents.locationTracking}
              onCheckedChange={(checked) => handleConsentChange("locationTracking", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="emotionDetection" className="font-medium">
                Emotion Detection
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous analysis of emotional responses to content
              </p>
            </div>
            <Switch
              id="emotionDetection"
              checked={consents.emotionDetection}
              onCheckedChange={(checked) => handleConsentChange("emotionDetection", checked)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 justify-end mt-6">
        <Button variant="outline" onClick={handleRejectAll}>
          Reject All
        </Button>
        <Button variant="outline" onClick={handleAcceptAll}>
          Accept All
        </Button>
        <Button onClick={handleSavePreferences}>Save Preferences</Button>
      </div>
    </div>
  )
}

function Separator() {
  return <div className="h-px bg-border my-4" />
}

