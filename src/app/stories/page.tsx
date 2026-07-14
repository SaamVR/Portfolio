import Link from "next/link";
import { ArrowLeft, Crown, Quote, TrendingUp } from "lucide-react";

const stories = [
  {
    merchant: "Luna Skin Lab",
    category: "Skincare brand",
    quote: "We went from answering the same support and payment questions in chat to having a storefront that explained the offer clearly before people messaged us.",
    outcome: "Launched in one evening",
  },
  {
    merchant: "Trendy Closet",
    category: "Fashion merchant",
    quote: "The launch flow made it easy to refresh the homepage for drops. We could change the campaign feel quickly without starting over every time.",
    outcome: "Campaign updates happen in minutes",
  },
  {
    merchant: "Volt Cart",
    category: "Electronics seller",
    quote: "The product, payment, and trust messaging finally lived in one place. That made the business feel more legitimate to new buyers.",
    outcome: "Clearer checkout and fewer repetitive questions",
  },
] as const;

export default function StoriesPage() {
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
            <Quote className="h-3.5 w-3.5" />
            Merchant stories
          </p>
          <h1 className="font-heading text-4xl font-extrabold sm:text-5xl">Social proof that supports the landing-page promise.</h1>
          <p className="text-base leading-relaxed text-zinc-400">
            These stories are presented as short merchant outcomes so the sales funnel can point to believable results, not just polished UI.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {stories.map((story, index) => (
            <article
              key={story.merchant}
              className={`rounded-[1.8rem] border p-6 ${
                index === 1
                  ? "border-emerald-500/30 bg-white/[0.08] shadow-[0_22px_70px_rgba(0,0,0,0.24)]"
                  : "border-white/10 bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 1 ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-white"}`}>
                  <Crown className="h-4.5 w-4.5" />
                </div>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                  {story.outcome}
                </span>
              </div>
              <p className="mt-5 text-base leading-relaxed text-white">"{story.quote}"</p>
              <div className="mt-6">
                <p className="text-sm font-bold text-white">{story.merchant}</p>
                <p className="text-xs text-zinc-500">{story.category}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/35 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold text-white">Why keep this as a separate page too?</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
                The homepage should keep the strongest proof visible, but a dedicated stories page gives you a better destination for sales calls, ad traffic, and future case studies once you collect more merchant wins.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
