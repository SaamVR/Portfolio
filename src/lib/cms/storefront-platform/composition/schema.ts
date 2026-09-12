import { z } from "zod";
import {
  COMPOSITION_LIMITS,
  COMPOSITION_SCHEMA_VERSION,
  compositionPrimitiveIds,
  type CompositionDocument,
  type CompositionNode,
} from "@/lib/cms/storefront-platform/composition/contracts";
import {
  compositionBindingSchema,
  getCompositionPrimitiveDefinition,
} from "@/lib/cms/storefront-platform/composition/primitives";

const nodeIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

function addNestedIssues(
  ctx: z.RefinementCtx,
  issues: z.ZodIssue[],
  prefix: Array<string | number>,
) {
  for (const issue of issues) {
    ctx.addIssue({
      ...issue,
      path: [...prefix, ...issue.path],
    });
  }
}

export const compositionNodeSchema: z.ZodType<CompositionNode> = z.lazy(() =>
  z.object({
    id: nodeIdSchema,
    primitive: z.enum(compositionPrimitiveIds),
    props: z.record(z.string(), z.unknown()).default({}),
    children: z.array(compositionNodeSchema).max(COMPOSITION_LIMITS.maxChildrenPerNode).optional(),
  }).strict().superRefine((node, ctx) => {
    const definition = getCompositionPrimitiveDefinition(node.primitive);
    const propsResult = definition.propsSchema.safeParse(node.props);

    if (!propsResult.success) {
      addNestedIssues(ctx, propsResult.error.issues, ["props"]);
    }

    const childCount = node.children?.length ?? 0;
    if (!definition.allowsChildren && childCount > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["children"],
        message: `${node.primitive} does not accept child nodes`,
      });
    }

    if (childCount > definition.maxChildren) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        path: ["children"],
        maximum: definition.maxChildren,
        type: "array",
        inclusive: true,
        exact: false,
        message: `${node.primitive} accepts at most ${definition.maxChildren} child nodes`,
      });
    }
  }),
);

type PendingBinding = {
  slotId: string;
  path: Array<string | number>;
};

function collectBindings(value: unknown, path: Array<string | number>, bindings: PendingBinding[]) {
  const parsed = compositionBindingSchema.safeParse(value);
  if (parsed.success) {
    bindings.push({ slotId: parsed.data.slotId, path });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectBindings(item, [...path, index], bindings));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      collectBindings(nested, [...path, key], bindings);
    }
  }
}

export const compositionTreeSchema = compositionNodeSchema.superRefine((tree, ctx) => {
  if (tree.primitive !== "section") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primitive"],
      message: "Composition root must be a section primitive",
    });
  }

  let nodeCount = 0;
  let nodeLimitReported = false;
  const nodeIds = new Set<string>();
  const dataSlotIds = new Set<string>();
  const bindings: PendingBinding[] = [];

  const visit = (node: CompositionNode, depth: number, path: Array<string | number>) => {
    nodeCount += 1;

    if (nodeCount > COMPOSITION_LIMITS.maxNodes && !nodeLimitReported) {
      nodeLimitReported = true;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Composition tree exceeds ${COMPOSITION_LIMITS.maxNodes} nodes`,
      });
    }

    if (depth > COMPOSITION_LIMITS.maxDepth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Composition tree exceeds maximum nesting depth ${COMPOSITION_LIMITS.maxDepth}`,
      });
    }

    if (nodeIds.has(node.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, "id"],
        message: `Duplicate composition node id: ${node.id}`,
      });
    } else {
      nodeIds.add(node.id);
    }

    if (node.primitive === "data-slot") {
      dataSlotIds.add(node.id);
    }

    collectBindings(node.props, [...path, "props"], bindings);

    node.children?.forEach((child, index) => {
      visit(child, depth + 1, [...path, "children", index]);
    });
  };

  visit(tree, 1, []);

  for (const binding of bindings) {
    if (!dataSlotIds.has(binding.slotId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: binding.path,
        message: `Binding references unknown data slot node: ${binding.slotId}`,
      });
    }
  }
});

export const compositionDocumentSchema: z.ZodType<CompositionDocument> = z.object({
  schemaVersion: z.literal(COMPOSITION_SCHEMA_VERSION),
  recipeId: z.string().min(1).max(80).optional(),
  tree: compositionTreeSchema,
}).strict();

export function parseCompositionDocument(value: unknown): CompositionDocument {
  return compositionDocumentSchema.parse(value);
}

export function validateCompositionDocument(value: unknown) {
  return compositionDocumentSchema.safeParse(value);
}
