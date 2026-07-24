"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Mail, MapPin, Phone, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { BookingServiceCard } from "@/components/storefront/booking/BookingServiceCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { storefrontPath } from "@/lib/slug";

type HeroBlockProps = {
  tagline?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  ctaText?: string;
  secondaryCtaText?: string;
};

type FeaturedBlockProps = {
  title?: string;
  tagline?: string;
  limit?: number;
};

type RichTextBlockProps = {
  eyebrow?: string;
  title?: string;
  body?: unknown;
};

type TestimonialBlockProps = {
  title?: string;
  subtitle?: string;
  reviews?: Array<{ name?: string; rating?: number; comment?: string }>;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
  response_time_text?: string;
  map_enabled?: boolean;
  map_embed_url?: string;
};

type FooterSettings = {
  about_text?: string;
  company_links?: Array<{ label?: string; url?: string }>;
};

type AboutSettings = {
  title?: string;
  content?: string;
  values?: Array<{ icon?: string; title?: string; desc?: string }>;
};

type PublicReviewRow = {
  id: string | null;
  product_id: string | null;
  author_name: string | null;
  rating: number | null;
  review_text: string | null;
};

type ReviewStats = {
  count: number;
  average: number;
};

type BookingStaff = {
  id: string;
  name: string;
  role: string;
  details: string;
};

type BookingFormState = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

function getHomepageBlock<TProps extends Record<string, unknown>>(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type)?.props as TProps | undefined;
}

function buildReviewStats(rows: PublicReviewRow[]) {
  const stats: Record<string, ReviewStats> = {};

  rows.forEach((row) => {
    if (!row.product_id || typeof row.rating !== "number") {
      return;
    }

    const current = stats[row.product_id] ?? { count: 0, average: 0 };
    const nextCount = current.count + 1;
    stats[row.product_id] = {
      count: nextCount,
      average: ((current.average * current.count) + row.rating) / nextCount,
    };
  });

  return stats;
}

function extractPlainText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const node = value as { text?: string; content?: unknown[] };
  const text = typeof node.text === "string" ? node.text : "";
  const nested = Array.isArray(node.content) ? node.content.map(extractPlainText).join(" ") : "";
  return `${text} ${nested}`.trim();
}

function deriveDuration(product: Product) {
  if (product.sizes.length >= 4) return 90;
  if (product.colors.length >= 4) return 75;
  if (typeof product.stock === "number" && product.stock > 30) return 45;
  return 60;
}

function buildStaff(store: Store, aboutSettings: AboutSettings | undefined, contactSettings: ContactSettings | undefined) {
  const fromValues = (aboutSettings?.values ?? [])
    .filter((value) => value?.title?.trim() && value?.desc?.trim())
    .slice(0, 4)
    .map((value, index) => ({
      id: `about-${index}`,
      name: value.title!.trim(),
      role: value.desc!.trim().split(".")[0] || "Specialist",
      details: value.desc!.trim(),
    }));

  if (fromValues.length > 0) {
    return fromValues;
  }

  return [
    {
      id: "primary-team",
      name: store.name?.trim() || "Service Team",
      role: "Primary booking team",
      details: contactSettings?.response_time_text?.trim() || "Merchant-managed appointments and support.",
    },
  ];
}

function buildAvailableTimes(selectedDate: Date, selectedService: Product | null, selectedStaff: BookingStaff | null) {
  const baseTimes = ["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "06:30 PM"];
  const daySeed = selectedDate.getDate();
  const serviceShift = selectedService ? selectedService.name.length % 2 : 0;
  const staffShift = selectedStaff ? selectedStaff.name.length % 3 : 0;
  const start = (daySeed + serviceShift + staffShift) % 2;
  return baseTimes.filter((_, index) => (index + start) % 2 === 0);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const firstWeekday = start.getDay();
  const firstGridDate = new Date(start);
  firstGridDate.setDate(start.getDate() - firstWeekday);

  return Array.from({ length: 35 }).map((_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
}

function buildWhatsappHref(storeName: string, contactSettings: ContactSettings | undefined, selectedService: Product | null, selectedStaff: BookingStaff | null, selectedDate: Date, selectedTime: string) {
  const digits = (contactSettings?.whatsapp || contactSettings?.phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("0") && digits.length === 11 ? `88${digits}` : digits;
  const message = [
    `Hi ${storeName}, I want to book an appointment.`,
    selectedService ? `Service: ${selectedService.name}` : "",
    selectedStaff ? `Staff: ${selectedStaff.name}` : "",
    `Date: ${formatDateLabel(selectedDate)}`,
    selectedTime ? `Time: ${selectedTime}` : "",
  ].filter(Boolean).join("\n");

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.45rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function BookingStorefrontRenderer({
  store,
  page: _page,
  blocks,
}: {
  store: Store;
  page: StorePage;
  blocks: StorePageBlock[];
}) {
  const currentStore = useOptionalStore();
  const activeStore = currentStore ?? store;
  const bookingRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: aboutSettings } = useSiteSettings<AboutSettings>("about_page", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["booking-storefront-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, product_id, author_name, rating, review_text")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown) as PublicReviewRow[];
    },
    enabled: Boolean(activeStore.id),
    staleTime: 120_000,
  });

  const heroBlock = getHomepageBlock<HeroBlockProps>(blocks, "hero");
  const categoryBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const richTextBlock = getHomepageBlock<RichTextBlockProps>(blocks, "rich-text");
  const testimonialBlock = getHomepageBlock<TestimonialBlockProps>(blocks, "testimonials");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const bookingProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 8),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const heroProduct = bookingProducts[0] ?? availableProducts[0] ?? null;
  const reviewStats = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const staffMembers = useMemo(
    () => buildStaff(activeStore, aboutSettings ?? undefined, contactSettings ?? undefined),
    [activeStore, aboutSettings, contactSettings],
  );
  const initialService = bookingProducts[0] ?? null;
  const [selectedService, setSelectedService] = useState<Product | null>(initialService);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffMembers[0]?.id ?? "");
  const selectedStaff = staffMembers.find((staff) => staff.id === selectedStaffId) ?? staffMembers[0] ?? null;
  const availableTimes = useMemo(
    () => buildAvailableTimes(selectedDate, selectedService, selectedStaff),
    [selectedDate, selectedService, selectedStaff],
  );
  const [selectedTime, setSelectedTime] = useState<string>(availableTimes[0] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<BookingFormState>({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });

  const testimonials = useMemo(() => {
    const fromReviews = approvedReviews
      .filter((row) => row.review_text?.trim())
      .slice(0, 3)
      .map((row, index) => ({
        id: row.id ?? `review-${index}`,
        name: row.author_name?.trim() || "Verified guest",
        role: `${activeStore.name || "This store"} client`,
        rating: Math.max(1, Math.min(5, row.rating ?? 5)),
        comment: row.review_text?.trim() || "",
      }));

    if (fromReviews.length > 0) {
      return fromReviews;
    }

    return (testimonialBlock?.reviews ?? [])
      .filter((item) => item?.comment?.trim())
      .slice(0, 3)
      .map((item, index) => ({
        id: `testimonial-${index}`,
        name: item?.name?.trim() || "Happy customer",
        role: `${activeStore.name || "This store"} guest`,
        rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
        comment: item?.comment?.trim() || "",
      }));
  }, [activeStore.name, approvedReviews, testimonialBlock?.reviews]);

  const categoryNames = useMemo(() => {
    const names = productCategories.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value));
    if (names.length > 0) return names.slice(0, 6);
    const typeNames = productTypes.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value));
    if (typeNames.length > 0) return typeNames.slice(0, 6);
    return Array.from(new Set(availableProducts.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
  }, [availableProducts, productCategories, productTypes]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const monthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const whatsappHref = buildWhatsappHref(activeStore.name || "there", contactSettings ?? undefined, selectedService, selectedStaff, selectedDate, selectedTime);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Please share your name and email before confirming the booking.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: allowed, error: rateErr } = await supabase.rpc("check_contact_rate_limit", {
        _email: form.email.trim(),
      });

      if (rateErr) throw rateErr;
      if (!allowed) {
        toast.error("Too many recent booking requests. Please try again a little later.");
        setSubmitting(false);
        return;
      }

      const message = [
        `Booking request`,
        `Service: ${selectedService?.name || "Not selected"}`,
        `Staff: ${selectedStaff?.name || "Not selected"}`,
        `Date: ${formatDateLabel(selectedDate)}`,
        `Time: ${selectedTime || "Not selected"}`,
        `Phone: ${form.phone.trim() || "Not provided"}`,
        "",
        form.notes.trim() || "No additional notes.",
      ].join("\n");

      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: form.fullName.trim(),
          email: form.email.trim(),
          message,
          store_id: activeStore.id,
        });

      if (error) throw error;

      toast.success("Booking request sent. The merchant can confirm the appointment from their messages inbox.");
      setForm({
        fullName: "",
        email: "",
        phone: "",
        notes: "",
      });
    } catch {
      toast.error("Failed to submit booking request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fbfdfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.11),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#fbfdfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[540px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              {heroBlock?.tagline?.trim() || "Book your next experience"}
            </p>
            <h1 className="mt-5 text-[3rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.2rem]">
              {heroBlock?.title?.trim() || "Reserve your time."}{" "}
              <span className="text-primary">{heroBlock?.highlight?.trim() || "Show up prepared."}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroBlock?.subtitle?.trim()
                || extractPlainText(richTextBlock?.body)
                || contactSettings?.description?.trim()
                || activeStore.description
                || "A booking-first storefront for appointments, reservations, and service requests with a clear path into confirmation."}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.55)] transition-transform hover:-translate-y-0.5"
              >
                {heroBlock?.ctaText?.trim() || "Book Now"}
              </button>
              <Link
                href={storefrontPath("/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "Explore Services"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Expert team", description: staffMembers[0]?.role || "Merchant-managed specialists" },
                { label: "Premium booking", description: contactSettings?.response_time_text?.trim() || "Fast confirmation support" },
                { label: "Easy scheduling", description: "Choose service, date, and time in one flow" },
              ].map((item, index) => (
                <div key={item.label} className="rounded-[20px] border border-[#e7eee9] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {index === 0 ? <Users className="h-4.5 w-4.5" /> : index === 1 ? <BadgeCheck className="h-4.5 w-4.5" /> : <CalendarDays className="h-4.5 w-4.5" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[34px] border border-[#e8efe9] bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-card">
            {heroProduct ? (
              <img
                src={heroProduct.image}
                srcSet={generateCloudinarySrcSet(heroProduct.image)}
                sizes="(max-width: 1024px) 92vw, 48vw"
                alt={heroProduct.name}
                className="aspect-[16/11] w-full object-cover"
              />
            ) : (
              <div className="aspect-[16/11] w-full bg-[#f5faf6]" />
            )}
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0))] dark:bg-[linear-gradient(90deg,rgba(10,10,10,0.72),rgba(10,10,10,0))]" />
            <div className="absolute bottom-6 left-6 max-w-[270px] rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-card/92">
              <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                {selectedService?.name || heroProduct?.name || "Bookable service"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                {selectedService ? `${deriveDuration(selectedService)} min booking` : "Merchant-managed availability and confirmation"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Our bookable services"}
          title={categoryBlock?.title?.trim() || "Choose what you want to reserve"}
          subtitle={categoryNames.length > 0 ? `Categories in this store include ${categoryNames.slice(0, 4).join(", ")}.` : "Use real services or spaces from this merchant catalog."}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {bookingProducts.map((product) => (
            <BookingServiceCard
              key={product.id}
              product={product}
              reviewStats={reviewStats[product.id]}
              onBook={(selected) => {
                setSelectedService(selected);
                bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ))}
        </div>
      </section>

      <section ref={bookingRef} className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Easy booking"
          title="Book in 3 simple steps"
          subtitle="This interface uses real store services and merchant contact routing, while the availability grid remains a storefront-side scheduler until a full booking backend is added."
        />

        <div className="rounded-[30px] border border-[#e7eee9] bg-white p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] lg:p-6 dark:border-white/10 dark:bg-card">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              { id: 1, title: "Choose Service" },
              { id: 2, title: "Select Date" },
              { id: 3, title: "Confirm Time" },
            ].map((step) => (
              <div key={step.id} className="text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {step.id}
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-muted-foreground">
                  {step.title}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
            <div className="rounded-[24px] border border-[#edf2ee] bg-[#fbfdfb] p-4 dark:border-white/10 dark:bg-secondary/20">
              <p className="text-sm font-semibold text-slate-950 dark:text-foreground">1. Choose a Service</p>
              <select
                value={selectedService?.id ?? ""}
                onChange={(event) => {
                  const nextService = bookingProducts.find((product) => product.id === event.target.value) ?? null;
                  setSelectedService(nextService);
                }}
                className="mt-4 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring dark:bg-card"
              >
                {bookingProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>

              {staffMembers.length > 1 ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-foreground">Staff selection</p>
                  <div className="mt-3 grid gap-2">
                    {staffMembers.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => setSelectedStaffId(staff.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${selectedStaffId === staff.id ? "border-primary bg-primary/5" : "border-[#dce9df] bg-white dark:border-white/10 dark:bg-card"}`}
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{staff.name}</p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground">{staff.role}</p>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {selectedService ? (
                <div className="mt-4 overflow-hidden rounded-[18px] border border-[#e7eee9] bg-white dark:border-white/10 dark:bg-card">
                  <img
                    src={selectedService.image}
                    srcSet={generateCloudinarySrcSet(selectedService.image)}
                    sizes="(max-width: 1280px) 80vw, 24vw"
                    alt={selectedService.name}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{selectedService.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{deriveDuration(selectedService)} min • BDT {selectedService.price.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                      {selectedService.description.split(/[.!?]\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 3).map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-[#edf2ee] bg-[#fbfdfb] p-4 dark:border-white/10 dark:bg-secondary/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-foreground">2. Select a Date</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dce9df] bg-white dark:border-white/10 dark:bg-card"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dce9df] bg-white dark:border-white/10 dark:bg-card"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-center text-sm font-semibold text-slate-950 dark:text-foreground">{monthLabel}</p>
              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarDays.map((date) => {
                  const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                  const isSelected = isSameDay(date, selectedDate);
                  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime("");
                      }}
                      className={`h-10 rounded-xl text-sm transition-colors ${isSelected ? "bg-primary text-primary-foreground" : isCurrentMonth ? "bg-white text-slate-800 hover:border-primary/30 dark:bg-card dark:text-foreground" : "bg-transparent text-slate-300"} ${isPast ? "cursor-not-allowed opacity-40" : "border border-[#edf2ee] dark:border-white/10"}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-[#e7eee9] bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-card dark:text-muted-foreground">
                {formatDateLabel(selectedDate)}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#edf2ee] bg-[#fbfdfb] p-4 dark:border-white/10 dark:bg-secondary/20">
              <p className="text-sm font-semibold text-slate-950 dark:text-foreground">3. Select a Time</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${selectedTime === time ? "border-primary bg-primary/5 text-primary" : "border-[#dce9df] bg-white text-slate-800 dark:border-white/10 dark:bg-card dark:text-foreground"}`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-[20px] border border-[#e7eee9] bg-white p-4 dark:border-white/10 dark:bg-card">
                <div className="rounded-2xl bg-[#f5faf6] px-4 py-3 dark:bg-secondary/40">
                  <p className="text-sm font-semibold text-slate-950 dark:text-foreground">Confirmation summary</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-muted-foreground">
                    <p><span className="font-medium text-slate-900 dark:text-foreground">Service:</span> {selectedService?.name || "Choose a service"}</p>
                    <p><span className="font-medium text-slate-900 dark:text-foreground">Staff:</span> {selectedStaff?.name || "Auto-assigned by merchant"}</p>
                    <p><span className="font-medium text-slate-900 dark:text-foreground">Date:</span> {formatDateLabel(selectedDate)}</p>
                    <p><span className="font-medium text-slate-900 dark:text-foreground">Time:</span> {selectedTime || "Choose a time"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email address"
                    className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone number"
                  className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notes, preferred arrangements, or special requests"
                  className="w-full rounded-[1.4rem] border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />

                <button
                  type="submit"
                  disabled={submitting || !selectedTime}
                  className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Confirm Booking Request"}
                </button>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                  You will receive merchant follow-up through the store contact flow. Instant slot locking is not enabled yet in this storefront renderer.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[28px] border border-[#e7eee9] bg-white px-4 py-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.16)] sm:grid-cols-2 xl:grid-cols-4 lg:px-6 dark:border-white/10 dark:bg-card">
          {[
            { label: "Instant confirmation", body: "Booking requests are sent directly into the merchant's scoped message pipeline.", icon: Mail },
            { label: "Flexible reschedule", body: "Use this area to explain reschedule windows, lead time, or same-day limitations.", icon: CalendarDays },
            { label: "Cancellation policy", body: footerSettings?.company_links?.some((link) => link.url?.includes("policy")) ? "Policy details are available in footer links." : "Add clear cancellation rules and fees in the store policy page or footer links.", icon: ShieldCheck },
            { label: "Trusted experience", body: contactSettings?.response_time_text?.trim() || "Merchant-managed confirmation, support, and follow-up.", icon: BadgeCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[20px] border border-[#eef3ef] bg-[#fbfdfb] px-4 py-4 dark:border-white/10 dark:bg-secondary/20">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-950 dark:text-foreground">{item.label}</p>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "What guests say"}
          title={testimonialBlock?.title?.trim() || "Trusted by returning clients"}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-[24px] border border-[#e7eee9] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">
                {testimonial.comment}
              </p>
              <div className="mt-5">
                <p className="font-semibold text-slate-950 dark:text-foreground">{testimonial.name}</p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 pb-14 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Visit us"
          title="Location and contact"
          subtitle="Keep real contact details, map information, and response expectations visible before the guest submits a booking request."
        />
        <div className="grid gap-5 lg:grid-cols-[0.44fr_0.56fr]">
          <div className="rounded-[26px] border border-[#e7eee9] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            <div className="space-y-5">
              {contactSettings?.address ? (
                <div className="flex gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-foreground">{activeStore.name || "This location"}</p>
                    <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings.address}</p>
                  </div>
                </div>
              ) : null}
              {contactSettings?.phone ? (
                <div className="flex gap-3">
                  <Phone className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-foreground">Phone</p>
                    <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings.phone}</p>
                  </div>
                </div>
              ) : null}
              {contactSettings?.email ? (
                <div className="flex gap-3">
                  <Mail className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-foreground">Email</p>
                    <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings.email}</p>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3">
                <Clock3 className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Confirmation window</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">
                    {contactSettings?.response_time_text?.trim() || "The merchant can review booking requests and confirm details after submission."}
                  </p>
                </div>
              </div>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-[#e7eee9] bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            {contactSettings?.map_enabled && contactSettings?.map_embed_url ? (
              <iframe
                src={contactSettings.map_embed_url}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 360 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Store location map"
              />
            ) : (
              heroProduct ? (
                <img
                  src={heroProduct.image}
                  srcSet={generateCloudinarySrcSet(heroProduct.image)}
                  sizes="(max-width: 1024px) 92vw, 52vw"
                  alt={heroProduct.name}
                  className="aspect-[16/9.4] w-full object-cover"
                />
              ) : (
                <div className="flex min-h-[360px] items-center justify-center bg-[#f5faf6] text-slate-400 dark:bg-secondary/30">
                  <Sparkles className="h-8 w-8" />
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
