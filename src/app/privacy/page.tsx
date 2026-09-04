import { PublicPolicyPage } from "@/components/platform/PublicPolicyPage";
import { getPublicPolicyRuntime } from "@/lib/platform/public-policy-runtime";
import { buildBindingPrivacySections } from "@/lib/platform/paid-beta-policy-copy";

export async function generateMetadata() {
  const policy = await getPublicPolicyRuntime();
  return {
    title: `Privacy Policy — ${policy.siteName}${policy.binding ? "" : " review version"}`,
    description: `${policy.binding ? "Privacy Policy" : "Published review-version privacy disclosure"} for the ${policy.siteName} platform.`,
  };
}

export default async function PrivacyPage() {
  const policy = await getPublicPolicyRuntime();
  const policyMeta = { version: policy.version, effectiveDate: policy.effectiveDate, status: policy.status, notice: policy.notice };

  if (policy.binding && policy.legalOperatorName) {
    return (
      <PublicPolicyPage
        eyebrow="Privacy disclosure"
        title="Privacy Policy"
        siteName={policy.siteName}
        policyMeta={policyMeta}
        intro={<p>This Privacy Policy explains how <strong>{policy.legalOperatorName}</strong>, operating {policy.siteName} (“{policy.siteName}”, “we”, “us”, or “our”), handles information through the {policy.siteName} platform. This Policy applies to platform merchant accounts and platform operations. Merchants remain responsible for providing appropriate disclosures and complying with applicable requirements in relation to their own shoppers and storefront activities.</p>}
        sections={buildBindingPrivacySections({ siteName: policy.siteName, legalOperatorName: policy.legalOperatorName })}
      />
    );
  }

  return (
    <PublicPolicyPage
      eyebrow="Privacy disclosure"
      title="Privacy Policy — review version"
      siteName={policy.siteName}
      policyMeta={policyMeta}
      intro={<p>This page describes the main categories of information the current {policy.siteName} product handles and the systems used to provide the service. It does not claim certifications, fixed retention periods, or jurisdiction-specific rights that have not been approved.</p>}
      sections={[
        { title: "Merchant account and store data", body: <p>{policy.siteName} can process merchant authentication identifiers, profile details, store identity and settings, catalog and inventory-facing data, CMS content, themes, orders, subscription and entitlement state, integration configuration state, backup/restore records, and operational/audit information needed to provide and secure merchant administration.</p> },
        { title: "Shopper and storefront data", body: <><p>Merchant storefronts can process shopper information associated with orders, checkout and delivery, contact messages, reviews, returns, stock notifications, cart-recovery workflows, account features, and storefront analytics or events where those features are enabled.</p><p>The merchant remains responsible for its customer relationship, storefront disclosures, products, fulfillment, and lawful use of customer information. {policy.siteName} handles storefront data to provide the merchant&apos;s configured commerce workflows.</p></> },
        { title: "Authentication and account security", body: <p>Authentication data can be handled through Supabase authentication and, where enabled, Google/Firebase-based authentication flows. Authentication providers can receive the information required by their own sign-in processes. {policy.siteName} does not ask users to submit passwords, access tokens, service-role keys, or other secrets through the public support form.</p> },
        { title: "Infrastructure and service providers", body: <><p>Current platform infrastructure uses services including Supabase for database/authentication functions, Vercel for web application hosting and delivery, and Cloudinary for media workflows where used. Google/Firebase can be involved where the corresponding authentication flow is enabled.</p><p>Payment, courier, email, messaging, domain, or other external providers may process data only when the relevant workflow is configured or used. Provider availability and verification state vary; a provider name is not treated as proof of an active connection.</p></> },
        { title: "Browser storage, cookies, and analytics", body: <p>The application can use browser storage and cookies for authentication/session state, interface preferences, storefront behavior, and feature operation. Storefront or platform analytics can record operational or usage events. Third-party analytics or marketing tools should only be treated as active when they are actually configured for the relevant environment.</p> },
        { title: "How information is used", body: <p>Information is used to authenticate users, operate and secure stores, display storefront content, process merchant-configured commerce workflows, provide support and recovery, enforce plan/authority boundaries, investigate failures or abuse, and improve platform operation.</p> },
        { title: "Retention, deletion, and export", body: <><p>This review version does not publish a fixed retention period. Retention can depend on account and store state, operational recovery needs, feature behavior, and requirements that still need owner/legal review.</p><p>Available export, backup, restore, deletion, and account/store controls should be used where applicable. Privacy or data requests that need platform assistance can be submitted through <a href="/support" className="font-semibold text-primary">platform support</a>. This page does not promise instantaneous deletion or recovery.</p></> },
        { title: "Security", body: <p>{policy.siteName} uses tenant-aware authorization, server-side authority boundaries for sensitive operations, secret-handling controls, and operational logging in parts of the product. No security measure is absolute, and this review version does not claim a security certification or guarantee against every incident.</p> },
        { title: "Privacy terms still awaiting approval", body: <p>Final operator identity/contact wording, jurisdiction-specific privacy commitments, formal retention schedules, regulatory-role language, and any additional rights or response-time commitments remain subject to owner/legal approval before paid-beta legal sign-off.</p> },
      ]}
    />
  );
}
