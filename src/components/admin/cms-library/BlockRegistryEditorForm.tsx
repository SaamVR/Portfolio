"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type BlockRegistryEditorFormProps = {
  form: Record<string, string | boolean>;
  isEditing: boolean;
  blockLayerOptions: readonly string[];
  businessFamilyOptions: readonly string[];
  knownCapabilities: string[];
  selectedCompatibleBusinessFamilies: string[];
  selectedCapabilities: string[];
  onUpdateField: (key: string, value: string | boolean) => void;
  onUpdateDelimitedStringArrayField: (key: string, raw: string) => void;
  onToggleStringArrayField: (key: string, value: string, checked: boolean) => void;
};

export function BlockRegistryEditorForm({
  form,
  isEditing,
  blockLayerOptions,
  businessFamilyOptions,
  knownCapabilities,
  selectedCompatibleBusinessFamilies,
  selectedCapabilities,
  onUpdateField,
  onUpdateDelimitedStringArrayField,
  onToggleStringArrayField,
}: BlockRegistryEditorFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Block Type</Label>
          <Input value={String(form.block_type ?? "")} onChange={(event) => onUpdateField("block_type", event.target.value)} disabled={isEditing} />
        </div>
        <div className="grid gap-2">
          <Label>Label</Label>
          <Input value={String(form.label ?? "")} onChange={(event) => onUpdateField("label", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Layer</Label>
          <Select value={String(form.layer ?? "core")} onValueChange={(value) => onUpdateField("layer", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {blockLayerOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => onUpdateField("description", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Compatible Business Families</Label>
          <Input
            value={selectedCompatibleBusinessFamilies.join(", ")}
            onChange={(event) => onUpdateDelimitedStringArrayField("compatible_business_families", event.target.value)}
            placeholder="commerce, booking"
          />
          <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
            {businessFamilyOptions.map((option) => (
              <label key={option} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                <Checkbox
                  checked={selectedCompatibleBusinessFamilies.includes(option)}
                  onCheckedChange={(checked) => onToggleStringArrayField("compatible_business_families", option, checked === true)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Required Capabilities</Label>
          <Input
            value={selectedCapabilities.join(", ")}
            onChange={(event) => onUpdateDelimitedStringArrayField("required_capabilities", event.target.value)}
            placeholder="catalog, checkout"
          />
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
            {knownCapabilities.map((capability) => (
              <label key={capability} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                <Checkbox
                  checked={selectedCapabilities.includes(capability)}
                  onCheckedChange={(checked) => onToggleStringArrayField("required_capabilities", capability, checked === true)}
                />
                <span>{capability}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => onUpdateField("is_active", checked)} />
        <Label>Active</Label>
      </div>
    </div>
  );
}
