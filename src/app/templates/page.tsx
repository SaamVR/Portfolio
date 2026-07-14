import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Layout, Palette, ShieldCheck } from "lucide-react";

const templateCards = [
  {
    name: "Fashion Boutique",
    summary: "Lookbook-led storefront for drops, campaigns, and repeat launches.",
    includes: ["Hero + lookbook sections", "Featured product grid", "Promo banners and trust badges"],
  },
  {
    name: "Skincare Brand",
    summary: "Ingredient-first layout that helps routine shoppers feel reassured.",
    includes: ["Routine storytelling blocks", "FAQ and support sections", "Bundle-friendly conversion flow"],
  },
  {
    name: "Bakery & Gifts",
    summary: "Warm storefront for daily menus, celebration boxes, and pre-orders.",
    includes: ["Menu and delivery sections", "Gift-ready campaign areas", "Pre-order friendly content structure"],
  },
  {
    name: "Gadget Store",
    summary: "Spec-driven layout with warranty and support cues for higher trust.",
    includes: ["Tech-oriented product rows", "Warranty and payment messaging", "Support-first conversion structure"],
  },
] as const;

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <Link href="/signup" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950">
            Start building
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            <Layout className="h-3.5 w-3.5" />
            Store templates
          </p>
          <h1 className="font-heading text-4xl font-extrabold sm:text-5xl">Template directions that already fit common merchant categories.</h1>
          <p className="text-base leading-relaxed text-zinc-400">
            These template directions are not just visual skins. Each one starts with a better content structure, conversion rhythm, and support story for that kind of business.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {templateCards.map((card) => (
            <article key={card.name} className="rounded-[1.75rem] border border-white/10 bg-slate-900/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
              <h2 className="font-heading text-2xl font-bold text-white">{card.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{card.summary}</p>
              <div className="mt-5 space-y-3">
                {card.includes.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-white">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/35 p-6">
            <Palette className="h-5 w-5 text-emerald-300" />
            <h3 className="mt-4 text-lg font-bold text-white">Visual flexibility</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">Theme and typography controls can shift the personality without rebuilding the page structure.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/35 p-6">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h3 className="mt-4 text-lg font-bold text-white">Trust by design</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">Each template direction keeps payment, support, and policy cues close to the shopper journey.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/35 p-6">
            <ArrowRight className="h-5 w-5 text-emerald-300" />
            <h3 className="mt-4 text-lg font-bold text-white">Guided next step</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">The landing walkthrough can now route merchants into signup with a much more specific mental model.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
