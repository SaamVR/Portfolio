import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

export function AnnouncementTab({
  settings,
  setSettings,
  update,
  SaveButton,
}: {
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  update: (category: string, key: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  const messages = ((settings.announcement_bar?.messages as string[]) ?? []);

  return (
    <TabsContent value="announcement">
      <Card className="rounded-xl border-border shadow-sm md:shadow-none">
        <CardHeader className="space-y-1 px-4 py-3.5 md:px-6 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Announcement Bar</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Group visibility, color, and rotating messages into one tighter mobile editor.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSettings((prev: any) => ({
                  ...prev,
                  announcement_bar: { ...prev.announcement_bar, messages: [...messages, ""] },
                }));
              }}
              className="shrink-0 gap-1"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3.5 px-4 pb-4 md:px-6">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Bar visibility</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep the rotating announcement visible at the top of the storefront.
                </p>
              </div>
              <Switch
                checked={settings.announcement_bar?.enabled ?? true}
                onCheckedChange={(v) => update("announcement_bar", "enabled", v)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Bar colour</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use a storefront accent or reset back to the default color.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                  <span className="text-xs text-muted-foreground">Pick</span>
                  <input
                    type="color"
                    value={settings.announcement_bar?.bg_color ?? "#1a9e52"}
                    onChange={(e) => update("announcement_bar", "bg_color", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    {settings.announcement_bar?.bg_color ?? "#1a9e52"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => update("announcement_bar", "bg_color", "")}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">Rotating messages</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add short messages that cycle one by one across the bar.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {messages.length} item{messages.length === 1 ? "" : "s"}
                </span>
              </div>
              {messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                  No custom messages added yet. The storefront will use the current announcement configuration until you add one.
                </p>
              ) : null}
              <div className="space-y-2">
                {messages.map((msg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </div>
                    <Input
                      value={msg}
                      onChange={(e) => {
                        const updated = [...messages];
                        updated[i] = e.target.value;
                        setSettings((prev: any) => ({
                          ...prev,
                          announcement_bar: { ...prev.announcement_bar, messages: updated },
                        }));
                      }}
                      className="h-11"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        const updated = messages.filter((_, idx) => idx !== i);
                        setSettings((prev: any) => ({
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
            </div>
          </div>

          <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">Announcement bar</p>
                <p className="truncate text-xs text-muted-foreground">Save bar visibility, color, and rotating messages.</p>
              </div>
              <SaveButton settingKey="announcement_bar" />
            </div>
          </div>
          <div className="hidden md:block">
            <SaveButton settingKey="announcement_bar" />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
