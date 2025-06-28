"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PrivacyPolicyDataRequest() {
  const [requestType, setRequestType] = useState("access")
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formError, setFormError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real implementation, this would submit to an API
    try {
      setFormSubmitted(true)
      setFormError(false)
    } catch (error) {
      setFormError(true)
    }
  }

  if (formSubmitted) {
    return (
      <div className="space-y-4">
        <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Request Submitted</AlertTitle>
          <AlertDescription>
            Your data request has been submitted successfully. You will receive a confirmation email shortly. We will
            process your request within 30 days as required by applicable privacy laws.
          </AlertDescription>
        </Alert>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-2">What happens next?</h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>You'll receive an email confirmation with your request details</li>
            <li>Our Data Protection Officer will review your request</li>
            <li>We may contact you for identity verification if needed</li>
            <li>We'll process your request within 30 days</li>
            <li>You'll receive a final notification when your request is completed</li>
          </ol>
        </div>

        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => setFormSubmitted(false)}>
            Submit Another Request
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>There was a problem submitting your request. Please try again.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Request Type</Label>
            <RadioGroup
              defaultValue="access"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
              onValueChange={setRequestType}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="access" id="access" />
                <Label htmlFor="access">Access My Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete">Delete My Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="correct" id="correct" />
                <Label htmlFor="correct">Correct My Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="restrict" id="restrict" />
                <Label htmlFor="restrict">Restrict Processing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portability" id="portability" />
                <Label htmlFor="portability">Data Portability</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="objection" id="objection" />
                <Label htmlFor="objection">Object to Processing</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" required />
            <p className="text-xs text-muted-foreground">
              We'll use this email to communicate about your request and verify your identity
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country of Residence</Label>
            <Select defaultValue="global">
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="eu">European Union</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === "correct" && (
            <div className="space-y-2">
              <Label htmlFor="correction">Correction Details</Label>
              <Textarea
                id="correction"
                placeholder="Please describe what information needs to be corrected and how"
                required
              />
            </div>
          )}

          {requestType === "delete" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Deletion Scope</CardTitle>
                <CardDescription>Select what data you want to delete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delete-all" />
                    <Label htmlFor="delete-all">All personal data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delete-account" />
                    <Label htmlFor="delete-account">Account information only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delete-analytics" />
                    <Label htmlFor="delete-analytics">Analytics data only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delete-marketing" />
                    <Label htmlFor="delete-marketing">Marketing preferences only</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="details">Additional Details</Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional information that might help us process your request"
            />
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox id="consent" required />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="consent" className="text-sm font-normal leading-snug text-muted-foreground">
                I confirm that I am the data subject or legally authorized to act on their behalf, and the information
                provided is accurate.
              </Label>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full">
          Submit Request
        </Button>
      </form>
    </div>
  )
}

