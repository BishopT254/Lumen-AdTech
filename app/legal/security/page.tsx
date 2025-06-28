import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Shield,
  Lock,
  Server,
  Database,
  Globe,
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  Users,
  Key,
  Eye,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react"
import Link from "next/link"

export default function SecurityPage() {
  const securityMeasures = [
    {
      category: "Data Protection",
      measures: [
        {
          title: "Encryption at Rest",
          description: "All stored data is encrypted using AES-256 encryption.",
          icon: <Lock className="h-5 w-5" />,
        },
        {
          title: "Encryption in Transit",
          description: "All data in transit is protected using TLS 1.3 with strong cipher suites.",
          icon: <Globe className="h-5 w-5" />,
        },
        {
          title: "Key Management",
          description: "Secure key management with regular rotation and strict access controls.",
          icon: <Key className="h-5 w-5" />,
        },
        {
          title: "Data Backup",
          description: "Automated backups with point-in-time recovery capabilities.",
          icon: <Database className="h-5 w-5" />,
        },
      ],
    },
    {
      category: "Infrastructure Security",
      measures: [
        {
          title: "Network Security",
          description: "Multi-layered firewalls, intrusion detection, and prevention systems.",
          icon: <Server className="h-5 w-5" />,
        },
        {
          title: "DDoS Protection",
          description: "Advanced DDoS mitigation to ensure service availability.",
          icon: <ShieldCheck className="h-5 w-5" />,
        },
        {
          title: "Vulnerability Management",
          description: "Regular vulnerability scanning and timely patching.",
          icon: <AlertTriangle className="h-5 w-5" />,
        },
        {
          title: "Secure Infrastructure",
          description: "Cloud infrastructure with security best practices and compliance.",
          icon: <Shield className="h-5 w-5" />,
        },
      ],
    },
    {
      category: "Access Control",
      measures: [
        {
          title: "Multi-Factor Authentication",
          description: "MFA required for all administrative access and available for all user accounts.",
          icon: <Users className="h-5 w-5" />,
        },
        {
          title: "Role-Based Access Control",
          description: "Principle of least privilege with granular permissions and regular access reviews.",
          icon: <Lock className="h-5 w-5" />,
        },
        {
          title: "Session Management",
          description: "Secure session handling with automatic timeouts and invalidation.",
          icon: <Clock className="h-5 w-5" />,
        },
        {
          title: "Privileged Access Management",
          description: "Just-in-time access for administrative functions with comprehensive logging.",
          icon: <Shield className="h-5 w-5" />,
        },
      ],
    },
    {
      category: "Application Security",
      measures: [
        {
          title: "Secure Development",
          description: "Secure SDLC with code reviews, static analysis, and security testing.",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          title: "API Security",
          description: "API authentication, rate limiting, and input validation.",
          icon: <ShieldAlert className="h-5 w-5" />,
        },
        {
          title: "Penetration Testing",
          description: "Regular penetration testing by independent security experts.",
          icon: <Eye className="h-5 w-5" />,
        },
        {
          title: "Bug Bounty Program",
          description: "Public vulnerability disclosure program with responsible reporting.",
          icon: <AlertCircle className="h-5 w-5" />,
        },
      ],
    },
  ]

  const securityIncidents = [
    {
      severity: "Low",
      count: 12,
      color: "bg-green-100 text-green-800",
      description: "Minor security events with no data impact",
      trend: "Decreasing",
      trendIcon: <CheckCircle className="h-4 w-4 text-green-500" />,
    },
    {
      severity: "Medium",
      count: 5,
      color: "bg-amber-100 text-amber-800",
      description: "Security events requiring investigation",
      trend: "Stable",
      trendIcon: <Clock className="h-4 w-4 text-amber-500" />,
    },
    {
      severity: "High",
      count: 0,
      color: "bg-red-100 text-red-800",
      description: "Significant security incidents",
      trend: "None",
      trendIcon: <CheckCircle className="h-4 w-4 text-green-500" />,
    },
    {
      severity: "Critical",
      count: 0,
      color: "bg-red-100 text-red-800",
      description: "Severe security breaches",
      trend: "None",
      trendIcon: <CheckCircle className="h-4 w-4 text-green-500" />,
    },
  ]

  const securityFAQs = [
    {
      question: "How do you protect my data?",
      answer:
        "We implement multiple layers of security controls including encryption at rest and in transit, strict access controls, regular security testing, and continuous monitoring. All data is stored in secure, compliant data centers with physical and environmental safeguards.",
    },
    {
      question: "Do you conduct regular security assessments?",
      answer:
        "Yes, we perform regular security assessments including vulnerability scanning, penetration testing, and code reviews. We also undergo independent third-party security audits and maintain compliance with industry standards such as ISO 27001 and SOC 2 Type II.",
    },
    {
      question: "How do you handle security incidents?",
      answer:
        "We have a comprehensive incident response plan that includes detection, analysis, containment, eradication, and recovery procedures. Our security team is available 24/7 to respond to potential security incidents, and we provide timely notifications to affected customers in accordance with our contractual obligations and applicable regulations.",
    },
    {
      question: "What security certifications do you maintain?",
      answer:
        "We maintain several security certifications and compliance attestations, including ISO 27001, SOC 2 Type II, and GDPR compliance. These certifications demonstrate our commitment to maintaining the highest security standards and are regularly renewed through independent audits.",
    },
    {
      question: "How can I report a security vulnerability?",
      answer:
        "We encourage responsible disclosure of security vulnerabilities. If you discover a potential security issue, please report it to security@lumenadtech.com. We have a dedicated security team that will investigate all reports and respond accordingly. We also maintain a bug bounty program for eligible security findings.",
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Security</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Comprehensive information about our security measures and practices to protect your data and ensure the
          integrity, confidentiality, and availability of our services.
        </p>
      </div>

      <Alert className="mb-8 border-primary/50 bg-primary/5">
        <Shield className="h-5 w-5" />
        <AlertTitle>Security Status: Normal</AlertTitle>
        <AlertDescription>
          All systems are operating normally with no known security incidents or vulnerabilities. Last security
          assessment: May 10, 2025.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="measures" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="measures">Security Measures</TabsTrigger>
          <TabsTrigger value="monitoring">Security Monitoring</TabsTrigger>
          <TabsTrigger value="reporting">Security Reporting</TabsTrigger>
          <TabsTrigger value="faq">Security FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="measures" className="space-y-6">
          {securityMeasures.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
                <CardDescription>Key security controls and protections in this category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.measures.map((measure) => (
                    <div key={measure.title} className="flex space-x-4">
                      <div className="mt-0.5 bg-primary/10 p-2 rounded-full">{measure.icon}</div>
                      <div>
                        <h3 className="font-medium mb-1">{measure.title}</h3>
                        <p className="text-sm text-muted-foreground">{measure.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Security Certifications</CardTitle>
              <CardDescription>Independent validation of our security controls and practices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">ISO 27001</h3>
                  <p className="text-sm text-muted-foreground mb-4">Information Security Management System</p>
                  <Badge className="bg-green-100 text-green-800">Certified</Badge>
                </div>
                <div className="border rounded-lg p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Server className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">SOC 2 Type II</h3>
                  <p className="text-sm text-muted-foreground mb-4">Service Organization Controls</p>
                  <Badge className="bg-green-100 text-green-800">Certified</Badge>
                </div>
                <div className="border rounded-lg p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">GDPR</h3>
                  <p className="text-sm text-muted-foreground mb-4">General Data Protection Regulation</p>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline">View All Certifications</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Monitoring Dashboard</CardTitle>
                <CardDescription>Real-time overview of our security posture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">System Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Infrastructure</span>
                          <Badge className="bg-green-100 text-green-800">Normal</Badge>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-[98%]"></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">98% of systems operating normally</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Applications</span>
                          <Badge className="bg-green-100 text-green-800">Normal</Badge>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 w-[100%]"></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">100% of applications operating normally</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Security Incidents (Last 30 Days)</h3>
                    <div className="space-y-3">
                      {securityIncidents.map((incident) => (
                        <div
                          key={incident.severity}
                          className="flex justify-between items-center border rounded-lg p-3"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge className={incident.color}>{incident.severity}</Badge>
                            <span className="text-sm">{incident.description}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{incident.count}</span>
                            <div className="flex items-center text-xs">
                              {incident.trendIcon}
                              <span className="ml-1">{incident.trend}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threat Intelligence</CardTitle>
                <CardDescription>Proactive monitoring of security threats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Threat Landscape</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Global Threat Level</span>
                          <Badge className="bg-amber-100 text-amber-800">Moderate</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on current global cyber threat intelligence
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Industry Threat Level</span>
                          <Badge className="bg-amber-100 text-amber-800">Moderate</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Based on threats targeting our industry</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Recent Blocked Threats</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Suspicious Login Attempts</span>
                          <Badge className="bg-blue-100 text-blue-800">Blocked</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Multiple failed login attempts from unusual locations
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">DDoS Attempt</span>
                          <Badge className="bg-blue-100 text-blue-800">Mitigated</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Small-scale distributed denial of service attempt
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Malicious Payload</span>
                          <Badge className="bg-blue-100 text-blue-800">Blocked</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Attempted upload of malicious file</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring Practices</CardTitle>
              <CardDescription>How we continuously monitor and protect our systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">24/7 Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Our security operations center provides round-the-clock monitoring of all systems and networks, with
                    automated alerts and human analysis of security events.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Threat Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced threat detection systems using machine learning and behavioral analysis to identify and
                    respond to potential security threats before they impact our services.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Incident Response</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive incident response procedures with defined roles, communication plans, and recovery
                    processes to quickly address and mitigate security incidents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reporting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Reporting</CardTitle>
              <CardDescription>Report security concerns and vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="font-medium text-lg mb-3">Report a Security Concern</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      If you have concerns about the security of your account or our services, please contact our
                      security team immediately.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">security@lumenadtech.com</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">+1 (800) 555-0123</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link href="/contact">
                        <Button>Contact Security Team</Button>
                      </Link>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="font-medium text-lg mb-3">Vulnerability Disclosure</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We encourage responsible disclosure of security vulnerabilities. If you discover a potential
                      security issue, please report it to us.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">security-reports@lumenadtech.com</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">PGP Key Available</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button>Submit Vulnerability Report</Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-3">Vulnerability Disclosure Policy</h3>
                  <div className="border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      We are committed to working with security researchers to verify and address potential
                      vulnerabilities. Our policy includes:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4">
                      <li>Safe harbor provisions for security researchers</li>
                      <li>Scope of systems and applications covered</li>
                      <li>Types of testing permitted and prohibited</li>
                      <li>Process for reporting vulnerabilities</li>
                      <li>Timeline for acknowledgment and resolution</li>
                      <li>Recognition program for valid reports</li>
                    </ul>
                    <Button variant="outline">View Full Disclosure Policy</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Report Submission</CardTitle>
              <CardDescription>Submit detailed information about a security concern</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Report Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Security Vulnerability</option>
                      <option>Account Security Concern</option>
                      <option>Suspicious Activity</option>
                      <option>Data Privacy Concern</option>
                      <option>Other Security Issue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Severity</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                      <option>Informational</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Summary</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    placeholder="Brief description of the security issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Detailed Description</label>
                  <textarea
                    className="w-full p-2 border rounded-md h-32"
                    placeholder="Please provide detailed information about the security issue, including steps to reproduce if applicable"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contact Information</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" className="w-full p-2 border rounded-md" placeholder="Name" />
                    <input type="email" className="w-full p-2 border rounded-md" placeholder="Email" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Submit Security Report</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security FAQ</CardTitle>
              <CardDescription>Frequently asked questions about our security practices</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {securityFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Resources</CardTitle>
              <CardDescription>Additional information and resources about our security practices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6">
                  <FileText className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-medium text-lg mb-2">Security Whitepaper</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Detailed overview of our security architecture, controls, and practices.
                  </p>
                  <Button variant="outline" className="w-full">
                    Download
                  </Button>
                </div>
                <div className="border rounded-lg p-6">
                  <Shield className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-medium text-lg mb-2">Compliance Reports</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access to our compliance certifications and attestations.
                  </p>
                  <Button variant="outline" className="w-full">
                    View Reports
                  </Button>
                </div>
                <div className="border rounded-lg p-6">
                  <Users className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-medium text-lg mb-2">Security Best Practices</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recommendations for securing your account and data.
                  </p>
                  <Button variant="outline" className="w-full">
                    Learn More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Security Commitment</h2>
        <p className="text-muted-foreground mb-6">
          At Lumen AdTech, security is not just a feature—it's a core value. We are committed to maintaining the highest
          standards of security to protect your data and ensure the integrity of our platform. Our security program is
          continuously evolving to address new threats and challenges in the digital landscape.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/legal/compliance">
            <Button variant="outline">View Compliance Information</Button>
          </Link>
          <Link href="/legal/privacy-policy">
            <Button variant="outline">Privacy Policy</Button>
          </Link>
          <Link href="/contact">
            <Button>Contact Security Team</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

