import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  MessageCircleMore,
  Palette,
  PhoneCall,
  Rocket,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsPricing } from "@/components/marketing/CmsPricing";

const merchantOutcomes = [
  {
    icon: Rocket,
    title: "Launch fast",
    copy: "Go from store idea to live storefront with launch templates, editable pages, and a setup flow designed to remove friction.",
  },
  {
    icon: CreditCard,
    title: "Sell locally",
    copy: "Offer bKash, Nagad, and cash on delivery in a checkout flow that already matches how local customers prefer to pay.",
  },
  {
    icon: LayoutDashboard,
    title: "Operate cleanly",
    copy: "Keep products, orders, coupons, reviews, homepage sections, and launch readiness in one focused workspace.",
  },
];

const customerTrustPoints = [
  {
    icon: BadgeCheck,
    title: "Storefronts that feel credible",
    copy: "Elegant pages, clearer product storytelling, and visible trust signals help buyers feel comfortable placing the first order.",
  },
  {
    icon: Truck,
    title: "Delivery expectations made obvious",
    copy: "Explain timing, coverage, and delivery flow before checkout so people are not forced to guess what happens next.",
  },
  {
    icon: MessageCircleMore,
    title: "Support confidence before checkout",
    copy: "Make your service feel human by showing there is responsive support behind the brand when buyers need reassurance.",
  },
];

const platformBlocks = [
  {
    icon: Palette,
    title: "Templates and themes",
    copy: "Start from polished launch templates for clothing, food, or general retail, then tune the look without touching code.",
  },
  {
    icon: Boxes,
    title: "Catalog and campaigns",
    copy: "Run featured products, campaign banners, launch pages, and promotional collections from the same CMS.",
  },
  {
    icon: ShieldCheck,
    title: "Store control",
    copy: "Manage members, domains, content, payment behavior, and launch readiness with structure built for serious stores.",
  },
  {
    icon: BarChart3,
    title: "Operational clarity",
    copy: "Spot what is missing before go-live instead of finding out only after traffic starts leaking away.",
  },
];

const journey = [
  "Create your store and choose a launch template",
  "Set your pages, homepage sections, logo, and trust copy",
  "Add products, pricing, delivery rules, and local payments",
  "Publish a storefront that is ready to convert, not just exist",
];

const statCards = [
  { value: "CMS + Storefront", label: "One system for content and selling" },
  { value: "bKash + COD", label: "Built for local checkout expectations" },
  { value: "Launch-ready pages", label: "Not just a blank homepage" },
];

const proofPoints = [
  "Trust-first homepage structure",
  "Local-payment checkout messaging",
  "Policy and FAQ sections that reduce doubt",
  "Launch templates merchants can publish quickly",
];

const floatingSignals = [
  { title: "Checkout confidence", value: "bKash + COD ready" },
  { title: "Buyer reassurance", value: "FAQs, policy, support" },
  { title: "Launch control", value: "CMS, products, themes" },
];

export function CmsLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-2xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-lg font-bold tracking-tight text-white transition-transform duration-300 hover:scale-[1.02]">
            COMMERCE<span className="text-primary"> Engine</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#why" className="nav-link-anim pb-1 transition-colors hover:text-white">
              Why it sells
            </a>
            <a href="#platform" className="nav-link-anim pb-1 transition-colors hover:text-white">
              Platform
            </a>
            <Link href="/plans" className="nav-link-anim pb-1 transition-colors hover:text-white">
              Plans
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white transition-all duration-300 hover:bg-white/10 hover:text-white">
              <Link href="/admin/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4 shadow-[0_12px_30px_rgba(16,185,129,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(16,185,129,0.28)]">
              <Link href="/signup">Start Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[#06110d]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.14),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_30%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute left-[6%] top-24 h-44 w-44 rounded-full bg-emerald-400/12 blur-3xl animate-float-orb-1" />
        <div className="absolute bottom-10 right-[8%] h-56 w-56 rounded-full bg-amber-300/10 blur-3xl animate-float-orb-2" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="max-w-3xl">
              <div className="glass-chip inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Store className="h-4 w-4" />
                Sell-ready ecommerce CMS
              </div>
              <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
                Launch a storefront that looks premium, feels trustworthy, and converts curious visitors into paying customers.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                Commerce Engine gives merchants an elegant CMS, persuasive storefront sections, local-payment readiness, and the operational control needed to sell with more confidence from day one.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2 rounded-full px-7 shadow-[0_16px_40px_rgba(16,185,129,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(16,185,129,0.3)]">
                  <Link href="/signup">
                    Launch your store <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full border border-white/15 bg-white/8 px-7 text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/14 hover:text-white"
                >
                  <Link href="/plans">See plans</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {proofPoints.map((point) => (
                  <div key={point} className="glass-chip inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white/88 hover:-translate-y-0.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {statCards.map((item) => (
                  <div key={item.value} className="glass-luxe rounded-2xl px-4 py-4 hover:-translate-y-1.5">
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-sm leading-6 text-white/75">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-3xl" />
              <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -left-6 top-12 hidden w-44 rounded-2xl border border-white/10 bg-white/10 p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl animate-float-card md:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Buyer signal</p>
                <p className="mt-2 text-sm font-semibold text-white">The store feels ready to trust.</p>
                <p className="mt-2 text-xs leading-5 text-white/72">Support, payment, delivery, and storefront quality show up before checkout.</p>
              </div>
              <div className="absolute -right-6 bottom-10 hidden w-48 rounded-2xl border border-white/10 bg-white/10 p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl animate-float-card-delayed md:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Merchant signal</p>
                <p className="mt-2 text-sm font-semibold text-white">Update content without redesigning everything.</p>
                <p className="mt-2 text-xs leading-5 text-white/72">Templates, CMS sections, and store settings stay aligned inside one system.</p>
              </div>

              <div className="glass-luxe relative overflow-hidden rounded-[2rem] bg-[#091411]/82 p-5 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Merchant launch workspace</p>
                    <p className="mt-1 text-xs text-white/65">The pieces customers feel and the ops merchants need to actually sell</p>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Publish-ready
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {journey.map((item, index) => (
                    <div key={item} className="glass-luxe rounded-2xl bg-white/[0.07] p-4 hover:-translate-y-0.5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-6 text-white">{item}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-300"
                              style={{ width: `${90 - index * 14}%` }}
                            />
                          </div>
                        </div>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {floatingSignals.map((signal) => (
                    <div key={signal.title} className="glass-luxe rounded-2xl bg-white/[0.06] px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{signal.title}</p>
                      <p className="mt-2 text-sm font-medium leading-5 text-white">{signal.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="glass-luxe rounded-2xl bg-black/30 p-4 hover:bg-black/35">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Customer-facing</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/85">
                      <li>Trust-driven homepage sections</li>
                      <li>bKash, Nagad, and COD messaging</li>
                      <li>Policy, FAQ, and support cues</li>
                    </ul>
                  </div>
                  <div className="glass-luxe rounded-2xl bg-black/30 p-4 hover:bg-black/35">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Merchant-facing</p>
                    <ul className="mt-3 space-y-2 text-sm text-white/85">
                      <li>CMS builder and launch templates</li>
                      <li>Catalog, coupons, and reviews</li>
                      <li>Readiness checks before go-live</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="relative py-20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why this converts better</p>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              A good-looking store is not enough. Buyers need to feel safe, clear, and ready to act.
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Conversion improves when the page answers the real buying questions quickly: what is being sold, why it is worth buying, how payment works, how delivery works, and whether support will respond.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {merchantOutcomes.map((item) => (
              <article key={item.title} className="glass-luxe group rounded-3xl bg-card/70 p-6 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-500 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_minmax(0,1.08fr)] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Customer confidence stack</p>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                The best storefronts remove doubt before doubt becomes an abandoned cart.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Stronger hierarchy, better copy, visible payment reassurance, and elegant support context turn the experience from "just another store" into something buyers are more willing to trust.
              </p>
              <div className="glass-luxe mt-6 rounded-3xl bg-white/5 p-5 hover:bg-white/8">
                <div className="flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Stores convert better when support, delivery, and payment are designed into the experience instead of hidden in disconnected pages.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {customerTrustPoints.map((item) => (
                <article key={item.title} className="glass-luxe group rounded-3xl bg-background/80 p-6 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-500 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Inside the platform</p>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                This is not just a page editor. It is the control layer behind a more convincing online business.
              </h2>
            </div>
            <p className="text-base leading-8 text-muted-foreground">
              Merchants should be able to shape the offer, the story, the trust cues, and the operational flow without losing control of the brand experience.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {platformBlocks.map((item) => (
              <article key={item.title} className="glass-luxe group rounded-3xl bg-card/70 p-6 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary transition-all duration-500 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CmsPricing />

      <section className="border-t border-border py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="glass-luxe rounded-[2rem] bg-white/5 px-6 py-8 hover:bg-white/7 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ready to relaunch the experience?</p>
                <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  Give merchants a storefront foundation that feels premium before they even start customizing it.
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  Start with stronger copy, cleaner hierarchy, more persuasive sections, and a CMS flow that helps merchants publish with confidence.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2 rounded-full px-7 shadow-[0_16px_40px_rgba(16,185,129,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(16,185,129,0.3)]">
                <Link href="/signup">
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
