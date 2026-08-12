import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { StorePage } from "@/lib/cms/schema";

export type EditorMode = "basic" | "advanced";
export type Breakpoint = "desktop" | "tablet" | "mobile";
export type BasicTabId =
  | "pages"
  | "content"
  | "layout"
  | "theme"
  | "effects"
  | "flow"
  | "launch";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type InspectorTabId = "style" | "content" | "advanced";

export type BasicRailItem = {
  id: BasicTabId;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  warning?: boolean;
};

export type EditorPageOption = {
  id: string;
  title: string;
  slug?: string;
};

export type EditorHeaderAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
};

export type EditorShellRenderProps = {
  page: StorePage | null;
  breakpoint: Breakpoint;
};

export type EditorShellSlot = (props: EditorShellRenderProps) => ReactNode;
