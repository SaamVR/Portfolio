import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function ContactPageTab({
  settings,
  update,
  supportsMapControls,
  storefrontContext,
  SaveButton,
  MobileSectionShell,
  StickySectionSaveBar,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  supportsMapControls: boolean;
  storefrontContext: any;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  return (
    <TabsContent value="contact">
      <MobileSectionShell
        title="Contact Page"
        description="Contact details and map controls are sectioned for simpler mobile editing."
      >
        <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
          This page supports your current storefront by turning visitors into {storefrontContext.conversionLabel}. Keep the response promise and contact channels accurate for this merchant.
        </div>
        <div className="grid gap-2">
          <Label>Badge</Label>
          <Input
            value={settings.contact_page?.badge ?? ""}
            onChange={(e) => update("contact_page", "badge", e.target.value)}
            placeholder="Get in Touch"
          />
        </div>
        <div className="grid gap-2">
          <Label>Title</Label>
          <Input
            value={settings.contact_page?.title ?? ""}
            onChange={(e) => update("contact_page", "title", e.target.value)}
            placeholder="Contact Us"
          />
        </div>
        <div className="grid gap-2">
          <Label>Intro text</Label>
          <Textarea
            value={settings.contact_page?.description ?? ""}
            onChange={(e) => update("contact_page", "description", e.target.value)}
            placeholder="Tell customers how to reach you."
          />
        </div>
        <div className="grid gap-2">
          <Label>Address</Label>
          <Input
            value={settings.contact_page?.address ?? ""}
            onChange={(e) => update("contact_page", "address", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Phone</Label>
          <Input
            value={settings.contact_page?.phone ?? ""}
            onChange={(e) => update("contact_page", "phone", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input
            value={settings.contact_page?.email ?? ""}
            onChange={(e) => update("contact_page", "email", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>WhatsApp</Label>
          <Input
            value={settings.contact_page?.whatsapp ?? ""}
            onChange={(e) => update("contact_page", "whatsapp", e.target.value)}
            placeholder="+8801..."
          />
        </div>
        <div className="grid gap-2">
          <Label>Form button label</Label>
          <Input
            value={settings.contact_page?.form_button_label ?? ""}
            onChange={(e) => update("contact_page", "form_button_label", e.target.value)}
            placeholder="Send Message"
          />
        </div>
        <div className="grid gap-2">
          <Label>Response time heading</Label>
          <Input
            value={settings.contact_page?.response_time_label ?? ""}
            onChange={(e) => update("contact_page", "response_time_label", e.target.value)}
            placeholder="Response Time"
          />
        </div>
        <div className="grid gap-2">
          <Label>Response time text</Label>
          <Textarea
            value={settings.contact_page?.response_time_text ?? ""}
            onChange={(e) => update("contact_page", "response_time_text", e.target.value)}
            placeholder="Usually within 1 business day."
          />
        </div>
        {supportsMapControls && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.contact_page?.map_enabled ?? false}
                onCheckedChange={(v) => update("contact_page", "map_enabled", v)}
              />
              <Label>Show map on contact page</Label>
            </div>
            {settings.contact_page?.map_enabled && (
              <div className="grid gap-2">
                <Label>Google Maps Embed URL</Label>
                <Input
                  value={settings.contact_page?.map_embed_url ?? ""}
                  onChange={(e) => update("contact_page", "map_embed_url", e.target.value)}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-muted-foreground">
                  Go to Google Maps, choose Share, then Embed a map, and copy the <code className="bg-secondary px-1 rounded">src</code> URL.
                </p>
                {settings.contact_page?.map_embed_url && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    <iframe
                      src={settings.contact_page.map_embed_url}
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Map preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <SaveButton settingKey="contact_page" />
        <StickySectionSaveBar settingKey="contact_page" title="Contact page" hint="Save inquiry details and map visibility." />
      </MobileSectionShell>
    </TabsContent>
  );
}
