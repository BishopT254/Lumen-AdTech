import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, FileText, Scale, Lock, BookOpen, Accessibility } from "lucide-react"

export default function LegalHub() {
  const legalPages = [
    {
      title: "Privacy Policy",
      description: "Detailed information about how we collect, use, and protect your personal data.",
      icon: <FileText className="h-8 w-8 text-primary" />,
      href: "/legal/privacy-policy",
      features: ["Data Collection", "Cookie Policy", "Third-Party Sharing", "User Rights"],
    },
    {
      title: "Terms of Service",
      description: "The rules, guidelines, and agreements for using our platform and services.",
      icon: <Scale className="h-8 w-8 text-primary" />,
      href: "/legal/terms-of-service",
      features: ["User Obligations", "Intellectual Property", "Limitation of Liability", "Termination"],
    },
    {
      title: "Compliance",
      description: "Information about our adherence to industry standards and regulatory requirements.",
      icon: <Shield className="h-8 w-8 text-primary" />,
      href: "/legal/compliance",
      features: ["Industry Certifications", "Regulatory Frameworks", "Compliance Reporting", "Audit Logs"],
    },
    {
      title: "Security",
      description: "Details about our security measures and practices to protect your data and privacy.",
      icon: <Lock className="h-8 w-8 text-primary" />,
      href: "/legal/security",
      features: ["Data Encryption", "Threat Monitoring", "Security Protocols", "Incident Response"],
    },
    {
      title: "GDPR",
      description: "Information about our compliance with the General Data Protection Regulation.",
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      href: "/legal/gdpr",
      features: ["Data Subject Rights", "Lawful Processing", "Data Protection", "Breach Notification"],
    },
    {
      title: "Accessibility",
      description: "Our commitment to making our platform accessible to all users, including those with disabilities.",
      icon: <Accessibility className="h-8 w-8 text-primary" />,
      href: "/legal/accessibility",
      features: ["WCAG Compliance", "Assistive Technologies", "Accessibility Features", "Feedback Mechanisms"],
    },
  ]

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Legal & Compliance Hub</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive information about our legal policies, compliance standards, and commitments to security,
          privacy, and accessibility.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {legalPages.map((page) => (
          <Card key={page.title} className="flex flex-col h-full transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-4">{page.icon}</div>
              <CardTitle className="text-2xl">{page.title}</CardTitle>
              <CardDescription className="text-base">{page.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {page.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href={page.href} className="w-full">
                <Button className="w-full">View {page.title}</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">Need Additional Information?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          If you have specific questions about our legal policies or compliance standards, please don't hesitate to
          contact our legal team.
        </p>
        <Link href="/contact">
          <Button variant="outline" size="lg">
            Contact Legal Team
          </Button>
        </Link>
      </div>
    </div>
  )
}

