"use client";

import { useState } from "react";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { ArrowLeft, Building2, Layers3, LayoutDashboard, LogOut, Menu, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type CmsAdminMobileNavProps = {
  userEmail?: string | null;
  onOpenCommand: () => void;
  onSignOut: () => void;
};

const primaryLinks = [
  { to: "/cms-admin", icon: Shield, label: "Control" },
  { to: "/cms-admin/libraries", icon: Layers3, label: "Library" },
  { to: "/admin", icon: LayoutDashboard, label: "Store Admin" },
];

export default function CmsAdminMobileNav({ userEmail, onOpenCommand, onSignOut }: CmsAdminMobileNavProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="border-b border-border/60 bg-card/40 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {primaryLinks.map((link) => {
            const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background/80 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/90 px-4 py-2 backdrop-blur-xl md:hidden pb-safe">
        <div className="grid grid-cols-4 gap-2">
          {primaryLinks.map((link) => {
            const active = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-all",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-muted-foreground transition-all",
                  isOpen && "bg-primary/10 text-primary",
                )}
              >
                <Menu className="h-4 w-4" />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem] border-t border-border/80 bg-card p-6 shadow-2xl">
              <SheetHeader className="border-b border-border/50 pb-4 text-left">
                <SheetTitle className="flex items-center gap-3">
                  <span className="font-heading text-xl font-bold text-foreground">
                    CMS<span className="text-primary">Admin</span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Platform
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3 py-6">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCommand();
                  }}
                  className="flex items-center gap-3 rounded-xl border border-transparent bg-secondary/40 p-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span>Search Admin</span>
                </button>
                <SheetClose asChild>
                  <Link
                    to="/"
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-secondary/40 p-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span>Storefront</span>
                  </Link>
                </SheetClose>
              </div>

              <div className="space-y-4 border-t border-border/50 pt-4">
                <div className="px-2">
                  <p className="text-xs text-muted-foreground">Logged in as</p>
                  <p className="truncate text-sm font-medium text-foreground">{userEmail ?? ""}</p>
                </div>
                <ChangePasswordDialog />
                <div className="flex gap-3">
                  <SheetClose asChild>
                    <Button variant="outline" size="lg" asChild className="flex-1 justify-center gap-2 rounded-xl">
                      <Link to="/admin">
                        <Building2 className="h-4 w-4" />
                        Store Admin
                      </Link>
                    </Button>
                  </SheetClose>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => {
                      setIsOpen(false);
                      onSignOut();
                    }}
                    className="flex-1 justify-center gap-2 rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
