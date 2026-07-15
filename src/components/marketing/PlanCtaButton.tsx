"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PlanCtaButtonProps {
  planId: string;
  cta: string;
  featured: boolean;
}

export function PlanCtaButton({ planId, cta, featured }: PlanCtaButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isContactSalesPlan = planId === "pro";

  const href = isContactSalesPlan
    ? "/contact"
    : (isMounted && isLoggedIn)
      ? "/admin/billing"
      : `/signup?planId=${encodeURIComponent(planId)}`;

  const text = isContactSalesPlan
    ? cta
    : (isMounted && isLoggedIn)
    ? "Upgrade current store"
    : cta;

  return (
    <Button
      asChild
      className={`mt-7 w-full rounded-full transition-all duration-300 group-hover:-translate-y-0.5 ${
        featured ? "shadow-[0_12px_30px_rgba(255,255,255,0.16)]" : "shadow-[0_12px_30px_rgba(16,185,129,0.14)]"
      }`}
      variant={featured ? "secondary" : "default"}
    >
      <Link href={href}>{text}</Link>
    </Button>
  );
}
