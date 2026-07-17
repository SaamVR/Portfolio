import test from "node:test";
import assert from "node:assert/strict";
import { hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";

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

test("hex <-> hsl channel helpers convert guided theme colors", () => {
  const channels = hexToHslChannels("#22c55e");
  assert.ok(channels);

  const roundTrip = hslChannelsToHex(channels!);
  assert.ok(roundTrip);
});
