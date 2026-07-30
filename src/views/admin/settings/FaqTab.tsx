import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function FaqTab({
  faqEntries,
  addFaq,
  removeFaq,
  updateFaq,
  SaveButton,
}: {
  faqEntries: Array<{ q: string; a: string }>;
  addFaq: () => void;
  removeFaq: (index: number) => void;
  updateFaq: (index: number, field: "q" | "a", value: string) => void;
  SaveButton: React.ComponentType<{ settingKey: string }>;
}) {
  return (
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
          {faqEntries.length === 0 && <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>}
          {faqEntries.map((faq, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">FAQ #{i + 1}</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeFaq(i)}
                >
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
  );
}
