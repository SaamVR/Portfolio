import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Palette,
  Rocket,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsPricing } from "@/components/marketing/CmsPricing";

const capabilities = [
  { icon: Rocket, title: "Launch wizard", copy: "Phone-first onboarding turns a store idea into a published storefront in minutes." },
  { icon: Palette, title: "Template engine", copy: "Clothing, food, and general storefronts start with blocks, themes, and payment defaults." },
  { icon: LayoutDashboard, title: "CMS builder", copy: "Edit pages, homepage blocks, theme presets, and launch content without touching code." },
  { icon: CreditCard, title: "Local payments", copy: "Configure bKash, Nagad, COD, and payment copy for Bangladesh-first checkout." },
  { icon: BarChart3, title: "Commerce ops", copy: "Products, orders, reviews, coupons, store health, and readiness checks in one admin." },
  { icon: ShieldCheck, title: "Tenant-ready core", copy: "Store ownership, staff roles, domains, settings, and policies are moving to a multi-store CMS model." },
];

const workflow = ["Create account", "Pick a launch template", "Tune theme and payments", "Publish storefront"];

export function CmsLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-lg font-bold">
            COMMERCE<span className="text-primary"> Engine</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
            <Link href="/plans" className="hover:text-foreground">Plans</Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-[url('/og-image.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-background/95" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-24 lg:grid-cols-[1fr_0.9fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Store className="h-4 w-4" />
              Ecommerce CMS for fast-moving merchants
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Launch and manage online stores without rebuilding the website every time.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Commerce Engine is becoming the CMS layer for product catalogs, storefront pages, local payments, launch templates, and store operations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Start building <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/plans">View packages</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-semibold">Launch Command Center</p>
                <p className="text-xs text-muted-foreground">Store setup, CMS blocks, payments</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">82% ready</span>
            </div>
            <div className="mt-4 grid gap-3">
              {workflow.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item}</p>
                    <div className="mt-2 h-2 rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${95 - index * 18}%` }} />
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">The CMS is the product now.</h2>
            <p className="mt-3 text-muted-foreground">
              The storefront is one output. The engine manages templates, content, catalog, payments, store health, and launch workflows.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-lg border border-border bg-card p-5">
                <item.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">From signup to published store.</h2>
              <p className="mt-3 text-muted-foreground">
                A merchant should land here, choose a package, sign up, and enter the setup flow. The storefront comes after the CMS has enough context to publish it.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map((item, index) => (
                <div key={item} className="rounded-lg border border-border bg-background p-5">
                  <p className="text-sm font-semibold text-primary">Step {index + 1}</p>
                  <p className="mt-2 font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CmsPricing />

      <section className="border-t border-border py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Ready to make this a real CMS engine?</h2>
            <p className="mt-2 text-muted-foreground">Start with the signup flow, then continue store setup from the dashboard.</p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Create account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
