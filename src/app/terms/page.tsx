import { PublicPolicyPage } from "@/components/platform/PublicPolicyPage";

export const metadata = {
  title: "Terms of Service — EZComo review version",
  description: "Published review-version terms for the EZComo platform.",
};

export default function TermsPage() {
  return (
    <PublicPolicyPage
      eyebrow="Platform policy"
      title="Terms of Service — review version"
      intro={<p>These terms describe the current EZComo platform relationship and merchant responsibilities. They deliberately omit unresolved legal provisions that still require owner/legal approval before paid beta.</p>}
      sections={[
        {
          title: "Accounts and access",
          body: <><p>Merchant accounts are used to create and administer storefront workspaces. Account holders are responsible for providing accurate account information, keeping credentials and authentication methods secure, and using access only within workspaces they are authorized to manage.</p><p>Store and platform permissions are enforced separately. Attempting to access another merchant&apos;s data, credentials, administrative functions, or tenant-scoped resources without authorization is prohibited.</p></>,
        },
        {
          title: "Merchant responsibilities",
          body: <><p>Merchants remain responsible for the products, services, content, prices, taxes, customer communications, fulfillment, returns, policies, and legal compliance of their storefronts. EZComo provides commerce and content-management tools; it does not become the seller of a merchant&apos;s goods or services merely because the storefront runs on the platform.</p><p>Merchants must have the rights and permissions needed for content, images, trademarks, customer information, and other material they add to the platform.</p></>,
        },
        {
          title: "Acceptable use",
          body: <p>Do not use EZComo for fraud, malware, credential theft, unlawful content or transactions, deliberate service interference, unauthorized security testing, cross-tenant access attempts, or activity intended to bypass product security and authority boundaries.</p>,
        },
        {
          title: "Platform availability and external services",
          body: <><p>Some workflows depend on third-party infrastructure or merchant-configured payment, courier, authentication, media, domain, messaging, or similar services. A provider being configurable does not mean it is verified, available, or active for every merchant.</p><p>Service availability can also depend on plan entitlement, merchant configuration, provider verification, DNS, credentials, external-provider terms, and operational conditions. This review version does not publish a guaranteed uptime or performance commitment.</p></>,
        },
        {
          title: "Plans, trials, and billing",
          body: <p>Public plan names, prices, trial durations, and store limits are sourced from the current billing catalog where displayed. Billing, cancellation, refund, proration, and external-provider charge disclosures are described separately in the <a href="/billing-policy" className="font-semibold text-primary">billing policy</a>. Unresolved commercial rules are not implied by this review version.</p>,
        },
        {
          title: "Security, suspension, and data access",
          body: <><p>EZComo may restrict access when necessary to protect account, tenant, platform, or operational integrity, or to respond to suspected abuse. This review version does not state final termination notice periods or post-termination retention commitments.</p><p>Available export, backup, restore, deletion, and recovery tools depend on the relevant feature and account state. Requests that cannot be completed through available product controls can be raised through platform support.</p></>,
        },
        {
          title: "Content and intellectual property",
          body: <p>Merchants remain responsible for and retain their rights in merchant-provided content subject to the permissions needed for EZComo to store, process, display, and deliver that content as part of the service. This review version does not add a broader transfer of merchant ownership rights.</p>,
        },
        {
          title: "Legal provisions still awaiting approval",
          body: <p>This review version intentionally does not assert an operator legal-entity identity, governing-law jurisdiction, arbitration or dispute forum, warranty language, liability cap, indemnity structure, or other unresolved legal terms. Those provisions require explicit owner/legal approval before paid-beta legal sign-off.</p>,
        },
      ]}
    />
  );
}
