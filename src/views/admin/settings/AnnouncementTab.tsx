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
  return (
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
                setSettings((prev: any) => ({
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
          <div className="space-y-2">
            <Label>Messages (rotate one-by-one)</Label>
            {((settings.announcement_bar?.messages as string[]) ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No messages added. Using built-in defaults.</p>
            )}
            {((settings.announcement_bar?.messages as string[]) ?? []).map((msg, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={msg}
                  onChange={(e) => {
                    const updated = [...((settings.announcement_bar?.messages as string[]) ?? [])];
                    updated[i] = e.target.value;
                    setSettings((prev: any) => ({
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
          <SaveButton settingKey="announcement_bar" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
