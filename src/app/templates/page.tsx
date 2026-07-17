import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Layout, Palette, ShieldCheck } from "lucide-react";
import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";
import { resolveThemePackageById } from "@/lib/theme-packages";

export default function TemplatesPage() {
  const templateCards = fallbackStoreBlueprints.map((blueprint) => {
    const themePackage = resolveThemePackageById(blueprint.defaultTheme.themePackageId, undefined, blueprint.defaultTheme.presetId);
    return {
      id: blueprint.id,
      name: blueprint.name,
      summary: blueprint.description,
      includes: blueprint.recommendedBlockSet.slice(0, 3).map((item) => item.replace(/-/g, " ")),
      preview: themePackage.preview,
      group: blueprint.group,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f3f7f4_0%,#eef3ef_48%,#e5ece5_100%)] text-slate-950">
      <header className="border-b border-slate-950/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <Link href="/signup" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            Start building
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
            <Layout className="h-3.5 w-3.5" />
            Store templates
          </p>
          <h1 className="font-heading text-4xl font-extrabold sm:text-5xl">Blueprint-backed storefront directions that merchants can preview before signup.</h1>
          <p className="text-base leading-relaxed text-slate-600">
            These template directions are not just visual skins. Each one starts with a better content structure, conversion rhythm, and support story for that kind of business.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {templateCards.map((card) => (
            <article key={card.id} className="rounded-[1.75rem] border border-slate-950/10 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.group}</p>
                  <h2 className="font-heading text-2xl font-bold text-slate-950">{card.name}</h2>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-9 w-9 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.bg }} />
                  <div className="h-9 w-9 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.primary }} />
                  <div className="h-9 w-9 rounded-full border border-slate-950/10" style={{ backgroundColor: card.preview.accent }} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.summary}</p>
              <div className="mt-5 space-y-3">
                {card.includes.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-950/8 bg-slate-50 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm capitalize text-slate-900">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
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

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <Palette className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Visual flexibility</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Theme packages, guided token overrides, and typography controls now shape the storefront without rebuilding the structure.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Trust by design</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Each blueprint keeps payment, support, and policy cues close to the shopper journey.</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-950/10 bg-white/75 p-6">
            <ArrowRight className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-950">Guided next step</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Merchants can preview a real blueprint demo first, then jump into signup with that blueprint already selected.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
