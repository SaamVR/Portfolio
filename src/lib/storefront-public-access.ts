export type PublicStorefrontAccessState = {
  isPublished?: boolean | null;
  hasSubscription?: boolean;
  planLive?: boolean;
};

export function canExposePublicStorefront(
  access: PublicStorefrontAccessState | null | undefined,
) {
  if (!access?.isPublished) return false;

  // Published legacy stores without a subscription record remain supported.
  if (!access.hasSubscription) return true;

  // Subscription eligibility never publishes a merchant draft storefront.
  return access.planLive === true;
}
