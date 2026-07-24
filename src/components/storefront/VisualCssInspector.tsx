import { StorePageBlock } from "@/lib/cms/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function VisualCssInspector({
  selectedBlock,
  updateSelectedBlock,
  updateSelectedBlockProps,
  viewport = "desktop",
}: {
  selectedBlock: StorePageBlock | null;
  updateSelectedBlock?: (patch: Partial<StorePageBlock>) => void;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  if (!selectedBlock) {
    return (
      <div className="flex h-32 flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Select a block to inspect CSS.
      </div>
    );
  }

  const css = ((selectedBlock.props as any).customCss as Record<string, string>) || {};
  const scopedEntries = Object.entries(css).filter(([key]) =>
    viewport === "desktop" ? !key.includes(":") : key.startsWith(`${viewport}:`),
  );
  const scopedOverrideCount = scopedEntries.length;

  const getCssValue = (key: string) => {
    const finalKey = viewport === "desktop" ? key : `${viewport}:${key}`;
    return css[finalKey] || "";
  };

  const getInheritedValue = (key: string) => {
    if (viewport === "desktop") {
      return "";
    }

    return css[key] || "";
  };

  const updateCssValue = (key: string, value: string) => {
    const finalKey = viewport === "desktop" ? key : `${viewport}:${key}`;
    const nextCss = { ...css };

    if (!value.trim()) {
      delete nextCss[finalKey];
    } else {
      nextCss[finalKey] = value;
    }

    updateSelectedBlockProps({
      customCss: nextCss,
    });
  };

  const copyStyles = async () => {
    if (typeof navigator === "undefined") return;
    const payload = viewport === "desktop"
      ? Object.fromEntries(Object.entries(css).filter(([key]) => !key.includes(":")))
      : Object.fromEntries(
          Object.entries(css)
            .filter(([key]) => key.startsWith(`${viewport}:`))
            .map(([key, value]) => [key.replace(`${viewport}:`, ""), value]),
        );
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  const pasteStyles = async () => {
    if (typeof navigator === "undefined") return;
    const raw = await navigator.clipboard.readText();
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const normalized = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [
          viewport === "desktop" || key.includes(":") ? key : `${viewport}:${key}`,
          value,
        ]),
      );
      updateSelectedBlockProps({ customCss: { ...css, ...normalized } });
    } catch {
      return;
    }
  };

  const resetViewportStyles = () => {
    const nextCss = Object.fromEntries(
      Object.entries(css).filter(([key]) =>
        viewport === "desktop" ? key.includes(":") : !key.startsWith(`${viewport}:`),
      ),
    );
    updateSelectedBlockProps({ customCss: nextCss });
  };

  const resetAllStyles = () => {
    updateSelectedBlockProps({ customCss: {} });
  };

  const renderTextInput = (
    label: string,
    key: string,
    placeholder: string,
    extraProps?: { type?: string; min?: string; max?: string; step?: string },
  ) => {
    const currentValue = getCssValue(key);
    const inheritedValue = getInheritedValue(key);
    const showInherited = !currentValue && inheritedValue;

    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          {showInherited ? (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              inherits {inheritedValue}
            </span>
          ) : currentValue ? (
            <span className="text-[10px] uppercase tracking-wide text-primary">override</span>
          ) : null}
        </div>
        <Input
          className="h-8 text-xs"
          placeholder={showInherited ? `Inherited: ${inheritedValue}` : placeholder}
          value={currentValue}
          onChange={(e) => updateCssValue(key, e.target.value)}
          {...extraProps}
        />
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-2">
        <div>
          <p className="text-xs font-medium text-foreground">Styles for {viewport}</p>
          <p className="text-[11px] text-muted-foreground">
            {scopedOverrideCount > 0
              ? `${scopedOverrideCount} override${scopedOverrideCount === 1 ? "" : "s"} saved for this breakpoint.`
              : viewport === "desktop"
                ? "No desktop overrides yet."
                : "No breakpoint overrides yet. Blank fields inherit desktop styles."}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyStyles()}>Copy</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void pasteStyles()}>Paste</Button>
          <Button type="button" variant="outline" size="sm" onClick={resetViewportStyles} disabled={scopedOverrideCount === 0}>
            Reset {viewport}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={resetAllStyles} disabled={Object.keys(css).length === 0}>
            Reset all
          </Button>
        </div>
      </div>
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="layout" className="text-[10px] sm:text-xs">Layout</TabsTrigger>
          <TabsTrigger value="spacing" className="text-[10px] sm:text-xs">Space</TabsTrigger>
          <TabsTrigger value="type" className="text-[10px] sm:text-xs">Type</TabsTrigger>
          <TabsTrigger value="effects" className="text-[10px] sm:text-xs">Fx</TabsTrigger>
          <TabsTrigger value="position" className="text-[10px] sm:text-xs">Pos</TabsTrigger>
          <TabsTrigger value="code" className="text-[10px] sm:text-xs">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="layout" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Display</Label>
              <Select value={getCssValue("display") || "block"} onValueChange={(val) => updateCssValue("display", val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">block</SelectItem>
                  <SelectItem value="flex">flex</SelectItem>
                  <SelectItem value="grid">grid</SelectItem>
                  <SelectItem value="none">none</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Flex Direction</Label>
              <Select value={getCssValue("flexDirection") || "row"} onValueChange={(val) => updateCssValue("flexDirection", val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="row">row</SelectItem>
                  <SelectItem value="column">column</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Gap", "gap", "e.g. 24px")}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Align Items</Label>
              <Select value={getCssValue("alignItems") || "stretch"} onValueChange={(val) => updateCssValue("alignItems", val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stretch">stretch</SelectItem>
                  <SelectItem value="start">start</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="end">end</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="spacing" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Margin", "margin", "e.g. 16px")}
            {renderTextInput("Padding", "padding", "e.g. 16px")}
          </div>
          {renderTextInput("Min Height", "minHeight", "e.g. 60vh")}
        </TabsContent>
        <TabsContent value="type" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Font Size", "fontSize", "e.g. 1rem")}
            {renderTextInput("Font Weight", "fontWeight", "e.g. 600")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Line Height", "lineHeight", "e.g. 1.4")}
            {renderTextInput("Text Color", "color", "e.g. hsl(var(--primary))")}
          </div>
        </TabsContent>
        <TabsContent value="effects" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Opacity", "opacity", "1.0", { type: "number", min: "0", max: "1", step: "0.1" })}
            {renderTextInput("Border Radius", "borderRadius", "e.g. 8px")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Box Shadow", "boxShadow", "e.g. 0 18px 40px rgb(0 0 0 / .18)")}
            {renderTextInput("Filter", "filter", "e.g. blur(2px)")}
          </div>
        </TabsContent>
        <TabsContent value="position" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <Select value={getCssValue("position") || "static"} onValueChange={(val) => updateCssValue("position", val)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">static</SelectItem>
                  <SelectItem value="relative">relative</SelectItem>
                  <SelectItem value="sticky">sticky</SelectItem>
                  <SelectItem value="absolute">absolute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Z Index</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. 10"
                value={getCssValue("zIndex")}
                onChange={(e) => updateCssValue("zIndex", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderTextInput("Top", "top", "e.g. 0")}
            {renderTextInput("Left", "left", "e.g. 0")}
          </div>
        </TabsContent>
        <TabsContent value="code" className="space-y-4 pt-4">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Custom HTML Injection</Label>
              <Textarea
                className="min-h-[80px] font-mono text-xs"
                placeholder="<div>...</div>"
                value={selectedBlock.customHtml || ""}
                onChange={(e) => updateSelectedBlock?.({ customHtml: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Custom CSS</Label>
              <Textarea
                className="min-h-[80px] font-mono text-xs"
                placeholder=".block { ... }"
                value={selectedBlock.customCss || ""}
                onChange={(e) => updateSelectedBlock?.({ customCss: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
