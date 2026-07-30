"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Download, Loader2, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productUrl, storePageUrl, storefrontPath } from "@/lib/slug";

type TargetOption = {
  label: string;
  value: string;
  url: string;
  helper: string;
};

export default function QrCodeGeneratorPage() {
  const { activeStoreId } = useAuth();
  const [selectedTarget, setSelectedTarget] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");

  const { data } = useQuery({
    queryKey: ["qr-generator-store-data", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const [{ data: store, error: storeError }, { data: pages, error: pagesError }, { data: products, error: productsError }, { data: coupons, error: couponsError }] = await Promise.all([
        supabase.from("stores").select("id, name, slug, custom_domain").eq("id", activeStoreId as string).maybeSingle(),
        supabase.from("store_pages").select("id, title, slug").eq("store_id", activeStoreId as string).order("slug"),
        supabase.from("products").select("id, name, featured, created_at").eq("store_id", activeStoreId as string).order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(12),
        supabase.from("coupon_codes").select("code, discount_type, discount_value").eq("store_id", activeStoreId as string).eq("is_active", true).order("created_at", { ascending: false }).limit(8),
      ]);

      if (storeError) throw storeError;
      if (pagesError) throw pagesError;
      if (productsError) throw productsError;
      if (couponsError) throw couponsError;

      return {
        store: store as { id: string; name: string; slug: string; custom_domain: string | null } | null,
        pages: (pages ?? []) as Array<{ id: string; title: string; slug: string }>,
        products: (products ?? []) as Array<{ id: string; name: string; featured: boolean | null; created_at: string }>,
        coupons: (coupons ?? []) as Array<{ code: string; discount_type: string; discount_value: number }>,
      };
    },
  });

  const options = useMemo(() => {
    const store = data?.store;
    if (!store) return [] as TargetOption[];

    const baseOptions: TargetOption[] = [
      { label: "Storefront homepage", value: "storefront-home", url: storefrontPath("/", store.slug), helper: "Best for flyers, cards, and market stalls." },
      { label: "Shop page", value: "storefront-shop", url: storefrontPath("/shop", store.slug), helper: "Send shoppers straight into the catalog." },
      { label: "Checkout page", value: "storefront-checkout", url: storefrontPath("/checkout", store.slug), helper: "Useful for existing buyers you already guided manually." },
    ];

    const pageOptions = (data?.pages ?? [])
      .filter((page) => page.slug !== "/")
      .map((page) => ({
        label: `${page.title} page`,
        value: `page:${page.id}`,
        url: storePageUrl(store.slug, page.slug),
        helper: `Drive scans directly into ${page.title.toLowerCase()}.`,
      }));

    const productOptions = (data?.products ?? []).slice(0, 5).map((product) => ({
      label: `Product: ${product.name}`,
      value: `product:${product.id}`,
      url: productUrl(product.id, product.name, store.slug),
      helper: "Great for shelf tags, packaging inserts, and social reshares.",
    }));

    const couponOptions = (data?.coupons ?? []).slice(0, 3).map((coupon) => ({
      label: `Coupon: ${coupon.code}`,
      value: `coupon:${coupon.code}`,
      url: storefrontPath(`/shop?coupon=${encodeURIComponent(coupon.code)}`, store.slug),
      helper: "Give offline traffic a measurable promo path.",
    }));

    return [...baseOptions, ...pageOptions, ...productOptions, ...couponOptions];
  }, [data]);

  useEffect(() => {
    if (!selectedTarget && options[0]) {
      setSelectedTarget(options[0].value);
    }
  }, [options, selectedTarget]);

  const selectedOption = options.find((option) => option.value === selectedTarget) ?? null;
  const qrTargetUrl = (customUrl.trim() || selectedOption?.url || "").trim();

  useEffect(() => {
    let active = true;
    if (!qrTargetUrl) {
      setQrSvg("");
      return;
    }
    void QRCode.toString(qrTargetUrl, { type: "svg", width: 320, margin: 1, color: { dark: "#111827", light: "#ffffff" } })
      .then((svg) => {
        if (active) setQrSvg(svg);
      })
      .catch((error) => {
        console.error(error);
        if (active) setQrSvg("");
      });
    return () => {
      active = false;
    };
  }, [qrTargetUrl]);

  const downloadQr = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `store-qr-${(selectedTarget || "custom").replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>QR codes</CardTitle>
          <CardDescription>Select a store first to generate storefront QR codes.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data?.store) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading QR destinations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Choose what people should scan into</CardTitle>
            <CardDescription>Generate codes for your storefront, product drops, support pages, or coupon-led campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTarget(option.value)}
                  className={`rounded-2xl border p-4 text-left transition ${selectedTarget === option.value ? "border-primary/40 bg-primary/5" : "border-border bg-background/80 hover:border-primary/20"}`}
                >
                  <p className="text-sm font-semibold text-foreground">{option.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.helper}</p>
                  <p className="mt-2 text-xs text-primary">{option.url}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="custom-qr-url">Custom override URL</Label>
              <Input id="custom-qr-url" value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} placeholder="Paste a custom URL when you want a special destination" />
              <p className="text-xs text-muted-foreground">Leave this empty to use the selected storefront destination above.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Printable QR card</CardTitle>
            <CardDescription>Use this for shop counters, packaging inserts, delivery slips, and offline promotions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] border border-dashed border-border bg-background/90 p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <QrCode className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{selectedOption?.label ?? "Custom storefront link"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{data.store.name}</p>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  {qrSvg ? <div className="h-72 w-72" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <div className="flex h-72 w-72 items-center justify-center text-sm text-muted-foreground">Preparing QR preview...</div>}
                </div>
                <p className="max-w-md text-sm text-muted-foreground">{qrTargetUrl}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={downloadQr} disabled={!qrSvg}>
                <Download className="mr-2 h-4 w-4" />
                Download SVG
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrTargetUrl);
                  toast.success("QR destination copied.");
                }}
                disabled={!qrTargetUrl}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
