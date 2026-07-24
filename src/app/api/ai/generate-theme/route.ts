import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

function buildFallbackTheme(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();
  const isLuxury = /luxury|premium|jewelry|fashion|boutique|elegant/.test(normalizedPrompt);
  const isFood = /food|restaurant|cafe|coffee|bakery|menu|meal/.test(normalizedPrompt);
  const isPlayful = /kids|toy|fun|play|color|pop/.test(normalizedPrompt);
  const isTech = /tech|gadget|digital|software|modern/.test(normalizedPrompt);

  if (isLuxury) {
    return {
      source: "fallback",
      theme: { primary: "#B88A44", accent: "#E8C27A", background: "#111111", foreground: "#F8F3EA" },
      fonts: { heading: "Playfair Display", body: "Inter" },
      aesthetic: "dark-luxury",
      hero: {
        tagline: "Premium Edit",
        title: "Refined Pieces For Everyday Luxury",
        highlight: "Luxury",
        subtitle: "Curated products, polished details, and a smoother way to shop your signature style.",
        ctaText: "Shop Now",
      },
    };
  }

  if (isFood) {
    return {
      source: "fallback",
      theme: { primary: "#D84A2B", accent: "#F2B84B", background: "#FFF8EF", foreground: "#2B1B12" },
      fonts: { heading: "Poppins", body: "Nunito" },
      aesthetic: "artisan",
      hero: {
        tagline: "Fresh Today",
        title: "Fresh Flavor Delivered With Care",
        highlight: "Flavor",
        subtitle: "Bring your best dishes, offers, and customer favorites into one appetizing storefront.",
        ctaText: "Order Now",
      },
    };
  }

  if (isPlayful) {
    return {
      source: "fallback",
      theme: { primary: "#F04F9A", accent: "#38BDF8", background: "#FFF7FB", foreground: "#24122A" },
      fonts: { heading: "Montserrat", body: "Nunito" },
      aesthetic: "playful-pop",
      hero: {
        tagline: "New Favorites",
        title: "Bright Finds Made For Happy Shopping",
        highlight: "Happy",
        subtitle: "A colorful storefront for cheerful products, quick browsing, and easy buying decisions.",
        ctaText: "Explore Now",
      },
    };
  }

  if (isTech) {
    return {
      source: "fallback",
      theme: { primary: "#2563EB", accent: "#14B8A6", background: "#F8FAFC", foreground: "#0F172A" },
      fonts: { heading: "Inter", body: "Inter" },
      aesthetic: "minimal",
      hero: {
        tagline: "Smart Picks",
        title: "Modern Gear For Everyday Momentum",
        highlight: "Momentum",
        subtitle: "Showcase practical products with clean structure, clear benefits, and confident calls to action.",
        ctaText: "Browse Gear",
      },
    };
  }

  return {
    source: "fallback",
    theme: { primary: "#4F46E5", accent: "#F59E0B", background: "#FFFFFF", foreground: "#171717" },
    fonts: { heading: "Poppins", body: "Inter" },
    aesthetic: "minimal",
    hero: {
      tagline: "Made For You",
      title: "Build A Store Customers Trust",
      highlight: "Trust",
      subtitle: "Create a polished shopping experience with clear sections, strong styling, and confident copy.",
      ctaText: "Shop Now",
    },
  };
}

export async function POST(req: Request) {
  let prompt = "";

  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "");

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: z.object({
        theme: z.object({
          primary: z.string().describe("Hex color code, e.g., #000000 or #FF5733"),
          accent: z.string().describe("Hex color code, complementary to primary"),
          background: z.string().describe("Hex color code, usually light or very dark"),
          foreground: z.string().describe("Hex color code for text, must contrast with background"),
        }),
        fonts: z.object({
          heading: z.enum(["Inter", "Poppins", "Playfair Display", "Raleway", "Oswald", "Montserrat"]),
          body: z.enum(["Inter", "Open Sans", "Lato", "Nunito", "Source Sans 3"]),
        }),
        aesthetic: z.enum([
          "minimal", "glassmorphism", "fluid", "brutalist", "neumorphism", 
          "editorial", "retro", "artisan", "dark-luxury", "playful-pop"
        ]),
        hero: z.object({
          tagline: z.string().describe("Short 2-4 word eyebrow tagline"),
          title: z.string().describe("Catchy main headline (4-8 words)"),
          highlight: z.string().describe("One specific word from the title to highlight"),
          subtitle: z.string().describe("Persuasive subtitle explaining the value proposition (10-20 words)"),
          ctaText: z.string().describe("Action-oriented primary button text (2-3 words)"),
        }),
      }),
      prompt: `You are an expert ecommerce UI/UX designer and copywriter. 
      Based on the user's business description, generate a beautiful, high-converting store theme (colors, fonts, aesthetic style) and compelling copy for their homepage hero section.
      
      User's business description: "${prompt}"
      
      Rules:
      1. Make the colors harmonious and appropriate for the industry.
      2. Ensure high contrast between background and foreground (text) colors for accessibility.
      3. Use proper 6-digit hex codes for all colors (e.g., #FFFFFF).
      4. Select an aesthetic that perfectly matches the brand vibe.
      5. The hero highlight word MUST be present in the hero title.`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("AI Theme Generation Error:", error);
    return NextResponse.json(buildFallbackTheme(prompt));
  }
}
