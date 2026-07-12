"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ThemeEditorFormProps = {
  form: Record<string, string | boolean>;
  isEditing: boolean;
  themeSourceTypeOptions: readonly string[];
  themeModeOptions: readonly string[];
  onUpdateField: (key: string, value: string | boolean) => void;
};

export function ThemeEditorForm({
  form,
  isEditing,
  themeSourceTypeOptions,
  themeModeOptions,
  onUpdateField,
}: ThemeEditorFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Theme Id</Label>
          <Input value={String(form.id ?? "")} onChange={(event) => onUpdateField("id", event.target.value)} disabled={isEditing} />
        </div>
        <div className="grid gap-2">
          <Label>Slug</Label>
          <Input value={String(form.slug ?? "")} onChange={(event) => onUpdateField("slug", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input value={String(form.name ?? "")} onChange={(event) => onUpdateField("name", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => onUpdateField("description", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-2">
          <Label>Source Type</Label>
          <Select value={String(form.source_type ?? "admin_shared")} onValueChange={(value) => onUpdateField("source_type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {themeSourceTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>{option.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Version</Label>
          <Input type="number" min={1} value={String(form.version ?? "1")} onChange={(event) => onUpdateField("version", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Compatibility</Label>
          <Input type="number" min={1} value={String(form.compatibility_version ?? "1")} onChange={(event) => onUpdateField("compatibility_version", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Mode</Label>
          <Select value={String(form.mode ?? "dark")} onValueChange={(value) => onUpdateField("mode", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {themeModeOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Preset Bridge</Label>
          <Input value={String(form.preset_id ?? "")} onChange={(event) => onUpdateField("preset_id", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Owner Store Id</Label>
          <Input value={String(form.owner_store_id ?? "")} onChange={(event) => onUpdateField("owner_store_id", event.target.value)} placeholder="Leave blank for shared/system themes" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Preview Metadata JSON</Label>
          <Textarea rows={8} value={String(form.preview_metadata ?? "")} onChange={(event) => onUpdateField("preview_metadata", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Tokens JSON</Label>
          <Textarea rows={8} value={String(form.tokens ?? "")} onChange={(event) => onUpdateField("tokens", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Component Recipes JSON</Label>
          <Textarea rows={8} value={String(form.component_recipes ?? "")} onChange={(event) => onUpdateField("component_recipes", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Custom CSS</Label>
          <Textarea rows={8} value={String(form.custom_css ?? "")} onChange={(event) => onUpdateField("custom_css", event.target.value)} />
        </div>
      </div>
    </div>
  );
}
