"use client";

import React, { useCallback, useEffect } from "react";
import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, ...props }, ref) => {
    return <NextLink ref={ref} href={to || href || "#"} {...props} />;
  },
);
Link.displayName = "Link";

export const useLocation = () => {
  const pathname = usePathname() || "";
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
  const router = useRouter();
  return useCallback((to: any, options?: { replace?: boolean; state?: any; scroll?: boolean }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
    } else if (options?.replace) {
      router.replace(to, { scroll: options.scroll ?? true });
    } else {
      router.push(to, { scroll: options?.scroll ?? true });
    }
  }, [router]);
};

export const useParams = () => {
  return useNextParams() || {};
};

export const useSearchParams = () => {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);
  return null;
};

export const NavLink = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, className, children, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === to;

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
