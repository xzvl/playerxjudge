import { cn } from "@/lib/utils";

// FormField now lives in components/ui/form-field (shared by every form);
// re-exported so existing team imports keep working.
export { FormField } from "@/components/ui/form-field";

export function FormStatus({ status, message }: { status: "success" | "error" | null; message?: string | null }) {
  if (!status || !message) return null;
  return (
    <p role="status" className={cn("text-[13px]", status === "error" ? "text-primary" : "text-emerald-500")}>
      {message}
    </p>
  );
}
