"use client";

import { Button } from "@/components/ui/button";

export function AdvancedUnsupportedNotice({
  onSwitchToBasic,
  reason = "screen",
}: {
  onSwitchToBasic: () => void;
  reason?: "screen" | "plan";
}) {
  const title = reason === "plan"
    ? "Advanced Mode is not included in this store plan"
    : "Advanced editing needs a larger screen";
  const description = reason === "plan"
    ? "You can keep editing this storefront in Basic Mode, or upgrade the store plan to unlock Advanced Mode."
    : "Switch to Basic Mode to edit on this device, or open the editor on desktop.";

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-gray-50 p-6 text-center dark:bg-gray-950">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        <Button type="button" className="mt-4" onClick={onSwitchToBasic}>
          Switch to Basic Mode
        </Button>
      </div>
    </div>
  );
}
