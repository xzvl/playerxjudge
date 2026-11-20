"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Lets a page swap a URL segment (e.g. a league's UUID) for a readable name
// in the dashboard breadcrumbs.
interface Ctx {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string | null) => void;
}

const BreadcrumbLabelContext = createContext<Ctx>({ labels: {}, setLabel: () => {} });

export function BreadcrumbLabelProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const value = useMemo<Ctx>(
    () => ({
      labels,
      setLabel: (segment, label) =>
        setLabels((prev) => {
          if (label === null) {
            if (!(segment in prev)) return prev;
            const next = { ...prev };
            delete next[segment];
            return next;
          }
          return prev[segment] === label ? prev : { ...prev, [segment]: label };
        }),
    }),
    [labels]
  );
  return <BreadcrumbLabelContext.Provider value={value}>{children}</BreadcrumbLabelContext.Provider>;
}

export function useBreadcrumbLabels() {
  return useContext(BreadcrumbLabelContext).labels;
}

export function BreadcrumbLabel({ segment, label }: { segment: string; label: string }) {
  const { setLabel } = useContext(BreadcrumbLabelContext);
  useEffect(() => {
    setLabel(segment, label);
    return () => setLabel(segment, null);
  }, [segment, label, setLabel]);
  return null;
}
