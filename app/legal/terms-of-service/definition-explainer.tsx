"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TermsDefinitionExplainer() {
  const [searchTerm, setSearchTerm] = useState("")

  const legalTerms = [
    {
      term: "Arbitration",
      definition:
        "A process where a dispute is resolved by an impartial adjudicator whose decision the parties to the dispute have agreed to be bound by. In our Terms, this means disputes are resolved outside of court by a neutral third party.",
      section: "13.2",
      plainLanguage:
        "Instead of going to court, disputes are settled by a neutral third party whose decision is final. This is usually faster and less expensive than a lawsuit.",
    },
    {
      term: "Class Action Waiver",
      definition:
        "A contractual provision where users agree not to participate in a class action lawsuit against the company. Each user must pursue any legal claims individually.",
      section: "13.3",
      plainLanguage:
        "You agree not to join with others in a group lawsuit against us. If you have a dispute, you must handle it individually.",
    },
    {
      term: "Confidential Information",
      definition:
        "Non-public information disclosed by one party to another that is marked as confidential or would reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure.",
      section: "10.1",
      plainLanguage: "Private information that isn't publicly known and that both parties agree to keep secret.",
    },
    {
      term: "Force Majeure",
      definition:
        "Unforeseeable circumstances that prevent someone from fulfilling a contract, such as natural disasters, war, or other 'acts of God'.",
      section: "14.5",
      plainLanguage:
        "Events beyond our control (like natural disasters or global pandemics) that might prevent us from providing our services.",
    },
    {
      term: "Indemnification",
      definition:
        "An agreement by one party to cover the losses, damages, or liabilities incurred by another party. In our Terms, users agree to protect Lumen from certain claims related to their use of the Services.",
      section: "Not explicitly defined",
      plainLanguage: "A promise to pay for damages or legal costs if your actions cause problems for us.",
    },
    {
      term: "Intellectual Property Rights",
      definition:
        "Legal rights that protect creations of the mind, such as copyrights, trademarks, patents, trade secrets, and other proprietary rights.",
      section: "9",
      plainLanguage: "Legal protections for creative works, inventions, brand names, and business secrets.",
    },
    {
      term: "Limitation of Liability",
      definition:
        "A provision that restricts the amount and types of damages that can be recovered in the event of a legal dispute.",
      section: "11",
      plainLanguage:
        "Limits on how much money you can claim from us if something goes wrong, and for what types of problems.",
    },
    {
      term: "Performance-Based Pricing",
      definition:
        "A pricing model where advertisers pay based on actual engagement, impressions, and conversions rather than traditional flat rates.",
      section: "2",
      plainLanguage: "You pay based on how well your ads perform (views, clicks, actions) instead of a fixed price.",
    },
    {
      term: "Severability",
      definition:
        "A provision stating that if one part of the agreement is found to be unenforceable, the rest of the agreement remains valid and enforceable.",
      section: "14.2",
      plainLanguage: "If one part of the Terms is found to be invalid, the rest of the Terms still apply.",
    },
    {
      term: "User Data",
      definition:
        "Information collected about viewers and users of our Services, including anonymous audience metrics, engagement data, and other analytics.",
      section: "2",
      plainLanguage: "Information we collect about how people interact with ads and our platform.",
    },
  ]

  const filteredTerms = searchTerm
    ? legalTerms.filter(
        (term) =>
          term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.definition.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : legalTerms

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search legal terms..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredTerms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No terms found matching "{searchTerm}"</div>
        ) : (
          filteredTerms.map((term, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Tabs defaultValue="plain">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{term.term}</h3>
                    <TabsList className="h-8">
                      <TabsTrigger value="plain" className="text-xs">
                        Plain Language
                      </TabsTrigger>
                      <TabsTrigger value="legal" className="text-xs">
                        Legal Definition
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="plain" className="mt-2">
                    <p className="text-sm">{term.plainLanguage}</p>
                  </TabsContent>

                  <TabsContent value="legal" className="mt-2">
                    <p className="text-sm">{term.definition}</p>
                  </TabsContent>

                  <div className="mt-2 text-xs text-muted-foreground">Found in Section: {term.section}</div>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm">
          View Full Legal Glossary
        </Button>
      </div>
    </div>
  )
}

