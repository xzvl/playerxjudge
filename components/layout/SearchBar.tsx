"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SearchInput } from "@/components/ui/search-input";

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
      <SearchInput
        id="site-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tournaments, communities, players..."
      />
    </form>
  );
}
