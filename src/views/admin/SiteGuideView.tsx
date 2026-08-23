"use client";

import React, { useState } from "react";
import { Link } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";

import {
  Rocket,
  CheckCircle2,
  Palette,
  Layers,
  CreditCard,
  Globe,
  Truck,
  FileText,
  Sparkles,
  PlayCircle,
  ChevronRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Settings,
  Store,
  Package,
  ShoppingBag,
  Sliders,
  ShieldCheck,
  Zap,
  Info,
  ListOrdered,
  Lightbulb,
  LayoutGrid,
  CheckSquare,
  Video,
  Eye,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SiteGuideView() {
  const { activeStoreId } = useAuth();
  const [activeSubCategory, setActiveSubCategory] = useState<"creation" | "management" | "walkthrough" | "checklist">("creation");
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const creationStepsDetailed = [
    {
      step: 1,
      id: "template-selection",
      title: "Select Base Storefront Template",
      icon: Palette,
      badge: "Design Foundation",
      shortSummary: "Pick an industry-optimized template (Electronics, Food, Crafts).",
      image: "/images/guide/step1_template_selection.png",
      actionUrl: "/admin/onboarding?step=template",
      actionText: "Open Step 1 in Onboarding",

      whatItMeans:
        "Selecting a base storefront template defines your site's visual skeleton, default component arrangement, typography spacing, and customer interaction flow. Different industries require vastly different user experience (UX) rhythms—for instance, electronics demand spec-dense grids, whereas food outlets require quick-add menu lists.",

      whatToDo: [
        "Browse the available template cards: Electronics (spec-heavy), Food & Menu (quick ordering), or Crafts & Fashion (storytelling).",
        "Click the Preview icon on any template card to inspect its homepage layout, product card styling, and cart drawer interaction.",
          "Click 'Select Template' on your chosen template layout.",
        "Click 'Next' at the bottom right to lock in your foundation and proceed to brand setup.",
      ],

      recommendations: [
        "Choose Electronics if you sell multi-variant gadgets with tech specs.",
        "Choose Food if you sell items with instant pickup/delivery options.",
        "Choose Crafts for artisan, clothing, or single-category brand storytelling.",
      ],

      proTip:
        "Don't worry about being locked in! Changing your template later in the Online Store Hub (`/admin/online-store`) preserves all existing product catalog items, categories, and payment configurations.",
    },
    {
      step: 2,
      id: "brand-identity",
      title: "Configure Store Identity & Brand Details",
      icon: Store,
      badge: "Brand Setup",
      shortSummary: "Set store name, URL slug, description, and official brand logo.",
      image: "/images/guide/step2_brand_details.png",
      actionUrl: "/admin/onboarding?step=brand",
      actionText: "Open Step 2 in Onboarding",

      whatItMeans:
        "Your brand identity parameters establish your store's public presence across the internet. The Store Name appears on browser titles, Google search results, customer order receipts, and SMS order alerts. The Store Slug creates your unique web subdomain handle.",

      whatToDo: [
        "Enter your official Store Name (e.g. 'ThreadBD Premium Gear').",
        "Verify your Store Slug (e.g. 'threadbd'). The platform automatically checks if the slug is available in real-time.",
        "Write a concise Store Description (1-2 sentences summarizing your offering for SEO meta tags).",
        "Upload or paste a high-resolution logo URL (transparent PNG/SVG recommended, around 400x120px).",
        "Click 'Next' to save your brand identity settings.",
      ],

      recommendations: [
        "Keep your slug short, memorable, and lowercase without special characters.",
        "Use a dark-mode compatible logo with transparent background for clean header rendering.",
      ],

      proTip:
        "If you plan to connect a custom domain (e.g. `www.yourbrand.com`), your store slug will remain as your internal platform fallback address.",
    },
    {
      step: 3,
      id: "hero-content",
      title: "Define Front-Page Hero & Attraction Content",
      icon: Sparkles,
      badge: "Homepage Hook",
      shortSummary: "Craft high-impact hero titles, promo badges, and main visual banners.",
      image: "/images/guide/step3_hero_content.png",
      actionUrl: "/admin/onboarding?step=hero",
      actionText: "Open Step 3 in Onboarding",

      whatItMeans:
        "The Hero section is the prime visual real estate at the top of your homepage. Studies show merchants have less than 3 seconds to capture a new shopper's attention. The Hero Content communicates your primary offer, current sales campaign, and primary Call-To-Action (CTA).",

      whatToDo: [
        "Input your Headline text (e.g. 'Elevate Your Audio Experience With ThreadBD').",
        "Input your Sub-headline description highlighting key customer benefits.",
        "Add a Highlight Slogan or promotional callout (e.g. 'Free Delivery on Orders Over ৳1000').",
        "Attach a Hero Banner Image or Promo Video URL.",
        "Configure primary CTA button labels (e.g. 'Shop Now', 'Explore Collection').",
      ],

      recommendations: [
        "Use high-contrast images where text overlay remains readable.",
        "Highlight compelling value propositions like 'Official Warranty', 'Fast 2-Day Delivery', or 'Cash on Delivery Available'.",
      ],

      proTip:
        "You can update your hero banners seasonally or for major promotional campaigns directly inside the Page Builder (`/admin/page-builder`).",
    },
    {
      step: 4,
      id: "catalog-strategy",
      title: "Select Catalog & Sales Layout Strategy",
      icon: Layers,
      badge: "Conversion Path",
      shortSummary: "Choose between Multi-Product, Single-Product, Menu, or Inquiry models.",
      image: "/images/guide/step4_catalog_layout.png",
      actionUrl: "/admin/onboarding?step=catalog",
      actionText: "Open Step 4 in Onboarding",

      whatItMeans:
        "Not all e-commerce businesses operate the same way. A multi-item retail store needs a full catalog grid with category filters, whereas a single offer (like a flagship massage gun or viral gadget) converts best on a focused 1-page funnel. The Catalog Strategy dictates your storefront navigation and cart flow.",

      whatToDo: [
        "Review the 5 sales models:",
        "• Multi Product: Standard multi-category store with cart drawer & filterable grid.",
        "• Single Product: Dedicated 1-page conversion funnel optimized for high-volume ad traffic.",
        "• Menu Assortment: Fast tabbed ordering tailored for restaurants & local items.",
        "• Inquiry Only: Quote-led browsing with direct WhatsApp sales contact.",
        "• Landing Only: Promotional launch page focusing on product presentation.",
        "Click to select the model that matches your current business strategy, then click 'Next'.",
      ],

      recommendations: [
        "For general retail/fashion: Choose Multi Product.",
        "For TikTok/Facebook ad campaigns selling one hero item: Choose Single Product.",
      ],

      proTip:
        "Selecting Single Product automatically streamlines your checkout by bypassing cart steps and placing order forms right on the main product view.",
    },
    {
      step: 5,
      id: "theme-aesthetics",
      title: "Customize Theme Aesthetics & Color Palette",
      icon: Sliders,
      badge: "Visual Style",
      shortSummary: "Set brand color schemes, typography, corner styles, and dark/light modes.",
      image: "/images/guide/step5_theme_palette.png",
      actionUrl: "/admin/onboarding?step=theme",
      actionText: "Open Step 5 in Onboarding",

      whatItMeans:
        "Visual consistency builds merchant authority and trust. Theme Aesthetics allow you to apply tailored color palettes (like Emerald Green, Ocean Blue, or Deep Rose), pick brand typography, and control UI element shapes like button border radii.",

      whatToDo: [
        "Choose a primary Color Palette preset or input custom hex codes for primary accent colors.",
        "Select your preferred Typography font family (Inter, Roboto, or Outfit).",
        "Adjust Button Corner Radius (Square, Slight Radius, or Pill Rounded).",
        "Choose default color scheme mode (Light Mode, Dark Mode, or System Auto).",
        "Click 'Next' to finalize visual theme customization.",
      ],

      recommendations: [
        "Use high-contrast primary colors for action buttons (e.g. vibrant emerald green or intense indigo) so checkout buttons stand out.",
        "Keep font choices consistent across headings and body text.",
      ],

      proTip:
        "Preview your color scheme on both dark and light backgrounds using the built-in preview toggle at the top right of the screen.",
    },
    {
      step: 6,
      id: "payment-delivery",
      title: "Set Up Mobile Payments & Delivery Methods",
      icon: CreditCard,
      badge: "Checkout Setup",
      shortSummary: "Connect bKash, Nagad wallet numbers, and toggle Cash on Delivery.",
      image: "/images/guide/step6_payments_launch.png",
      actionUrl: "/admin/onboarding?step=payments",
      actionText: "Open Step 6 in Onboarding",

      whatItMeans:
        "A smooth checkout payment experience is critical for reducing cart abandonment. In emerging markets, offering local Mobile Financial Services (MFS) like bKash and Nagad along with Cash on Delivery (COD) covers over 98% of customer payment preferences.",

      whatToDo: [
        "Toggle Cash on Delivery (COD) to 'Enabled' if you accept doorstep cash collection.",
        "Enter your bKash Merchant / Personal Account Number for MFS payment instructions.",
        "Enter your Nagad Merchant / Personal Account Number.",
        "Configure delivery charge defaults (e.g. Inside Dhaka ৳70, Outside Dhaka ৳130).",
        "Click 'Next' to save payment and shipping parameters.",
      ],

      recommendations: [
        "Double-check your bKash & Nagad numbers to ensure customer payments reach your wallet.",
        "Set clear delivery timeframe expectations (e.g. 24-48 hours inside city, 2-4 days nationwide).",
      ],

      proTip:
        "You can integrate automated courier API keys for Pathao, Steadfast, or RedX later in the Couriers menu (`/admin/couriers`) to auto-generate parcel tracking numbers.",
    },
    {
      step: 7,
      id: "seed-launch",
      title: "Seed Catalog & Launch Storefront Live",
      icon: Rocket,
      badge: "Go Live",
      shortSummary: "Optionally generate sample demo products and publish your site live.",
      image: "/images/guide/step6_payments_launch.png",
      actionUrl: "/admin/onboarding?step=launch",
      actionText: "Open Step 7 in Onboarding",

      whatItMeans:
        "The Launch step is your final deployment station. Here you can generate demo products and categories to immediately verify your store's visual look, copy your live storefront link, and publish your store to the web.",

      whatToDo: [
        "Check 'Seed Demo Products' if you want pre-populated sample items for testing.",
        "Click 'Publish Store Live' to activate your store URL.",
        "Click 'Open Storefront Live' to open your brand new e-commerce store in a new browser tab!",
      ],

      recommendations: [
        "Place a test order on your live storefront immediately after publishing to test customer SMS alerts and order receipt flows.",
      ],

      proTip:
        "You can delete or replace demo products anytime from the Product Inventory panel (`/admin/products`).",
    },
  ];

  const managementSubCategories = [
    {
      title: "1. Visual Page Builder & Theme Customizer",
      icon: Palette,
      path: "/admin/online-store",
      cta: "Open Page Builder",
      badge: "Design & Content",
      whatItMeans:
        "The Online Store Hub (`/admin/online-store`) is your central creative studio. It houses the drag-and-drop Page Builder, Theme Templates, Custom Pages (About Us, Contact, Policies), Blog Manager, and Media Library.",
      whatToDo: [
        "Click 'Customize Design' to launch the visual section editor.",
        "Drag and reorder homepage sections (Hero, Featured Products, Testimonials, FAQ accordions).",
        "Add new custom CMS pages (e.g. Return Policy, FAQ, Contact Us).",
        "Upload banners and product media to your centralized Media Library.",
      ],
      tip: "Use the live device preview toggle inside the Page Builder to test how your storefront renders on Mobile, Tablet, and Desktop screens.",
    },
    {
      title: "2. Site Settings, Custom Domains & Analytics",
      icon: Settings,
      path: "/admin/site-settings",
      cta: "Open Site Settings",
      badge: "Platform Control",
      whatItMeans:
        "Site Settings (`/admin/site-settings`) controls technical site identity, DNS custom domains, tracking pixels, announcement header banners, and store contact info.",
      whatToDo: [
        "Connect Custom Domain: Map your own domain (e.g. `www.yourstore.com`) with free automatic SSL certificates.",
        "Tracking Pixels: Paste your Facebook Pixel ID and Google Analytics (GA4) Measurement ID.",
        "Announcement Bar: Enable top bar banner announcements (e.g. '🎉 Eid Sale - 20% Off All Items!').",
        "Store Contact Info: Update phone numbers, WhatsApp sales numbers, and support email.",
      ],
      tip: "Connecting Facebook Pixel allows you to run high-converting retargeting campaigns for abandoned cart visitors.",
    },
    {
      title: "3. Product Catalog & Inventory Control",
      icon: Package,
      path: "/admin/products",
      cta: "Manage Products",
      badge: "Stock & Pricing",
      whatItMeans:
        "The Product Catalog (`/admin/products`) is where you manage your stock inventory, set regular and sale pricing, upload multi-angle product photos, organize categories, and configure discount badges.",
      whatToDo: [
        "Click 'Add Product' to list a new item.",
        "Upload high-quality product gallery images and set primary thumbnail.",
        "Input Pricing: Set Sale Price (discounted rate) and Original Compare Price to display discount percentage badges.",
        "Set Stock Quantity & SKU code for automated inventory tracking.",
        "Assign categories and tags for structured storefront filtering.",
      ],
      tip: "Products with sale compare pricing display eye-catching 'SAVE 25%' badges that boost click-through rates.",
    },
    {
      title: "4. Order Processing & Courier Automation",
      icon: Truck,
      path: "/admin/orders",
      cta: "Process Orders",
      badge: "Fulfillment & COD",
      whatItMeans:
        "The Orders panel (`/admin/orders`) tracks customer purchases from order placement to doorstep delivery. Connect local couriers (Pathao, Steadfast, RedX) for 1-click automated parcel booking and tracking.",
      whatToDo: [
        "View new incoming orders with customer details, item lists, and payment status.",
        "Verify MFS payments (bKash/Nagad transaction IDs) or confirm Cash on Delivery orders.",
        "Click 'Book Courier' to automatically dispatch order details to Pathao or Steadfast and generate tracking numbers.",
        "Update order status (Pending -> Processing -> Shipped -> Delivered).",
      ],
      tip: "Automated courier dispatch eliminates manual address entry and sends tracking SMS updates to customers automatically.",
    },
    {
      title: "5. Marketing, Coupons & Cart Recovery",
      icon: Zap,
      path: "/admin/marketing",
      cta: "Growth Tools",
      badge: "Sales Boost",
      whatItMeans:
        "Growth Tools (`/admin/marketing`) help drive repeat purchases and recover lost sales. Create promo coupon codes, generate campaign QR codes, and trigger automated abandoned cart recovery.",
      whatToDo: [
        "Create Discount Coupons: Fixed amount (e.g. ৳200 Off) or Percentage (e.g. 15% Off).",
        "Set Coupon Rules: Minimum order total, usage limits per customer, and expiry dates.",
        "Cart Recovery: View shoppers who dropped off at checkout and send automated WhatsApp/Email reminders.",
        "Generate QR Codes: Create scannable promotional QR codes for packaging or offline flyers.",
      ],
      tip: "Offering a 5% discount code in cart recovery messages typically recovers 15-25% of abandoned checkouts.",
    },
    {
      title: "6. Sales Analytics & Revenue Reports",
      icon: ShieldCheck,
      path: "/admin/analytics",
      cta: "View Stats",
      badge: "Insights",
      whatItMeans:
        "Analytics (`/admin/analytics`) gives you real-time visibility into financial performance, conversion rates, traffic sources, and customer purchase trends.",
      whatToDo: [
        "Monitor Daily/Weekly Revenue charts and Average Order Value (AOV).",
        "Track Conversion Funnel rates (Visitors -> Product Views -> Cart Additions -> Orders).",
        "Identify Top Selling Products and high-margin inventory.",
        "Analyze customer geographical distribution for targeted marketing.",
      ],
      tip: "Check your conversion funnel metrics weekly—if cart additions are high but completed checkouts are low, consider adjusting shipping fees or payment options.",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold gap-1.5 px-3 py-1">
                <BookOpen className="h-3.5 w-3.5" /> Official Platform Operations Manual
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                Updated for Live Production
              </Badge>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl tracking-tight">
              Store Creation & Management Guide
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
              A comprehensive, structured operational guide explaining **what each step means**, **what to do step-by-step**, best practices, and **live interface visual previews**.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/admin/site-settings">
                <Settings className="h-4 w-4" /> Site Settings
              </Link>
            </Button>
            <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <Link to="/admin/onboarding">
                <Rocket className="h-4 w-4" /> Launch Wizard
              </Link>
            </Button>
          </div>
        </div>

        {/* Sub-Category Navigation Bar (Replaces hidden tabs with explicit sub-categories) */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/80 pt-6">
          <button
            onClick={() => setActiveSubCategory("creation")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeSubCategory === "creation"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card/80 text-foreground hover:bg-secondary"
            }`}
          >
            <Rocket className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Sub-Category 1</p>
              <p className="text-sm font-bold truncate">7-Step Site Creation</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubCategory("management")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeSubCategory === "management"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card/80 text-foreground hover:bg-secondary"
            }`}
          >
            <Sliders className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Sub-Category 2</p>
              <p className="text-sm font-bold truncate">Site Management</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubCategory("walkthrough")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeSubCategory === "walkthrough"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card/80 text-foreground hover:bg-secondary"
            }`}
          >
            <Video className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Sub-Category 3</p>
              <p className="text-sm font-bold truncate">Video & Screenshots</p>
            </div>
          </button>

          <button
            onClick={() => setActiveSubCategory("checklist")}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeSubCategory === "checklist"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card/80 text-foreground hover:bg-secondary"
            }`}
          >
            <CheckSquare className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Sub-Category 4</p>
              <p className="text-sm font-bold truncate">Launch Checklist</p>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-CATEGORY 1: 7-STEP SITE CREATION FLOW */}
      {/* ========================================================================= */}
      {activeSubCategory === "creation" && (
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Rocket className="h-6 w-6 text-primary" /> Sub-Category 1: 7-Step Site Creation Wizard
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed guidance on creating your storefront from template selection to live launch.
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
              7 Sequential Steps
            </Badge>
          </div>

          {/* Quick Step Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {creationStepsDetailed.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setSelectedStepIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedStepIndex === idx
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:bg-secondary"
                }`}
              >
                <span>Step {s.step}</span>
                <span className="opacity-80">({s.badge})</span>
              </button>
            ))}
          </div>

          {/* Active Step Detailed Showcase (Structured Text + Image Paired) */}
          {(() => {
            const currentStep = creationStepsDetailed[selectedStepIndex]!;
            const StepIcon = currentStep.icon;

            return (
              <Card className="border-border bg-card shadow-md overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary font-bold text-xl shadow-inner">
                        <StepIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-bold">
                            Step {currentStep.step} of 7
                          </Badge>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                            {currentStep.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground mt-1">
                          {currentStep.title}
                        </CardTitle>
                      </div>
                    </div>

                    <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                      <Link to={currentStep.actionUrl}>
                        {currentStep.actionText} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-8">
                  {/* Two Column Grid: Left = Context & Action Guide, Right = Live Interface Image */}
                  <div className="grid gap-8 lg:grid-cols-12 items-start">
                    {/* Left 7 Cols: Detailed Context & Guidance */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Section 1: What This Step Means */}
                      <div className="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                        <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 uppercase tracking-wide">
                          <Info className="h-4 w-4 text-blue-500" /> What This Step Means
                        </h3>
                        <p className="text-sm leading-relaxed text-foreground">
                          {currentStep.whatItMeans}
                        </p>
                      </div>

                      {/* Section 2: What To Do Step-by-Step */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                          <ListOrdered className="h-4 w-4 text-primary" /> What To Do (Action Guide)
                        </h3>
                        <div className="space-y-2.5">
                          {currentStep.whatToDo.map((act, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg border border-border/70 bg-background p-3 text-xs leading-relaxed">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-[11px]">
                                {i + 1}
                              </span>
                              <span className="text-foreground">{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Recommendations & Best Practices */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                          <Lightbulb className="h-4 w-4 text-amber-500" /> Best Practices & Recommendations
                        </h3>
                        <ul className="space-y-1.5 list-disc list-inside text-xs text-muted-foreground">
                          {currentStep.recommendations.map((rec, i) => (
                            <li key={i} className="text-foreground">{rec}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Pro Tip Box */}
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pro Tip: </span>
                            {currentStep.proTip}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right 5 Cols: Live Interface Image Preview */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" /> Live Interface Screenshot
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLightboxImage(currentStep.image)}
                          className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <Maximize2 className="h-3 w-3" /> Zoom
                        </Button>
                      </div>

                      <div
                        onClick={() => setLightboxImage(currentStep.image)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-neutral-950 shadow-lg"
                      >
                        <img
                          src={currentStep.image}
                          alt={currentStep.title}
                          className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="rounded-lg bg-background/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-md flex items-center gap-1.5">
                            <Maximize2 className="h-3.5 w-3.5" /> Click to Expand
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Actual live screenshot of Step {currentStep.step} ({currentStep.badge}) in Commerce Engine.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Navigation Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      disabled={selectedStepIndex === 0}
                      onClick={() => setSelectedStepIndex((prev) => Math.max(0, prev - 1))}
                      className="gap-2"
                    >
                      ← Previous Step
                    </Button>

                    <div className="order-last flex w-full items-center justify-center gap-0.5 sm:order-none sm:w-auto">
                      {creationStepsDetailed.map((_, idx) => {
                        const isSelected = selectedStepIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedStepIndex(idx)}
                            aria-label={`Go to step ${idx + 1}`}
                            aria-current={isSelected ? "step" : undefined}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <span
                              aria-hidden="true"
                              className={`h-2.5 rounded-full transition-all ${
                                isSelected ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/30"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      disabled={selectedStepIndex === creationStepsDetailed.length - 1}
                      onClick={() => setSelectedStepIndex((prev) => Math.min(creationStepsDetailed.length - 1, prev + 1))}
                      className="gap-2"
                    >
                      Next Step →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Complete 7 Steps Vertical Card Stack */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" /> All 7 Creation Steps Overview
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {creationStepsDetailed.map((s, idx) => {
                const IconC = s.icon;
                const isActive = selectedStepIndex === idx;
                return (
                  <Card
                    key={s.step}
                    onClick={() => setSelectedStepIndex(idx)}
                    className={`cursor-pointer transition-all border-border hover:border-primary/50 flex flex-col justify-between ${
                      isActive ? "ring-2 ring-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          <IconC className="h-4 w-4" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">Step 0{s.step}</Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">{s.title}</CardTitle>
                      <CardDescription className="text-xs leading-normal mt-1">{s.shortSummary}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Button size="sm" variant={isActive ? "default" : "ghost"} className="w-full justify-between text-xs">
                        {isActive ? "Viewing Details" : "View Step Guide"} <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SUB-CATEGORY 2: MANAGING & OPERATING YOUR SITE */}
      {/* ========================================================================= */}
      {activeSubCategory === "management" && (
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-6 w-6 text-primary" /> Sub-Category 2: Site Management & Operations
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed guidance on running your storefront, managing inventory, processing orders, and configuring settings.
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
              6 Core Operational Modules
            </Badge>
          </div>

          {/* Stacked Sub-Category Operational Modules */}
          <div className="space-y-6">
            {managementSubCategories.map((mod, idx) => {
              const ModIcon = mod.icon;
              return (
                <Card key={idx} className="border-border bg-card shadow-sm hover:border-primary/40 transition-all">
                  <CardHeader className="border-b border-border/60 bg-muted/20 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ModIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[10px] font-semibold">{mod.badge}</Badge>
                          <CardTitle className="text-xl font-bold text-foreground mt-0.5">{mod.title}</CardTitle>
                        </div>
                      </div>
                      <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                        <Link to={mod.path}>
                          {mod.cta} <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* What it Means + What to Do Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* What It Means */}
                      <div className="space-y-2 rounded-xl border border-border/80 bg-background/60 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-primary" /> What This Module Means
                        </h4>
                        <p className="text-xs leading-relaxed text-foreground">
                          {mod.whatItMeans}
                        </p>
                      </div>

                      {/* What To Do */}
                      <div className="space-y-2 rounded-xl border border-border/80 bg-background/60 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ListOrdered className="h-3.5 w-3.5 text-emerald-500" /> What To Do (Actions)
                        </h4>
                        <div className="space-y-1.5">
                          {mod.whatToDo.map((act, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pro Tip Footer */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Pro Tip: </span>
                        {mod.tip}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SUB-CATEGORY 3: VIDEO DEMO & SCREENSHOT GALLERY */}
      {/* ========================================================================= */}
      {activeSubCategory === "walkthrough" && (
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" /> Sub-Category 3: Video Demo & Full Screenshot Gallery
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Visual proof and live recorded browser session showing store creation and management actions.
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold px-3 py-1">
              Live Session Captured
            </Badge>
          </div>

          {/* Video Showcase Card */}
          <Card className="border-border bg-card shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold gap-1">
                      <Video className="h-3.5 w-3.5" /> Full Animated Session Recording
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      8.8 MB WebP Animation
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">Recorded Browser Subagent Execution</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Watch the AI browser subagent execute all onboarding steps, select templates, configure brand settings, and navigate the site management dashboard live.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLightboxImage("/images/guide/site_creation_and_management_demo.webp");
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Fullscreen View
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 space-y-4">
              {/* Browser Window Container */}
              <div className="overflow-hidden rounded-xl border border-border bg-neutral-950 shadow-2xl">
                {/* Browser Top Chrome Bar */}
                <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-xs font-semibold text-neutral-400 ml-2 hidden sm:inline">Commerce Engine AI Browser Session</span>
                  </div>

                  <div className="flex items-center gap-2 max-w-md w-full mx-4">
                    <div className="flex h-7 w-full items-center gap-2 rounded-md bg-neutral-950 px-3 text-[11px] text-neutral-300 border border-neutral-800 font-mono truncate">
                      <span className="text-emerald-400">🔒</span> http://127.0.0.1:8080/admin/onboarding?step=template
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider hidden md:inline">Recorded Playback</span>
                  </div>
                </div>

                {/* Animated WebP Image Player Canvas */}
                <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                  <img
                    key={lightboxImage || "main-player"}
                    src="/images/guide/site_creation_and_management_demo.webp"
                    alt="Recorded Browser Subagent Execution"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Browser Footer Timeline Bar */}
                <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span className="font-semibold text-neutral-200">Executing Onboarding Wizard & Site Management</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Recorded by Browser Subagent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Screenshot Gallery */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Complete Platform Interface Screenshot Gallery
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Step 1: Template Selection", img: "/images/guide/step1_template_selection.png", desc: "Select Electronics, Food, or Crafts template." },
                { title: "Step 2: Brand & Identity", img: "/images/guide/step2_brand_details.png", desc: "Set store name, unique URL slug, and logo." },
                { title: "Step 3: Hero Content Hook", img: "/images/guide/step3_hero_content.png", desc: "Craft homepage hero titles & promo slogan." },
                { title: "Step 4: Catalog Strategy", img: "/images/guide/step4_catalog_layout.png", desc: "Choose Multi-product, Single-product, or Menu." },
                { title: "Step 5: Theme & Palette", img: "/images/guide/step5_theme_palette.png", desc: "Customize brand colors and font typography." },
                { title: "Step 6 & 7: Payments & Launch", img: "/images/guide/step6_payments_launch.png", desc: "Set bKash/COD payments & publish live." },
                { title: "Admin Operations Overview", img: "/images/guide/admin_dashboard_overview.png", desc: "Central control panel for order & store setup." },
              ].map((item, idx) => (
                <Card key={idx} className="border-border overflow-hidden group">
                  <div
                    onClick={() => setLightboxImage(item.img)}
                    className="relative aspect-video bg-muted overflow-hidden cursor-pointer"
                  >
                    <img src={item.img} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="rounded-lg bg-background/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-md flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5" /> Expand Image
                      </span>
                    </div>
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-bold">{item.title}</CardTitle>
                    <CardDescription className="text-xs">{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SUB-CATEGORY 4: PRE-FLIGHT LAUNCH CHECKLIST */}
      {/* ========================================================================= */}
      {activeSubCategory === "checklist" && (
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="h-6 w-6 text-primary" /> Sub-Category 4: Pre-Flight Launch Checklist
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verify these key operational tasks before running marketing campaigns or accepting real orders.
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
              6 Verification Items
            </Badge>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              {[
                { title: "Store Brand & Logo Configured", desc: "Store name, custom URL slug, description, and logo mark set up.", path: "/admin/site-settings", category: "Brand" },
                { title: "Mobile Payment Channels Active", desc: "bKash / Nagad wallet numbers entered and Cash on Delivery toggle set.", path: "/admin/onboarding?step=payments", category: "Checkout" },
                { title: "Catalog Items Stocked", desc: "At least 3-5 products listed with prices, photos, and stock counts.", path: "/admin/products", category: "Inventory" },
                { title: "Custom Domain & SSL Mapped", desc: "DNS CNAME or A-records pointing to your merchant storefront URL.", path: "/admin/site-settings", category: "Domain" },
                { title: "Courier Shipping Rates Defined", desc: "Delivery fees configured for local city and nationwide zones.", path: "/admin/couriers", category: "Shipping" },
                { title: "Test Order Placed & Verified", desc: "Completed 1 test order to verify customer SMS & email order notifications.", path: "/admin/orders", category: "Fulfillment" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4 bg-background/50 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                    <Link to={item.path}>
                      Open <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Lightbox Modal for Fullscreen Image Inspection */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-5xl w-full overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-2xl">
            <img src={lightboxImage} alt="Expanded Screenshot" className="w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="p-3 text-center">
              <Button size="sm" variant="secondary" onClick={() => setLightboxImage(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}