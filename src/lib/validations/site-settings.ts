import { z } from "zod";

export const brandSettingsSchema = z.object({
  name: z.string().optional(),
  highlight: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

export const announcementBarSchema = z.object({
  enabled: z.boolean().default(false),
  text: z.string().optional(),
  link: z.string().optional(),
  bg_color: z.string().optional(),
  text_color: z.string().optional(),
});

export const whatsappSupportSchema = z.object({
  enabled: z.boolean().default(false),
  number: z.string().optional(),
  message: z.string().optional(),
});

export const aboutPageSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

export const contactPageSchema = z.object({
  badge: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  whatsapp: z.string().optional(),
  form_button_label: z.string().optional(),
  response_time_label: z.string().optional(),
  response_time_text: z.string().optional(),
  map_enabled: z.boolean().optional(),
  map_embed_url: z.string().url().or(z.literal("")).optional(),
});

export const navigationLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const navigationSchema = z.object({
  primary_links: z.array(navigationLinkSchema).optional(),
  shop_label: z.string().optional(),
  shop_feature_title: z.string().optional(),
  shop_feature_subtitle: z.string().optional(),
  shop_feature_image: z.string().optional(),
  nav_layout: z.enum(["brand-left", "centered", "compact"]).optional(),
  show_search: z.boolean().optional(),
  show_theme_toggle: z.boolean().optional(),
  show_account: z.boolean().optional(),
  show_wishlist: z.boolean().optional(),
  show_cart: z.boolean().optional(),
});

export const shopPageSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  search_placeholder: z.string().optional(),
  size_guide_label: z.string().optional(),
  empty_title: z.string().optional(),
  empty_description: z.string().optional(),
  end_message: z.string().optional(),
  show_sale_filter: z.boolean().optional(),
  show_price_filter: z.boolean().optional(),
  show_size_filter: z.boolean().optional(),
  show_color_filter: z.boolean().optional(),
  show_size_guide: z.boolean().optional(),
});

export const footerLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const footerSectionOrderSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const footerSchema = z.object({
  about_text: z.string().optional(),
  newsletter_heading: z.string().optional(),
  newsletter_description: z.string().optional(),
  newsletter_subscribed: z.string().optional(),
  company_links: z.array(footerLinkSchema).optional(),
  extra_links_title: z.string().optional(),
  extra_links: z.array(footerLinkSchema).optional(),
  section_order: z.array(footerSectionOrderSchema).optional(),
  payment_text: z.string().optional(),
  copyright: z.string().optional(),
  show_shop_links: z.boolean().optional(),
  show_newsletter: z.boolean().optional(),
});

export const exitIntentSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().optional(),
  offer_text: z.string().optional(),
  discount_amount: z.string().optional(),
  discount_code: z.string().optional(),
  min_seconds_on_page: z.number().min(0).max(120).optional(),
  trigger_top_tolerance: z.number().min(0).max(80).optional(),
  bg_color: z.string().optional(),
  image_url: z.string().optional(),
});

export const analyticsTrackingSchema = z.object({
  firstPartyEnabled: z.boolean().optional(),
  trackTrafficSources: z.boolean().optional(),
  ga4Enabled: z.boolean().optional(),
  ga4MeasurementId: z.string().optional(),
  metaPixelEnabled: z.boolean().optional(),
  metaPixelId: z.string().optional(),
});

export const loyaltySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().optional(),
  earn_rate: z.number().min(0).optional(),
  redemption_value: z.number().min(0).optional(),
});

export const bkashConnectionDraftSchema = z.object({
  appKey: z.string().optional(),
  appSecret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  isLive: z.boolean().default(false),
});

export const faqEntrySchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const siteSettingsSchema = z.object({
  brand_settings: brandSettingsSchema.optional(),
  announcement_bar: announcementBarSchema.optional(),
  whatsapp_support: whatsappSupportSchema.optional(),
  about_page: aboutPageSchema.optional(),
  contact_page: contactPageSchema.optional(),
  navigation: navigationSchema.optional(),
  shop_page: shopPageSchema.optional(),
  footer: footerSchema.optional(),
  exit_intent: exitIntentSchema.optional(),
  analytics_tracking: analyticsTrackingSchema.optional(),
  loyalty_settings: loyaltySettingsSchema.optional(),
  faq_entries: z.array(faqEntrySchema).optional(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;
export type BkashConnectionDraftValues = z.infer<typeof bkashConnectionDraftSchema>;
