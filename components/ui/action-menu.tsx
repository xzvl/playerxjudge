"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
}

// "..." overflow menu for the less common actions on a row or card.
// Destructive items sit separated at the bottom, tinted. Keep the one or two
// actions people use constantly as visible buttons instead.
export function ActionMenu({ items, label = "More actions", disabled }: { items: ActionMenuItem[]; label?: string; disabled?: boolean }) {
  const normal = items.filter((i) => !i.destructive);
  const danger = items.filter((i) => i.destructive);

  const renderItem = (item: ActionMenuItem) => {
    const body = (
      <>
        {item.icon ? (
          <span className="mr-2 inline-flex [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        {item.label}
      </>
    );
    const cls = cn("min-h-9 cursor-pointer", item.destructive && "text-primary focus:text-primary");
    return item.href ? (
      <DropdownMenuItem key={item.label} asChild disabled={item.disabled} className={cls}>
        <Link href={item.href}>{body}</Link>
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={item.onSelect} className={cls}>
        {body}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {normal.map(renderItem)}
        {normal.length > 0 && danger.length > 0 ? <DropdownMenuSeparator /> : null}
        {danger.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
