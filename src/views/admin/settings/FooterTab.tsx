import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function FooterTab({
  settings,
  setSettings,
  update,
  supportsNewsletterControls,
  SaveButton,
  MobileSectionShell,
  MobileSectionJumper,
  StickySectionSaveBar,
}: {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  update: (category: string, field: string, value: any) => void;
  supportsNewsletterControls: boolean;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  MobileSectionJumper: React.ComponentType<{ items: Array<{ id: string; label: string }> }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  const companyLinks = ((settings.footer?.company_links as { label: string; url: string }[]) ?? []);
  const extraLinks = ((settings.footer?.extra_links as { label: string; url: string }[]) ?? []);
  const sectionOrder: { id: string; label: string }[] = (settings.footer?.section_order ?? [
    { id: "brand", label: "Brand & Tagline" },
    { id: "shop", label: "Shop Links" },
    { id: "company", label: "Company Links" },
    { id: "newsletter", label: "Newsletter" },
  ]);

  return (
    <TabsContent value="footer">
      <MobileSectionShell
        title="Footer Settings"
        description="Footer sections are denser on mobile and keep save affordances within reach."
      >
        <MobileSectionJumper
          items={[
            { id: "footer-brand", label: "Brand" },
            ...(supportsNewsletterControls ? [{ id: "footer-newsletter", label: "Newsletter" }] : []),
            { id: "footer-company-links", label: "Company" },
            { id: "footer-extra-links", label: "Extra Links" },
            { id: "footer-order", label: "Order" },
            { id: "footer-bottom", label: "Bottom" },
          ]}
        />

        {/* Brand */}
        <div id="footer-brand" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Brand</h3>
          <div className="grid gap-2">
            <Label>Brand Tagline (used in footer)</Label>
            <Textarea
              value={settings.footer?.about_text ?? ""}
              placeholder="A clear, trusted summary of what your store offers."
              onChange={(e) => update("footer", "about_text", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Newsletter */}
        {supportsNewsletterControls && (
          <div id="footer-newsletter" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
            <h3 className="text-sm font-semibold text-foreground">Newsletter</h3>
            <div className="grid gap-2">
              <Label>Heading</Label>
              <Input
                value={settings.footer?.newsletter_heading ?? ""}
                placeholder="Optional heading for updates or announcements"
                onChange={(e) => update("footer", "newsletter_heading", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={settings.footer?.newsletter_description ?? ""}
                placeholder="Optional note for updates, launches, or announcements."
                onChange={(e) => update("footer", "newsletter_description", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Subscribed Message</Label>
              <Input
                value={settings.footer?.newsletter_subscribed ?? ""}
                placeholder="You're subscribed!"
                onChange={(e) => update("footer", "newsletter_subscribed", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Company Links */}
        <div id="footer-company-links" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Company Links</h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setSettings((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, company_links: [...companyLinks, { label: "", url: "" }] },
                }));
              }}
            >
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>
          {companyLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <Input
                value={link.label}
                placeholder="Label"
                onChange={(e) => {
                  const updated = [...companyLinks];
                  updated[i] = { ...updated[i], label: e.target.value };
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                }}
              />
              <Input
                value={link.url}
                placeholder="/about"
                onChange={(e) => {
                  const updated = [...companyLinks];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  const updated = companyLinks.filter((_, idx) => idx !== i);
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Custom Extra Links Column */}
        <div id="footer-extra-links" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Extra Links Column</h3>
              <p className="text-xs text-muted-foreground">Optional additional links section</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setSettings((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, extra_links: [...extraLinks, { label: "", url: "" }] },
                }));
              }}
            >
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </div>
          <div className="grid gap-2">
            <Label>Column Title</Label>
            <Input
              value={settings.footer?.extra_links_title ?? ""}
              placeholder="Quick Links"
              onChange={(e) => update("footer", "extra_links_title", e.target.value)}
            />
          </div>
          {extraLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <Input
                value={link.label}
                placeholder="Label"
                onChange={(e) => {
                  const updated = [...extraLinks];
                  updated[i] = { ...updated[i], label: e.target.value };
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                }}
              />
              <Input
                value={link.url}
                placeholder="/shop"
                onChange={(e) => {
                  const updated = [...extraLinks];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  const updated = extraLinks.filter((_, idx) => idx !== i);
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Section Order */}
        <div id="footer-order" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Section Order</h3>
          <p className="text-xs text-muted-foreground">Drag to reorder footer columns. Use arrows to rearrange.</p>
          {sectionOrder.map((section, i) => (
            <div key={section.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{section.label}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={i === 0}
                onClick={() => {
                  const updated = [...sectionOrder];
                  [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, section_order: updated } }));
                }}
              >
                Up
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={i === sectionOrder.length - 1}
                onClick={() => {
                  const updated = [...sectionOrder];
                  [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                  setSettings((prev) => ({ ...prev, footer: { ...prev.footer, section_order: updated } }));
                }}
              >
                Down
              </Button>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div id="footer-bottom" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">Bottom Bar</h3>
          <div className="grid gap-2">
            <Label>Payment Methods Text</Label>
            <Input
              value={settings.footer?.payment_text ?? ""}
              placeholder="Optional note about accepted payment methods or checkout policies."
              onChange={(e) => update("footer", "payment_text", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Copyright Text</Label>
            <Input
              value={settings.footer?.copyright ?? ""}
              placeholder="Optional copyright or legal footer text"
              onChange={(e) => update("footer", "copyright", e.target.value)}
            />
          </div>
        </div>

        {/* Show/hide Toggles */}
        <div className="rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.footer?.show_shop_links ?? true}
              onCheckedChange={(v) => update("footer", "show_shop_links", v)}
            />
            <Label>Show Shop Category Links</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.footer?.show_newsletter ?? true}
              onCheckedChange={(v) => update("footer", "show_newsletter", v)}
            />
            <Label>Show Newsletter Section</Label>
          </div>
        </div>

        <SaveButton settingKey="footer" />
        <StickySectionSaveBar settingKey="footer" title="Footer settings" hint="Save footer copy, columns, and visibility toggles." />
      </MobileSectionShell>
    </TabsContent>
  );
}
