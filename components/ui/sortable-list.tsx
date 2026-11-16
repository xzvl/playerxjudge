"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// A vertical list the user reorders by dragging the grip handle (mouse),
// or with the up/down buttons (touch and keyboard, where HTML5 drag and
// drop doesn't work). Controlled: `onReorder` gets the new array.
export function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  className,
  itemClassName,
}: {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item, index) => (
        <li
          key={getKey(item)}
          onDragOver={(e) => {
            if (dragIndex === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (overIndex !== index) setOverIndex(index);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) onReorder(moveItem(items, dragIndex, index));
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={cn(
            "flex items-start gap-2 rounded-md border border-outline-variant/25 bg-surface-container-low p-2 transition-colors",
            dragIndex === index && "opacity-50",
            overIndex === index && dragIndex !== null && dragIndex !== index && "border-primary/60",
            itemClassName
          )}
        >
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
            <span
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
                // Firefox needs data set for the drag to start.
                e.dataTransfer.setData("text/plain", String(index));
                const row = (e.currentTarget as HTMLElement).closest("li");
                if (row) e.dataTransfer.setDragImage(row, 16, 16);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-on-surface/40 hover:bg-surface-container hover:text-on-surface active:cursor-grabbing"
              title="Drag to reorder"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onReorder(moveItem(items, index, index - 1))}
              className="flex h-5 w-6 items-center justify-center rounded text-on-surface/40 hover:bg-surface-container hover:text-on-surface disabled:opacity-25"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === items.length - 1}
              onClick={() => onReorder(moveItem(items, index, index + 1))}
              className="flex h-5 w-6 items-center justify-center rounded text-on-surface/40 hover:bg-surface-container hover:text-on-surface disabled:opacity-25"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  );
}
