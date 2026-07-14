import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";

export function BrandSeoTab({
  settings,
  update,
  SaveButton,
}: {
  settings: any;
  update: (category: string, key: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
    <TabsContent value="brand_seo">
      <Card className="border-border">
        <CardHeader><CardTitle>Global Brand & SEO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Brand Name</Label>
            <Input 
              value={settings.brand_settings?.name ?? ""} 
              placeholder="THREAD" 
              onChange={(e) => update("brand_settings", "name", e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label>Brand Highlight (colored)</Label>
            <Input 
              value={settings.brand_settings?.highlight ?? ""} 
              placeholder="BD" 
              onChange={(e) => update("brand_settings", "highlight", e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label>Global SEO Title Default</Label>
            <Input 
              value={settings.brand_settings?.seo_title ?? ""} 
              placeholder="Your Store Name" 
              onChange={(e) => update("brand_settings", "seo_title", e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label>Global SEO Description Default</Label>
            <Textarea 
              value={settings.brand_settings?.seo_description ?? ""} 
              placeholder="Launch a configurable storefront with merchant-managed pages, products, and checkout flows." 
              onChange={(e) => update("brand_settings", "seo_description", e.target.value)} 
              rows={3} 
            />
          </div>
          <SaveButton settingKey="brand_settings" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
