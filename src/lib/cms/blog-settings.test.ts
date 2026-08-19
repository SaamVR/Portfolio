import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultBlogSettings, normalizeBlogSettings } from "./blog-settings";

describe("Blog settings copy normalization", () => {
  it("uses Blog language for new stores", () => {
    assert.equal(defaultBlogSettings.indexTitle, "Blog");
    assert.equal(defaultBlogSettings.homepageWidgetEyebrow, "From the blog");
    assert.equal(defaultBlogSettings.homepageWidgetTitle, "Latest from the blog");
  });

  it("upgrades the exact legacy Journal defaults without rewriting custom copy", () => {
    assert.equal(normalizeBlogSettings({ indexTitle: "Journal" }).indexTitle, "Blog");
    assert.equal(normalizeBlogSettings({ homepageWidgetEyebrow: "From the journal" }).homepageWidgetEyebrow, "From the blog");
    assert.equal(normalizeBlogSettings({ indexTitle: "Our field journal" }).indexTitle, "Our field journal");
    assert.equal(normalizeBlogSettings({ homepageWidgetEyebrow: "Studio journal" }).homepageWidgetEyebrow, "Studio journal");
  });
});
