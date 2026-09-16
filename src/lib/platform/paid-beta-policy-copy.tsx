import Link from "next/link";
import type { ReactNode } from "react";

type PolicySection = { title: string; body: ReactNode };
type Identity = { siteName: string; legalOperatorName: string };

export function buildBindingTermsSections({ siteName }: Identity): PolicySection[] {
  return [
    {
      title: "Accounts and authority",
      body: <><p>You must provide accurate information when creating or administering an account and must protect your authentication methods and credentials.</p><p>You may access or manage only stores, accounts, data, and administrative functions that you are authorized to use.</p><p>The person accepting these Terms for a business represents that they have authority to accept them on behalf of that business.</p></>,
    },
    {
      title: "Merchant relationship and responsibilities",
      body: <><p>{siteName} provides software and infrastructure for creating and operating online storefronts. Unless expressly stated otherwise, {siteName} is not the seller of a merchant&apos;s goods or services merely because the merchant uses the platform.</p><p>The merchant remains responsible for its products and services, descriptions, prices, taxes, product safety, availability, customer communications, fulfillment, delivery, returns, refunds owed to its customers, regulatory obligations, and compliance with applicable law.</p><p>Merchants must have the rights and permissions necessary to use all content, trademarks, photographs, customer information, and other material they submit to {siteName}.</p></>,
    },
    {
      title: "Acceptable use",
      body: <><p>You must not use {siteName} to conduct fraud, credential theft, malware distribution, unlawful transactions, unauthorized access, cross-tenant access attempts, deliberate service interference, abuse of infrastructure, or activities intended to bypass platform security, permissions, billing authority, or commerce controls.</p><p>We may investigate suspected misuse and may restrict or suspend affected access where reasonably necessary to protect merchants, users, the platform, third parties, or legal and operational integrity.</p></>,
    },
    {
      title: "Plans, trials, and paid access",
      body: <><p>Plan names, prices, trial periods, store limits, and other catalog terms shown by {siteName} are based on the platform&apos;s current billing catalog.</p><p>Paid access begins or changes only after the corresponding payment or verification condition has been satisfied.</p><p>Detailed renewal, cancellation, payment, and refund terms appear in the <Link href="/billing-policy" className="font-semibold text-primary">Billing, Renewal, Cancellation & Refund Policy</Link>, which forms part of these Terms.</p></>,
    },
    {
      title: "Third-party services",
      body: <><p>{siteName} may integrate with or depend on third-party hosting, database, authentication, media, payment, courier, messaging, domain, analytics, or other providers.</p><p>A provider being available as an integration option does not mean that the provider is connected, verified, included in a {siteName} subscription, or available to every merchant.</p><p>Third-party services may impose their own fees, eligibility requirements, outages, restrictions, terms, and privacy practices.</p></>,
    },
    {
      title: "Core Service availability",
      body: <><p>{siteName} commits to a <strong>99% monthly Core Service availability level</strong> from the date production availability monitoring is activated.</p><p>For this commitment, the “Core Service” means the canonical {siteName} application together with the production database-backed path required for the automated availability probe to complete successfully.</p><p>Availability is measured in completed five-minute slots. A slot is considered available when the automated monitor records a successful Core Service probe for that slot. An expected slot for which no successful probe is recorded counts as unavailable.</p><p>Measurement begins only after the monitoring system is formally activated. Partial time before activation is not included in the denominator.</p><p>The Core Service definition does not include merchant-specific custom DNS or domain configuration, a merchant&apos;s own device or internet connection, or independently operated payment, courier, messaging, authentication, media, analytics, or other external-provider systems. A failure limited to one of those systems is therefore not itself a Core Service outage.</p><p>No historical availability is represented for periods before monitoring activation.</p></>,
    },
    {
      title: "Support",
      body: <><p>Platform support is available through {siteName}&apos;s platform support channel.</p><p>Support is provided on a best-effort basis unless a separate written service-level agreement expressly states otherwise. These Terms do not promise a specific initial-response time, resolution time, or outcome.</p></>,
    },
    {
      title: "Security, suspension, and termination",
      body: <><p>We may temporarily restrict or suspend access where reasonably necessary because of suspected abuse, security risk, non-payment, legal requirements, platform integrity, or material violation of these Terms.</p><p>A merchant may stop using {siteName} subject to outstanding billing obligations and the applicable Billing Policy.</p><p>Following suspension or termination, access to some features or data may cease. Retention and deletion are governed by the Privacy Policy and applicable legal requirements.</p></>,
    },
    {
      title: "Merchant content and intellectual property",
      body: <><p>Merchants retain their rights in merchant-provided content.</p><p>By submitting content to {siteName}, the merchant grants {siteName} the permissions reasonably necessary to host, process, reproduce, transmit, display, back up, and otherwise handle that content for the purpose of providing, securing, maintaining, and supporting the service.</p><p>This permission does not transfer ownership of merchant content to {siteName}.</p><p>{siteName} and its licensors retain their respective rights in the platform software, branding, interfaces, documentation, and other platform materials.</p></>,
    },
    {
      title: "Service changes",
      body: <><p>We may modify or improve platform features, interfaces, integrations, infrastructure, or plan capabilities.</p><p>Where a change materially alters binding legal terms, we will publish a new policy version and effective date rather than silently rewriting the version previously accepted.</p><p>Where {siteName} marks a new version as requiring acceptance, continued use of the affected merchant or paid functionality may require acceptance of that new version.</p></>,
    },
    {
      title: "Warranties and legal rights",
      body: <><p>{siteName} will use reasonable efforts to operate and secure the service consistent with these Terms.</p><p>Except for express commitments stated in these Terms and to the fullest extent permitted by applicable law, the service is provided without additional implied warranties or guarantees regarding uninterrupted operation, merchant revenue, sales results, business outcomes, compatibility with every external provider, or freedom from every possible defect or security incident.</p><p>Nothing in these Terms excludes, restricts, or waives a warranty, remedy, liability, consumer right, statutory right, or other obligation that cannot lawfully be excluded or restricted.</p></>,
    },
    {
      title: "Limitation of liability",
      body: <><p>To the fullest extent permitted by applicable law, {siteName} is not responsible for indirect, incidental, special, exemplary, or consequential loss arising from the use of the service where such exclusion is legally permitted, including losses caused solely by a merchant&apos;s own configuration, unlawful conduct, unauthorized use, or independently operated third-party services.</p><p>These Terms do <strong>not</strong> establish an artificial monetary liability cap.</p><p>Nothing in this section limits liability that cannot lawfully be limited or excluded.</p></>,
    },
    {
      title: "Governing law and disputes",
      body: <><p>These Terms are governed by the laws of <strong>Bangladesh</strong>.</p><p>The parties should first attempt in good faith to resolve a dispute through the {siteName} support process where appropriate. Unresolved disputes may be brought before a court or other competent authority having jurisdiction under Bangladesh law.</p><p>These Terms do not require mandatory private arbitration.</p></>,
    },
    {
      title: "Contact",
      body: <p>Questions about these Terms, billing, account access, privacy, abuse, or security may be submitted through the {siteName} platform support page at <Link href="/support" className="font-semibold text-primary">/support</Link>.</p>,
    },
    {
      title: "Entire platform policy set",
      body: <><p>These Terms should be read together with the current:</p><ul className="list-disc space-y-2 pl-6"><li>Privacy Policy; and</li><li>Billing, Renewal, Cancellation & Refund Policy.</li></ul><p>If a mandatory provision of applicable law conflicts with this policy set, the mandatory legal requirement controls to the extent of that conflict.</p></>,
    },
  ];
}

export function buildBindingPrivacySections({ siteName }: Identity): PolicySection[] {
  return [
    {
      title: `Information ${siteName} may process`,
      body: <><p>Depending on the features used, {siteName} may process:</p><h3 className="font-semibold text-foreground">Merchant and account information</h3><p>This can include authentication identifiers, profile details, contact information, store ownership and membership information, store identity, configuration, plan and subscription status, and support communications.</p><h3 className="font-semibold text-foreground">Store and commerce information</h3><p>This can include catalog data, products, inventory-facing data, prices, CMS content, themes, settings, orders, returns, payment and entitlement status, integration configuration state, backup and restore records, and operational history.</p><h3 className="font-semibold text-foreground">Shopper and storefront information</h3><p>Merchant storefront features may process information associated with orders, checkout, delivery, contact messages, reviews, returns, stock notifications, customer accounts, cart-recovery features, and storefront analytics or events where enabled.</p><h3 className="font-semibold text-foreground">Technical and operational information</h3><p>We may process security events, audit records, application errors, request identifiers, operational incidents, browser or device-related information, session information, and usage events needed to operate, protect, troubleshoot, or improve the service.</p></>,
    },
    {
      title: "Authentication",
      body: <><p>{siteName} uses Supabase authentication and may use Google authentication flows where enabled.</p><p>Authentication providers process the information required to perform their respective authentication services under their own applicable terms and privacy practices.</p></>,
    },
    {
      title: "How information is used",
      body: <><p>We use information as reasonably necessary to:</p><ul className="list-disc space-y-2 pl-6"><li>authenticate users and maintain accounts;</li><li>create and administer merchant stores;</li><li>operate storefront and commerce features;</li><li>maintain subscriptions and entitlements;</li><li>process merchant-configured workflows;</li><li>prevent fraud, abuse, unauthorized access, and cross-tenant access;</li><li>provide backup, restoration, support, and incident response;</li><li>maintain platform security and reliability;</li><li>send operational communications;</li><li>satisfy legal, accounting, dispute, and compliance requirements; and</li><li>improve and maintain the service.</li></ul><p>Where applicable law requires consent or another specific lawful basis for a particular activity, {siteName} and merchants must use the appropriate basis for that activity.</p></>,
    },
    {
      title: "Merchant shopper data",
      body: <><p>A merchant controls its commercial relationship with its shoppers and remains responsible for its storefront disclosures, lawful collection and use of shopper information, products, communications, fulfillment, and customer-service obligations.</p><p>{siteName} processes storefront information to provide the merchant&apos;s configured platform functions and to secure and operate the service.</p><p>{siteName} does not obtain ownership of merchant shopper data merely because that data is processed through the platform.</p></>,
    },
    {
      title: "Service providers and infrastructure",
      body: <><p>{siteName} currently uses infrastructure or services that can include:</p><ul className="list-disc space-y-2 pl-6"><li><strong>Supabase</strong> for database, authentication, and backend functions;</li><li><strong>Vercel</strong> for application hosting and delivery;</li><li><strong>Cloudinary</strong> for media workflows where used;</li><li><strong>Google</strong> for authentication functionality where enabled;</li><li>email-delivery services where configured;</li><li>bKash or other payment services when the relevant payment workflow is used; and</li><li>courier, messaging, domain, analytics, or other providers where the relevant feature is configured.</li></ul><p>A provider named or supported by the platform should not be assumed to receive information from every merchant. Provider involvement depends on the features actually configured or used.</p></>,
    },
    {
      title: "Browser storage, cookies, and analytics",
      body: <><p>{siteName} may use browser storage, cookies, or similar mechanisms for authentication and session state, security, interface preferences, storefront behavior, and feature operation.</p><p>Platform or storefront analytics may record operational or usage events where enabled.</p><p>Third-party analytics or marketing tools are relevant only where they are actually configured for the applicable environment or storefront.</p></>,
    },
    {
      title: "Communications",
      body: <><p>{siteName} may use account contact information to send transactional, security, billing, renewal, support, or other service-related communications.</p><p>Where SMS or another messaging channel is used, delivery depends on the relevant provider, destination, network, valid contact information, and configuration. {siteName} does not guarantee successful delivery of every message.</p></>,
    },
    {
      title: "Retention",
      body: <><p>{siteName} does not apply one universal retention period to every category of information.</p><p>Transaction, billing, commerce, accounting, audit, or related records may be retained for the period required by applicable law or reasonably necessary for accounting, disputes, fraud prevention, security, recovery, and legal compliance.</p><p>Other information is retained for as long as reasonably necessary to provide or secure the service, maintain legitimate operational records, resolve disputes, meet legal obligations, or support recovery.</p><p>When information no longer needs to be retained, it may be deleted, anonymized, or otherwise handled in accordance with applicable law and technically available deletion or lifecycle processes.</p><p>A request to delete information does not require {siteName} to delete information that must lawfully be retained.</p></>,
    },
    {
      title: "Security",
      body: <><p>{siteName} uses controls that include tenant-aware authorization, server-side authority boundaries for sensitive operations, restricted secret handling, authentication controls, database row-level security in relevant areas, operational logging, and backup/recovery processes.</p><p>No security system can guarantee prevention of every unauthorized event or failure.</p><p>Users and merchants must also protect their own devices, credentials, authentication methods, integrations, and authorized-user access.</p></>,
    },
    {
      title: "Data access, export, correction, and deletion requests",
      body: <><p>Available product controls should be used to manage, export, correct, or delete information where those controls exist.</p><p>Requests requiring platform assistance may be submitted through <Link href="/support" className="font-semibold text-primary">/support</Link>.</p><p>We will handle applicable requests in accordance with the requirements that legally apply to the request and the relevant information. We do not promise deletion where retention is required by law or necessary to preserve a legally valid record.</p></>,
    },
    {
      title: "International and third-party infrastructure",
      body: <><p>Some infrastructure or service providers may process or store information in locations different from the merchant or shopper.</p><p>Where a cross-border or third-party processing requirement applies, {siteName} will use the service subject to applicable legal requirements and the relevant provider arrangement.</p></>,
    },
    {
      title: "Children and unlawful use",
      body: <p>{siteName} is intended for lawful business and commerce use. Merchants must not intentionally use the platform to collect or process information in a manner prohibited by applicable law.</p>,
    },
    {
      title: "Changes to this Privacy Policy",
      body: <><p>This Privacy Policy is versioned.</p><p>Material changes will be published as a new version with a new effective date rather than silently altering the historical version.</p><p>Where an updated policy requires renewed merchant acknowledgement or acceptance, {siteName} may require that acknowledgement before allowing affected merchant or paid functionality to continue.</p></>,
    },
    {
      title: "Contact",
      body: <p>Privacy and data requests may be submitted through the {siteName} platform support page at <Link href="/support" className="font-semibold text-primary">/support</Link>.</p>,
    },
    {
      title: "Applicable law",
      body: <><p>This Privacy Policy is interpreted subject to applicable law in Bangladesh and any other mandatory law that legally applies to the relevant processing or request.</p><p>Nothing in this Policy removes a privacy or data-protection right that cannot lawfully be waived.</p></>,
    },
  ];
}

export function buildBindingBillingSections({ siteName }: Identity): PolicySection[] {
  return [
    {
      title: "Plans and prices",
      body: <><p>Available plans, prices, currencies, trial periods, store limits, and availability are determined by {siteName}&apos;s current authoritative billing catalog.</p><p>The amount shown for a plan at checkout or payment submission is the applicable {siteName} subscription amount for that transaction.</p><p>Fees charged separately by payment, courier, messaging, domain, authentication, media, analytics, or other external providers are not included unless {siteName} expressly says otherwise.</p></>,
    },
    {
      title: "Free plans and trials",
      body: <><p>A Free plan does not require a {siteName} subscription payment while its catalog amount remains zero.</p><p>Where a paid plan has a trial period configured in the current plan catalog, the displayed trial period applies to that plan.</p><p>Trial access remains subject to the subscription status and entitlements enforced by the platform.</p></>,
    },
    {
      title: "When paid access begins",
      body: <><p>A paid plan is not activated merely because it is selected.</p><p>Paid access begins or changes after the applicable payment has been successfully completed or, for a manual-payment workflow, after {siteName} has successfully verified and accepted the payment.</p></>,
    },
    {
      title: "Renewal preference",
      body: <><p>{siteName} sets the subscription <strong>renewal preference to ON by default</strong>.</p><p>This renewal preference means the account is intended to continue and the applicable renewal workflow remains enabled.</p><p><strong>The renewal preference by itself does not authorize {siteName} or bKash to make a silent or automatic debit.</strong></p><p>Under the current bKash checkout implementation, payment approval is still required unless a separate reusable recurring-payment authorization or agreement is later implemented, supported by the payment provider, and separately authorized by the merchant.</p><p>If {siteName} later supports automatic debit through a reusable payment authorization, the debit may occur only within the scope of that separately authorized arrangement and the applicable provider rules.</p></>,
    },
    {
      title: "Turning renewal off",
      body: <><p>The store owner may turn the renewal preference off through the available billing controls.</p><p>Where renewal is off, the subscription remains usable through its applicable paid-through or entitlement period unless another valid suspension or termination rule applies.</p><p>Turning renewal off does not itself create a refund for already-paid subscription time.</p></>,
    },
    {
      title: "Expiry reminder when renewal is off",
      body: <><p>For an active subscription with renewal turned off, {siteName} will <strong>attempt</strong> to send an email reminder and an SMS/phone reminder around three days before the applicable expiry date.</p><p>The reminder is intended to include a path for renewing or making the required payment.</p><p>Reminder delivery depends on valid contact information and availability/configuration of the relevant email, messaging, telecommunications, and network providers.</p><p>{siteName} therefore does not guarantee that every reminder will be successfully delivered, and failure to receive a reminder does not by itself extend the subscription period or create a refund.</p></>,
    },
    {
      title: "Renewal periods",
      body: <><p>For a successful renewal of the <strong>same plan</strong> while a future paid-through expiry already exists:</p><ul className="list-disc space-y-2 pl-6"><li>a monthly renewal adds <strong>one calendar month</strong> from the existing future expiry; and</li><li>an annual renewal adds <strong>12 calendar months</strong> from the existing future expiry.</li></ul><p>This preserves prepaid subscription time rather than resetting the period from an earlier payment date.</p><p>If the prior subscription period has already expired and no future prepaid expiry remains, the new paid period begins from the successful payment or verification time used by the platform.</p></>,
    },
    {
      title: "Plan changes",
      body: <><p>A paid change to a different plan takes effect after successful payment or verification.</p><p>{siteName}&apos;s entitlement controls are designed not to erase an already-paid future access period merely because a plan change occurs. As a result, an entitlement transition may preserve a later existing paid-through date while the changed plan becomes effective.</p><p>No cash proration, partial-period refund, or account credit is promised for a plan change unless {siteName} expressly offers one for that transaction.</p></>,
    },
    {
      title: "Seven-day refund policy",
      body: <><p>For an <strong>initial paid {siteName} subscription charge or a paid {siteName} renewal charge</strong>, the account owner may request a refund within <strong>7 calendar days after the successful charge</strong>.</p><p>A refund request must be submitted through <Link href="/support" className="font-semibold text-primary">/support</Link> with enough transaction or account information for {siteName} to identify and review the charge.</p><p>The seven-day {siteName} subscription refund does not cover:</p><ul className="list-disc space-y-2 pl-6"><li>fees paid directly to a payment provider, courier, messaging provider, domain provider, authentication provider, media provider, or other third party;</li><li>amounts already refunded;</li><li>amounts already reversed through a chargeback or equivalent payment reversal;</li><li>fraudulent transactions, abusive use of the refund process, or deliberate misuse of the platform.</li></ul><p>If subscription time associated with a refunded payment has already been credited to the account, {siteName} may remove that refunded subscription time, return the account to its otherwise applicable plan or entitlement state, or suspend the corresponding paid entitlement.</p><p>Refund processing time and the method by which funds are returned may depend on the payment provider or financial network.</p><p><strong>Nothing in this Policy limits any refund, remedy, cancellation right, or other right that cannot lawfully be excluded or restricted under applicable law.</strong></p></>,
    },
    {
      title: "Cancellation and expiry",
      body: <><p>Turning renewal off prevents the subscription from being treated as intended to continue through the renewal workflow, but does not retroactively cancel an already-paid period.</p><p>At the end of the applicable entitlement period, access to paid features may expire, downgrade, or otherwise change according to the account&apos;s resulting plan and entitlement state.</p><p>Outstanding payment obligations, fraud controls, legal obligations, or valid platform suspensions are not waived merely because renewal is disabled.</p></>,
    },
    {
      title: "Billing disputes",
      body: <><p>Billing questions, refund requests, suspected payment errors, or subscription disputes should be submitted through <Link href="/support" className="font-semibold text-primary">/support</Link>.</p><p>{siteName} will review billing disputes on a best-effort basis using the available account, invoice, provider, transaction, and entitlement records.</p><p>This Policy does not guarantee a particular response time or dispute outcome.</p></>,
    },
    {
      title: "Failed or incomplete payments",
      body: <><p>A failed, cancelled, abandoned, unverified, or otherwise incomplete payment does not create paid entitlement merely because the payment process was started.</p><p>Where a payment-provider session or manual submission exists but its final status is uncertain, {siteName} may preserve the related invoice or transaction record for reconciliation.</p></>,
    },
    {
      title: "Taxes and external charges",
      body: <><p>Merchants remain responsible for taxes or other charges that legally apply to their business unless {siteName} expressly states that a particular amount is being collected by {siteName} for that purpose.</p><p>Third-party provider charges remain governed by the relevant third party.</p></>,
    },
    {
      title: "Changes to this Policy",
      body: <><p>This Policy is versioned.</p><p>Material changes will receive a new version and effective date rather than silently rewriting a previously accepted billing policy.</p><p>Where a new version is marked as binding, {siteName} may require fresh acceptance before new store creation, paid checkout, renewal, or other affected merchant functionality.</p></>,
    },
    {
      title: "Applicable law",
      body: <><p>This Policy is governed by the laws of Bangladesh together with any other mandatory legal rights that apply to the relevant transaction.</p><p>Nothing in this Policy removes or limits a legal right that cannot lawfully be excluded.</p></>,
    },
  ];
}
