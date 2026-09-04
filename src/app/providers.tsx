"use client";

import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/hooks/useAuth";
import { PlatformIdentityProvider, type PlatformIdentityValue } from "@/components/platform/PlatformIdentityProvider";

export function Providers({ children, platformIdentity }: { children: React.ReactNode; platformIdentity: PlatformIdentityValue }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PlatformIdentityProvider identity={platformIdentity}>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  {children}
                  <Toaster />
                  <Sonner />
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </PlatformIdentityProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
