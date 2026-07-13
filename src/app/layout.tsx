import React from "react";
import "@/index.css";
import { Providers } from "./providers";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL("https://commerce-engine.local"),
  title: "Commerce Engine - Ecommerce CMS for Launching Stores",
  description: "A mobile-first ecommerce CMS for launch templates, storefront pages, products, checkout flows, and store operations.",
  authors: [{ name: "Commerce Engine" }],
  openGraph: {
    title: "Commerce Engine - Ecommerce CMS for Launching Stores",
    description: "Launch and manage online stores with templates, CMS pages, products, payments, and admin workflows.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@CommerceEngine",
    title: "Commerce Engine - Ecommerce CMS for Launching Stores",
    description: "Launch and manage online stores with templates, CMS pages, products, payments, and admin workflows.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://kipopygvmfvknbtjbzzv.supabase.co" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
