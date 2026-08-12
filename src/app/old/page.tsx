import type { Metadata } from "next";
import { CmsLandingPage } from "@/components/marketing/CmsLandingPage";
import { CmsPricing } from "@/components/marketing/CmsPricing";

export const metadata: Metadata = {
  title: "Commerce Engine - Classic Landing Page",
  description: "Preserved original landing page for Commerce Engine.",
};

export default function OldLandingPage() {
  return (
    <CmsLandingPage>
      <CmsPricing />
    </CmsLandingPage>
  );
}
