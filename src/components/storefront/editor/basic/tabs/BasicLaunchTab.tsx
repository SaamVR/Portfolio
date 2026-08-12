"use client";

import React from "react";
import { Rocket, CheckCircle, ExternalLink, Globe, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@/lib/cms/schema";

interface BasicLaunchTabProps {
  store: Store;
  onPublish?: () => void;
  isPublishing?: boolean;
}

export function BasicLaunchTab({ store, onPublish, isPublishing }: BasicLaunchTabProps) {
  const customDomain = store.customDomain;
  const storefrontUrl = customDomain ? `https://${customDomain}` : `https://${store.slug}.ezcomo.com`;

  const checklistItems = [
    { title: "Store Details & Branding", completed: Boolean(store.name && store.slug) },
    { title: "Storefront Template", completed: true },
    { title: "Pages & Content Blocks", completed: true },
    { title: "Payment Methods Configured", completed: Boolean(store.siteSettings?.payment_settings) },
    { title: "Delivery Rates Set", completed: Boolean(store.siteSettings?.delivery_settings) },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;

  return (
    <div data-testid="basic-tab-launch" className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Launch Readiness</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Review readiness checklist and publish your storefront live</p>
      </div>

      {/* Domain & URL info */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">Live Storefront URL</span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
            Active
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900 p-2.5">
          <span className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate">{storefrontUrl}</span>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
          >
            Visit <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Launch Checklist ({completedCount}/{checklistItems.length})
          </h4>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {Math.round((completedCount / checklistItems.length) * 100)}% Complete
          </span>
        </div>

        <div className="space-y-2">
          {checklistItems.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
              {item.completed ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Publish button */}
      {onPublish ? (
        <div className="pt-2">
          <Button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="w-full h-11 text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            {isPublishing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Publish Storefront Changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
