import type { StoreTheme } from "@/lib/cms/schema";
import { getStoreThemeStyle } from "@/lib/cms/store-theme-style";

export function StoreThemeScope({
  theme,
  children,
}: {
  theme: StoreTheme;
  children: React.ReactNode;
}) {
  return <div style={getStoreThemeStyle(theme)}>{children}</div>;
}
