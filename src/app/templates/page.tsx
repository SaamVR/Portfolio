import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Layout, Palette, ShieldCheck, Sparkles, Store } from "lucide-react";
import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";
import { resolveThemePackageById } from "@/lib/theme-packages";

function formatBlockLabel(value: string) {
  return value.replace(/-/g, " ");
}

function buildBlueprintHighlights(blocks: string[]) {
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
  const templateCards = fallbackStoreBlueprints.map((blueprint) => {
    const themePackage = resolveThemePackageById(blueprint.defaultTheme.themePackageId, undefined, blueprint.defaultTheme.presetId);
    const highlights = buildBlueprintHighlights(blueprint.recommendedBlockSet);

    return {
      id: blueprint.id,
      name: blueprint.name,
      summary: blueprint.description,
      storeDescription: blueprint.storeDescription,
      heroTagline: blueprint.hero.tagline,
      heroPromise: `${blueprint.hero.title} ${blueprint.hero.highlight}`.trim(),
      includes: blueprint.recommendedBlockSet.slice(0, 4).map(formatBlockLabel),
      highlights,
      preview: themePackage.preview,
      group: blueprint.group,
      blockCount: blueprint.recommendedBlockSet.length,
      pageCount: blueprint.recommendedPageSet.length,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f1e6_0%,#f4efe8_28%,#ebf1ea_68%,#e4ebe6_100%)] text-slate-950">
      <header className="border-b border-slate-950/10 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <Link href="/signup" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
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
              Blueprint-backed storefronts that look closer to real brands than starter skeletons.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              Every direction starts with a stronger shopper journey: better CTA rhythm, more believable section pacing, and content structures that match how each kind of store actually sells.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <p className="mt-4 text-2xl font-bold text-slate-950">{templateCards.length}</p>
              <p className="mt-1 text-sm text-slate-600">Blueprint families tuned for different storefront stories.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
              <Store className="h-5 w-5 text-emerald-600" />
              <p className="mt-4 text-2xl font-bold text-slate-950">Live</p>
              <p className="mt-1 text-sm text-slate-600">Preview real seeded storefront output before signup.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/78 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
              <ShieldCheck className="h-5 w-5 text-cyan-700" />
              <p className="mt-4 text-2xl font-bold text-slate-950">Safer</p>
              <p className="mt-1 text-sm text-slate-600">Theme direction, trust sections, and conversion defaults move together.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 xl:grid-cols-2">
          {templateCards.map((card) => (
            <article key={card.id} className="overflow-hidden rounded-[2rem] border border-slate-950/10 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-950/8 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{card.group}</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{card.name}</h2>
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
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.blockCount} section defaults</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.pageCount} seeded pages</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{card.heroPromise}</span>
                </div>
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
                  <p className="text-sm font-semibold text-slate-950">Seeded sections</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.includes.map((item) => (
                      <span key={item} className="rounded-full border border-slate-950/10 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{card.storeDescription}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 px-6 pb-6">
                <Link href={`/templates/${card.id}`} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                  Preview
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/signup?blueprint=${encodeURIComponent(card.id)}`} className="inline-flex items-center gap-2 rounded-full border border-slate-950/10 px-4 py-2 text-sm font-semibold text-slate-700">
                  Use this template
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <Palette className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Visual direction, not just colors</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Theme defaults now reinforce the blueprint story instead of acting like neutral paint over the same weak structure.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Trust closer to action</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Support, payment, FAQ, and proof sections are pulled closer to where shoppers decide whether to continue.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ArrowRight className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Preview, then launch</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Merchants can inspect a realistic storefront first and then enter signup with the blueprint already preselected.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
