import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

type LegacyHomepageSettings = Partial<{
  hero_section: {
    tagline?: string;
    title?: string;
    highlight?: string;
    subtitle?: string;
    cta_text?: string;
    cta_link?: string;
    secondary_cta_text?: string;
    secondary_cta_link?: string;
    media_url?: string;
    media_type?: "image" | "video";
    overlay_color?: string;
    overlay_opacity?: number;
  };
  promo_banner: {
    enabled?: boolean;
    title?: string;
    subtitle?: string;
    cta_text?: string;
    cta_link?: string;
    badge_text?: string;
    bg_style?: "gradient" | "dark" | "accent" | "luxury-gold" | "indigo" | "rose" | "aurora" | "luxury-dark" | "confetti" | "mesh-gradient";
    text_alignment?: "left" | "center" | "right";
    padding_size?: "compact" | "cozy" | "large";
    enable_glow?: boolean;
    enable_particles?: boolean;
    enable_orbs?: boolean;
    card_opacity?: number;
  };
  home_featured: {
    tagline?: string;
    title?: string;
  };
  home_categories: {
    tagline?: string;
    title?: string;
  };
}>;

export type LegacyHomepageSettingKey =
  | "hero_section"
  | "promo_banner"
  | "home_featured"
  | "home_categories";

export type SiteSettingRecord = {
  key: string;
  value: unknown;
};

type LegacyHomepageAdaptMode = "backfill" | "force";

function mergeBlockProps<T extends StorePageBlock["props"]>(
  props: T,
  fallback: Partial<T>,
): T {
  const nextProps = { ...props } as Record<string, unknown>;

  for (const [key, value] of Object.entries(fallback)) {
    if (nextProps[key] === undefined && value !== undefined) {
      nextProps[key] = value;
    }
  }

  return nextProps as T;
}

function overwriteDefinedBlockProps<T extends StorePageBlock["props"]>(
  props: T,
  updates: Partial<T>,
): T {
  const nextProps = { ...props } as Record<string, unknown>;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      nextProps[key] = value;
    }
  }

  return nextProps as T;
}

function adaptBlockFromLegacySettings(
  block: StorePageBlock,
  settings: LegacyHomepageSettings,
  mode: LegacyHomepageAdaptMode = "backfill",
): StorePageBlock {
  const shouldForce = mode === "force";

  switch (block.type) {
    case "hero":
      return {
        ...block,
        props: shouldForce
          ? overwriteDefinedBlockProps(block.props, {
              tagline: settings.hero_section?.tagline,
              title: settings.hero_section?.title,
              highlight: settings.hero_section?.highlight,
              subtitle: settings.hero_section?.subtitle,
              ctaText: settings.hero_section?.cta_text,
              ctaLink: settings.hero_section?.cta_link,
              secondaryCtaText: settings.hero_section?.secondary_cta_text,
              secondaryCtaLink: settings.hero_section?.secondary_cta_link,
              mediaUrl: settings.hero_section?.media_url,
              mediaType: settings.hero_section?.media_type,
              overlayColor: settings.hero_section?.overlay_color,
              overlayOpacity: settings.hero_section?.overlay_opacity,
            })
          : mergeBlockProps(block.props, {
              tagline: settings.hero_section?.tagline,
              title: settings.hero_section?.title,
              highlight: settings.hero_section?.highlight,
              subtitle: settings.hero_section?.subtitle,
              ctaText: settings.hero_section?.cta_text,
              ctaLink: settings.hero_section?.cta_link,
              secondaryCtaText: settings.hero_section?.secondary_cta_text,
              secondaryCtaLink: settings.hero_section?.secondary_cta_link,
              mediaUrl: settings.hero_section?.media_url,
              mediaType: settings.hero_section?.media_type,
              overlayColor: settings.hero_section?.overlay_color,
              overlayOpacity: settings.hero_section?.overlay_opacity,
            }),
      };
    case "promo-banner":
      const promoVisible = shouldForce
        ? (settings.promo_banner?.enabled ?? block.isVisible)
        : block.isVisible;
      return {
        ...block,
        isVisible: promoVisible,
        visible: promoVisible,
        props: shouldForce
          ? overwriteDefinedBlockProps(block.props, {
              title: settings.promo_banner?.title,
              subtitle: settings.promo_banner?.subtitle,
              ctaText: settings.promo_banner?.cta_text,
              ctaLink: settings.promo_banner?.cta_link,
              badgeText: settings.promo_banner?.badge_text,
              bgStyle: settings.promo_banner?.bg_style,
              textAlignment: settings.promo_banner?.text_alignment,
              paddingSize: settings.promo_banner?.padding_size,
              enableGlow: settings.promo_banner?.enable_glow,
              enableParticles: settings.promo_banner?.enable_particles,
              enableOrbs: settings.promo_banner?.enable_orbs,
              cardOpacity: settings.promo_banner?.card_opacity,
            })
          : mergeBlockProps(block.props, {
              title: settings.promo_banner?.title,
              subtitle: settings.promo_banner?.subtitle,
              ctaText: settings.promo_banner?.cta_text,
              ctaLink: settings.promo_banner?.cta_link,
              badgeText: settings.promo_banner?.badge_text,
              bgStyle: settings.promo_banner?.bg_style,
              textAlignment: settings.promo_banner?.text_alignment,
              paddingSize: settings.promo_banner?.padding_size,
              enableGlow: settings.promo_banner?.enable_glow,
              enableParticles: settings.promo_banner?.enable_particles,
              enableOrbs: settings.promo_banner?.enable_orbs,
              cardOpacity: settings.promo_banner?.card_opacity,
            }),
      };
    case "featured-products":
      return {
        ...block,
        props: shouldForce
          ? overwriteDefinedBlockProps(block.props, {
              tagline: settings.home_featured?.tagline,
              title: settings.home_featured?.title,
            })
          : mergeBlockProps(block.props, {
              tagline: settings.home_featured?.tagline,
              title: settings.home_featured?.title,
            }),
      };
    case "category-showcase":
      return {
        ...block,
        props: shouldForce
          ? overwriteDefinedBlockProps(block.props, {
              tagline: settings.home_categories?.tagline,
              title: settings.home_categories?.title,
            })
          : mergeBlockProps(block.props, {
              tagline: settings.home_categories?.tagline,
              title: settings.home_categories?.title,
            }),
      };
    default:
      return block;
  }
}

function forceApplyLegacyHomepageSettingToBlock(
  block: StorePageBlock,
  key: LegacyHomepageSettingKey,
  value: unknown,
): StorePageBlock {
  switch (key) {
    case "hero_section":
      if (block.type !== "hero" || typeof value !== "object" || !value) {
        return block;
      }
      return adaptBlockFromLegacySettings(
        block,
        { hero_section: value as LegacyHomepageSettings["hero_section"] },
        "force",
      );
    case "promo_banner":
      if (block.type !== "promo-banner" || typeof value !== "object" || !value) {
        return block;
      }
      return adaptBlockFromLegacySettings(
        block,
        { promo_banner: value as LegacyHomepageSettings["promo_banner"] },
        "force",
      );
    case "home_featured":
      if (block.type !== "featured-products" || typeof value !== "object" || !value) {
        return block;
      }
      return adaptBlockFromLegacySettings(
        block,
        { home_featured: value as LegacyHomepageSettings["home_featured"] },
        "force",
      );
    case "home_categories":
      if (block.type !== "category-showcase" || typeof value !== "object" || !value) {
        return block;
      }
      return adaptBlockFromLegacySettings(
        block,
        { home_categories: value as LegacyHomepageSettings["home_categories"] },
        "force",
      );
    default:
      return block;
  }
}

export function applyLegacyHomepageSettingToBlock(
  block: StorePageBlock,
  key: LegacyHomepageSettingKey,
  value: unknown,
): StorePageBlock {
  return forceApplyLegacyHomepageSettingToBlock(block, key, value);
}

export function mapLegacyHomepageSettings(siteSettings: SiteSettingRecord[]): LegacyHomepageSettings {
  const mapped: Record<string, unknown> = {};

  for (const row of siteSettings) {
    mapped[row.key] = row.value;
  }

  return mapped as LegacyHomepageSettings;
}

export function applyLegacyHomepageSettingsToPages(
  pages: StorePage[],
  siteSettings: SiteSettingRecord[],
  options?: {
    mode?: LegacyHomepageAdaptMode;
  },
): StorePage[] {
  if (!siteSettings.length) {
    return pages;
  }

  const settings = mapLegacyHomepageSettings(siteSettings);
  const mode = options?.mode ?? "backfill";

  return pages.map((page) => {
    if (!page.isHomepage) {
      return page;
    }

    return {
      ...page,
      blocks: page.blocks.map((block) => adaptBlockFromLegacySettings(block, settings, mode)),
    };
  });
}
