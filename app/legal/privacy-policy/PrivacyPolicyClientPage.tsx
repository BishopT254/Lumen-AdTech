"use client"
import Link from "next/link"
import { Download, Eye, FileText, Globe, History, Printer, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PrivacyPolicyVersionHistory } from "./version-history"
import { PrivacyPolicyDataFlow } from "./data-flow"
import { PrivacyPolicyConsentManager } from "./consent-manager"
import { PrivacyPolicyDataRequest } from "./data-request"
import { PrivacyPolicyRegionSelector } from "./region-selector"

export default function PrivacyPolicyClientPage() {
  return (
    <div className="container max-w-7xl mx-auto py-6 md:py-10 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs font-normal">
              Last Updated: April 2, 2024
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              Version 3.2.1
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground max-w-3xl">
            This Privacy Policy explains how Lumen AdTech Platform collects, uses, and protects your personal
            information across our AI-powered advertising technology ecosystem.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search policy..." className="pl-9 w-full md:w-[260px]" />
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print policy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print policy</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download as PDF</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <History className="h-4 w-4" />
                    <span className="sr-only">Version history</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Version history</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="sticky top-20">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent className="py-0">
                <nav className="space-y-1">
                  {[
                    { name: "Overview", href: "#overview" },
                    { name: "Information We Collect", href: "#information-we-collect" },
                    { name: "How We Use Your Information", href: "#how-we-use" },
                    { name: "Data Sharing & Third Parties", href: "#data-sharing" },
                    { name: "Your Privacy Rights", href: "#privacy-rights" },
                    { name: "Data Security", href: "#data-security" },
                    { name: "Children's Privacy", href: "#childrens-privacy" },
                    { name: "International Data Transfers", href: "#international-transfers" },
                    { name: "Policy Updates", href: "#policy-updates" },
                    { name: "Contact Us", href: "#contact-us" },
                  ].map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </CardContent>
              <CardFooter className="pt-4 pb-4 flex flex-col items-start gap-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Region:</span>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    Global (Default)
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  View Data Processing Addendum
                </Button>
              </CardFooter>
            </Card>

            <Card className="mt-4">
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Interactive Tools</CardTitle>
                <CardDescription>Manage your privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="py-0 space-y-4">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="#consent-manager">
                    <Eye className="mr-2 h-4 w-4" />
                    Consent Manager
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="#data-flow">
                    <Eye className="mr-2 h-4 w-4" />
                    View Data Flow
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="#data-request">
                    <Eye className="mr-2 h-4 w-4" />
                    Submit Data Request
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-9">
          <Tabs defaultValue="policy" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="policy">Full Policy</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="interactive">Interactive</TabsTrigger>
              <TabsTrigger value="history">Version History</TabsTrigger>
            </TabsList>

            <TabsContent value="policy" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                    <div className="space-y-8">
                      <section id="overview">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">1. Overview</h2>
                        <p className="mb-4">
                          Lumen AI-Powered Smart AdTech Platform ("Lumen," "we," "our," or "us") is committed to
                          protecting your privacy. This Privacy Policy explains our practices regarding the collection,
                          use, and disclosure of information that we receive through our advertising technology
                          services, which include our Android TV applications deployed in public spaces, transportation
                          vehicles, and retail environments.
                        </p>
                        <p className="mb-4">
                          Our platform leverages artificial intelligence, real-time analytics, and IoT integration to
                          provide a revolutionary advertising experience where advertisers pay based on actual
                          engagement, impressions, and conversions rather than traditional flat rates.
                        </p>
                        <div className="bg-muted p-4 rounded-lg my-6">
                          <h3 className="font-medium mb-2">Key Privacy Points</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>We collect anonymous audience metrics using computer vision technology</li>
                            <li>Personal data is processed with privacy-preserving techniques</li>
                            <li>We use federated learning to improve our services without centralizing raw data</li>
                            <li>You can opt out of personalized advertising through our Consent Manager</li>
                            <li>We implement blockchain-verified impressions for transparency</li>
                          </ul>
                        </div>
                      </section>

                      <section id="information-we-collect">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">2. Information We Collect</h2>

                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>
                              <h3 className="text-lg font-medium">2.1 Audience Metrics</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="mb-4">
                                Our Android TV applications may use computer vision technology to collect anonymous
                                audience metrics, including:
                              </p>
                              <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>Estimated audience count (number of viewers)</li>
                                <li>Approximate age ranges and gender distribution (demographic estimation)</li>
                                <li>Attention metrics (glance detection, dwell time)</li>
                                <li>Anonymized emotional responses (joy, surprise, neutral expressions)</li>
                              </ul>
                              <p className="text-muted-foreground text-sm">
                                <strong>Important:</strong> Our computer vision technology does not use facial
                                recognition or store personal biometric data. All processing occurs locally on the
                                device, and only aggregated, anonymized metrics are transmitted to our servers.
                              </p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="item-2">
                            <AccordionTrigger>
                              <h3 className="text-lg font-medium">2.2 Location Data</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="mb-4">
                                For mobile installations (such as in matatus and boda-bodas), we collect:
                              </p>
                              <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>GPS location data of the device (not individual users)</li>
                                <li>Route information and travel patterns</li>
                                <li>Geo-fencing data for location-specific ad triggering</li>
                              </ul>
                              <p className="text-muted-foreground text-sm">
                                This information helps us deliver location-relevant content and measure the performance
                                of advertisements in different areas.
                              </p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="item-3">
                            <AccordionTrigger>
                              <h3 className="text-lg font-medium">2.3 Device Information</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="mb-4">
                                We collect information about the Android TV devices in our network, including:
                              </p>
                              <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>Device identifiers and technical specifications</li>
                                <li>Operating system and application version</li>
                                <li>Network connection information</li>
                                <li>Performance and health metrics</li>
                                <li>Energy consumption data (for sustainability tracking)</li>
                              </ul>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="item-4">
                            <AccordionTrigger>
                              <h3 className="text-lg font-medium">2.4 Engagement Data</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="mb-4">When users interact with our advertisements, we may collect:</p>
                              <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>QR code scans and click-through actions</li>
                                <li>Voice command interactions (when enabled)</li>
                                <li>AR experience engagement metrics</li>
                                <li>Conversion events (purchases, sign-ups, etc.)</li>
                              </ul>
                              <p className="text-muted-foreground text-sm">
                                These interactions are typically anonymized unless you explicitly provide personal
                                information through a form or application.
                              </p>
                            </AccordionContent>
                          </AccordionItem>

                          <AccordionItem value="item-5">
                            <AccordionTrigger>
                              <h3 className="text-lg font-medium">2.5 Partner and Advertiser Information</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="mb-4">For our business customers (advertisers and partners), we collect:</p>
                              <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li>Account information (name, email, phone number)</li>
                                <li>Company details and business address</li>
                                <li>Payment information and transaction history</li>
                                <li>Campaign preferences and settings</li>
                                <li>Usage data related to our platform</li>
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </section>

                      <section id="how-we-use">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">3. How We Use Your Information</h2>
                        <p className="mb-4">We use the collected information for the following purposes:</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Core Platform Functionality</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Delivering targeted advertisements</li>
                                <li>Measuring ad performance and engagement</li>
                                <li>Processing payments and commissions</li>
                                <li>Managing advertiser campaigns and partner devices</li>
                              </ul>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Analytics & Improvement</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Analyzing audience engagement patterns</li>
                                <li>Improving ad targeting algorithms</li>
                                <li>Enhancing platform features and usability</li>
                                <li>Training our AI models via federated learning</li>
                              </ul>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Business Operations</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Providing customer support</li>
                                <li>Processing transactions and payments</li>
                                <li>Maintaining business records</li>
                                <li>Communicating about service updates</li>
                              </ul>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Legal & Compliance</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Complying with legal obligations</li>
                                <li>Enforcing our terms of service</li>
                                <li>Preventing fraud and unauthorized access</li>
                                <li>Resolving disputes</li>
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Special Note on AI & Machine Learning</h3>
                          <p className="mb-2">
                            Our platform uses artificial intelligence and machine learning to optimize ad delivery and
                            measure engagement. We employ privacy-preserving techniques such as:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              <strong>Federated Learning:</strong> Model training occurs across distributed devices
                              without centralizing raw data
                            </li>
                            <li>
                              <strong>Edge Computing:</strong> Processing sensitive data locally on devices rather than
                              in the cloud
                            </li>
                            <li>
                              <strong>Differential Privacy:</strong> Adding statistical noise to datasets to protect
                              individual privacy
                            </li>
                            <li>
                              <strong>Aggregation:</strong> Working with grouped data rather than individual-level
                              information
                            </li>
                          </ul>
                        </div>
                      </section>

                      <section id="data-sharing">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">4. Data Sharing & Third Parties</h2>
                        <p className="mb-4">We may share information with the following categories of third parties:</p>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted">
                                <th className="text-left p-3 border">Recipient Category</th>
                                <th className="text-left p-3 border">Purpose of Sharing</th>
                                <th className="text-left p-3 border">Data Categories</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="p-3 border">Advertisers</td>
                                <td className="p-3 border">Campaign performance reporting, audience insights</td>
                                <td className="p-3 border">
                                  Aggregated analytics, engagement metrics, demographic estimates (anonymized)
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 border">Partners (Device Owners)</td>
                                <td className="p-3 border">Revenue sharing, device performance monitoring</td>
                                <td className="p-3 border">
                                  Device metrics, impression counts, commission calculations
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 border">Service Providers</td>
                                <td className="p-3 border">Platform operations, payment processing, cloud hosting</td>
                                <td className="p-3 border">
                                  Account information, transaction data, platform usage data
                                </td>
                              </tr>
                              <tr>
                                <td className="p-3 border">Analytics Partners</td>
                                <td className="p-3 border">Performance measurement, audience analysis</td>
                                <td className="p-3 border">Anonymized engagement data, aggregated audience metrics</td>
                              </tr>
                              <tr>
                                <td className="p-3 border">Legal Authorities</td>
                                <td className="p-3 border">
                                  Compliance with legal obligations, law enforcement requests
                                </td>
                                <td className="p-3 border">
                                  As required by applicable law, court order, or regulation
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-3">Blockchain Verification</h3>
                          <p className="mb-4">
                            Our platform uses Hyperledger Fabric blockchain technology to create immutable records of ad
                            impressions and engagements. This blockchain contains transaction hashes and metadata but
                            does not store personal information. The blockchain serves as a transparent verification
                            system for advertisers and partners.
                          </p>

                          <h3 className="text-lg font-medium mb-3 mt-6">No Sale of Personal Information</h3>
                          <p>
                            Lumen does not sell personal information as defined under applicable privacy laws. We may
                            share anonymized, aggregated data with third parties for business purposes, but this
                            information cannot reasonably be used to identify individuals.
                          </p>
                        </div>
                      </section>

                      <section id="privacy-rights">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">5. Your Privacy Rights</h2>
                        <p className="mb-6">
                          Depending on your location, you may have certain rights regarding your personal information.
                          These may include:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Access</h3>
                            <p className="text-sm text-muted-foreground">
                              Request information about what personal data we process about you
                            </p>
                          </div>

                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Correction</h3>
                            <p className="text-sm text-muted-foreground">
                              Request correction of inaccurate or incomplete information
                            </p>
                          </div>

                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Deletion</h3>
                            <p className="text-sm text-muted-foreground">
                              Request deletion of your personal information (right to be forgotten)
                            </p>
                          </div>

                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Restriction</h3>
                            <p className="text-sm text-muted-foreground">
                              Request restriction of processing of your personal information
                            </p>
                          </div>

                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Portability</h3>
                            <p className="text-sm text-muted-foreground">
                              Request transfer of your personal information in a structured format
                            </p>
                          </div>

                          <div className="bg-card border rounded-lg p-4">
                            <h3 className="font-medium mb-2">Objection</h3>
                            <p className="text-sm text-muted-foreground">
                              Object to processing of your personal information
                            </p>
                          </div>
                        </div>

                        <p className="mb-4">
                          To exercise any of these rights, please use our{" "}
                          <Link href="#data-request" className="text-primary underline">
                            Data Request Form
                          </Link>{" "}
                          or contact our Data Protection Officer at privacy@lumen-adtech.com.
                        </p>

                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Response Timeline</h3>
                          <p className="mb-2">
                            We will respond to your request within 30 days. In some cases, we may need additional time
                            to respond, and we will notify you if this is the case. We may also need to verify your
                            identity before processing certain requests.
                          </p>
                        </div>
                      </section>

                      <section id="data-security">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">6. Data Security</h2>
                        <p className="mb-4">
                          We implement appropriate technical and organizational measures to protect your information
                          against unauthorized access, alteration, disclosure, or destruction.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h3 className="text-lg font-medium mb-3">Technical Safeguards</h3>
                            <ul className="list-disc pl-5 space-y-2">
                              <li>End-to-end encryption for sensitive data</li>
                              <li>Secure authentication using JWT and OAuth2</li>
                              <li>HTTPS enforcement across all endpoints</li>
                              <li>Regular security audits and penetration testing</li>
                              <li>Intrusion detection and prevention systems</li>
                              <li>Data encryption at rest and in transit</li>
                            </ul>
                          </div>

                          <div>
                            <h3 className="text-lg font-medium mb-3">Organizational Measures</h3>
                            <ul className="list-disc pl-5 space-y-2">
                              <li>Employee security training and awareness programs</li>
                              <li>Access controls and least privilege principles</li>
                              <li>Regular security risk assessments</li>
                              <li>Incident response procedures</li>
                              <li>Vendor security assessment process</li>
                              <li>Data protection impact assessments</li>
                            </ul>
                          </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Data Breach Notification</h3>
                          <p>
                            In the event of a data breach that affects your personal information, we will notify you and
                            the relevant supervisory authorities as required by applicable law. Our notification will
                            include information about the nature of the breach, the information affected, and steps you
                            can take to mitigate potential harm.
                          </p>
                        </div>
                      </section>

                      <section id="childrens-privacy">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">7. Children's Privacy</h2>
                        <p className="mb-4">
                          Our services are not directed to children under the age of 16. We do not knowingly collect
                          personal information from children under 16. If we become aware that we have collected
                          personal information from a child under 16 without verification of parental consent, we will
                          take steps to remove that information from our servers.
                        </p>
                        <p>
                          Our audience measurement technology is designed to avoid processing children's data in detail.
                          While our systems may detect the presence of younger viewers for aggregate counting purposes,
                          we do not create profiles or target advertisements specifically to children.
                        </p>
                      </section>

                      <section id="international-transfers">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">8. International Data Transfers</h2>
                        <p className="mb-4">
                          Lumen operates globally, and your information may be transferred to, stored, and processed in
                          countries other than your country of residence. These countries may have data protection laws
                          that differ from those in your country.
                        </p>

                        <div className="bg-muted p-4 rounded-lg mb-6">
                          <h3 className="font-medium mb-2">Safeguards for International Transfers</h3>
                          <p className="mb-2">
                            When we transfer personal information outside of your region, we implement appropriate
                            safeguards, which may include:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Standard Contractual Clauses approved by the European Commission</li>
                            <li>Data Processing Agreements with third-party service providers</li>
                            <li>Binding Corporate Rules for intra-group transfers</li>
                            <li>Privacy Shield certification (where applicable)</li>
                            <li>Obtaining your explicit consent for certain transfers</li>
                          </ul>
                        </div>

                        <p>
                          You can request more information about the specific safeguards applied to the export of your
                          personal information by contacting our Data Protection Officer.
                        </p>
                      </section>

                      <section id="policy-updates">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">9. Policy Updates</h2>
                        <p className="mb-4">
                          We may update this Privacy Policy from time to time to reflect changes in our practices,
                          technology, legal requirements, and other factors. When we make material changes to this
                          Privacy Policy, we will notify you by:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                          <li>Posting a notice on our website</li>
                          <li>Sending an email to registered users</li>
                          <li>Updating the "Last Updated" date at the top of this policy</li>
                          <li>Providing in-app notifications where appropriate</li>
                        </ul>
                        <p>
                          We encourage you to review this Privacy Policy periodically to stay informed about our data
                          practices. Your continued use of our services after any changes to this Privacy Policy
                          constitutes your acceptance of the revised policy.
                        </p>
                      </section>

                      <section id="contact-us">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">10. Contact Us</h2>
                        <p className="mb-4">
                          If you have any questions, concerns, or requests regarding this Privacy Policy or our data
                          practices, please contact us:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Data Protection Officer</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="mb-1">Email: privacy@lumen-adtech.com</p>
                              <p className="mb-1">Phone: +254 (0) 700 123 456</p>
                              <p>Address: Lumen AdTech, Nairobi, Kenya</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Supervisory Authority</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="mb-1">
                                You have the right to lodge a complaint with your local data protection authority if you
                                have concerns about how we process your personal information.
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Response Time Commitment</h3>
                          <p>
                            We strive to respond to all privacy-related inquiries within 48 hours and to resolve any
                            concerns as quickly as possible, typically within 30 days.
                          </p>
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg">
                      <h2 className="text-xl font-bold mb-2">Privacy Policy Summary</h2>
                      <p>
                        This is a simplified summary of our Privacy Policy. For complete details, please read the full
                        policy.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">What We Collect</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Anonymous audience metrics (no facial recognition)</li>
                            <li>Device location data (for mobile installations)</li>
                            <li>Ad engagement and interaction data</li>
                            <li>Business information for partners and advertisers</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">How We Use It</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Deliver and measure advertising campaigns</li>
                            <li>Improve our AI and targeting algorithms</li>
                            <li>Process payments and manage business operations</li>
                            <li>Comply with legal obligations</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Who We Share With</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Advertisers (aggregated, anonymized data)</li>
                            <li>Device partners (performance metrics)</li>
                            <li>Service providers (for platform operations)</li>
                            <li>Legal authorities (when required by law)</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Your Rights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Access, correct, or delete your data</li>
                            <li>Object to or restrict processing</li>
                            <li>Data portability</li>
                            <li>Withdraw consent</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Security Measures</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>End-to-end encryption</li>
                            <li>Secure authentication</li>
                            <li>Regular security audits</li>
                            <li>Employee training</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Contact Us</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="mb-1">Email: privacy@lumen-adtech.com</p>
                          <p className="mb-1">Phone: +254 (0) 700 123 456</p>
                          <p>Address: Lumen AdTech, Nairobi, Kenya</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-center mt-6">
                      <Button>View Full Privacy Policy</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interactive" className="mt-6">
              <div className="grid grid-cols-1 gap-6">
                <Card id="consent-manager">
                  <CardHeader>
                    <CardTitle>Consent Manager</CardTitle>
                    <CardDescription>Control how your data is used across our platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PrivacyPolicyConsentManager />
                  </CardContent>
                </Card>

                <Card id="data-flow">
                  <CardHeader>
                    <CardTitle>Data Flow Visualization</CardTitle>
                    <CardDescription>See how your data moves through our platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PrivacyPolicyDataFlow />
                  </CardContent>
                </Card>

                <Card id="data-request">
                  <CardHeader>
                    <CardTitle>Data Request Form</CardTitle>
                    <CardDescription>Submit requests regarding your personal data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PrivacyPolicyDataRequest />
                  </CardContent>
                </Card>

                <Card id="region-selector">
                  <CardHeader>
                    <CardTitle>Regional Privacy Information</CardTitle>
                    <CardDescription>View privacy information specific to your region</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PrivacyPolicyRegionSelector />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                  <CardDescription>Track changes to our Privacy Policy over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrivacyPolicyVersionHistory />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

