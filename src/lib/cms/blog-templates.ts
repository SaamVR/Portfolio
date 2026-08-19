export type BlogArticleTemplateId =
  | "buying-guide"
  | "comparison"
  | "how-to-care"
  | "product-launch"
  | "collection-story";

export type BlogArticleTemplate = {
  id: BlogArticleTemplateId;
  title: string;
  description: string;
  category: string;
  tags: string[];
  productEmbedTitle: string;
  content: string;
  seoTitleHint: string;
  seoDescriptionHint: string;
};

export const blogArticleTemplates: BlogArticleTemplate[] = [
  {
    id: "buying-guide",
    title: "Buying guide",
    description: "Help shoppers choose by use case, fit, budget, material, compatibility, or another practical decision factor.",
    category: "Buying Guides",
    tags: ["buying guide", "shopping advice"],
    productEmbedTitle: "Recommended options",
    seoTitleHint: "How to choose [product/category]: a practical buying guide",
    seoDescriptionHint: "Compare the factors that matter most when choosing [product/category], then review practical options for different needs and budgets.",
    content: `## The short answer

Start with the clearest recommendation for a shopper who wants a quick answer. Explain who this guide is for and the one or two factors that matter most.

## Who this is for

Describe the shopper, use case, problem, budget, environment, fit, or compatibility needs this guide addresses.

## What to compare

- **Use case:** What changes depending on how the product will be used?
- **Fit or compatibility:** What must match the shopper, device, space, routine, or requirement?
- **Material or construction:** Which differences affect comfort, durability, maintenance, or performance?
- **Budget:** What improves as price increases, and what is not worth paying extra for?

## Recommended options

Explain how the recommended products differ before showing the product cards.

[[products]]

## What to avoid

Call out common buying mistakes, misleading specifications, poor-fit choices, or unnecessary upgrades.

## Final buying advice

Give the shopper a simple decision rule and link to another useful [guide](/blog/related-guide) or the relevant [shop page](/shop) when it genuinely helps.`,
  },
  {
    id: "comparison",
    title: "Product comparison",
    description: "Compare two or more products or approaches using concrete differences and clear best-for recommendations.",
    category: "Comparisons",
    tags: ["comparison", "product guide"],
    productEmbedTitle: "Compare the products",
    seoTitleHint: "[Product A] vs [Product B]: which should you choose?",
    seoDescriptionHint: "Compare [Product A] and [Product B] by the differences that matter, including use case, features, tradeoffs, price, and who each option suits best.",
    content: `## Quick verdict

State the simplest useful conclusion first: who should choose each option and why.

## The important differences

Explain only meaningful differences. Avoid repeating specifications that do not change the buying decision.

- **Best for:** Option A — [use case]. Option B — [use case].
- **Main advantage:** Option A — [advantage]. Option B — [advantage].
- **Main tradeoff:** Option A — [tradeoff]. Option B — [tradeoff].
- **Price and value:** Explain what the shopper gains or gives up at each price point.

## Best for different shoppers

### Choose option A if...

Explain the strongest use cases for option A.

### Choose option B if...

Explain the strongest use cases for option B.

## Compare the products

[[products]]

## What both options do well

Explain the shared strengths so the comparison stays fair and useful.

## Which should you choose?

End with a decision rule based on shopper priorities, not a generic winner. Link to a related [buying guide](/blog/related-guide) if it adds context.`,
  },
  {
    id: "how-to-care",
    title: "How-to / care guide",
    description: "Teach setup, use, styling, maintenance, troubleshooting, storage, or aftercare while naturally linking relevant products.",
    category: "How-To & Care",
    tags: ["how to", "care guide"],
    productEmbedTitle: "Useful products for this guide",
    seoTitleHint: "How to [task]: step-by-step guide",
    seoDescriptionHint: "Learn how to [task] with practical steps, common mistakes to avoid, maintenance advice, and the products or tools that can make the process easier.",
    content: `## Before you start

Explain what the reader needs, what to check first, and any preparation that prevents mistakes.

## Step-by-step

1. **Step one:** Explain the first action and what a good result looks like.
2. **Step two:** Explain the next action and any important technique.
3. **Step three:** Finish the process and explain how to check the result.

## Common mistakes

- Mention a mistake that causes poor results.
- Explain what to do instead.
- Add a safety, compatibility, or care warning if relevant.

## Useful products

Explain which products, replacements, accessories, or supplies are genuinely useful for the process.

[[products]]

## Maintenance and aftercare

Explain how often to repeat the process, how to store or clean the item, and what signals indicate that maintenance is needed.

## Quick checklist

Summarize the process in a few actionable points and link to a related [guide](/blog/related-guide) if the reader needs more detail.`,
  },
  {
    id: "product-launch",
    title: "Product launch",
    description: "Introduce a new product with useful context: what changed, who it is for, why it matters, and where it fits in the catalog.",
    category: "New Arrivals",
    tags: ["new arrival", "product launch"],
    productEmbedTitle: "Shop the new release",
    seoTitleHint: "Introducing [product]: what is new and who it is for",
    seoDescriptionHint: "Meet [product], learn what is new, who it is designed for, the problems it solves, and whether it is the right fit for your needs.",
    content: `## What is new

Introduce the product without marketing filler. Explain the real change, improvement, new use case, material, design decision, or capability.

## Who it is for

Describe the shopper who benefits most and, just as importantly, who may be better served by another option.

## The key improvements

- **Improvement one:** Explain the shopper benefit.
- **Improvement two:** Explain the shopper benefit.
- **Improvement three:** Explain the shopper benefit.

## Shop the new release

[[products]]

## How it compares with existing options

Explain where the new product sits in the current range and when an existing product remains the better choice.

## Why it matters

Connect the product back to a real shopper problem, routine, workflow, style, or use case.

## Availability and next step

Explain variants, sizing, compatibility, stock, delivery, or launch details that affect the purchase. Link to the relevant [shop page](/shop) if needed.`,
  },
  {
    id: "collection-story",
    title: "Collection story",
    description: "Turn a collection, seasonal edit, drop, or curated assortment into a shoppable editorial story rather than a plain product grid.",
    category: "Collections",
    tags: ["collection", "editorial"],
    productEmbedTitle: "Shop the collection",
    seoTitleHint: "Inside the [collection name] collection",
    seoDescriptionHint: "Explore the idea behind the [collection name] collection, the design or selection choices that connect it, and how to choose the right pieces for you.",
    content: `## The idea behind the collection

Explain the problem, mood, season, audience, material direction, design language, or use case that connects the collection.

## What makes these pieces belong together

Describe shared materials, colors, functions, construction choices, ingredients, themes, or customer needs.

## How to choose from the collection

Give practical selection guidance based on fit, use case, size, compatibility, budget, style, or another real decision factor.

## Shop the collection

[[products]]

## Standout pieces

Highlight a few products for specific shoppers or situations without simply repeating product descriptions.

## How to combine or use them

Explain styling, pairing, routines, bundles, setups, recipes, rooms, workflows, or complementary use where appropriate.

## Explore more

Finish with a useful next step, such as the broader [shop](/shop) or a related [guide](/blog/related-guide).`,
  },
];

export function getBlogArticleTemplate(id: BlogArticleTemplateId) {
  return blogArticleTemplates.find((template) => template.id === id) ?? null;
}
