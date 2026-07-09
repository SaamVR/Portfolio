"use client";

import React, { useCallback, useEffect } from "react";
import NextLink from "next/link";
import { usePathname, useRouter, useParams as useNextParams, useSearchParams as useNextSearchParams } from "next/navigation";

// Link Shim
export const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, ...props }, ref) => {
    return <NextLink ref={ref} href={to || href || "#"} {...props} />;
  }
);
Link.displayName = "Link";

// useLocation Shim
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

// useNavigate Shim
export const useNavigate = () => {
  const router = useRouter();
  return useCallback((to: any, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
    } else {
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    }
  }, [router]);
};

// useParams Shim
export const useParams = () => {
  return useNextParams() || {};
};

// useSearchParams Shim
export const useSearchParams = () => {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (newParams: any, options?: { replace?: boolean }) => {
    const current = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (typeof newParams === "function") {
      newParams = newParams(current);
    }
    if (newParams instanceof URLSearchParams) {
      const url = `${pathname}?${newParams.toString()}`;
      if (options?.replace) {
        router.replace(url);
      } else {
        router.push(url);
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
        router.replace(url);
      } else {
        router.push(url);
      }
    }
  };

  return [searchParams || new URLSearchParams(), setSearchParams] as const;
};

// Navigate Shim (Redirect Component)
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

// NavLink Shim
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
  }
);
NavLink.displayName = "NavLink";

// Outlet placeholder if needed
export const Outlet = () => {
  if (process.env.NODE_ENV === "development") {
    console.error("Outlet was rendered, which is a legacy React Router concept not supported in Next.js App Router. Please replace the layout routing implementation.");
  }
  return <div className="text-red-500 font-bold p-4 border border-red-500">React Router Outlet is deprecated. Use Next.js children prop in Layouts instead.</div>;
};
