import type { Metadata } from "next"
import PrivacyPolicyClientPage from "./PrivacyPolicyClientPage"

export const metadata: Metadata = {
  title: "Privacy Policy | Lumen AdTech Platform",
  description: "Comprehensive privacy policy for the Lumen AI-Powered Smart AdTech Platform",
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />
}

