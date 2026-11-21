"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";

import { PageSkeleton } from "@/components/dashboard/PageSkeleton";

// Dashboard-wide "something is saving" state. While any mutation started
// through `useBusyTransition` is pending (server action + the refresh that
// loads the new data), the content area swaps to a skeleton; once it's done
// the fresh data shows. Children stay mounted (just hidden) so forms, dialogs
// and local state survive.
interface BusyApi {
  busy: boolean;
  begin: () => void;
  end: () => void;
}

const BusyContext = createContext<BusyApi>({ busy: false, begin: () => {}, end: () => {} });

export function DashboardBusyProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const begin = useCallback(() => setCount((c) => c + 1), []);
  const end = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
  return <BusyContext.Provider value={{ busy: count > 0, begin, end }}>{children}</BusyContext.Provider>;
}

// Drop-in for React's `useTransition` in dashboard components.
export function useBusyTransition() {
  const [pending, start] = useTransition();
  const { begin, end } = useContext(BusyContext);

  // Register while pending; the cleanup also covers the component
  // unmounting mid-mutation (e.g. a deleted row), so the skeleton can't stick.
  useEffect(() => {
    if (!pending) return;
    begin();
    return end;
  }, [pending, begin, end]);

  return [pending, start] as const;
}

export function BusyBoundary({ children }: { children: React.ReactNode }) {
  const { busy } = useContext(BusyContext);
  return (
    <>
      {busy ? <PageSkeleton /> : null}
      <div hidden={busy}>{children}</div>
    </>
  );
}
