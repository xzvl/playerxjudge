"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex flex-wrap items-center gap-y-1 border border-outline-variant/30 bg-surface-container-lowest p-1 erp:max-w-full erp:gap-0.5 erp:overflow-x-auto erp:rounded-[3px] erp:border-outline-variant/25 erp:bg-surface-container-low erp:p-0.5 erp:scrollbar-none",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3 lg:px-5 py-2 font-mono text-[9px] lg:text-[11px] uppercase tracking-widest text-on-surface/50 transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-on-primary erp:relative erp:gap-1.5 erp:rounded-[2px] erp:px-3.5 erp:py-2 erp:font-display erp:text-[15px] erp:font-semibold erp:uppercase erp:tracking-[0.06em] erp:text-on-surface/55 erp:hover:text-on-surface erp:lg:px-3.5 erp:lg:text-[15px] erp:data-[state=active]:bg-primary/15 erp:data-[state=active]:text-on-surface erp:data-[state=active]:after:absolute erp:data-[state=active]:after:inset-x-2 erp:data-[state=active]:after:bottom-0 erp:data-[state=active]:after:h-[2px] erp:data-[state=active]:after:bg-primary erp:data-[state=active]:after:shadow-[0_0_8px_rgb(var(--m3-primary))]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-6 focus-visible:outline-none erp:mt-4", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
