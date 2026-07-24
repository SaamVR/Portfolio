"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteStoreResult = {
  success: boolean;
  deletedAllOwnedStores: boolean;
  ownerUserId: string | null;
  banned: boolean;
  deletedStoreId: string;
};

type DeleteStoreDialogProps = {
  storeId: string;
  storeName: string;
  mode: "merchant" | "platform";
  buttonLabel?: string;
  buttonClassName?: string;
  banToggleLabel?: string;
  onDeleted?: (result: DeleteStoreResult) => Promise<void> | void;
};

export function DeleteStoreDialog({
  storeId,
  storeName,
  mode,
  buttonLabel,
  buttonClassName,
  banToggleLabel = "Block this merchant from creating another site",
  onDeleted,
}: DeleteStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [banMerchant, setBanMerchant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPlatformMode = mode === "platform";
  const canSubmit = confirmName.trim() === storeName.trim() && (!isPlatformMode || note.trim().length > 0);

  const resetState = () => {
    setNote("");
    setConfirmName("");
    setBanMerchant(false);
    setSubmitting(false);
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Please sign in again before deleting a site.");
      }

      const response = await fetch("/api/stores/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          note,
          banMerchant: isPlatformMode ? banMerchant : false,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete site");
      }

      toast.success(isPlatformMode ? "Store deleted and lifecycle note saved." : "Store deleted from your workspace.");
      setOpen(false);
      resetState();
      await onDeleted?.(payload as DeleteStoreResult);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete site.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={buttonClassName ?? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {buttonLabel ?? (isPlatformMode ? "Delete Site" : "Delete This Site")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {storeName}
          </DialogTitle>
          <DialogDescription>
            {isPlatformMode
              ? "This permanently deletes the store workspace, its storefront content, and merchant data tied to that site."
              : "This permanently removes this site from your account, including its storefront content and store-scoped data."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
            Type <span className="font-semibold text-foreground">{storeName}</span> to confirm this delete action.
          </div>

          <div className="grid gap-2">
            <Label htmlFor="delete-store-confirm-name">Confirm site name</Label>
            <Input
              id="delete-store-confirm-name"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={storeName}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="delete-store-note">
              {isPlatformMode ? "Merchant-visible deletion note" : "Reason (optional)"}
            </Label>
            <Textarea
              id="delete-store-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={isPlatformMode
                ? "Explain why this site was removed. This note appears on the merchant recovery page."
                : "Tell us why you're deleting this site. We'll show this on your deleted-sites history page."}
              rows={4}
            />
          </div>

          {isPlatformMode ? (
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="pr-4">
                <p className="text-sm font-medium text-foreground">{banToggleLabel}</p>
                <p className="text-xs text-muted-foreground">
                  If enabled, the merchant will not see the create-another-site option until support restores access.
                </p>
              </div>
              <Switch checked={banMerchant} onCheckedChange={setBanMerchant} />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Site
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
