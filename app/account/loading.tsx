import { ShellSkeleton } from "@/components/dashboard/PageSkeleton";

// Entering /account from elsewhere: the role layout (and its shell) is
// still loading, so show the whole shell outline.
export default function Loading() {
  return <ShellSkeleton />;
}
