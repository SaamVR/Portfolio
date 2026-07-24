"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store } from "@/lib/cms/schema";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { buildMarketplaceTemplateReview, type TemplateSafetyFinding } from "@/lib/cms/template-publisher";

interface TemplatePublishDialogProps {
  store: Store;
  children: React.ReactNode;
}

export function TemplatePublishDialog({ store, children }: TemplatePublishDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImage: "",
    category: "minimal",
    pricingMode: "free",
    price: "0",
    tags: "",
    bestFor: "",
  });
  const [findings, setFindings] = useState<TemplateSafetyFinding[]>([]);

  const handlePublish = async () => {
    if (!formData.title || !formData.coverImage) {
      toast.error("Title and Cover Image are required");
      return;
    }

    setLoading(true);
    try {
      const review = buildMarketplaceTemplateReview(store);
      setFindings(review.safetyFindings);
      if (review.safetyStatus === "failed") {
        toast.error("Template needs cleanup before marketplace review. Check the safety findings.");
        return;
      }

      const tags = formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const bestFor = formData.bestFor.split(",").map((tag) => tag.trim()).filter(Boolean);
      
      const { error } = await supabase.from("cms_marketplace_templates").insert({
        title: formData.title,
        description: formData.description,
        cover_image: formData.coverImage,
        category: formData.category,
        pricing_mode: formData.pricingMode,
        price: Number(formData.price) || 0,
        bundle_json: review.bundle as any,
        creator_id: user?.id,
        status: "in_review",
        safety_status: review.safetyStatus,
        safety_findings: review.safetyFindings as any,
        submitted_at: new Date().toISOString(),
        tags,
        best_for: bestFor,
        aesthetic: store.theme.aesthetic ?? formData.category,
        preview_asset_urls: formData.coverImage ? [formData.coverImage] : [],
        mobile_ready: true,
      });

      if (error) {
        throw error;
      }

      toast.success("Template submitted for marketplace review.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="template-publish-dialog">
        <DialogHeader>
          <DialogTitle>Publish to Marketplace</DialogTitle>
          <DialogDescription>
            Share your store layout and theme as a template for other merchants.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Template Name</Label>
            <Input 
              data-testid="template-publish-title"
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              placeholder="e.g. Modern Glassmorphism" 
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea 
              data-testid="template-publish-description"
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Describe your template's vibe..." 
            />
          </div>
          <div className="grid gap-2">
            <Label>Best For</Label>
            <Input
              data-testid="template-publish-best-for"
              value={formData.bestFor}
              onChange={e => setFormData({ ...formData, bestFor: e.target.value })}
              placeholder="e.g. skincare, boutique, single product"
            />
          </div>
          <div className="grid gap-2">
            <Label>Tags</Label>
            <Input
              data-testid="template-publish-tags"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              placeholder="Comma separated, e.g. premium, mobile-ready"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cover Preview</Label>
            <CloudinaryUpload 
              value={formData.coverImage} 
              onChange={url => setFormData({ ...formData, coverImage: url })} 
              folder="marketplace-covers"
              storeId={store.id}
              label="Upload cover image"
              inputTestId="template-publish-cover-url"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                  <SelectItem value="editorial">Editorial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Pricing Mode</Label>
              <Select value={formData.pricingMode} onValueChange={val => setFormData({ ...formData, pricingMode: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {formData.pricingMode === "premium" && (
            <div className="grid gap-2">
              <Label>Price (USD)</Label>
              <Input 
                type="number" 
                value={formData.price} 
                onChange={e => setFormData({ ...formData, price: e.target.value })} 
                min="0" 
              />
            </div>
          )}
          {findings.length > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Safety review findings
              </p>
              <div className="mt-2 space-y-2">
                {findings.slice(0, 4).map((finding, index) => (
                  <p key={`${finding.code}-${index}`} className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                    {finding.message}
                  </p>
                ))}
                {findings.length > 4 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">{findings.length - 4} more finding{findings.length - 4 === 1 ? "" : "s"}.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handlePublish} disabled={loading} data-testid="template-publish-submit">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Publish Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
