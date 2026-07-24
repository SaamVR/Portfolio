import { describe, expect, it } from "@/test/test-utils";
import { parseLegacyStringToDoc } from "@/lib/cms/rich-text-adapter";
import { storePageBlockSchema } from "@/lib/cms/schema";

describe("rich-text backward-compatible adapter", () => {
  it("parses legacy '- bullet' string bodies into the new doc model", () => {
    const legacyStringBody = `Welcome to our shop!\n- Fast Dhaka delivery\n- Authentic products\n- 7-day return policy`;

    const doc = parseLegacyStringToDoc(legacyStringBody);

    expect(doc.type).toBe("doc");
    expect(doc.content).toHaveLength(2);

    // First node should be paragraph: "Welcome to our shop!"
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content?.[0].text).toBe("Welcome to our shop!");

    // Second node should be bulletList with 3 items
    expect(doc.content[1].type).toBe("bulletList");
    expect(doc.content[1].content).toHaveLength(3);

    const firstBulletItem = doc.content[1].content?.[0];
    expect(firstBulletItem?.type).toBe("listItem");
    expect(firstBulletItem?.content?.[0].content?.[0].text).toBe("Fast Dhaka delivery");
  });

  it("allows storePageBlockSchema to validate and transform legacy string-body blocks", () => {
    const legacyBlockInput = {
      id: "legacy_rich_text_1",
      type: "rich-text",
      sortOrder: 0,
      isVisible: true,
      props: {
        title: "About Our Brand",
        body: "We craft handmade goods in Dhaka.\n- Sustainable materials\n- Fair wages",
        align: "center",
      },
    };

    const parsedBlock = storePageBlockSchema.parse(legacyBlockInput);

    expect(parsedBlock.type).toBe("rich-text");
    if (parsedBlock.type === "rich-text") {
      const bodyDoc = parseLegacyStringToDoc(parsedBlock.props.body);
      expect(bodyDoc.type).toBe("doc");
      expect(bodyDoc.content).toHaveLength(2);
      expect(bodyDoc.content[0].type).toBe("paragraph");
      expect(bodyDoc.content[1].type).toBe("bulletList");
    }
  });
});
