"use client";

import React, { useCallback, useEffect } from "react";
import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useStorefrontRouting } from "@/components/storefront/StorefrontRoutingProvider";
import { toCanonicalStorefrontPath, toPublicStorefrontPath } from "@/lib/storefront-routing";

function resolvePublicStorefrontPath(
  value: string,
  routing: ReturnType<typeof useStorefrontRouting>,
) {
  return routing.storeSlug
    ? toPublicStorefrontPath(value, routing.storeSlug, routing.mode)
    : value;
}

function resolveCanonicalStorefrontPath(
  value: string,
  routing: ReturnType<typeof useStorefrontRouting>,
) {
  return routing.storeSlug
    ? toCanonicalStorefrontPath(value, routing.storeSlug)
    : value;
}

export const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, ...props }, ref) => {
    const routing = useStorefrontRouting();
    const rawHref = to || href || "#";
    const resolvedHref = typeof rawHref === "string"
      ? resolvePublicStorefrontPath(rawHref, routing)
      : rawHref;
    return <NextLink ref={ref} href={resolvedHref} {...props} />;
  },
);
Link.displayName = "Link";

export const useLocation = () => {
  const routing = useStorefrontRouting();
  const rawPathname = usePathname() || "";
  const pathname = resolveCanonicalStorefrontPath(rawPathname, routing);
  const searchParams = useNextSearchParams();
  const search = searchParams ? `?${searchParams.toString()}` : "";
  return {
    pathname,
    search,
    hash: "",
    state: null,
  };
};

export const useNavigate = () => {
  const routing = useStorefrontRouting();
  const router = useRouter();

  return useCallback((to: any, options?: { replace?: boolean; state?: any; scroll?: boolean }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
      return;
    }

    const destination = typeof to === "string"
      ? resolvePublicStorefrontPath(to, routing)
      : to;
    if (options?.replace) {
      router.replace(destination, { scroll: options.scroll ?? true });
    } else {
      router.push(destination, { scroll: options?.scroll ?? true });
    }
  }, [router, routing]);
};

export const useParams = () => {
  return useNextParams() || {};
};

export const useSearchParams = () => {
  const routing = useStorefrontRouting();
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const rawPathname = usePathname() || "";
  const pathname = resolvePublicStorefrontPath(rawPathname, routing);

  const setSearchParams = (
    newParams: any,
    options?: { replace?: boolean; scroll?: boolean; preventScrollReset?: boolean },
  ) => {
    const current = new URLSearchParams(Array.from(searchParams?.entries() || []));
    const shouldScroll = options?.preventScrollReset ? false : (options?.scroll ?? false);

    if (typeof newParams === "function") {
      newParams = newParams(current);
    }

    if (newParams instanceof URLSearchParams) {
      const url = `${pathname}?${newParams.toString()}`;
      if (options?.replace) {
        router.replace(url, { scroll: shouldScroll });
      } else {
        router.push(url, { scroll: shouldScroll });
      }
    } else {
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });
      const url = `${pathname}?${current.toString()}`;
      if (options?.replace) {
        router.replace(url, { scroll: shouldScroll });
      } else {
        router.push(url, { scroll: shouldScroll });
      }
    }
  };

  return [searchParams || new URLSearchParams(), setSearchParams] as const;
};

export const Navigate = ({ to, replace }: { to: string; replace?: boolean }) => {
  const routing = useStorefrontRouting();
  const router = useRouter();
  const publicTo = resolvePublicStorefrontPath(to, routing);
  useEffect(() => {
    if (replace) {
      router.replace(publicTo);
    } else {
      router.push(publicTo);
    }
  }, [publicTo, router, replace]);
  return null;
};

export const NavLink = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, className, children, ...props }, ref) => {
    const routing = useStorefrontRouting();
    const rawPathname = usePathname() || "";
    const pathname = resolveCanonicalStorefrontPath(rawPathname, routing);
    const canonicalTo = typeof to === "string"
      ? resolveCanonicalStorefrontPath(to.split("?")[0], routing)
      : "";
    const isActive = pathname === canonicalTo;

    const resolvedClassName = typeof className === "function"
      ? className({ isActive })
      : className;

    return (
      <Link ref={ref} to={to} className={resolvedClassName} {...props}>
        {children}
      </Link>
    );
  },
);
NavLink.displayName = "NavLink";

export const Outlet = () => {
  if (process.env.NODE_ENV === "development") {
    console.error("Outlet was rendered, which is a legacy React Router concept not supported in Next.js App Router. Please replace the layout routing implementation.");
  }
  return null;
};
