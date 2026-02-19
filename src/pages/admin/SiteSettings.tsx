import { useEffect, useState } from "react";
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
import { Loader2, Save } from "lucide-react";

const SiteSettings = () => {
  const { role } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
      .update({ value: settings[key] })
      .eq("key", key);
    if (error) toast.error("Failed to save");
    else toast.success(`${key.replace(/_/g, " ")} updated`);
    setSaving(null);
  };

  const update = (key: string, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
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
          <TabsTrigger value="announcement">Announcement Bar</TabsTrigger>
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="about">About Page</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="announcement">
          <Card className="border-border">
            <CardHeader><CardTitle>Announcement Bar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.announcement_bar?.enabled ?? true}
                  onCheckedChange={(v) => update("announcement_bar", "enabled", v)}
                />
                <Label>Enabled</Label>
              </div>
              <div className="grid gap-2">
                <Label>Text</Label>
                <Input value={settings.announcement_bar?.text ?? ""} onChange={(e) => update("announcement_bar", "text", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Link</Label>
                <Input value={settings.announcement_bar?.link ?? ""} onChange={(e) => update("announcement_bar", "link", e.target.value)} />
              </div>
              <Button onClick={() => saveSetting("announcement_bar")} disabled={saving === "announcement_bar"} className="gap-2">
                {saving === "announcement_bar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero">
          <Card className="border-border">
            <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.hero_section?.title ?? ""} onChange={(e) => update("hero_section", "title", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Subtitle</Label>
                <Textarea value={settings.hero_section?.subtitle ?? ""} onChange={(e) => update("hero_section", "subtitle", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>CTA Text</Label>
                  <Input value={settings.hero_section?.cta_text ?? ""} onChange={(e) => update("hero_section", "cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>CTA Link</Label>
                  <Input value={settings.hero_section?.cta_link ?? ""} onChange={(e) => update("hero_section", "cta_link", e.target.value)} />
                </div>
              </div>
              <Button onClick={() => saveSetting("hero_section")} disabled={saving === "hero_section"} className="gap-2">
                {saving === "hero_section" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card className="border-border">
            <CardHeader><CardTitle>Payment Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">bKash</h3>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.payment_settings?.bkash_enabled ?? false}
                    onCheckedChange={(v) => update("payment_settings", "bkash_enabled", v)}
                  />
                  <Label>Enable bKash</Label>
                </div>
                <div className="grid gap-2">
                  <Label>bKash Merchant Number</Label>
                  <Input
                    value={settings.payment_settings?.bkash_number ?? ""}
                    onChange={(e) => update("payment_settings", "bkash_number", e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Nagad</h3>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.payment_settings?.nagad_enabled ?? false}
                    onCheckedChange={(v) => update("payment_settings", "nagad_enabled", v)}
                  />
                  <Label>Enable Nagad</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Nagad Merchant Number</Label>
                  <Input
                    value={settings.payment_settings?.nagad_number ?? ""}
                    onChange={(e) => update("payment_settings", "nagad_number", e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
              <Button onClick={() => saveSetting("payment_settings")} disabled={saving === "payment_settings"} className="gap-2">
                {saving === "payment_settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card className="border-border">
            <CardHeader><CardTitle>About Page</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.about_page?.title ?? ""} onChange={(e) => update("about_page", "title", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea value={settings.about_page?.content ?? ""} onChange={(e) => update("about_page", "content", e.target.value)} rows={6} />
              </div>
              <Button onClick={() => saveSetting("about_page")} disabled={saving === "about_page"} className="gap-2">
                {saving === "about_page" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card className="border-border">
            <CardHeader><CardTitle>Footer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>About Text</Label>
                <Textarea value={settings.footer?.about_text ?? ""} onChange={(e) => update("footer", "about_text", e.target.value)} rows={3} />
              </div>
              <Button onClick={() => saveSetting("footer")} disabled={saving === "footer"} className="gap-2">
                {saving === "footer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteSettings;
