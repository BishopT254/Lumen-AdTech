'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Shield,
  FileText,
  CheckCircle,
  Clock,
  Users,
  Database,
  AlertTriangle,
  ExternalLink,
  Mail,
  UserX,
  Trash2,
  Eye,
  Bell,
  Lock,
} from "lucide-react"

export default function GDPRPage() {
  const dataSubjectRights = [
    {
      right: "Right to Access",
      description:
        "You have the right to request a copy of your personal data and information about how we process it.",
      icon: <Eye className="h-5 w-5" />,
    },
    {
      right: "Right to Rectification",
      description: "You have the right to request that we correct inaccurate or incomplete personal data about you.",
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      right: "Right to Erasure",
      description: "Also known as the 'right to be forgotten', you can request that we delete your personal data.",
      icon: <Trash2 className="h-5 w-5" />,
    },
    {
      right: "Right to Restrict Processing",
      description: "You can request that we limit the way we use your personal data.",
      icon: <Lock className="h-5 w-5" />,
    },
    {
      right: "Right to Data Portability",
      description:
        "You can request a copy of your data in a machine-readable format and the right to have it transferred.",
      icon: <Database className="h-5 w-5" />,
    },
    {
      right: "Right to Object",
      description: "You have the right to object to the processing of your personal data in certain circumstances.",
      icon: <UserX className="h-5 w-5" />,
    },
    {
      right: "Rights Related to Automated Decision Making",
      description: "You have the right not to be subject to a decision based solely on automated processing.",
      icon: <Users className="h-5 w-5" />,
    },
    {
      right: "Right to Be Informed",
      description: "You have the right to be informed about the collection and use of your personal data.",
      icon: <Bell className="h-5 w-5" />,
    },
  ]

  const gdprChecklist = [
    {
      category: "Data Processing",
      items: [
        { item: "Lawful basis for processing established", status: "Completed" },
        { item: "Data processing records maintained", status: "Completed" },
        { item: "Data processing agreements with processors", status: "Completed" },
        { item: "Privacy by design and default implemented", status: "Completed" },
        { item: "Data protection impact assessments conducted", status: "Completed" },
      ],
    },
    {
      category: "Data Subject Rights",
      items: [
        { item: "Process for handling data subject requests", status: "Completed" },
        { item: "Verification procedures for data subjects", status: "Completed" },
        { item: "Response timeframes established", status: "Completed" },
        { item: "Staff trained on handling requests", status: "Completed" },
      ],
    },
    {
      category: "Consent Management",
      items: [
        { item: "Consent mechanisms implemented", status: "Completed" },
        { item: "Consent withdrawal process established", status: "Completed" },
        { item: "Consent records maintained", status: "Completed" },
        { item: "Child consent mechanisms (if applicable)", status: "Completed" },
      ],
    },
    {
      category: "Security Measures",
      items: [
        { item: "Technical security measures implemented", status: "Completed" },
        { item: "Organizational security measures implemented", status: "Completed" },
        { item: "Regular security testing conducted", status: "Completed" },
        { item: "Data breach response plan established", status: "Completed" },
      ],
    },
    {
      category: "Documentation",
      items: [
        { item: "Privacy notices updated for GDPR", status: "Completed" },
        { item: "Internal data protection policies", status: "Completed" },
        { item: "Staff training materials", status: "Completed" },
        { item: "Data retention schedules", status: "Completed" },
      ],
    },
  ]

  const dataProcessingActivities = [
    {
      category: "User Data",
      description: "Personal data collected from users of our platform",
      dataTypes: ["Name", "Email", "IP Address", "Device Information"],
      purpose: "Account management, authentication, service provision",
      legalBasis: "Contract Performance, Legitimate Interest",
      retention: "Duration of account plus 30 days after deletion",
      recipients: "Internal teams, essential service providers",
    },
    {
      category: "Marketing Data",
      description: "Data used for marketing and promotional activities",
      dataTypes: ["Email", "Marketing Preferences", "Interaction History"],
      purpose: "Sending promotional materials, product updates",
      legalBasis: "Consent",
      retention: "Until consent withdrawal or 2 years of inactivity",
      recipients: "Marketing team, marketing service providers",
    },
    {
      category: "Analytics Data",
      description: "Data collected for platform analytics and improvement",
      dataTypes: ["Usage Statistics", "Feature Interaction", "Performance Metrics"],
      purpose: "Service improvement, bug fixing, feature development",
      legalBasis: "Legitimate Interest",
      retention: "Aggregated indefinitely, raw data for 90 days",
      recipients: "Product and engineering teams, analytics providers",
    },
    {
      category: "Customer Support Data",
      description: "Data collected during customer support interactions",
      dataTypes: ["Support Requests", "Communication History", "Account Information"],
      purpose: "Providing customer support and issue resolution",
      legalBasis: "Contract Performance, Legitimate Interest",
      retention: "3 years after ticket resolution",
      recipients: "Support team, customer service tools",
    },
  ]

  const dataBreachFAQs = [
    {
      question: "What is considered a data breach under GDPR?",
      answer:
        "Under GDPR, a data breach is a security incident leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data. This includes both accidental and deliberate causes.",
    },
    {
      question: "What is our data breach response procedure?",
      answer:
        "Our data breach response procedure includes: 1) Breach detection and containment, 2) Assessment of risk to individuals, 3) Notification to supervisory authorities within 72 hours if required, 4) Notification to affected individuals if high risk, 5) Documentation of the breach and response actions, and 6) Post-breach review and improvements.",
    },
    {
      question: "When do we need to notify authorities about a breach?",
      answer:
        "We are required to notify the relevant supervisory authority within 72 hours of becoming aware of a breach if it poses a risk to the rights and freedoms of individuals. If the breach is unlikely to result in such risks, notification is not required, but the breach must still be documented internally.",
    },
    {
      question: "When do we need to notify individuals about a breach?",
      answer:
        "We must notify affected individuals without undue delay when a breach is likely to result in a high risk to their rights and freedoms. The notification must describe in clear language the nature of the breach, likely consequences, measures taken, and contact information for further inquiries.",
    },
    {
      question: "What information is included in a breach notification?",
      answer:
        "A breach notification includes: 1) Description of the breach, 2) Categories and approximate number of individuals affected, 3) Categories and approximate number of records concerned, 4) Name and contact details of the Data Protection Officer, 5) Likely consequences of the breach, and 6) Measures taken or proposed to address the breach and mitigate possible adverse effects.",
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">GDPR Compliance</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Comprehensive information about our compliance with the General Data Protection Regulation (GDPR) and how we
          protect the privacy rights of EU data subjects.
        </p>
      </div>

      <Alert className="mb-8 border-primary/50 bg-primary/5">
        <Shield className="h-5 w-5" />
        <AlertTitle>GDPR Compliance Status: Compliant</AlertTitle>
        <AlertDescription>
          Our platform is fully compliant with the General Data Protection Regulation (GDPR). We regularly review and
          update our practices to maintain compliance.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="rights" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="rights">Data Subject Rights</TabsTrigger>
          <TabsTrigger value="checklist">Compliance Checklist</TabsTrigger>
          <TabsTrigger value="processing">Data Processing</TabsTrigger>
          <TabsTrigger value="breach">Data Breach</TabsTrigger>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="rights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Rights Under GDPR</CardTitle>
              <CardDescription>
                The GDPR provides the following rights for individuals with respect to their personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dataSubjectRights.map((right) => (
                  <div key={right.right} className="flex space-x-4">
                    <div className="mt-0.5 bg-primary/10 p-2 rounded-full">{right.icon}</div>
                    <div>
                      <h3 className="font-medium mb-1">{right.right}</h3>
                      <p className="text-sm text-muted-foreground">{right.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Exercise Your Rights</CardTitle>
              <CardDescription>Steps to follow when you want to exercise your data protection rights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="font-bold">1</span>
                    </div>
                    <h3 className="font-medium mb-2">Submit a Request</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use our data subject request form or contact our Data Protection Officer directly.
                    </p>
                    <Button className="w-full">Submit Request</Button>
                  </div>
                  <div className="border rounded-lg p-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="font-bold">2</span>
                    </div>
                    <h3 className="font-medium mb-2">Verification</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We'll verify your identity to ensure we're providing data to the right person.
                    </p>
                    <Button variant="outline" className="w-full">
                      Learn About Verification
                    </Button>
                  </div>
                  <div className="border rounded-lg p-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="font-bold">3</span>
                    </div>
                    <h3 className="font-medium mb-2">Response</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We'll respond to your request within 30 days, with possible extension for complex requests.
                    </p>
                    <Button variant="outline" className="w-full">
                      Response Timeframes
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-medium mb-3">Contact Our Data Protection Officer</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you have questions about your rights or how to exercise them, please contact our Data Protection
                    Officer.
                  </p>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>dpo@lumenadtech.com</span>
                    </div>
                    <Button variant="outline">Contact DPO</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Compliance Checklist</CardTitle>
              <CardDescription>Our implementation status for key GDPR requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {gdprChecklist.map((category) => (
                  <div key={category.category}>
                    <h3 className="font-medium text-lg mb-4">{category.category}</h3>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div key={item.item} className="flex justify-between items-center border rounded-lg p-3">
                          <span>{item.item}</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our GDPR Implementation</CardTitle>
              <CardDescription>Key measures we've taken to ensure GDPR compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Data Protection Officer</h3>
                  <p className="text-sm text-muted-foreground">
                    We've appointed a Data Protection Officer responsible for overseeing our data protection strategy
                    and implementation to ensure compliance with GDPR requirements.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Documentation</h3>
                  <p className="text-sm text-muted-foreground">
                    We maintain comprehensive documentation of all our data processing activities, including records of
                    processing activities, data protection impact assessments, and consent records.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <div className="w-12 h-12 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">Staff Training</h3>
                  <p className="text-sm text-muted-foreground">
                    All staff members receive regular training on data protection principles, GDPR requirements, and our
                    specific policies and procedures to ensure consistent compliance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing Activities</CardTitle>
              <CardDescription>Overview of how we process personal data under GDPR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dataProcessingActivities.map((activity) => (
                  <div key={activity.category} className="border rounded-lg p-6">
                    <h3 className="font-medium text-lg mb-2">{activity.category}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{activity.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Data Types</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {activity.dataTypes.map((type) => (
                            <li key={type}>{type}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Purpose</h4>
                        <p className="text-sm text-muted-foreground">{activity.purpose}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Legal Basis</h4>
                        <p className="text-sm text-muted-foreground">{activity.legalBasis}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Retention Period</h4>
                        <p className="text-sm text-muted-foreground">{activity.retention}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Recipients</h4>
                        <p className="text-sm text-muted-foreground">{activity.recipients}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Processing Visualization</CardTitle>
              <CardDescription>Interactive visualization of how data flows through our systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6">
                <div className="w-full h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">Interactive data flow diagram</p>
                    <Button>View Data Flow Diagram</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lawful Bases for Processing</CardTitle>
              <CardDescription>
                Explanation of the legal grounds we rely on for processing personal data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Consent</h3>
                  <p className="text-sm text-muted-foreground">
                    We obtain clear, specific, and informed consent for certain processing activities, particularly for
                    marketing communications and non-essential cookies. Consent is always freely given, specific,
                    informed, and unambiguous, with clear affirmative action.
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Contract Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    We process personal data when necessary to fulfill our contractual obligations to you, such as
                    providing our services, processing payments, and managing your account.
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Legal Obligation</h3>
                  <p className="text-sm text-muted-foreground">
                    We process personal data when necessary to comply with legal obligations, such as tax laws,
                    accounting requirements, and other regulatory obligations.
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Legitimate Interests</h3>
                  <p className="text-sm text-muted-foreground">
                    We process personal data based on our legitimate interests, such as improving our services, ensuring
                    security, and preventing fraud. We always balance our interests against your rights and interests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breach" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Breach Notification</CardTitle>
              <CardDescription>Our procedures for handling and reporting data breaches under GDPR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="font-medium text-lg mb-3">Authority Notification</h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Clock className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <h4 className="font-medium">Timeframe</h4>
                          <p className="text-sm text-muted-foreground">
                            Within 72 hours of becoming aware of a breach that poses a risk to individuals' rights and
                            freedoms.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <h4 className="font-medium">Information Provided</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            <li>Nature of the breach</li>
                            <li>Categories and number of individuals affected</li>
                            <li>Categories and number of records concerned</li>
                            <li>Contact details of the DPO</li>
                            <li>Likely consequences</li>
                            <li>Measures taken or proposed</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="font-medium text-lg mb-3">Individual Notification</h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <h4 className="font-medium">When Required</h4>
                          <p className="text-sm text-muted-foreground">
                            When a breach is likely to result in a high risk to the rights and freedoms of individuals.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <h4 className="font-medium">Information Provided</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            <li>Clear description of the breach</li>
                            <li>Name and contact details of the DPO</li>
                            <li>Likely consequences of the breach</li>
                            <li>Measures taken or proposed</li>
                            <li>Recommendations for individuals</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-medium text-lg mb-3">Data Breach Response Process</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">1</span>
                      </div>
                      <h4 className="font-medium mb-2">Detection</h4>
                      <p className="text-xs text-muted-foreground">Identify and confirm the breach</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">2</span>
                      </div>
                      <h4 className="font-medium mb-2">Containment</h4>
                      <p className="text-xs text-muted-foreground">Limit the scope and impact</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">3</span>
                      </div>
                      <h4 className="font-medium mb-2">Assessment</h4>
                      <p className="text-xs text-muted-foreground">Evaluate risks and impacts</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">4</span>
                      </div>
                      <h4 className="font-medium mb-2">Notification</h4>
                      <p className="text-xs text-muted-foreground">Inform authorities and individuals</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">5</span>
                      </div>
                      <h4 className="font-medium mb-2">Review</h4>
                      <p className="text-xs text-muted-foreground">Document and improve</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Breach FAQ</CardTitle>
              <CardDescription>
                Frequently asked questions about data breaches and our response procedures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {dataBreachFAQs.map((faq, index) => (
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
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Subject Request Form</CardTitle>
              <CardDescription>Use this form to submit requests related to your personal data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Request Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Access to my data</option>
                      <option>Rectification of my data</option>
                      <option>Erasure of my data</option>
                      <option>Restriction of processing</option>
                      <option>Data portability</option>
                      <option>Object to processing</option>
                      <option>Withdraw consent</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Account Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>User Account</option>
                      <option>Customer Account</option>
                      <option>Partner Account</option>
                      <option>Former User/Customer</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Request Details</label>
                  <textarea
                    className="w-full p-2 border rounded-md h-32"
                    placeholder="Please provide details about your request, including specific data or processing activities you're concerned about."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contact Information</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Full Name</label>
                      <input type="text" className="w-full p-2 border rounded-md" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Email Address</label>
                      <input type="email" className="w-full p-2 border rounded-md" placeholder="Your email address" />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">Identity Verification</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    To protect your privacy and security, we need to verify your identity before processing your
                    request. We may contact you for additional verification information.
                  </p>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="verification-consent" />
                    <label htmlFor="verification-consent" className="text-sm">
                      I understand that I may need to provide additional information to verify my identity.
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Submit Request</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Right to Be Forgotten</CardTitle>
              <CardDescription>Information about requesting the deletion of your personal data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-medium text-lg mb-3">About the Right to Erasure</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The right to erasure, also known as the "right to be forgotten," gives you the right to request the
                    deletion of your personal data in certain circumstances. This right is not absolute and depends on
                    the specific situation and legal basis for processing.
                  </p>
                  <h4 className="font-medium mb-2">When the Right Applies</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mb-4">
                    <li>The personal data is no longer necessary for the purpose it was collected</li>
                    <li>You withdraw consent and there is no other legal ground for processing</li>
                    <li>You object to the processing and there are no overriding legitimate grounds</li>
                    <li>The personal data has been unlawfully processed</li>
                    <li>The personal data must be erased for compliance with a legal obligation</li>
                    <li>
                      The personal data was collected in relation to the offer of information society services to a
                      child
                    </li>
                  </ul>
                  <h4 className="font-medium mb-2">When the Right Does Not Apply</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>
                      When processing is necessary for exercising the right of freedom of expression and information
                    </li>
                    <li>When processing is necessary for compliance with a legal obligation</li>
                    <li>When processing is necessary for reasons of public interest in the area of public health</li>
                    <li>
                      When processing is necessary for archiving purposes in the public interest, scientific or
                      historical research, or statistical purposes
                    </li>
                    <li>When processing is necessary for the establishment, exercise, or defense of legal claims</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="font-medium text-lg mb-3">Erasure Process</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">1</span>
                      </div>
                      <h4 className="font-medium mb-2">Submit Request</h4>
                      <p className="text-xs text-muted-foreground">
                        Use the data subject request form to submit your erasure request
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">2</span>
                      </div>
                      <h4 className="font-medium mb-2">Verification</h4>
                      <p className="text-xs text-muted-foreground">
                        We'll verify your identity to ensure the security of your data
                      </p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <span className="font-bold">3</span>
                      </div>
                      <h4 className="font-medium mb-2">Processing</h4>
                      <p className="text-xs text-muted-foreground">
                        We'll evaluate your request and take appropriate action
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button>Submit Erasure Request</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Additional GDPR Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">GDPR Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access our GDPR-related documentation, including our privacy policy, data processing agreements, and
                more.
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Data Processing Agreement
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  GDPR Compliance Statement
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get in touch with our Data Protection Officer or privacy team for GDPR-related inquiries.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Data Protection Officer</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">dpo@lumenadtech.com</span>
                </div>
                <Button className="w-full mt-2">Contact DPO</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">External Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Links to official GDPR resources and regulatory authorities.
              </p>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Official GDPR Text
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  European Data Protection Board
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Find Your Data Protection Authority
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

