"use client";

import type { StorefrontMobilePrimaryAction } from "@/lib/storefront-platform/mobile/mobile-action";

export function MobileStorefrontActionBar({
  action,
  onPrimaryAction,
}: {
  action: StorefrontMobilePrimaryAction;
  onPrimaryAction?: () => void;
}) {
  const className = "inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const content = onPrimaryAction ? (
    <button type="button" className={className} onClick={onPrimaryAction}>{action.label}</button>
  ) : (
    <a
      className={className}
      href={action.href}
      target={action.channel === "whatsapp" ? "_blank" : undefined}
      rel={action.channel === "whatsapp" ? "noreferrer" : undefined}
    >
      {action.label}
    </a>
  );

  return (
    <aside
      aria-label="Storefront primary action"
      className="sticky bottom-0 z-40 border-t border-border/70 bg-background/95 px-4 pt-3 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {content}
    </aside>
  );
}
