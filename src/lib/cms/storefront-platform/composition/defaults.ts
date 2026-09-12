import type { StorePageBlock } from "@/lib/cms/schema";
import {
  COMPOSITION_SCHEMA_VERSION,
  type CompositionDocument,
} from "@/lib/cms/storefront-platform/composition/contracts";

export function createDefaultCompositionDocument(): CompositionDocument {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    tree: {
      id: "section",
      primitive: "section",
      props: { width: "contained", padding: "comfortable", tone: "default" },
      children: [
        {
          id: "content",
          primitive: "stack",
          props: { gap: "md", align: "stretch" },
          children: [
            {
              id: "heading",
              primitive: "heading",
              props: { text: "Build a custom section", level: "h2", align: "left", emphasis: "normal" },
            },
            {
              id: "body",
              primitive: "text",
              props: { text: "Compose this section from safe layout, content, media, action, and data primitives.", style: "body", align: "left" },
            },
          ],
        },
      ],
    },
  };
}

export function createDefaultCompositionBlock(sortOrder: number): StorePageBlock {
  return {
    id: crypto.randomUUID(),
    type: "composition",
    sortOrder,
    isVisible: true,
    visible: true,
    props: createDefaultCompositionDocument(),
  } as StorePageBlock;
}
