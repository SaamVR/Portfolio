export type StorefrontNavStyle = "sticky" | "static" | "hidden" | null | undefined;

export type StorefrontChromeLayoutInput = {
  announcementVisible: boolean;
  announcementHeight: number;
  navbarHeight: number;
  bottomNavHeight: number;
  navStyle: StorefrontNavStyle;
};

export type StorefrontChromeLayout = {
  navbarTop: number;
  mainPaddingTop: number;
  bottomPadding: number;
};

function normalizeHeight(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function resolveStorefrontChromeLayout({
  announcementVisible,
  announcementHeight,
  navbarHeight,
  bottomNavHeight,
  navStyle,
}: StorefrontChromeLayoutInput): StorefrontChromeLayout {
  const activeAnnouncementHeight = announcementVisible ? normalizeHeight(announcementHeight) : 0;
  const activeNavbarHeight = normalizeHeight(navbarHeight);

  return {
    navbarTop: activeAnnouncementHeight,
    mainPaddingTop: activeAnnouncementHeight + (navStyle === "static" ? 0 : activeNavbarHeight),
    bottomPadding: normalizeHeight(bottomNavHeight),
  };
}
