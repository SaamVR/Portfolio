"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Palette,
  LayoutTemplate,
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PlanTemplateItem {
  id: string;
  key: string;
  name: string;
  category: "Retail" | "Specialized" | "Media & Recurring" | "Bookings & Stays" | "Theme Aesthetics";
  type: "template" | "theme";
  description: string;
  defaultTier: "free" | "starter" | "pro" | "enterprise";
  badgeLabel?: string;
}

const PLATFORM_TEMPLATES_AND_THEMES: PlanTemplateItem[] = [
  // Templates - Retail
  {
    id: "template:fashion",
    key: "template_fashion",
    name: "Fashion & Clothing Catalog",
    category: "Retail",
    type: "template",
    description: "Apparel, drop releases, curated fits, and lookbooks.",
    defaultTier: "free",
  },
  {
    id: "template:general",
    key: "template_general",
    name: "General Retail Catalog",
    category: "Retail",
    type: "template",
    description: "Flexible multi-category catalog for mixed merchandise.",
    defaultTier: "free",
  },
  {
    id: "template:food",
    key: "template_food",
    name: "Food & Daily Menu Storefront",
    category: "Retail",
    type: "template",
    description: "Bakery drops, meal specials, and local ordering.",
    defaultTier: "free",
  },
  {
    id: "template:crafts",
    key: "template_crafts",
    name: "Crafts & Handmade Store",
    category: "Retail",
    type: "template",
    description: "Artisan goods, maker stories, and custom orders.",
    defaultTier: "free",
  },
  {
    id: "template:beauty",
    key: "template_beauty",
    name: "Beauty & Routine Storefront",
    category: "Retail",
    type: "template",
    description: "Soft editorial routines, swatches, and bundle stories.",
    defaultTier: "starter",
  },
  {
    id: "template:electronics",
    key: "template_electronics",
    name: "Gadgets & Spec-Led Tech",
    category: "Retail",
    type: "template",
    description: "Feature comparison, device specs, and tech accessories.",
    defaultTier: "starter",
  },

  // Templates - Specialized & B2B
  {
    id: "template:single-product",
    key: "template_single_product",
    name: "Single Product Launch",
    category: "Specialized",
    type: "template",
    description: "Campaign-led hero offer with high persuasion rhythm.",
    defaultTier: "starter",
  },
  {
    id: "template:inquiry-catalog",
    key: "template_inquiry_catalog",
    name: "Inquiry-Led B2B Catalog",
    category: "Specialized",
    type: "template",
    description: "Browse-first quote requests with hidden direct prices.",
    defaultTier: "starter",
  },
  {
    id: "template:service",
    key: "template_service",
    name: "Service Packages & Consultations",
    category: "Specialized",
    type: "template",
    description: "Service tiers, consultation leads, and package quotes.",
    defaultTier: "starter",
  },
  {
    id: "template:landing",
    key: "template_landing",
    name: "Direct WhatsApp Landing",
    category: "Specialized",
    type: "template",
    description: "Single-page direct inquiry flow for social campaigns.",
    defaultTier: "free",
  },

  // Templates - Media & Recurring
  {
    id: "template:subscriptions",
    key: "template_subscriptions",
    name: "Subscription Marketplace",
    category: "Media & Recurring",
    type: "template",
    description: "Recurring access, memberships, and SaaS subscription tiers.",
    defaultTier: "pro",
    badgeLabel: "Pro Tier",
  },
  {
    id: "template:digital-downloads",
    key: "template_digital_downloads",
    name: "Digital Marketplace & Licenses",
    category: "Media & Recurring",
    type: "template",
    description: "Instant post-payment file delivery and asset licensing.",
    defaultTier: "pro",
    badgeLabel: "Pro Tier",
  },

  // Templates - Bookings & Hospitality
  {
    id: "template:booking",
    key: "template_booking",
    name: "Appointment & Reservation Hub",
    category: "Bookings & Stays",
    type: "template",
    description: "Calendar slots, service availability, and booking flows.",
    defaultTier: "pro",
    badgeLabel: "Pro Tier",
  },
  {
    id: "template:hotel",
    key: "template_hotel",
    name: "Hospitality & Hotel Stays",
    category: "Bookings & Stays",
    type: "template",
    description: "Room tiers, amenities, check-in dates, and reservations.",
    defaultTier: "enterprise",
    badgeLabel: "Enterprise Exclusive",
  },
  {
    id: "template:real-estate",
    key: "template_real_estate",
    name: "Real Estate & Property Listings",
    category: "Bookings & Stays",
    type: "template",
    description: "Property tours, neighborhood trust, and agent inquiry leads.",
    defaultTier: "enterprise",
    badgeLabel: "Enterprise Exclusive",
  },

  // Theme Aesthetics
  {
    id: "theme:default",
    key: "theme_default",
    name: "Minimalist Retailer",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Clean, neutral baseline visual design for everyday retail.",
    defaultTier: "free",
  },
  {
    id: "theme:soft-beauty",
    key: "theme_soft_beauty",
    name: "Soft Beauty & Pastel",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Editorial pastels and rounded component borders.",
    defaultTier: "free",
  },
  {
    id: "theme:midnight-blue",
    key: "theme_midnight_blue",
    name: "Midnight Tech & Dark",
    category: "Theme Aesthetics",
    type: "theme",
    description: "High-contrast dark mode for gadgets and electronics.",
    defaultTier: "free",
  },
  {
    id: "theme:warm-earth",
    key: "theme_warm_earth",
    name: "Warm Earthy Handmade",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Organic warm tones suited for crafts and food.",
    defaultTier: "free",
  },
  {
    id: "theme:luxury-gold",
    key: "theme_luxury_gold",
    name: "Luxury Gold & Premium Bold",
    category: "Theme Aesthetics",
    type: "theme",
    description: "High-end gold accents and bold editorial layouts.",
    defaultTier: "pro",
    badgeLabel: "Pro Premium",
  },
  {
    id: "theme:royal-purple",
    key: "theme_royal_purple",
    name: "Royal Purple & Editorial",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Deep regal tones for high-ticket brands and subscriptions.",
    defaultTier: "pro",
    badgeLabel: "Pro Premium",
  },
  {
    id: "theme:emerald-fresh",
    key: "theme_emerald_fresh",
    name: "Emerald Fresh & Organic",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Vibrant emerald green for health and wellness.",
    defaultTier: "starter",
  },
  {
    id: "theme:ocean-teal",
    key: "theme_ocean_teal",
    name: "Ocean Teal & Modern Clean",
    category: "Theme Aesthetics",
    type: "theme",
    description: "Vibrant ocean teal for modern single-product brands.",
    defaultTier: "starter",
  },
];

const TIER_ORDER = ["free", "starter", "pro", "advanced", "enterprise"];

function isTierEligible(planSlugOrName: string, defaultTier: string): boolean {
  const normalizedPlan = planSlugOrName.toLowerCase();
  const planIdx = TIER_ORDER.findIndex((t) => normalizedPlan.includes(t)) !== -1
    ? TIER_ORDER.findIndex((t) => normalizedPlan.includes(t))
    : 1; // Default to starter if unmapped
  const defaultIdx = TIER_ORDER.indexOf(defaultTier);
  return planIdx >= defaultIdx;
}

interface PlanTemplateMatrixCardProps {
  plans: Array<{ id: string; name: string; slug?: string; monthly_price?: number | null }>;
  planFeatures: Array<{ plan_id: string; feature_key: string; enabled: boolean }>;
  onTogglePlanFeature: (planId: string, featureKey: string, enabled: boolean) => Promise<void>;
  canModify: boolean;
}

export function PlanTemplateMatrixCard({
  plans,
  planFeatures,
  onTogglePlanFeature,
  canModify,
}: PlanTemplateMatrixCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const planFeatureMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const pf of planFeatures) {
      map.set(`${pf.plan_id}:${pf.feature_key}`, pf.enabled);
    }
    return map;
  }, [planFeatures]);

  const isEnabled = useCallback((planId: string, itemKey: string, defaultTier: string, planName: string): boolean => {
    const key = `${planId}:${itemKey}`;
    if (planFeatureMap.has(key)) {
      return Boolean(planFeatureMap.get(key));
    }
    return isTierEligible(planName, defaultTier);
  }, [planFeatureMap]);

  const filteredItems = useMemo(() => {
    return PLATFORM_TEMPLATES_AND_THEMES.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesType = selectedType === "all" || item.type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  const stats = useMemo(() => {
    const totalItems = PLATFORM_TEMPLATES_AND_THEMES.length;
    const premiumItems = PLATFORM_TEMPLATES_AND_THEMES.filter((i) => i.defaultTier === "pro" || i.defaultTier === "enterprise").length;
    let activeMappings = 0;
    for (const item of PLATFORM_TEMPLATES_AND_THEMES) {
      for (const plan of plans) {
        if (isEnabled(plan.id, item.key, item.defaultTier, plan.name)) {
          activeMappings++;
        }
      }
    }
    return { totalItems, premiumItems, activeMappings };
  }, [isEnabled, plans]);

  const handleBulkResetDefaults = async () => {
    if (!canModify) {
      toast.error("Super Admin permissions required to modify plan template matrix.");
      return;
    }
    try {
      setIsBulkProcessing(true);
      for (const item of PLATFORM_TEMPLATES_AND_THEMES) {
        for (const plan of plans) {
          const eligible = isTierEligible(plan.name, item.defaultTier);
          await onTogglePlanFeature(plan.id, item.key, eligible);
        }
      }
      toast.success("Reset plan-template matrix to default subscription tier entitlement rules.");
    } catch (err: any) {
      toast.error("Failed to update template matrix defaults.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkEnablePro = async () => {
    if (!canModify) {
      toast.error("Super Admin permissions required to modify plan template matrix.");
      return;
    }
    try {
      setIsBulkProcessing(true);
      const upperPlans = plans.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes("pro") || n.includes("advanced") || n.includes("enterprise");
      });
      for (const item of PLATFORM_TEMPLATES_AND_THEMES) {
        for (const plan of upperPlans) {
          await onTogglePlanFeature(plan.id, item.key, true);
        }
      }
      toast.success("Granted access to all templates and themes for Pro, Advanced, and Enterprise plans.");
    } catch (err: any) {
      toast.error("Failed to enable template matrix for upper tiers.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkLockPremium = async () => {
    if (!canModify) {
      toast.error("Super Admin permissions required to modify plan template matrix.");
      return;
    }
    try {
      setIsBulkProcessing(true);
      const lowerPlans = plans.filter((p) => {
        const n = p.name.toLowerCase();
        return n.includes("free") || n.includes("starter") || n.includes("basic");
      });
      const premiumItems = PLATFORM_TEMPLATES_AND_THEMES.filter(
        (i) => i.defaultTier === "pro" || i.defaultTier === "enterprise"
      );
      for (const item of premiumItems) {
        for (const plan of lowerPlans) {
          await onTogglePlanFeature(plan.id, item.key, false);
        }
      }
      toast.success("Restricted premium templates (Subscriptions, Bookings, Luxury Theme) from Free & Starter tiers.");
    } catch (err: any) {
      toast.error("Failed to restrict premium templates.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/60 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <Palette className="h-5 w-5 text-primary" /> Plan-Template & Theme Access Matrix
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Control merchant access to storefront layout templates and visual themes based on subscription tier entitlement.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2.5 py-1 text-xs">
              <Sparkles className="mr-1 h-3 w-3" /> {stats.totalItems} Layouts & Themes
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2.5 py-1 text-xs">
              <Lock className="mr-1 h-3 w-3" /> {stats.premiumItems} Premium Tier Restricted
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2.5 py-1 text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" /> {stats.activeMappings} Active Entitlements
            </Badge>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates & themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Specialized">Specialized & B2B</SelectItem>
                <SelectItem value="Media & Recurring">Media & Recurring</SelectItem>
                <SelectItem value="Bookings & Stays">Bookings & Stays</SelectItem>
                <SelectItem value="Theme Aesthetics">Theme Aesthetics</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="template">Templates Only</SelectItem>
                <SelectItem value="theme">Themes Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canModify || isBulkProcessing}
              onClick={() => void handleBulkResetDefaults()}
              className="h-9 px-3 text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Reset Tier Defaults
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canModify || isBulkProcessing}
              onClick={() => void handleBulkEnablePro()}
              className="h-9 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-primary" /> Unlock All for Pro+
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canModify || isBulkProcessing}
              onClick={() => void handleBulkLockPremium()}
              className="h-9 px-3 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Lock Premium Tiers
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                <TableHead className="w-[300px] text-xs font-semibold">Template / Theme Specs</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Category</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Base Tier</TableHead>
                {plans.map((plan) => (
                  <TableHead key={plan.id} className="text-center text-xs font-semibold min-w-[110px]">
                    <div>{plan.name}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {plan.monthly_price != null ? `BDT ${plan.monthly_price}` : "Custom"}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + plans.length} className="h-28 text-center text-xs text-muted-foreground">
                    No templates or themes match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20 border-b border-border/60 transition-colors">
                    <TableCell className="align-top py-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold",
                            item.type === "template"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          )}
                        >
                          {item.type === "template" ? (
                            <LayoutTemplate className="h-3.5 w-3.5" />
                          ) : (
                            <Palette className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{item.name}</span>
                            {item.badgeLabel && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
                              >
                                {item.badgeLabel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                          <code className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                            {item.key}
                          </code>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle py-3">
                      <Badge variant="outline" className="text-[10px] font-normal border-border bg-background">
                        {item.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-middle py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold capitalize",
                          item.defaultTier === "free" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                          item.defaultTier === "starter" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                          item.defaultTier === "pro" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                          item.defaultTier === "enterprise" && "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        )}
                      >
                        {item.defaultTier}
                      </Badge>
                    </TableCell>

                    {plans.map((plan) => {
                      const enabled = isEnabled(plan.id, item.key, item.defaultTier, plan.name);
                      return (
                        <TableCell key={plan.id} className="align-middle text-center py-3">
                          <div
                            className={cn(
                              "mx-auto flex h-9 w-14 items-center justify-center rounded-xl border transition-all duration-200",
                              enabled
                                ? "border-primary/30 bg-primary/10 shadow-xs"
                                : "border-border/60 bg-muted/20 opacity-70"
                            )}
                          >
                            <Switch
                              checked={enabled}
                              disabled={!canModify}
                              className="scale-75"
                              onCheckedChange={(checked) =>
                                void onTogglePlanFeature(plan.id, item.key, checked)
                              }
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
