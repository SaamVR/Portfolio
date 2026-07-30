import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Layers, Sliders, AlertCircle } from "lucide-react";
import type { useThemeManager } from "@/hooks/useThemeManager";

export function TemplateFeaturesTab({
  themeManager,
  settings,
  update,
  SaveButton,
}: {
  themeManager: ReturnType<typeof useThemeManager>;
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  const { activeThemePackage } = themeManager;
  const featureList = (activeThemePackage as any)?.features ?? [];

  return (
    <TabsContent value="template_features">
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle>{activeThemePackage.name} Template Features</CardTitle>
                <CardDescription>
                  Configure features specific to your active template.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureList.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-lg border border-border bg-muted/20">
                <AlertCircle className="h-4 w-4" />
                <span>This template does not have custom feature toggles.</span>
              </div>
            ) : (
              featureList.map((feat) => {
                const currentSetting = settings.template_features?.[feat.id] ?? {};
                return (
                  <div key={feat.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-semibold text-sm">{feat.name}</Label>
                        {feat.description && (
                          <p className="text-xs text-muted-foreground">{feat.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={currentSetting.enabled ?? true}
                        onCheckedChange={(val) =>
                          update("template_features", feat.id, {
                            ...currentSetting,
                            enabled: val,
                          })
                        }
                      />
                    </div>

                    {/* Additional text fields if present */}
                    {feat.fields?.map((field: any) => (
                      <div key={field.id} className="grid gap-1.5 pt-2">
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          value={currentSetting.fields?.[field.id] ?? field.default ?? ""}
                          placeholder={field.placeholder || ""}
                          onChange={(e) =>
                            update("template_features", feat.id, {
                              ...currentSetting,
                              fields: {
                                ...(currentSetting.fields || {}),
                                [field.id]: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                );
              })
            )}

            <SaveButton settingKey="template_features" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
