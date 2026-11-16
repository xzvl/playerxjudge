"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const CONTENT_TABS = [
  { label: "Branding", href: "/backend/content/branding" },
  { label: "Header", href: "/backend/content/header" },
  { label: "Hero", href: "/backend/content/hero" },
  { label: "Footer", href: "/backend/content/footer" },
  { label: "Images", href: "/backend/content/images" },
  { label: "FAQs", href: "/backend/content/faqs" },
  { label: "Privacy Policy", href: "/backend/content/privacy-policy" },
  { label: "Terms & Conditions", href: "/backend/content/terms" },
  { label: "How to Use", href: "/backend/content/how-to-use" },
];

// Section switcher for /backend/content. Scrolls sideways on narrow screens.
export function ContentTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Content sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-1 border-b border-outline-variant/20">
        {CONTENT_TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-9 items-center border-b-2 px-2.5 text-[13px] transition-colors",
                  active
                    ? "border-primary font-medium text-on-surface"
                    : "border-transparent text-on-surface/55 hover:text-on-surface"
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
