import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Clock, Download, ExternalLink, Search } from "lucide-react"
import Link from "next/link"

export default function CompliancePage() {
  const certifications = [
    {
      name: "ISO 27001",
      status: "Certified",
      validUntil: "December 2025",
      description: "Information security management system certification",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-100 text-green-800",
    },
    {
      name: "SOC 2 Type II",
      status: "Certified",
      validUntil: "October 2025",
      description: "Security, availability, processing integrity, confidentiality, and privacy controls",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-100 text-green-800",
    },
    {
      name: "GDPR Compliance",
      status: "Compliant",
      validUntil: "Ongoing",
      description: "European Union data protection and privacy regulations",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-100 text-green-800",
    },
    {
      name: "CCPA Compliance",
      status: "Compliant",
      validUntil: "Ongoing",
      description: "California Consumer Privacy Act regulations",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-100 text-green-800",
    },
    {
      name: "PCI DSS",
      status: "In Progress",
      validUntil: "Expected Q3 2025",
      description: "Payment Card Industry Data Security Standard",
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-100 text-amber-800",
    },
    {
      name: "HIPAA Compliance",
      status: "Not Applicable",
      validUntil: "N/A",
      description: "Health Insurance Portability and Accountability Act",
      icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
      color: "bg-gray-100 text-gray-800",
    },
  ]

  const regulatoryFrameworks = [
    {
      name: "GDPR",
      region: "European Union",
      complianceLevel: 98,
      lastAudit: "March 15, 2025",
      nextAudit: "September 15, 2025",
    },
    {
      name: "CCPA",
      region: "California, USA",
      complianceLevel: 95,
      lastAudit: "February 10, 2025",
      nextAudit: "August 10, 2025",
    },
    {
      name: "LGPD",
      region: "Brazil",
      complianceLevel: 92,
      lastAudit: "January 20, 2025",
      nextAudit: "July 20, 2025",
    },
    {
      name: "PIPEDA",
      region: "Canada",
      complianceLevel: 94,
      lastAudit: "April 5, 2025",
      nextAudit: "October 5, 2025",
    },
    {
      name: "PDPA",
      region: "Singapore",
      complianceLevel: 90,
      lastAudit: "March 1, 2025",
      nextAudit: "September 1, 2025",
    },
  ]

  const complianceReports = [
    {
      title: "Annual Security Assessment",
      date: "January 15, 2025",
      type: "Security",
      status: "Completed",
    },
    {
      title: "GDPR Compliance Audit",
      date: "March 10, 2025",
      type: "Privacy",
      status: "Completed",
    },
    {
      title: "Vendor Security Assessment",
      date: "April 22, 2025",
      type: "Third-Party",
      status: "Completed",
    },
    {
      title: "Penetration Testing Report",
      date: "May 5, 2025",
      type: "Security",
      status: "Completed",
    },
    {
      title: "Q2 Compliance Review",
      date: "July 1, 2025",
      type: "Internal",
      status: "Scheduled",
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Compliance</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Comprehensive information about our adherence to industry standards and regulatory requirements to ensure the
          highest levels of security, privacy, and data protection.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="dashboard">Compliance Dashboard</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="frameworks">Regulatory Frameworks</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Overall Compliance Score</CardTitle>
                <CardDescription>Based on all regulatory frameworks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-40">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-gray-200"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-primary"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - 0.94)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold">94%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Certification Status</CardTitle>
                <CardDescription>Current certification overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Certifications</span>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">4</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>In Progress</span>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">1</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Not Applicable</span>
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">1</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expiring Soon</span>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Upcoming Audits</CardTitle>
                <CardDescription>Scheduled compliance reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="font-medium">GDPR Compliance Audit</span>
                    <span className="text-sm text-muted-foreground">September 15, 2025</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">CCPA Compliance Audit</span>
                    <span className="text-sm text-muted-foreground">August 10, 2025</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">ISO 27001 Surveillance Audit</span>
                    <span className="text-sm text-muted-foreground">October 5, 2025</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Improvement Roadmap</CardTitle>
              <CardDescription>Planned initiatives to enhance compliance posture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">PCI DSS Certification</span>
                    <span>60% Complete</span>
                  </div>
                  <Progress value={60} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Expected completion by Q3 2025. Currently addressing documentation requirements.
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Enhanced Vendor Risk Management</span>
                    <span>40% Complete</span>
                  </div>
                  <Progress value={40} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Implementing improved vendor assessment processes and continuous monitoring.
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Automated Compliance Monitoring</span>
                    <span>75% Complete</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Deploying tools for real-time compliance monitoring and alerting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certifications.map((cert) => (
              <Card key={cert.name}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">{cert.name}</CardTitle>
                    <Badge className={cert.color}>{cert.status}</Badge>
                  </div>
                  <CardDescription>{cert.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valid Until</span>
                      <span className="font-medium">{cert.validUntil}</span>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        View Details
                      </Button>
                      {cert.status === "Certified" && (
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Download Certificate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Certification Process</CardTitle>
              <CardDescription>How we obtain and maintain our certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="font-bold">1</span>
                    </div>
                    <h3 className="font-medium mb-2">Preparation</h3>
                    <p className="text-sm text-muted-foreground">
                      Gap analysis and implementation of required controls
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="font-bold">2</span>
                    </div>
                    <h3 className="font-medium mb-2">Documentation</h3>
                    <p className="text-sm text-muted-foreground">Development of policies, procedures, and evidence</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="font-bold">3</span>
                    </div>
                    <h3 className="font-medium mb-2">Audit</h3>
                    <p className="text-sm text-muted-foreground">
                      Independent assessment by accredited certification bodies
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="font-bold">4</span>
                    </div>
                    <h3 className="font-medium mb-2">Maintenance</h3>
                    <p className="text-sm text-muted-foreground">Continuous monitoring and periodic reassessment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Framework Compliance</CardTitle>
              <CardDescription>
                Our compliance status with global privacy and data protection regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Framework</th>
                      <th className="text-left py-3 px-4">Region</th>
                      <th className="text-left py-3 px-4">Compliance Level</th>
                      <th className="text-left py-3 px-4">Last Audit</th>
                      <th className="text-left py-3 px-4">Next Audit</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulatoryFrameworks.map((framework, index) => (
                      <tr key={framework.name} className={index !== regulatoryFrameworks.length - 1 ? "border-b" : ""}>
                        <td className="py-3 px-4 font-medium">{framework.name}</td>
                        <td className="py-3 px-4">{framework.region}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Progress value={framework.complianceLevel} className="h-2 w-24" />
                            <span>{framework.complianceLevel}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{framework.lastAudit}</td>
                        <td className="py-3 px-4">{framework.nextAudit}</td>
                        <td className="py-3 px-4">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>GDPR Compliance Details</CardTitle>
                <CardDescription>General Data Protection Regulation (EU)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Key Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Lawful basis for processing</li>
                      <li>Data subject rights</li>
                      <li>Privacy by design and default</li>
                      <li>Data protection impact assessments</li>
                      <li>Breach notification</li>
                      <li>Data transfer restrictions</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Our Implementation</h3>
                    <p className="text-sm text-muted-foreground">
                      We have implemented comprehensive measures to ensure GDPR compliance, including appointing a Data
                      Protection Officer, maintaining records of processing activities, implementing data subject rights
                      procedures, and ensuring appropriate technical and organizational measures.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Link href="/legal/gdpr">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View GDPR Page
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download GDPR Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CCPA Compliance Details</CardTitle>
                <CardDescription>California Consumer Privacy Act (USA)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Key Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Right to know what personal information is collected</li>
                      <li>Right to delete personal information</li>
                      <li>Right to opt-out of the sale of personal information</li>
                      <li>Right to non-discrimination for exercising rights</li>
                      <li>Special protections for minors</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Our Implementation</h3>
                    <p className="text-sm text-muted-foreground">
                      We have implemented mechanisms to honor consumer rights requests, updated our privacy policies,
                      implemented "Do Not Sell My Personal Information" links, and established processes for verifying
                      consumer requests.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View CCPA Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download CCPA Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Historical and scheduled compliance assessments and audits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Report Title</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceReports.map((report, index) => (
                      <tr key={report.title} className={index !== complianceReports.length - 1 ? "border-b" : ""}>
                        <td className="py-3 px-4 font-medium">{report.title}</td>
                        <td className="py-3 px-4">{report.date}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{report.type}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              report.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Search className="h-3 w-3" />
                              View
                            </Button>
                            {report.status === "Completed" && (
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Reporting Tools</CardTitle>
              <CardDescription>Generate custom compliance reports and documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Compliance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate a high-level overview of compliance status across all frameworks.
                      </p>
                      <Button className="w-full">Generate Report</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Framework-Specific</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create detailed reports for specific regulatory frameworks.
                      </p>
                      <Button className="w-full">Generate Report</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Custom Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Build a tailored report with specific compliance metrics and data points.
                      </p>
                      <Button className="w-full">Generate Report</Button>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Report Scheduling</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up automated compliance reports to be generated and distributed on a regular schedule.
                  </p>
                  <Button variant="outline">Configure Report Schedule</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Need Additional Information?</h2>
        <p className="text-muted-foreground mb-6">
          If you have specific questions about our compliance programs or need detailed information for your own
          compliance requirements, please contact our compliance team.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/contact">
            <Button>Contact Compliance Team</Button>
          </Link>
          <Button variant="outline">Download Compliance Overview</Button>
          <Button variant="outline">Request Custom Attestation</Button>
        </div>
      </div>
    </div>
  )
}

