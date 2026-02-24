import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, GripVertical, MessageCircle, Upload, Check, Palette } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { themePresets, type ThemePreset } from "@/lib/themePresets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SiteSettings = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role !== "admin") return;
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, any> = {};
      data?.forEach((row) => {
        map[row.key] = row.value;
      });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, [role]);

  if (role !== "admin") return <Navigate to="/admin" replace />;

  const saveSetting = async (key: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: settings[key] ?? {} }, { onConflict: "key" });
    if (error) toast.error("Failed to save");
    else {
      toast.success(`${key.replace(/_/g, " ")} updated`);
      queryClient.invalidateQueries({ queryKey: ["site_settings", key] });
    }
    setSaving(null);
  };

  const update = (key: string, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  // FAQ array helpers
  const faqEntries: { q: string; a: string }[] = settings.faq_entries ?? [];

  const updateFaq = (index: number, field: "q" | "a", value: string) => {
    const updated = [...faqEntries];
    updated[index] = { ...updated[index], [field]: value };
    setSettings((prev) => ({ ...prev, faq_entries: updated }));
  };

  const addFaq = () => {
    setSettings((prev) => ({
      ...prev,
      faq_entries: [...(prev.faq_entries ?? []), { q: "", a: "" }],
    }));
  };

  const removeFaq = (index: number) => {
    const updated = faqEntries.filter((_, i) => i !== index);
    setSettings((prev) => ({ ...prev, faq_entries: updated }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hero-media").upload(fileName, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(fileName);
    const isVideo = file.type.startsWith("video/");
    setSettings((prev) => ({
      ...prev,
      hero_section: {
        ...prev.hero_section,
        media_url: urlData.publicUrl,
        media_type: isVideo ? "video" : "image",
      },
    }));
    toast.success("Media uploaded!");
    setUploading(false);
  };

  const SaveButton = ({ settingKey }: { settingKey: string }) => (
    <Button onClick={() => saveSetting(settingKey)} disabled={saving === settingKey} className="gap-2">
      {saving === settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save
    </Button>
  );

  // Theme helpers
  const activeThemeId: string = settings.active_theme ?? "default";

  const handleThemeSelect = (themeId: string) => {
    setSettings((prev) => ({ ...prev, active_theme: themeId }));
  };

  const saveTheme = async () => {
    setSaving("active_theme");
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "active_theme", value: settings.active_theme ?? "default" }, { onConflict: "key" });
    if (error) toast.error("Failed to save theme");
    else {
      toast.success("Theme updated!");
      queryClient.invalidateQueries({ queryKey: ["site_settings", "active_theme"] });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Site Settings</h1>
        <p className="text-sm text-muted-foreground">Edit your store's content and appearance</p>
      </div>

      <Tabs defaultValue="announcement" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="announcement">Announcement</TabsTrigger>
          <TabsTrigger value="promo">Promo Banner</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        {/* Announcement Bar */}
        <TabsContent value="announcement">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Announcement Bar</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current: string[] = settings.announcement_bar?.messages ?? [];
                    setSettings((prev) => ({
                      ...prev,
                      announcement_bar: { ...prev.announcement_bar, messages: [...current, ""] },
                    }));
                  }}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Message
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.announcement_bar?.enabled ?? true}
                  onCheckedChange={(v) => update("announcement_bar", "enabled", v)}
                />
                <Label>Enabled</Label>
              </div>
              <div className="flex items-center gap-4">
                <Label>Bar Colour</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.announcement_bar?.bg_color ?? "#1a9e52"}
                    onChange={(e) => update("announcement_bar", "bg_color", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {settings.announcement_bar?.bg_color ?? "#1a9e52"}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => update("announcement_bar", "bg_color", "")}>
                    Reset to default
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Messages (rotate one-by-one)</Label>
                {((settings.announcement_bar?.messages as string[]) ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No messages added. Using built-in defaults.</p>
                )}
                {((settings.announcement_bar?.messages as string[]) ?? []).map((msg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <Input
                      value={msg}
                      placeholder={`Message ${i + 1}`}
                      onChange={(e) => {
                        const updated = [...((settings.announcement_bar?.messages as string[]) ?? [])];
                        updated[i] = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          announcement_bar: { ...prev.announcement_bar, messages: updated },
                        }));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        const updated = ((settings.announcement_bar?.messages as string[]) ?? []).filter((_, idx) => idx !== i);
                        setSettings((prev) => ({
                          ...prev,
                          announcement_bar: { ...prev.announcement_bar, messages: updated },
                        }));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <SaveButton settingKey="announcement_bar" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promo Banner */}
        <TabsContent value="promo">
          <Card className="border-border">
            <CardHeader><CardTitle>Promotional Banner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={settings.promo_banner?.enabled ?? false} onCheckedChange={(v) => update("promo_banner", "enabled", v)} />
                <Label>Show banner on homepage</Label>
              </div>
              <div className="grid gap-2">
                <Label>Badge text</Label>
                <Input value={settings.promo_banner?.badge_text ?? ""} placeholder="Summer Sale" onChange={(e) => update("promo_banner", "badge_text", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.promo_banner?.title ?? ""} placeholder="Up to 40% off" onChange={(e) => update("promo_banner", "title", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Subtitle</Label>
                <Input value={settings.promo_banner?.subtitle ?? ""} placeholder="Shop the latest drops" onChange={(e) => update("promo_banner", "subtitle", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Button text</Label>
                  <Input value={settings.promo_banner?.cta_text ?? ""} placeholder="Shop Now" onChange={(e) => update("promo_banner", "cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Button link</Label>
                  <Input value={settings.promo_banner?.cta_link ?? ""} placeholder="/shop" onChange={(e) => update("promo_banner", "cta_link", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Colour style</Label>
                <div className="flex gap-3">
                  {(["gradient", "dark", "accent"] as const).map((style) => (
                    <button key={style} type="button" onClick={() => update("promo_banner", "bg_style", style)}
                      className={`rounded-lg border-2 px-4 py-2 text-xs font-semibold capitalize transition-colors ${(settings.promo_banner?.bg_style ?? "gradient") === style ? "border-primary text-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {style === "gradient" ? "Green Gradient" : style === "dark" ? "Dark" : "Light"}
                    </button>
                  ))}
                </div>
              </div>
              <SaveButton settingKey="promo_banner" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section - Enhanced */}
        <TabsContent value="hero">
          <Card className="border-border">
            <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Tagline (small text above title)</Label>
                <Input value={settings.hero_section?.tagline ?? ""} placeholder="Premium Menswear from Dhaka" onChange={(e) => update("hero_section", "tagline", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={settings.hero_section?.title ?? ""} placeholder="Wear Your" onChange={(e) => update("hero_section", "title", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Highlighted word (gradient)</Label>
                  <Input value={settings.hero_section?.highlight ?? ""} placeholder="Identity" onChange={(e) => update("hero_section", "highlight", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Subtitle</Label>
                <Textarea value={settings.hero_section?.subtitle ?? ""} onChange={(e) => update("hero_section", "subtitle", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Primary CTA Text</Label>
                  <Input value={settings.hero_section?.cta_text ?? ""} placeholder="Shop Now" onChange={(e) => update("hero_section", "cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Primary CTA Link</Label>
                  <Input value={settings.hero_section?.cta_link ?? ""} placeholder="/shop" onChange={(e) => update("hero_section", "cta_link", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Secondary CTA Text</Label>
                  <Input value={settings.hero_section?.secondary_cta_text ?? ""} placeholder="View Collection" onChange={(e) => update("hero_section", "secondary_cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Secondary CTA Link</Label>
                  <Input value={settings.hero_section?.secondary_cta_link ?? ""} placeholder="/shop" onChange={(e) => update("hero_section", "secondary_cta_link", e.target.value)} />
                </div>
              </div>

              {/* Background Media */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Background Media</h3>
                <div className="grid gap-2">
                  <Label>Media URL (or upload below)</Label>
                  <Input value={settings.hero_section?.media_url ?? ""} placeholder="https://..." onChange={(e) => update("hero_section", "media_url", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Media Type</Label>
                  <Select value={settings.hero_section?.media_type ?? "image"} onValueChange={(v) => update("hero_section", "media_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaUpload} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Image or Video
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">Recommended: 1920×1080 for images, MP4 under 10MB for videos</p>
                </div>
                {settings.hero_section?.media_url && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    {settings.hero_section?.media_type === "video" ? (
                      <video src={settings.hero_section.media_url} className="h-40 w-full object-cover" controls muted />
                    ) : (
                      <img src={settings.hero_section.media_url} alt="Hero preview" className="h-40 w-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Overlay */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Overlay</h3>
                <div className="flex items-center gap-4">
                  <Label>Overlay Colour</Label>
                  <input
                    type="color"
                    value={settings.hero_section?.overlay_color ?? "#101418"}
                    onChange={(e) => update("hero_section", "overlay_color", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{settings.hero_section?.overlay_color ?? "theme default"}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => update("hero_section", "overlay_color", "")}>
                    Reset
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Overlay Opacity ({settings.hero_section?.overlay_opacity ?? 50}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.hero_section?.overlay_opacity ?? 50}
                    onChange={(e) => update("hero_section", "overlay_opacity", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              <SaveButton settingKey="hero_section" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Themes */}
        <TabsContent value="themes">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Theme Presets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">Choose a colour scheme for your store. The theme applies to both light and dark modes.</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {themePresets.map((preset) => {
                  const isActive = activeThemeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleThemeSelect(preset.id)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                    >
                      {isActive && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="mb-3 flex gap-1.5">
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.bg }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.primary }} />
                        <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: preset.preview.accent }} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
              <Button onClick={saveTheme} disabled={saving === "active_theme"} className="gap-2">
                {saving === "active_theme" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Apply Theme
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment">
          <Card className="border-border">
            <CardHeader><CardTitle>Payment Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">bKash</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.payment_settings?.bkash_enabled ?? false} onCheckedChange={(v) => update("payment_settings", "bkash_enabled", v)} />
                  <Label>Enable bKash</Label>
                </div>
                <div className="grid gap-2">
                  <Label>bKash Merchant Number</Label>
                  <Input value={settings.payment_settings?.bkash_number ?? ""} onChange={(e) => update("payment_settings", "bkash_number", e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Nagad</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.payment_settings?.nagad_enabled ?? false} onCheckedChange={(v) => update("payment_settings", "nagad_enabled", v)} />
                  <Label>Enable Nagad</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Nagad Merchant Number</Label>
                  <Input value={settings.payment_settings?.nagad_number ?? ""} onChange={(e) => update("payment_settings", "nagad_number", e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
              <SaveButton settingKey="payment_settings" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery">
          <Card className="border-border">
            <CardHeader><CardTitle>Delivery Settings</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2">
                <Switch checked={settings.delivery_settings?.enabled ?? false} onCheckedChange={(v) => update("delivery_settings", "enabled", v)} />
                <Label>Enable delivery fee</Label>
              </div>
              {settings.delivery_settings?.enabled && (
                <>
                  <div className="grid gap-2">
                    <Label>Standard Delivery Fee (৳)</Label>
                    <Input type="number" value={settings.delivery_settings?.delivery_fee ?? 80} onChange={(e) => update("delivery_settings", "delivery_fee", Number(e.target.value))} placeholder="80" min={0} />
                    <p className="text-xs text-muted-foreground">Charged when order is below the free delivery threshold.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Free Delivery Threshold (৳)</Label>
                    <Input type="number" value={settings.delivery_settings?.free_threshold ?? 2000} onChange={(e) => update("delivery_settings", "free_threshold", Number(e.target.value))} placeholder="2000" min={0} />
                    <p className="text-xs text-muted-foreground">Orders at or above this amount get free delivery.</p>
                  </div>
                </>
              )}
              <SaveButton settingKey="delivery_settings" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Support */}
        <TabsContent value="support">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                WhatsApp Live Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2">
                <Switch checked={settings.whatsapp_support?.enabled ?? false} onCheckedChange={(v) => update("whatsapp_support", "enabled", v)} />
                <Label>Show WhatsApp button on storefront</Label>
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp Number</Label>
                <Input value={settings.whatsapp_support?.number ?? ""} onChange={(e) => update("whatsapp_support", "number", e.target.value)} placeholder="8801XXXXXXXXX (include country code, no +)" />
                <p className="text-xs text-muted-foreground">Include the country code without + (e.g. <span className="font-mono">8801712345678</span>).</p>
              </div>
              <div className="grid gap-2">
                <Label>Pre-filled message</Label>
                <Input value={settings.whatsapp_support?.message ?? ""} onChange={(e) => update("whatsapp_support", "message", e.target.value)} placeholder="Hi! I need help with my order." />
              </div>
              {settings.whatsapp_support?.enabled && settings.whatsapp_support?.number && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#25D366" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Button is live on storefront</p>
                    <p className="text-xs text-muted-foreground">Customers can click it to open WhatsApp</p>
                  </div>
                </div>
              )}
              <SaveButton settingKey="whatsapp_support" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Page */}
        <TabsContent value="about">
          <Card className="border-border">
            <CardHeader><CardTitle>About Page</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.about_page?.title ?? ""} onChange={(e) => update("about_page", "title", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Content (use new lines to separate paragraphs)</Label>
                <Textarea value={settings.about_page?.content ?? ""} onChange={(e) => update("about_page", "content", e.target.value)} rows={6} />
              </div>
              <SaveButton settingKey="about_page" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Entries */}
        <TabsContent value="faq">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>FAQ Entries</CardTitle>
                <Button variant="outline" size="sm" onClick={addFaq} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {faqEntries.length === 0 && <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>}
              {faqEntries.map((faq, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">FAQ #{i + 1}</Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFaq(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Question</Label>
                    <Input value={faq.q} onChange={(e) => updateFaq(i, "q", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Answer</Label>
                    <Textarea value={faq.a} onChange={(e) => updateFaq(i, "a", e.target.value)} rows={2} />
                  </div>
                </div>
              ))}
              <SaveButton settingKey="faq_entries" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Page */}
        <TabsContent value="contact">
          <Card className="border-border">
            <CardHeader><CardTitle>Contact Page</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input value={settings.contact_page?.address ?? ""} onChange={(e) => update("contact_page", "address", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={settings.contact_page?.phone ?? ""} onChange={(e) => update("contact_page", "phone", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={settings.contact_page?.email ?? ""} onChange={(e) => update("contact_page", "email", e.target.value)} />
              </div>
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.contact_page?.map_enabled ?? false} onCheckedChange={(v) => update("contact_page", "map_enabled", v)} />
                  <Label>Show map on contact page</Label>
                </div>
                {settings.contact_page?.map_enabled && (
                  <div className="grid gap-2">
                    <Label>Google Maps Embed URL</Label>
                    <Input value={settings.contact_page?.map_embed_url ?? ""} onChange={(e) => update("contact_page", "map_embed_url", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
                    <p className="text-xs text-muted-foreground">Go to Google Maps → share → Embed a map → copy the <code className="bg-secondary px-1 rounded">src</code> URL.</p>
                    {settings.contact_page?.map_embed_url && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-border">
                        <iframe src={settings.contact_page.map_embed_url} width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map preview" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <SaveButton settingKey="contact_page" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer */}
        <TabsContent value="footer">
          <Card className="border-border">
            <CardHeader><CardTitle>Footer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>About Text</Label>
                <Textarea value={settings.footer?.about_text ?? ""} onChange={(e) => update("footer", "about_text", e.target.value)} rows={3} />
              </div>
              <SaveButton settingKey="footer" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteSettings;
