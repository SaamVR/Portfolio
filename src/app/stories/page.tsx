import Link from "next/link";
import { Boxes, Paintbrush, ShoppingBag, UtensilsCrossed } from "lucide-react";

const scenarios = [
  { icon: Paintbrush, title: "Fashion catalog example", body: "Illustrative setup: a fashion merchant can start from a catalog-oriented template, organize collections, add products, and adjust storefront sections and theme settings." },
  { icon: ShoppingBag, title: "Beauty storefront example", body: "Illustrative setup: a beauty store can combine product discovery, brand content, trust information, checkout details, and merchant-managed promotions." },
  { icon: Boxes, title: "Electronics operations example", body: "Illustrative setup: an electronics merchant can structure product information, manage catalog and order workflows, and configure available payment or delivery connections." },
  { icon: UtensilsCrossed, title: "Food ordering example", body: "Illustrative setup: a food business can use a menu-oriented storefront structure, organize items, publish ordering information, and manage incoming commerce activity." },
] as const;

export default function StoriesPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-amber-500/25 bg-amber-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Illustrative examples — not testimonials</p>
          <h1 className="mt-4 max-w-4xl font-heading text-4xl font-semibold tracking-tight md:text-6xl">Example merchant workflows and storefront scenarios.</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-muted-foreground">These scenarios demonstrate ways EZComo can be configured. They do not represent named customers, star ratings, verified reviews, revenue claims, launch-time claims, or measured merchant outcomes.</p>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {scenarios.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[1.8rem] border border-border bg-card p-7">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-5 font-heading text-2xl font-semibold">{title}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/templates" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Browse templates</Link>
          <Link href="/how-it-works" className="rounded-full border border-border px-6 py-3 font-semibold">See the workflow</Link>
          <Link href="/" className="rounded-full border border-border px-6 py-3 font-semibold">Back home</Link>
        </div>
      </div>
    </main>
  );
}
