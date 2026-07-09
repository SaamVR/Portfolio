import { describe, expect, it } from "@/test/test-utils";
import { collectMediaUrlsFromValue, inferBackupMediaFileName, inferBackupMediaFolder, replaceUrlsInValue } from "@/lib/store-backup";

describe("store backup helpers", () => {
  it("collects nested media urls", () => {
    const urls = collectMediaUrlsFromValue({
      logo: "https://example.com/logo.png",
      sections: [
        { mediaUrl: "https://example.com/hero.mp4" },
        { title: "Ignore me" },
      ],
    });

    expect(Array.from(urls)).toEqual([
      "https://example.com/logo.png",
      "https://example.com/hero.mp4",
    ]);
  });

  it("replaces urls recursively", () => {
    const next = replaceUrlsInValue(
      {
        logo: "https://old.example/logo.png",
        gallery: ["https://old.example/1.png", "keep"],
      },
      new Map([
        ["https://old.example/logo.png", "https://new.example/logo.png"],
        ["https://old.example/1.png", "https://new.example/1.png"],
      ]),
    );

    expect(next).toEqual({
      logo: "https://new.example/logo.png",
      gallery: ["https://new.example/1.png", "keep"],
    });
  });

  it("infers backup media names and folders", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/stores/threadbd/hero/v123456/banner.jpg";
    expect(inferBackupMediaFileName(url)).toBe("banner.jpg");
    expect(inferBackupMediaFolder(url)).toBe("stores/threadbd/hero");
  });
});
