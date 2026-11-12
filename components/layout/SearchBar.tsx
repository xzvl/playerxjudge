"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form onSubmit={onSubmit} role="search" className={className}>
      <label htmlFor="site-search" className="sr-only">
        Search tournaments, communities, players, and judges
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface/40"
        />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tournaments, communities, players..."
          className="h-8 w-full rounded-md border border-outline-variant/30 bg-surface-container-low pl-8 pr-3 text-[13px] text-on-surface placeholder:text-on-surface/40 transition-colors focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
        />
      </div>
    </form>
  );
}
