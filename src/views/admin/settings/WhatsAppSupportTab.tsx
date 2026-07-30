import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MessageCircle } from "lucide-react";

export function WhatsAppSupportTab({
  settings,
  update,
  SaveButton,
  MobileSectionShell,
  StickySectionSaveBar,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
  MobileSectionShell: React.ComponentType<{ title: string; description: string; children: React.ReactNode }>;
  StickySectionSaveBar: React.ComponentType<{ settingKey: string; title: string; hint: string }>;
}) {
  return (
    <TabsContent value="support">
      <MobileSectionShell
        title="WhatsApp Live Support"
        description="Support controls keep the storefront toggle, number, and default message easier to manage from a phone."
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          WhatsApp channel
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={settings.whatsapp_support?.enabled ?? false}
            onCheckedChange={(v) => update("whatsapp_support", "enabled", v)}
          />
          <Label>Show WhatsApp button on storefront</Label>
        </div>
        <div className="grid gap-2">
          <Label>WhatsApp Number</Label>
          <Input
            value={settings.whatsapp_support?.number ?? ""}
            onChange={(e) => update("whatsapp_support", "number", e.target.value)}
            placeholder="Include country code, digits only"
          />
          <p className="text-xs text-muted-foreground">Use the full number with country code and digits only.</p>
        </div>
        <div className="grid gap-2">
          <Label>Pre-filled message</Label>
          <Input
            value={settings.whatsapp_support?.message ?? ""}
            onChange={(e) => update("whatsapp_support", "message", e.target.value)}
            placeholder="Hi! I need help with my order."
          />
        </div>
        {settings.whatsapp_support?.enabled && settings.whatsapp_support?.number && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#25D366" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Button is live on storefront</p>
              <p className="text-xs text-muted-foreground">Customers can click it to open WhatsApp</p>
            </div>
          </div>
        )}
        <SaveButton settingKey="whatsapp_support" />
        <StickySectionSaveBar settingKey="whatsapp_support" title="WhatsApp support" hint="Save storefront support visibility and contact details." />
      </MobileSectionShell>
    </TabsContent>
  );
}
