import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Toolbar above a list or table: search first, filters/sort beside it
// (`children`), then secondary page actions pushed right (`actions`: export,
// import...). The primary "create" action belongs in the PageHeader, not
// here. Controls fill the row on phones.
export function PageToolbar({
  search,
  children,
  actions,
  className,
}: {
  search?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {search ? <div className="w-full sm:max-w-xs sm:flex-1">{search}</div> : null}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
    </div>
  );
}
