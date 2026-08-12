import { TabsContent } from "@/components/ui/tabs";
import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, PanelsTopLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/react-router-dom-shim";
import { getHomepageSectionEditorLink } from "@/lib/admin-paths";
import {
  HomepageSectionChoiceCard,
  HomepageSectionLinkArrow,
  homepageSectionLinkIconClassName,
} from "@/components/admin/HomepageSectionChoiceCard";
import {
  getOptionalTemplateHomepageSectionChoices,
  normalizeHomepageSectionVisibility,
} from "@/lib/cms/template-homepage-sections";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export function TemplateFeaturesTab({
  activeStoreId,
  templateId,
  settings,
  update,
  SaveButton,
}: {
  activeStoreId?: string | null;
  templateId: StorefrontTemplateId;
  settings: any;
  update: (category: string, field: string, value: any) => void;
  SaveButton: ComponentType<{ settingKey: string }>;
}) {
  const sectionChoices = getOptionalTemplateHomepageSectionChoices(templateId);
  const visibility = normalizeHomepageSectionVisibility(templateId, settings.homepage_section_visibility);

  return (
    <TabsContent value="template_features">
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Homepage Sections</CardTitle>
                <CardDescription>
                  Choose which optional template sections appear on the live homepage.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Navbar, hero, the main product, booking, listing, or offer area, and footer stay enabled. These controls are only for extra homepage sections.
            </div>
            {activeStoreId ? (
              <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Use the shared style studio for the fuller workflow</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Section visibility now also lives in the shared style studio, alongside section order, layout style, and readiness guidance.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to={`/admin/online-store?tab=styles&storeId=${encodeURIComponent(activeStoreId)}`}>
                    Open shared style studio
                  </Link>
                </Button>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Every choice here can be changed later. Each card includes a shortcut to the exact editor or settings area used for that section&apos;s content, and the same visibility model now matches the shared style workflow.
            </p>

            {sectionChoices.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <PanelsTopLeft className="h-4 w-4" />
                <span>This template does not expose optional homepage section toggles.</span>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {sectionChoices.map((section) => {
                  const enabled = visibility[section.type] ?? true;
                  const editorLink = getHomepageSectionEditorLink(section.editTab, activeStoreId);

                  return (
                    <HomepageSectionChoiceCard
                      key={section.type}
                      section={section}
                      enabled={enabled}
                      statusLabels={{
                        enabled: "Visible now",
                        disabled: "Hidden now",
                      }}
                      actionLabels={{
                        enable: "Show now",
                        disable: "Hide now",
                      }}
                      onEnabledChange={(checked) => update("homepage_section_visibility", section.type, checked)}
                      editHint="Need to adjust the wording or layout as well? Jump straight into the matching editor from here."
                      editLink={(
                        <Link to={editorLink.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                          {editorLink.label}
                          <HomepageSectionLinkArrow className={homepageSectionLinkIconClassName} />
                        </Link>
                      )}
                    />
                  );
                })}
              </div>
            )}

            <SaveButton settingKey="homepage_section_visibility" />
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
