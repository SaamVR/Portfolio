import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Layout, Palette, ShieldCheck, Sparkles, Store } from "lucide-react";
import {
  getStorefrontTemplateSeedDefinition,
  storefrontTemplateOptions,
} from "@/lib/cms/storefront-templates";
import { resolveThemePackageById } from "@/lib/theme-packages";

function formatBlockLabel(value: string) {
  return value.replace(/-/g, " ");
}

function formatOnboardingMode(mode: "template" | "blank") {
  return mode === "blank" ? "Blank builder" : "Guided template";
}

function buildTemplateHighlights(blocks: string[]) {
  const highlightMap: Record<string, string> = {
    hero: "Strong hero storytelling",
    "promo-banner": "Campaign-ready promo rhythm",
    "category-showcase": "Faster category discovery",
    "featured-products": "Merchandising-first product sections",
    "social-feed": "Real-world media proof",
    "video-reel": "Demo or motion-led selling",
    "faq-accordion": "Buyer hesitation handling",
    "trust-badges": "Support and payment trust cues",
    testimonials: "Social proof close to checkout intent",
    "rich-text": "Brand and policy storytelling",
  };

  return blocks
    .map((block) => highlightMap[block])
    .filter(Boolean)
    .slice(0, 4);
}

export default function TemplatesPage() {
  const templateCards = storefrontTemplateOptions.filter((template) => !template.adminOnly).map((template) => {
    const seed = getStorefrontTemplateSeedDefinition(template.value);
    const themePackage = resolveThemePackageById(seed.defaultTheme.themePackageId, undefined, seed.defaultTheme.presetId);
    const highlights = buildTemplateHighlights(seed.recommendedBlockSet);

    return {
      id: template.value,
      name: template.label,
      summary: template.description,
      storeDescription: seed.storeDescription,
      heroTagline: seed.hero.tagline,
      heroPromise: `${seed.hero.title} ${seed.hero.highlight}`.trim(),
      startsWith: seed.defaultBlockSet.slice(0, 4).map(formatBlockLabel),
      recommendedNext: seed.recommendedBlockSet
        .filter((block) => !seed.defaultBlockSet.includes(block))
        .slice(0, 4)
        .map(formatBlockLabel),
      highlights,
      preview: themePackage.preview,
      group: seed.group,
      onboardingMode: seed.onboardingMode,
      modeLabel: formatOnboardingMode(seed.onboardingMode),
      businessFamily: seed.businessFamily,
      compatibleBlockCount: seed.compatibleBlockSet.length,
      recommendedBlockCount: seed.recommendedBlockSet.length,
      defaultBlockCount: seed.defaultBlockSet.length,
      pageCount: seed.recommendedPageSet.length,
    };
  });
  const groupedCards = Array.from(
    templateCards.reduce((map, card) => {
      const existing = map.get(card.group) ?? [];
      existing.push(card);
      map.set(card.group, existing);
      return map;
    }, new Map<string, typeof templateCards>()),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f1e6_0%,#f4efe8_28%,#ebf1ea_68%,#e4ebe6_100%)] text-slate-950">
      <header className="border-b border-slate-950/10 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to homepage
          </Link>
          <Link href="/signup" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:scale-105 hover:bg-slate-800 active:scale-95">
            Start building
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="max-w-3xl space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
              <Layout className="h-3.5 w-3.5" />
              Store templates
            </p>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              Template-backed storefronts that look closer to real brands than starter skeletons.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              Every direction starts with a stronger shopper journey: better CTA rhythm, more believable section pacing, and content structures that match how each kind of store actually sells.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
              Guided templates give merchants a recommended launch structure. Blank Builder starts with the same shared section system, but lets them choose the homepage mix and section styles during onboarding.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {groupedCards.map(([group]) => (
                <a
                  key={group}
                  href={`#template-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="rounded-full border border-slate-950/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-white hover:border-slate-950/30 hover:text-slate-900 hover:shadow-sm"
                >
                  {group}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="group rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <Sparkles className="h-5 w-5 text-amber-600 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
              <p className="mt-4 text-2xl font-bold text-slate-950">{templateCards.length}</p>
              <p className="mt-1 text-sm text-slate-600">Template families tuned for different storefront stories.</p>
            </div>
            <div className="group rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <Store className="h-5 w-5 text-emerald-600 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" />
              <p className="mt-4 text-2xl font-bold text-slate-950">Live</p>
              <p className="mt-1 text-sm text-slate-600">Preview real seeded storefront output before signup.</p>
            </div>
            <div className="group rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <ShieldCheck className="h-5 w-5 text-cyan-700 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
              <p className="mt-4 text-2xl font-bold text-slate-950">Safer</p>
              <p className="mt-1 text-sm text-slate-600">Theme direction, trust sections, and conversion defaults move together.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "1. Start with your selling model",
                body: "Pick the direction that already matches how the merchant sells: catalog-heavy, single-product, service-led, reservation-first, or fully custom.",
              },
              {
                title: "2. Choose guided or custom",
                body: "Use a guided template when you want stronger defaults fast. Use Blank Builder when you want to choose shared sections and layout styles during onboarding.",
              },
              {
                title: "3. Customize after signup",
                body: "Themes, copy, FAQs, promotions, and optional homepage sections can all be adjusted later, so choose the launch structure that feels most believable first.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-bold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>

          {groupedCards.map(([group, cards]) => (
            <section key={group} id={`template-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="space-y-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Template family</p>
                  <h2 className="font-heading text-2xl font-bold text-slate-950">{group}</h2>
                </div>
                <p className="max-w-2xl text-sm text-slate-600">
                  Choose the direction whose section pacing and buyer journey already feel closest to the real business you want to launch.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {cards.map((card) => (
                  <article key={card.id} className="group/card overflow-hidden rounded-[2rem] border border-slate-950/10 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-1 hover:border-slate-950/20 hover:shadow-[0_32px_96px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-slate-950/8 px-6 py-5 transition-colors duration-500 group-hover/card:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{card.group}</p>
                          <h3 className="mt-2 font-heading text-2xl font-bold text-slate-950">{card.name}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-700">{card.heroTagline}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="h-10 w-10 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.bg }} />
                          <div className="h-10 w-10 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.primary }} />
                          <div className="h-10 w-10 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.accent }} />
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.modeLabel}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{card.businessFamily}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.defaultBlockCount} starter sections</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.compatibleBlockCount} compatible blocks</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.pageCount} seeded pages</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">{card.heroPromise}</p>
                    </div>

                    <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">What this template improves</p>
                        <div className="mt-3 space-y-3">
                          {card.highlights.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-950/8 bg-slate-50/90 p-3">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              <p className="text-sm text-slate-900">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-950">Starts with</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.startsWith.map((item) => (
                            <span key={item} className="rounded-full border border-slate-950/10 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
                              {item}
                            </span>
                          ))}
                        </div>
                        {card.recommendedNext.length > 0 ? (
                          <>
                            <p className="mt-4 text-sm font-semibold text-slate-950">Recommended next sections</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {card.recommendedNext.map((item) => (
                                <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-800">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                        <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.storeDescription}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 px-6 pb-6">
                      <Link href={`/templates/${card.id}`} className="group/btn inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-slate-800 active:scale-95">
                        Preview
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                      <Link href={`/signup?template=${encodeURIComponent(card.id)}`} className="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-white hover:border-slate-950/30 hover:shadow-sm">
                        {card.onboardingMode === "blank" ? "Start from blank" : "Use this template"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <Palette className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Visual direction, not just colors</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Theme defaults now reinforce the template story instead of acting like neutral paint over the same weak structure.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Trust closer to action</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Support, payment, FAQ, and proof sections are pulled closer to where shoppers decide whether to continue.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ArrowRight className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Preview, then launch</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Merchants can inspect a realistic storefront first and then enter signup with the template already preselected.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
