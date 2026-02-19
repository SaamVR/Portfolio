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
import { Loader2, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const SiteSettings = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
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
    else {
      toast.success(`${key.replace(/_/g, " ")} updated`);
      // Invalidate cache so components pick up the new value immediately
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

  const SaveButton = ({ settingKey }: { settingKey: string }) => (
    <Button onClick={() => saveSetting(settingKey)} disabled={saving === settingKey} className="gap-2">
      {saving === settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save
    </Button>
  );

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
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
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
              {/* Enable toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.announcement_bar?.enabled ?? true}
                  onCheckedChange={(v) => update("announcement_bar", "enabled", v)}
                />
                <Label>Enabled</Label>
              </div>

              {/* Background color picker */}
              <div className="flex items-center gap-4">
                <Label>Bar Colour</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.announcement_bar?.bg_color ?? "#1a9e52"}
                    onChange={(e) => update("announcement_bar", "bg_color", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    title="Pick announcement bar background colour"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {settings.announcement_bar?.bg_color ?? "#1a9e52"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => update("announcement_bar", "bg_color", "")}
                  >
                    Reset to default
                  </Button>
                </div>
              </div>

              {/* Messages list */}
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

        {/* Hero Section */}
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
              <SaveButton settingKey="hero_section" />
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
                <Button variant="outline" size="sm" onClick={addFaq} className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {faqEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">No FAQ entries yet. Click "Add" to create one.</p>
              )}
              {faqEntries.map((faq, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">FAQ #{i + 1}</Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFaq(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
