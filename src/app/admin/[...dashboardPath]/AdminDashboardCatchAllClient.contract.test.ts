import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const catchAllPath = "src/app/admin/[...dashboardPath]/AdminDashboardCatchAllClient.tsx";
const source = readFileSync(resolve(process.cwd(), catchAllPath), "utf8");

const WORKSPACE_MODULES = [
  "@/components/admin/MediaLibraryManager",
  "@/components/admin/OnboardingWizard",
  "@/components/admin/StoreBackupManager",
  "@/views/admin/Billing",
  "@/views/admin/Analytics",
  "@/views/admin/LaunchReadiness",
  "@/views/admin/NotificationsCenter",
  "@/views/admin/OperationsDiagnostics",
  "@/views/admin/CouriersPluginManager",
  "@/views/admin/BlogManager",
  "@/views/admin/BlogPerformance",
  "@/views/admin/QrCodeGenerator",
  "@/views/admin/CartRecovery",
  "@/views/admin/Categories",
  "@/views/admin/Coupons",
  "@/views/admin/InviteCodes",
  "@/views/admin/Messages",
  "@/views/admin/Orders",
  "@/views/admin/PlatformControlPlane",
  "@/views/admin/Products",
  "@/views/admin/ReturnsOperations",
  "@/views/admin/Reviews",
  "@/views/admin/SiteSettings",
  "@/views/admin/Users",
  "@/views/admin/OnlineStoreHub",
  "@/views/admin/SiteGuideView",
] as const;

test("catch-all workspace modules are route-scoped dynamic imports", () => {
  assert.match(source, /import dynamic from "next\/dynamic"/);
  assert.doesNotMatch(source, /^import .* from "@\/views\/admin\//gm);

  for (const modulePath of WORKSPACE_MODULES) {
    const dynamicImport = `dynamic(() => import("${modulePath}")`;
    const staticImport = `from "${modulePath}"`;
    assert.ok(source.includes(dynamicImport), `${modulePath} must stay behind a literal dynamic import`);
    assert.equal(source.includes(staticImport), false, `${modulePath} must not regress to a static catch-all import`);
  }

  assert.doesNotMatch(source, /CmsPagesManager/);
});

test("legacy route aliases keep their current workspace semantics", () => {
  assert.match(source, /case "cms":\s*case "page-builder":[\s\S]*?<OnlineStoreHub \/>/);
  assert.match(source, /case "marketing":\s*case "coupons":\s*return <Coupons \/>/);
  assert.match(source, /case "customers":\s*case "messages":\s*return <Messages \/>/);
  assert.match(source, /case "guide":\s*case "help":\s*case "how-to":\s*return <SiteGuideView \/>/);
});

test("commercial feature gates remain outside dynamically loaded workspaces", () => {
  assert.match(source, /featureKey="cms_pages"[\s\S]*?<OnlineStoreHub \/>/);
  assert.match(source, /featureKey="backup_import"[\s\S]*?<StoreBackupManager \/>/);
  assert.match(source, /featureKey="staff_management"[\s\S]*?<InviteCodes \/>/);
  assert.match(source, /featureKey="media_library"[\s\S]*?<MediaLibraryManager \/>/);
});

test("workspace failures have an accessible route-resetting recovery path", () => {
  assert.match(source, /class AdminWorkspaceErrorBoundary/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Retry workspace/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, /<AdminWorkspaceErrorBoundary key=\{route\}>/);
});

test("dedicated heavy routes remain outside the catch-all implementation contract", () => {
  const orders = readFileSync(resolve(process.cwd(), "src/app/admin/(admin-dashboard)/orders/page.tsx"), "utf8");
  const products = readFileSync(resolve(process.cwd(), "src/app/admin/(admin-dashboard)/products/page.tsx"), "utf8");
  const settings = readFileSync(resolve(process.cwd(), "src/app/admin/(admin-dashboard)/site-settings/page.tsx"), "utf8");

  assert.match(orders, /from "@\/views\/admin\/Orders"/);
  assert.match(products, /from "@\/views\/admin\/Products"/);
  assert.match(settings, /from "@\/views\/admin\/SiteSettings"/);
});
