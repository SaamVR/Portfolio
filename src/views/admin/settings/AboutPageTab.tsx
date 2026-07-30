import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AboutPageTab({
  settings,
  update,
  SaveButton,
}: {
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
    <TabsContent value="about">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>About Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={settings.about_page?.title ?? ""}
              onChange={(e) => update("about_page", "title", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Content (use new lines to separate paragraphs)</Label>
            <Textarea
              value={settings.about_page?.content ?? ""}
              onChange={(e) => update("about_page", "content", e.target.value)}
              rows={6}
            />
          </div>
          <SaveButton settingKey="about_page" />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
