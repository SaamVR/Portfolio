"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
};

type BlueprintEditorFormProps = {
  form: Record<string, string | boolean>;
  isEditing: boolean;
  businessFamilyOptions: readonly string[];
  catalogModeOptions: readonly string[];
  legacyTemplateOptions: readonly string[];
  onboardingStepOptions: readonly string[];
  knownPageBlueprintIds: string[];
  knownBlockTypes: string[];
  knownCapabilities: string[];
  selectedRecommendedPages: string[];
  selectedRecommendedBlocks: string[];
  selectedCapabilities: string[];
  heroPayload: Record<string, unknown>;
  defaultThemePayload: Record<string, unknown>;
  onboardingSteps: OnboardingStep[];
  onUpdateField: (key: string, value: string | boolean) => void;
  onUpdateDelimitedStringArrayField: (key: string, raw: string) => void;
  onToggleStringArrayField: (key: string, value: string, checked: boolean) => void;
  onUpdateHeroField: (key: string, value: string) => void;
  onUpdateDefaultThemeField: (key: string, value: string) => void;
  onUpdateOnboardingStep: (index: number, key: "id" | "title" | "description", value: string) => void;
  onAddOnboardingStep: () => void;
  onRemoveOnboardingStep: (index: number) => void;
};

export function BlueprintEditorForm({
  form,
  isEditing,
  businessFamilyOptions,
  catalogModeOptions,
  legacyTemplateOptions,
  onboardingStepOptions,
  knownPageBlueprintIds,
  knownBlockTypes,
  knownCapabilities,
  selectedRecommendedPages,
  selectedRecommendedBlocks,
  selectedCapabilities,
  heroPayload,
  defaultThemePayload,
  onboardingSteps,
  onUpdateField,
  onUpdateDelimitedStringArrayField,
  onToggleStringArrayField,
  onUpdateHeroField,
  onUpdateDefaultThemeField,
  onUpdateOnboardingStep,
  onAddOnboardingStep,
  onRemoveOnboardingStep,
}: BlueprintEditorFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Blueprint Id</Label>
          <Input value={String(form.id ?? "")} onChange={(event) => onUpdateField("id", event.target.value)} disabled={isEditing} />
        </div>
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input value={String(form.name ?? "")} onChange={(event) => onUpdateField("name", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Short Name</Label>
          <Input value={String(form.short_name ?? "")} onChange={(event) => onUpdateField("short_name", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea rows={3} value={String(form.description ?? "")} onChange={(event) => onUpdateField("description", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-2">
          <Label>Business Family</Label>
          <Select value={String(form.business_family ?? "commerce")} onValueChange={(value) => onUpdateField("business_family", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {businessFamilyOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Catalog Mode</Label>
          <Select value={String(form.catalog_mode ?? "multi_product")} onValueChange={(value) => onUpdateField("catalog_mode", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {catalogModeOptions.map((option) => (
                <SelectItem key={option} value={option}>{option.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Group</Label>
          <Input value={String(form.group_name ?? "")} onChange={(event) => onUpdateField("group_name", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Legacy Template</Label>
          <Select value={String(form.legacy_template_id ?? "general")} onValueChange={(value) => onUpdateField("legacy_template_id", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {legacyTemplateOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Store Description</Label>
        <Textarea rows={3} value={String(form.store_description ?? "")} onChange={(event) => onUpdateField("store_description", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Recommended Page Set</Label>
          <Input
            value={selectedRecommendedPages.join(", ")}
            onChange={(event) => onUpdateDelimitedStringArrayField("recommended_page_set", event.target.value)}
            placeholder="home, policy, about"
          />
          <div className="flex flex-wrap gap-2">
            {knownPageBlueprintIds.map((pageId) => (
              <label key={pageId} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                <Checkbox
                  checked={selectedRecommendedPages.includes(pageId)}
                  onCheckedChange={(checked) => onToggleStringArrayField("recommended_page_set", pageId, checked === true)}
                />
                <span>{pageId}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Recommended Block Set</Label>
          <Input
            value={selectedRecommendedBlocks.join(", ")}
            onChange={(event) => onUpdateDelimitedStringArrayField("recommended_block_set", event.target.value)}
            placeholder="hero, featured-products, faq-accordion"
          />
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
            {knownBlockTypes.map((blockType) => (
              <label key={blockType} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                <Checkbox
                  checked={selectedRecommendedBlocks.includes(blockType)}
                  onCheckedChange={(checked) => onToggleStringArrayField("recommended_block_set", blockType, checked === true)}
                />
                <span>{blockType}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Required Capabilities</Label>
          <Input
            value={selectedCapabilities.join(", ")}
            onChange={(event) => onUpdateDelimitedStringArrayField("required_capabilities", event.target.value)}
            placeholder="catalog, checkout, promotions"
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Default Theme</Label>
          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Preset Id</Label>
                <Input
                  value={String(defaultThemePayload.presetId ?? "")}
                  onChange={(event) => onUpdateDefaultThemeField("presetId", event.target.value)}
                  placeholder="midnight-blue"
                />
              </div>
              <div className="grid gap-2">
                <Label>Mode</Label>
                <Select value={String(defaultThemePayload.mode ?? "dark")} onValueChange={(value) => onUpdateDefaultThemeField("mode", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">light</SelectItem>
                    <SelectItem value="dark">dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Heading Font</Label>
                <Input
                  value={String(defaultThemePayload.headingFont ?? "")}
                  onChange={(event) => onUpdateDefaultThemeField("headingFont", event.target.value)}
                  placeholder="'Outfit', sans-serif"
                />
              </div>
              <div className="grid gap-2">
                <Label>Body Font</Label>
                <Input
                  value={String(defaultThemePayload.bodyFont ?? "")}
                  onChange={(event) => onUpdateDefaultThemeField("bodyFont", event.target.value)}
                  placeholder="'Inter', sans-serif"
                />
              </div>
              <div className="grid gap-2">
                <Label>Border Radius</Label>
                <Input
                  value={String(defaultThemePayload.borderRadius ?? "")}
                  onChange={(event) => onUpdateDefaultThemeField("borderRadius", event.target.value)}
                  placeholder="0.75rem"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Default Theme JSON</Label>
          <Textarea rows={6} value={String(form.default_theme ?? "")} onChange={(event) => onUpdateField("default_theme", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Hero Content</Label>
          <div className="grid gap-3 rounded-md border border-border p-3">
            <div className="grid gap-2">
              <Label>Tagline</Label>
              <Input value={String(heroPayload.tagline ?? "")} onChange={(event) => onUpdateHeroField("tagline", event.target.value)} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={String(heroPayload.title ?? "")} onChange={(event) => onUpdateHeroField("title", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Highlight</Label>
                <Input value={String(heroPayload.highlight ?? "")} onChange={(event) => onUpdateHeroField("highlight", event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Textarea rows={4} value={String(heroPayload.subtitle ?? "")} onChange={(event) => onUpdateHeroField("subtitle", event.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Hero Payload JSON</Label>
          <Textarea rows={8} value={String(form.hero_payload ?? "")} onChange={(event) => onUpdateField("hero_payload", event.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Onboarding Steps</Label>
          <div className="grid gap-3 rounded-md border border-border p-3">
            {onboardingSteps.map((step, index) => (
              <div key={`${step.id}-${index}`} className="grid gap-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="grid flex-1 gap-2 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Step Id</Label>
                      <Select value={step.id} onValueChange={(value) => onUpdateOnboardingStep(index, "id", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {onboardingStepOptions.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Title</Label>
                      <Input value={step.title} onChange={(event) => onUpdateOnboardingStep(index, "title", event.target.value)} />
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => onRemoveOnboardingStep(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea rows={3} value={step.description} onChange={(event) => onUpdateOnboardingStep(index, "description", event.target.value)} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="gap-2" onClick={onAddOnboardingStep}>
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Onboarding Schema JSON</Label>
          <Textarea rows={8} value={String(form.onboarding_schema ?? "")} onChange={(event) => onUpdateField("onboarding_schema", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Default Site Settings JSON</Label>
        <Textarea rows={8} value={String(form.default_site_settings ?? "")} onChange={(event) => onUpdateField("default_site_settings", event.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={Boolean(form.is_active)} onCheckedChange={(checked) => onUpdateField("is_active", checked)} />
        <Label>Active</Label>
      </div>
    </div>
  );
}
