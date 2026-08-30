import test from "node:test";
import assert from "node:assert/strict";
import type { StoreTheme } from "@/lib/cms/schema";
import {
  hexToHslChannels,
  hslChannelsToHex,
  resolveStoreThemeForMode,
  resolveStoreThemeVars,
} from "@/lib/cms/store-theme-utils";

test("resolveStoreThemeVars merges package tokens with store overrides", () => {
  const resolved = resolveStoreThemeVars({
    presetId: "default",
    themePackageId: "ocean-teal",
    mode: "dark",
    customCssVars: {
      "--primary": "0 0% 100%",
    },
  });

  assert.equal(resolved.vars["--primary"], "0 0% 100%");
  assert.ok(resolved.vars["--background"]);
});

test("resolveStoreThemeForMode keeps store color overrides only for their saved mode", () => {
  const theme = {
    presetId: "default",
    themePackageId: "ocean-teal",
    mode: "dark",
    customCssVars: {
      "--primary": "0 0% 100%",
    },
  } as StoreTheme;

  const savedModeTheme = resolveStoreThemeForMode(theme, "dark");
  assert.equal(savedModeTheme, theme);
  assert.equal(savedModeTheme.customCssVars["--primary"], "0 0% 100%");

  const alternateModeTheme = resolveStoreThemeForMode(theme, "light");
  assert.equal(alternateModeTheme.mode, "light");
  assert.deepEqual(alternateModeTheme.customCssVars, {});

  const resolved = resolveStoreThemeVars(alternateModeTheme);
  assert.notEqual(resolved.vars["--primary"], "0 0% 100%");
  assert.ok(resolved.vars["--background"]);
});

test("hex <-> hsl channel helpers convert guided theme colors", () => {
  const channels = hexToHslChannels("#22c55e");
  assert.ok(channels);

  const roundTrip = hslChannelsToHex(channels!);
  assert.ok(roundTrip);
});
